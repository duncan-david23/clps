"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ScanLine, Minus, Plus, Check, Keyboard, Camera } from "lucide-react";
import {
  MultiFormatReader,
  BinaryBitmap,
  HybridBinarizer,
  HTMLCanvasElementLuminanceSource,
  DecodeHintType,
  BarcodeFormat,
} from "@zxing/library";
import { createClient } from "@/lib/supabase/client";

/* ============================================================
   Helpers
   ============================================================ */
const fm = (n) =>
  "GHS " +
  Number(n).toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ini = (n) =>
  n
    .split(/[ -]/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

/* ============================================================
   Sound
   ============================================================ */
let _audioCtx = null;

function getAudioCtx() {
  if (typeof window === "undefined") return null;
  if (!_audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    _audioCtx = new Ctx();
  }
  if (_audioCtx.state === "suspended") _audioCtx.resume().catch(() => {});
  return _audioCtx;
}

export function unlockAudio() {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") ctx.resume();
}

function beep(ok) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state !== "running") {
      ctx.resume().then(() => beep(ok)).catch(() => {});
      return;
    }

    const now = ctx.currentTime;

    if (ok) {
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(2700, now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.7, now + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } else {
      [0, 0.14].forEach((offset) => {
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(500, now + offset);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now + offset);
        g.gain.exponentialRampToValueAtTime(0.6, now + offset + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.09);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });
    }
  } catch (e) {
    console.warn("beep failed:", e);
  }
}

/* ============================================================
   EAN-13 for receipt
   ============================================================ */
const L7 = [
  "0001101","0011001","0010011","0111101","0100011",
  "0110001","0101111","0111011","0110111","0001011",
];
const R7 = L7.map((c) => c.replace(/[01]/g, (d) => (d === "1" ? "0" : "1")));
const G7 = R7.map((c) => [...c].reverse().join(""));
const PAR = [
  "LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG",
  "LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL",
];

function ean(v) {
  v = (v || "").replace(/\D/g, "");
  if (v.length === 12) {
    let t = 0;
    [...v].forEach((d, i) => (t += d * (i % 2 ? 3 : 1)));
    v += (10 - (t % 10)) % 10;
  }
  return v;
}

function eanSvg(code) {
  const p = PAR[code[0]];
  let bits = "101";
  for (let i = 0; i < 6; i++) bits += (p[i] === "L" ? L7 : G7)[code[i + 1]];
  bits += "01010";
  for (let i = 7; i < 13; i++) bits += R7[code[i]];
  bits += "101";
  let bars = "";
  [...bits].forEach((x, i) => {
    if (x === "1") {
      const tall = i < 3 || i > 91 || (i >= 45 && i < 50);
      bars += `<rect x="${i + 9}" y="4" width="1" height="${tall ? 62 : 56}"/>`;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 113 80" font-family="Manrope,Arial,sans-serif" font-size="9"><rect width="113" height="80" fill="#f3f5f2"/><g fill="#050706">${bars}<text x="2" y="75">${code[0]}</text><text x="33" y="75" text-anchor="middle" letter-spacing="2.6">${code.slice(1,7)}</text><text x="80" y="75" text-anchor="middle" letter-spacing="2.6">${code.slice(7)}</text></g></svg>`;
}

/* ============================================================
   Receipt
   ============================================================ */
function Receipt({ r, biz, logo, id = "rcpt", width = "80mm" }) {
  return (
    <div
      id={id}
      style={{ ["--rcpt-width"]: width }}
      className="mx-auto w-full max-w-[320px] rounded-md border border-lk bg-white px-[18px] py-5 text-[12px] text-bg"
    >
      <div className="flex flex-col items-center gap-2 border-b border-dashed border-lk pb-3 text-center">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={biz || "Business logo"}
            className="h-14 w-auto max-w-[160px] object-contain"
          />
        )}
        <b className="text-[16px] font-extrabold tracking-[-0.02em]">
          {biz || "Business"}
        </b>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-b border-dashed border-lk py-3">
        <span className="text-gray-dim">Receipt</span>
        <b className="text-right font-semibold">{r.no}</b>
        <span className="text-gray-dim">Date</span>
        <b className="text-right font-semibold">
          {r.date}, {r.time}
        </b>
        <span className="text-gray-dim">Cashier</span>
        <b className="text-right font-semibold">{r.cashier}</b>
      </div>

      <div className="border-b border-dashed border-lk py-2">
        <div className="flex justify-between gap-3 pb-1 text-gray-dim">
          <span>Item</span>
          <span>Amount</span>
        </div>
        {r.lines.map((l, i) => (
          <div key={i} className="flex justify-between gap-3 py-1">
            <span>
              {l[0]}
              <small className="block text-gray-dim">
                {l[1]} × {l[2].toFixed(2)}
              </small>
            </span>
            <b className="tabular-nums">{(l[1] * l[2]).toFixed(2)}</b>
          </div>
        ))}
      </div>

      <div className="border-b border-dashed border-lk py-2.5">
        <div className="flex justify-between gap-3 py-0.5 text-gray-dim">
          <span>Subtotal</span>
          <span>{fm(r.sub)}</span>
        </div>
        <div className="flex justify-between gap-3 py-0.5 text-gray-dim">
          <span>Discount</span>
          <span>{fm(r.disc)}</span>
        </div>
        <div className="flex justify-between gap-3 py-0.5 text-gray-dim">
          <span>Tax</span>
          <span>{fm(r.tax)}</span>
        </div>
        <div className="flex justify-between gap-3 pt-1.5 text-[16px] font-extrabold">
          <span>TOTAL</span>
          <span>{fm(r.total)}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-lk py-2.5">
        {r.pays.map((p, i) => (
          <div key={i} className="flex justify-between gap-3 py-0.5 text-gray-dim">
            <span>{p[0]}</span>
            <span>{p[1]}</span>
          </div>
        ))}
      </div>

      <div className="pt-3.5 text-center">
        <div
          className="mx-auto w-[150px]"
          dangerouslySetInnerHTML={{
            __html: eanSvg(
              ean("2" + r.no.replace(/\D/g, "").padStart(11, "0"))
            ),
          }}
        />
        <p className="mb-0.5 mt-2.5 font-semibold">
          Thank you for your business.
        </p>
        <small className="text-gray-dim">Powered by ClaukkPOS</small>
      </div>
    </div>
  );
}

/* ============================================================
   Scanner source picker — Camera or USB/Bluetooth scanner
   ============================================================ */
function ScanSourceModal({
  onClose,
  onPickCamera,
  onPickUsb,
  usbConnected,
  onTestUsb,
}) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");

  const runTest = async () => {
    setTesting(true);
    setTestResult("");
    const detected = await onTestUsb();
    setTesting(false);
    setTestResult(
      detected
        ? "✓ Scanner detected — pull the trigger to test."
        : "No scanner detected. Pull the trigger on your scanner now, or check the cable/pairing."
    );
  };

  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-6">
        <h2 className="m-0 text-[18px] font-bold">How do you want to scan?</h2>
        <p className="mt-1 text-[13px] text-gray-dim">
          Choose the scanner you're using for this sale.
        </p>

        <div className="mt-4 grid gap-2.5">
          <button
            onClick={onPickCamera}
            className="flex items-center gap-3 rounded-xl border border-lk bg-white p-4 text-left transition-colors hover:border-em"
          >
            <span className="grid h-11 w-11 flex-none place-items-center rounded-lg bg-black text-emb">
              <Camera size={22} strokeWidth={1.8} />
            </span>
            <span className="flex-1">
              <b className="block text-[14px] font-bold">Use camera</b>
              <small className="block text-[12px] text-gray-dim">
                Phone or webcam scans the barcode directly.
              </small>
            </span>
          </button>

          <button
            onClick={onPickUsb}
            className="flex items-center gap-3 rounded-xl border border-lk bg-white p-4 text-left transition-colors hover:border-em"
          >
            <span className="relative grid h-11 w-11 flex-none place-items-center rounded-lg bg-black text-emb">
              <Keyboard size={22} strokeWidth={1.8} />
              {usbConnected && (
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emd" />
              )}
            </span>
            <span className="flex-1">
              <b className="block text-[14px] font-bold">
                USB / Bluetooth scanner
              </b>
              <small className="block text-[12px] text-gray-dim">
                {usbConnected
                  ? "Scanner detected and ready."
                  : "Use a plugged-in or paired barcode gun."}
              </small>
            </span>
          </button>
        </div>

        <button
          onClick={runTest}
          disabled={testing}
          className="mt-3 w-full rounded-lg border border-lk bg-transparent py-2 text-[12px] font-semibold text-gray-dim transition-colors hover:border-em disabled:opacity-50"
        >
          {testing ? "Listening for a scan…" : "Test connection"}
        </button>

        {testResult && (
          <p
            className={`mt-2 rounded-lg px-3 py-2 text-[12px] font-semibold ${
              testResult.startsWith("✓")
                ? "bg-emd text-emb"
                : "bg-black text-emb"
            }`}
          >
            {testResult}
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-lk bg-transparent py-2.5 text-[14px] font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Scanner modal (camera)
   ============================================================ */
function ScanModal({ onClose, onDetect }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const readerRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const loopRef = useRef(0);
  const lastRef = useRef({ code: "", t: 0 });

  const [manual, setManual] = useState("");
  const [status, setStatus] = useState("Starting camera…");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomCaps, setZoomCaps] = useState(null);
  const [feedback, setFeedback] = useState({
    cls: "",
    msg: "Scanned items are added to the sale automatically.",
  });

  function preprocess(video, canvas) {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return false;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);

    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;

    for (let i = 0; i < d.length; i += 4) {
      const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = y;
    }

    const CONTRAST = 1.9;
    for (let i = 0; i < d.length; i += 4) {
      let y = (d[i] - 128) * CONTRAST + 128;
      y = y < 128 ? y * 0.75 : 255 - (255 - y) * 0.85;
      if (y < 0) y = 0;
      else if (y > 255) y = 255;
      d[i] = d[i + 1] = d[i + 2] = y;
    }

    ctx.putImageData(img, 0, 0);
    return true;
  }

  useEffect(() => {
    let mounted = true;

    const reader = new MultiFormatReader();
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
    ]);
    reader.setHints(hints);
    readerRef.current = reader;

    async function start() {
      try {
        const baseVideo = {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        };

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              ...baseVideo,
              advanced: [
                { focusMode: "continuous" },
                { exposureMode: "continuous" },
                { whiteBalanceMode: "continuous" },
              ],
            },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: baseVideo,
          });
        }

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
        trackRef.current = track;

        const caps = track.getCapabilities?.() || {};
        setTorchSupported(!!caps.torch);

        if (caps.focusMode && caps.focusMode.includes("continuous")) {
          try {
            await track.applyConstraints({
              advanced: [{ focusMode: "continuous" }],
            });
          } catch {}
        }

        if (caps.exposureCompensation) {
          const { min = 0, max = 0 } = caps.exposureCompensation;
          const target = Math.max(min, Math.min(max, -1));
          try {
            await track.applyConstraints({
              advanced: [{ exposureCompensation: target }],
            });
          } catch {}
        }

        if (caps.zoom) {
          setZoomCaps(caps.zoom);
          setZoom(caps.zoom.min || 1);
        }

        const v = videoRef.current;
        v.srcObject = stream;
        await v.play();
        setStatus("Point a barcode at the camera.");
        tick();
      } catch (e) {
        if (!mounted) return;
        setStatus(
          e.name === "NotAllowedError"
            ? "Camera access was blocked. Allow the camera in your browser's address bar."
            : e.name === "NotFoundError"
            ? "No camera found. Type the barcode below."
            : "Couldn't start the camera. Type the barcode below."
        );
      }
    }

    async function tick() {
      if (!mounted) return;
      const v = videoRef.current;
      const canvas = canvasRef.current;

      if (!v || !canvas || v.readyState < 2) {
        loopRef.current = window.setTimeout(tick, 80);
        return;
      }

      try {
        if (preprocess(v, canvas)) {
          const source = new HTMLCanvasElementLuminanceSource(canvas);
          const bitmap = new BinaryBitmap(new HybridBinarizer(source));
          try {
            const result = readerRef.current.decode(bitmap);
            if (result) {
              const code = result.getText();
              const now = Date.now();
              if (code !== lastRef.current.code || now - lastRef.current.t > 2000) {
                lastRef.current = { code, t: now };
                const res = onDetect(code);
                setFeedback({ cls: res.ok ? "cok" : "cno", msg: res.msg });
                if (res.ok && navigator.vibrate) navigator.vibrate(40);
              }
            }
          } catch {}
        }
      } catch {}

      loopRef.current = window.setTimeout(tick, 80);
    }

    start();

    return () => {
      mounted = false;
      clearTimeout(loopRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [onDetect]);

  const toggleTorch = async () => {
    if (!trackRef.current || !torchSupported) return;
    try {
      await trackRef.current.applyConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn((v) => !v);
    } catch {}
  };

  const applyZoom = async (val) => {
    setZoom(val);
    if (trackRef.current && zoomCaps) {
      try {
        await trackRef.current.applyConstraints({ advanced: [{ zoom: val }] });
      } catch {}
    }
  };

  const feedbackCls =
    feedback.cls === "cok"
      ? "bg-emd text-emb border border-emd"
      : feedback.cls === "cno"
      ? "bg-black text-gray border border-black"
      : "border border-lk text-gray-dim";

  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[92vh] w-full max-w-[560px] overflow-auto rounded-2xl bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="m-0 text-[18px] font-bold">Scan barcode</h2>
          <button
            className="rounded-lg border border-lk bg-transparent px-3.5 py-1 text-[14px] font-semibold"
            onClick={onClose}
          >
            Done
          </button>
        </div>

        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-black">
          <video ref={videoRef} muted playsInline className="block h-full w-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="pointer-events-none absolute inset-[20%_14%]">
            <i className="absolute left-0 top-0 h-[30px] w-[30px] border-3 border-emb border-b-0 border-r-0" />
            <i className="absolute right-0 top-0 h-[30px] w-[30px] border-3 border-emb border-b-0 border-l-0" />
            <i className="absolute bottom-0 left-0 h-[30px] w-[30px] border-3 border-emb border-r-0 border-t-0" />
            <i className="absolute bottom-0 right-0 h-[30px] w-[30px] border-3 border-emb border-l-0 border-t-0" />
            <u className="absolute left-1.5 right-1.5 h-[2px] animate-[scan_1.8s_ease-in-out_infinite_alternate] bg-emb shadow-[0_0_12px_var(--color-emb)]" />
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={toggleTorch}
            disabled={!torchSupported}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
              torchOn ? "border-black bg-black text-emb" : "border-lk bg-transparent text-gray-dim"
            } ${!torchSupported ? "cursor-not-allowed opacity-40" : ""}`}
          >
            {torchSupported ? (torchOn ? "Flash On" : "Flash Off") : "No Flash"}
          </button>

          {zoomCaps && (
            <div className="flex flex-1 items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-dim">Zoom</span>
              <input
                type="range"
                min={zoomCaps.min || 1}
                max={zoomCaps.max || 2}
                step={zoomCaps.step || 0.1}
                value={zoom}
                onChange={(e) => applyZoom(+e.target.value)}
                className="flex-1"
              />
              <span className="w-8 text-right text-[11px] font-semibold tabular-nums text-gray-dim">
                {zoom.toFixed(1)}×
              </span>
            </div>
          )}
        </div>

        <p className="my-2 text-[13px] text-gray-dim">{status}</p>

        <div className={`mb-3 rounded-lg px-3 py-2.5 text-[13px] ${feedbackCls}`}>
          <span dangerouslySetInnerHTML={{ __html: feedback.msg }} />
        </div>

        <label className="block text-[12px] font-semibold text-gray-dim">
          Or type a barcode / SKU and press Enter
          <input
            className="mt-1 block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] font-medium text-bg focus:border-em focus:outline-none focus:ring-[3px] focus:ring-emb/25"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const res = onDetect(manual.trim());
                setFeedback({ cls: res.ok ? "cok" : "cno", msg: res.msg });
                setManual("");
              }
            }}
          />
        </label>

        <style jsx>{`
          @keyframes scan {
            from { top: 12%; }
            to { top: 88%; }
          }
          :global(.border-3) { border-width: 3px; }
        `}</style>
      </div>
    </div>
  );
}

/* ============================================================
   Checkout modal — Cash, Paystack, Split
   ============================================================ */
function CheckoutModal({
  lines,
  total,
  onClose,
  onComplete,
  cashier,
  biz,
  logo,
  saving,
  paymentMethods,
  paystackPublicKey,
  customerEmail,
}) {
  const [stage, setStage] = useState(0);
  const [pay, setPay] = useState(null);
  const [cash, setCash] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [paystackBusy, setPaystackBusy] = useState(false);
  const [paystackError, setPaystackError] = useState("");
  const timerRef = useRef(null);

  const totalNum = Number(total) || 0;
  const cashNum = Number(cash) || 0;

  const cashEnabled = paymentMethods?.includes("cash");
  const paystackEnabled = paymentMethods?.includes("paystack");
  const splitEnabled = cashEnabled && paystackEnabled;

  const momoPortion = pay === "split" ? Math.max(0, totalNum - cashNum) : 0;
  const change = pay === "cash" ? Math.max(0, cashNum - totalNum) : 0;

  useEffect(() => {
    if (pay) return;
    if (cashEnabled) setPay("cash");
    else if (paystackEnabled) setPay("paystack");
    else setPay(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethods]);

  const completeCash = () => {
    if (cashNum < totalNum) return alert("Enter the full cash amount");

    const d = new Date();
    const r = {
      no:
        "#INV-" + String(1285 + Math.floor(Math.random() * 100)).padStart(6, "0"),
      date: d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }),
      cashier: cashier || "Cashier",
      lines,
      sub: totalNum,
      disc: 0,
      tax: 0,
      total: totalNum,
      pays: [
        ["Cash", fm(cashNum)],
        ["Change", fm(change)],
      ],
      paidTotal: totalNum,
      paidChange: change,
      payment_method: "Cash",
      payment_ref: null,
    };

    setReceipt(r);
    onComplete(r);
    setStage(1);
  };

  const completePaystack = () => {
    openPaystack(totalNum, "Paystack", [["Paystack", fm(totalNum)]]);
  };

  const completeSplit = () => {
    if (cashNum <= 0 || cashNum >= totalNum) {
      return alert("Enter a cash portion below the total.");
    }
    openPaystack(momoPortion, "Split", [
      ["Cash", fm(cashNum)],
      ["Paystack (MoMo)", fm(momoPortion)],
    ]);
  };

  const openPaystack = (amount, methodLabel, paysBase) => {
    setPaystackError("");

    if (!paystackPublicKey) {
      return setPaystackError(
        "Paystack isn't configured. Ask the owner to add a public key in Settings → Payments."
      );
    }
    if (typeof window === "undefined" || !window.PaystackPop) {
      return setPaystackError(
        "Payment is still loading. Try again in a second."
      );
    }

    setPaystackBusy(true);

    try {
      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email: customerEmail || "customer@claukkpos.com",
        amount: Math.round(amount * 100),
        currency: "GHS",
        metadata: {
          custom_fields: [
            {
              display_name: "Cashier",
              variable_name: "cashier",
              value: cashier || "Cashier",
            },
            {
              display_name: "Method",
              variable_name: "method",
              value: methodLabel,
            },
          ],
        },
        callback: (response) => {
          const ref = response.reference || "PSK_" + Date.now();

          const d = new Date();
          const r = {
            no:
              "#INV-" +
              String(1285 + Math.floor(Math.random() * 100)).padStart(6, "0"),
            date: d.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            time: d.toLocaleTimeString("en", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            cashier: cashier || "Cashier",
            lines,
            sub: totalNum,
            disc: 0,
            tax: 0,
            total: totalNum,
            pays: [...paysBase, ["Ref", ref]],
            paidTotal: totalNum,
            paidChange: 0,
            payment_method: methodLabel,
            payment_ref: ref,
          };

          setPaystackBusy(false);
          setReceipt(r);
          onComplete(r);
          setStage(1);
        },
        onClose: () => {
          setPaystackBusy(false);
        },
      });

      handler.openIframe();
    } catch (err) {
      setPaystackBusy(false);
      setPaystackError(err.message || "Could not open Paystack.");
    }
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const payLabel =
    pay === "cash"
      ? "Cash"
      : pay === "paystack"
      ? "Paystack"
      : pay === "split"
      ? "Cash + MoMo"
      : "—";

  const canSubmit = (() => {
    if (!cashEnabled && !paystackEnabled) return false;
    if (paystackBusy) return false;
    if (pay === "cash") return cashNum >= totalNum;
    if (pay === "paystack") return true;
    if (pay === "split")
      return cashNum > 0 && cashNum < totalNum && momoPortion > 0;
    return false;
  })();

  const submitLabel = (() => {
    if (paystackBusy) return "Opening Paystack…";
    if (!cashEnabled && !paystackEnabled) return "SELECT A METHOD";
    if (pay === "cash") return "COMPLETE SALE";
    if (pay === "paystack") return "OPEN PAYSTACK";
    if (pay === "split") return "CHARGE CASH + MOMO";
    return "SELECT A METHOD";
  })();

  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && stage !== 2 && !saving) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-[440px] overflow-auto rounded-2xl bg-white p-6">
        {stage === 1 && receipt && (
          <div>
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-black text-emb">
                <Check size={32} strokeWidth={2.5} />
              </div>
              <h2 className="m-0 text-[20px] font-extrabold tracking-[-0.01em]">
                Payment successful
              </h2>
              <p className="mt-1 text-[13px] text-gray-dim">
                Received via {payLabel}
                {saving && " · Saving sale…"}
              </p>

              <div className="mt-4 rounded-xl bg-black px-4 py-4 text-white">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-gray">
                  Amount Paid
                </span>
                <b className="mt-1 block text-[34px] font-extrabold tracking-[-0.02em] text-emb">
                  {fm(receipt.paidTotal)}
                </b>
                {receipt.paidChange > 0 && (
                  <span className="mt-1 block text-[12px] font-semibold text-gray">
                    Change: {fm(receipt.paidChange)}
                  </span>
                )}
              </div>
            </div>

            <div className="mb-4 max-h-[340px] overflow-auto rounded-lg border border-lk bg-white p-3">
              <Receipt r={receipt} biz={biz} logo={logo} id="rcpt" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                className="rounded-lg border border-black bg-black py-2.5 text-[14px] font-semibold text-white"
                onClick={() => {
                  // Give React a tick so #rcpt is laid out before printing
                  requestAnimationFrame(() => window.print());
                }}
              >
                Print receipt
              </button>
              {/* <button
                className="rounded-lg border border-lk bg-transparent py-2.5 text-[14px] font-semibold"
                onClick={() => alert("Receipt link copied")}
              >
                Share receipt
              </button> */}
            </div>
            <button
              disabled={saving}
              className="mt-2 w-full rounded-lg border border-emb bg-emb py-3 text-[14px] font-extrabold text-bg disabled:opacity-60"
              onClick={onClose}
            >
              {saving ? "Saving…" : "New sale"}
            </button>
          </div>
        )}

        {stage === 0 && (
          <>
            <h2 className="mb-4 text-[18px] font-bold">Checkout</h2>

            <div className="rounded-lg border border-lk p-3">
              <div className="flex justify-between text-gray-dim">
                <span>Subtotal</span>
                <span>{fm(totalNum)}</span>
              </div>
              <div className="flex justify-between text-gray-dim">
                <span>Discount</span>
                <span>GHS 0.00</span>
              </div>
              <div className="flex justify-between text-gray-dim">
                <span>Tax</span>
                <span>GHS 0.00</span>
              </div>
              <div className="flex justify-between border-t border-lk pt-2 text-[18px] font-extrabold">
                <span>Total</span>
                <span>{fm(totalNum)}</span>
              </div>
            </div>

            <div
              className={`my-4 grid gap-2 ${
                [cashEnabled, paystackEnabled, splitEnabled].filter(Boolean)
                  .length === 3
                  ? "grid-cols-3"
                  : [cashEnabled, paystackEnabled].filter(Boolean).length === 2
                  ? "grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              {cashEnabled && (
                <button
                  onClick={() => {
                    setPay("cash");
                    setCash("");
                  }}
                  className={`rounded-lg border py-3 text-[13px] font-bold transition-colors ${
                    pay === "cash"
                      ? "border-black bg-black text-emb"
                      : "border-lk bg-transparent"
                  }`}
                >
                  CASH
                </button>
              )}
              {paystackEnabled && (
                <button
                  onClick={() => {
                    setPay("paystack");
                    setCash("");
                  }}
                  className={`rounded-lg border py-3 text-[13px] font-bold transition-colors ${
                    pay === "paystack"
                      ? "border-black bg-black text-emb"
                      : "border-lk bg-transparent"
                  }`}
                >
                  PAYSTACK
                </button>
              )}
              {splitEnabled && (
                <button
                  onClick={() => {
                    setPay("split");
                    setCash("");
                  }}
                  className={`rounded-lg border py-3 text-[13px] font-bold transition-colors ${
                    pay === "split"
                      ? "border-black bg-black text-emb"
                      : "border-lk bg-transparent"
                  }`}
                >
                  SPLIT
                </button>
              )}
            </div>

            {!cashEnabled && !paystackEnabled && (
              <div className="my-4 rounded-lg border border-black bg-black p-3 text-[12px] font-semibold text-emb">
                No payment methods are enabled. Ask the owner to turn on at
                least one method in Settings → Payments.
              </div>
            )}

            {pay === "cash" && cashEnabled && (
              <>
                <label className="mb-3 block text-[12px] font-semibold text-gray-dim">
                  Cash received
                  <input
                    type="number"
                    inputMode="decimal"
                    className="mt-1 block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] font-medium focus:border-em focus:outline-none focus:ring-[3px] focus:ring-emb/25"
                    placeholder="0.00"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    autoFocus
                  />
                </label>

                <div className="flex justify-between font-bold">
                  <span>Change</span>
                  <span>{fm(change)}</span>
                </div>
              </>
            )}

            {pay === "split" && splitEnabled && (
              <>
                <label className="mb-3 block text-[12px] font-semibold text-gray-dim">
                  Cash portion
                  <input
                    type="number"
                    inputMode="decimal"
                    className="mt-1 block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] font-medium focus:border-em focus:outline-none focus:ring-[3px] focus:ring-emb/25"
                    placeholder="0.00"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    autoFocus
                  />
                </label>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[13px] text-gray-dim">
                    <span>Cash</span>
                    <span>{fm(cashNum)}</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-gray-dim">
                    <span>MoMo (Paystack)</span>
                    <span>{fm(momoPortion)}</span>
                  </div>
                  <div className="flex justify-between border-t border-lk pt-1.5 font-bold">
                    <span>Total</span>
                    <span>{fm(totalNum)}</span>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-black bg-black p-3 text-[12px] text-emb">
                  <b className="block font-semibold">How split works</b>
                  <p className="mt-1 leading-[1.4]">
                    Collect {fm(cashNum)} in cash, then click the button
                    below. Paystack will open and charge the customer{" "}
                    {fm(momoPortion)} via MoMo or card.
                  </p>
                </div>
              </>
            )}

            {pay === "paystack" && paystackEnabled && (
              <div className="mt-1 rounded-lg border border-black bg-black p-3 text-[12px] text-emb">
                <b className="block font-semibold">Pay with Paystack</b>
                <p className="mt-1 leading-[1.4]">
                  A secure Paystack window will open. Ask the customer to
                  complete payment with their card or mobile money.
                </p>
              </div>
            )}

            {paystackError && (
              <div className="mt-3 rounded-lg border border-black bg-black px-3 py-2 text-[12px] font-semibold text-emb">
                {paystackError}
              </div>
            )}

            <button
              disabled={!canSubmit}
              className="mt-4 w-full rounded-lg border border-emb bg-emb py-3.5 text-[14px] font-extrabold text-bg transition-colors hover:bg-em disabled:opacity-60"
              onClick={() => {
                if (pay === "cash") completeCash();
                else if (pay === "paystack") completePaystack();
                else if (pay === "split") completeSplit();
              }}
            >
              {submitLabel}
            </button>

            <button
              className="mt-2 w-full rounded-lg border border-lk bg-transparent py-2.5 text-[14px] font-semibold"
              onClick={onClose}
            >
              Back to cart
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Product Card
   ============================================================ */
function ProductCard({ p, qty, onAdd }) {
  const out = p.stock === 0;
  const low = p.stock > 0 && p.stock <= p.low;
  const img = p.image_url;

  return (
    <button
      onClick={() => !out && onAdd(p.id)}
      disabled={out}
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-lk bg-white p-0 text-left transition-all ${
        out
          ? "cursor-not-allowed opacity-55"
          : "hover:-translate-y-0.5 hover:border-em hover:shadow-[0_10px_24px_rgba(0,0,0,0.1)] active:scale-[0.98]"
      }`}
    >
      <div className="relative h-[128px] border-b border-lk bg-[#fafbf9]">
        <span className="absolute inset-0 grid place-items-center bg-black text-[26px] font-extrabold text-emb">
          {ini(p.name)}
        </span>

        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={p.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full bg-[#fafbf9] object-contain p-2.5"
            onError={(e) => {
              e.currentTarget.remove();
            }}
          />
        )}

        <span
          className={`absolute left-2 top-2 rounded-full px-2.5 py-[2px] text-[11px] font-bold ${
            out
              ? "bg-black text-gray"
              : low
              ? "bg-black text-emb"
              : "bg-black text-emb"
          }`}
        >
          {out
            ? "Out of stock"
            : low
            ? `Low · ${p.stock} left`
            : `${p.stock} in stock`}
        </span>

        {qty > 0 && (
          <span className="absolute right-2 top-2 grid min-w-[26px] place-items-center rounded-[13px] bg-emb px-[7px] py-0 text-[12px] font-extrabold text-bg shadow-[0_0_0_3px_#fafbf9]">
            {qty}
          </span>
        )}
      </div>

      <div className="relative px-3.5 pb-3.5 pt-3">
        <b className="block pr-9 text-[14px] leading-[1.3]">{p.name}</b>
        <small className="block text-[12px] text-gray-dim">SKU: {p.sku}</small>
        <div className="mt-1.5 text-[16px] font-extrabold">{fm(p.price)}</div>

        <span
          className={`absolute bottom-3 right-3 grid h-[30px] w-[30px] place-items-center rounded-full text-[18px] font-bold transition-colors ${
            out
              ? "bg-lk text-gray-dim"
              : "bg-black text-emb group-hover:bg-emb group-hover:text-bg"
          }`}
        >
          +
        </span>
      </div>
    </button>
  );
}

/* ============================================================
   USB / Bluetooth scanner detection hook
   ------------------------------------------------------------
   Barcode guns act as keyboards. A real scan produces a rapid
   burst of keystrokes (< ~35ms apart) ending in Enter/Tab.
   Human typing is much slower. We use that timing signature
   to detect a scanner without needing special browser APIs.
   ============================================================ */
function useScannerDetection({ enabled = true, onScan }) {
  const [connected, setConnected] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);
  const bufRef = useRef("");
  const timesRef = useRef([]);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const SCAN_MAX_GAP = 45;     // ms between keystrokes in a scan burst
    const SCAN_MIN_LEN = 4;      // shortest barcode we care about
    const CONNECT_WINDOW = 8000; // scanner considered "connected" for 8s after a burst

    const onKey = (e) => {
      // Ignore modifier-only keydowns
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
        return;
      }

      const now = performance.now();

      // Check the gap since the last keypress
      const prev = timesRef.current[timesRef.current.length - 1] || 0;
      const gap = prev ? now - prev : Infinity;

      if (gap > SCAN_MAX_GAP) {
        // Too slow — start a fresh buffer
        bufRef.current = "";
        timesRef.current = [];
      }

      timesRef.current.push(now);

      if (e.key === "Enter" || e.key === "Tab") {
        const code = bufRef.current;
        bufRef.current = "";
        timesRef.current = [];

        if (code.length >= SCAN_MIN_LEN) {
          // Mark scanner as connected
          setConnected(true);
          setLastSeen(Date.now());
          // Fire the scan callback
          if (onScanRef.current) onScanRef.current(code);
        }
        return;
      }

      // Only count printable single chars
      if (e.key.length === 1) {
        bufRef.current += e.key;
      }
    };

    window.addEventListener("keydown", onKey, true);

    // Background check: if we haven't seen a scan in CONNECT_WINDOW, mark
    // as not connected (so the UI can show "not detected").
    const interval = window.setInterval(() => {
      if (lastSeen && Date.now() - lastSeen > CONNECT_WINDOW) {
        setConnected(false);
      }
    }, 2000);

    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.clearInterval(interval);
    };
  }, [enabled, lastSeen]);

  // Manual "test connection" — waits up to 6s for a scan burst
  const testConnection = () =>
    new Promise((resolve) => {
      let done = false;
      const handler = (e) => {
        if (done) return;
        const now = performance.now();
        const prev = timesRef.current[timesRef.current.length - 1] || 0;
        const gap = prev ? now - prev : Infinity;
        if (gap > SCAN_MAX_GAP) {
          bufRef.current = "";
          timesRef.current = [];
        }
        timesRef.current.push(now);
        if (e.key === "Enter" || e.key === "Tab") {
          if (bufRef.current.length >= SCAN_MIN_LEN) {
            done = true;
            setConnected(true);
            setLastSeen(Date.now());
            window.removeEventListener("keydown", handler, true);
            resolve(true);
          }
          bufRef.current = "";
          timesRef.current = [];
          return;
        }
        if (e.key.length === 1) bufRef.current += e.key;
      };
      window.addEventListener("keydown", handler, true);

      setTimeout(() => {
        if (done) return;
        done = true;
        window.removeEventListener("keydown", handler, true);
        resolve(false);
      }, 6000);
    });

  return { connected, testConnection };
}

/* ============================================================
   POS Page
   ============================================================ */
export default function POSPage() {
  const supabase = createClient();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [biz, setBiz] = useState("ClaukkPOS");
  const [logo, setLogo] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paystackPublicKey, setPaystackPublicKey] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [ownerId, setOwnerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingSale, setSavingSale] = useState(false);

  const [staff, setStaff] = useState(null);
  const [staffLoaded, setStaffLoaded] = useState(false);

  const [cart, setCart] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [scanSourceOpen, setScanSourceOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [usbScanReady, setUsbScanReady] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const searchRef = useRef(null);

  // Refs so the global scanner hook always sees the latest state
  const cartRef = useRef(cart);
  const productsRef = useRef(products);
  useEffect(() => { cartRef.current = cart; }, [cart]);
  useEffect(() => { productsRef.current = products; }, [products]);

  useEffect(() => {
    const id = window.localStorage.getItem("claukk_staff_id");
    const name = window.localStorage.getItem("claukk_staff_name");
    const role = window.localStorage.getItem("claukk_staff_role");
    if (id && name) setStaff({ id, name, role });
    setStaffLoaded(true);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoadError("You're not signed in.");
        setLoading(false);
        return;
      }

      setOwnerId(user.id);
      setCustomerEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "business_name, business_logo, payment_methods, paystack_public_key"
        )
        .eq("id", user.id)
        .single();

      if (profile?.business_name) setBiz(profile.business_name);
      if (profile?.business_logo) setLogo(profile.business_logo);

      setPaymentMethods(
        Array.isArray(profile?.payment_methods) &&
          profile.payment_methods.length
          ? profile.payment_methods
          : ["cash"]
      );
      setPaystackPublicKey(profile?.paystack_public_key || "");

      const { data: catsData } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      setCategories(catsData || []);

      const { data: prods, error } = await supabase
        .from("products")
        .select(
          "id, name, sku, barcode, category_id, selling_price, stock, low_stock_threshold, image_url"
        )
        .order("name");

      if (error) {
        setLoadError(error.message);
        setLoading(false);
        return;
      }

      setProducts(
        (prods || []).map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || "",
          barcode: p.barcode || "",
          category_id: p.category_id,
          price: p.selling_price,
          stock: p.stock,
          low: p.low_stock_threshold,
          image_url: p.image_url,
        }))
      );
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const catNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return products.filter((p) => {
      const catName = catNameById.get(p.category_id) || "Other";
      if (cat !== "All" && catName !== cat) return false;
      if (!t) return true;
      return (
        p.name.toLowerCase().includes(t) ||
        (p.sku || "").toLowerCase().includes(t) ||
        (p.barcode || "").includes(q)
      );
    });
  }, [products, q, cat, catNameById]);

  const cartTotal = useMemo(
    () =>
      cart.reduce((a, [pid, n]) => {
        const p = products.find((x) => x.id === pid);
        return a + (p ? p.price * n : 0);
      }, 0),
    [cart, products]
  );

  const cartItemCount = useMemo(
    () => cart.reduce((a, [, n]) => a + n, 0),
    [cart]
  );

  const addToCart = (pid) => {
    const p = products.find((x) => x.id === pid);
    if (!p || p.stock === 0) return;

    setCart((c) => {
      const idx = c.findIndex((x) => x[0] === pid);
      const currentQty = idx > -1 ? c[idx][1] : 0;
      if (currentQty >= p.stock) {
        beep(false);
        return c;
      }
      if (idx > -1) {
        const next = [...c];
        next[idx] = [pid, next[idx][1] + 1];
        return next;
      }
      return [...c, [pid, 1]];
    });
  };

  const setQty = (k, d) => {
    setCart((c) => {
      const next = [...c];
      next[k] = [next[k][0], next[k][1] + d];
      if (next[k][1] < 1) next.splice(k, 1);
      return next;
    });
  };

  const handleCode = (raw) => {
    const code = (raw || "").trim().toLowerCase();
    if (!code) return { ok: false, msg: "Type a barcode or SKU." };

    const prods = productsRef.current;
    const c = cartRef.current;

    const p = prods.find(
      (x) =>
        (x.barcode && x.barcode === raw.trim()) ||
        (x.sku && x.sku.toLowerCase() === code)
    );

    if (!p) {
      beep(false);
      return {
        ok: false,
        msg: `Barcode <b>${raw}</b> isn't in your catalogue.`,
      };
    }

    const inCart = (c.find((x) => x[0] === p.id) || [0, 0])[1];
    if (!p.stock || inCart >= p.stock) {
      beep(false);
      return { ok: false, msg: `${p.name}: no more stock available.` };
    }

    addToCart(p.id);
    beep(true);

    // Compute the new cart total for the feedback message
    let total = 0;
    let count = 0;
    const nextCart = c.map(([pid, n]) => {
      if (pid === p.id) return [pid, n + 1];
      return [pid, n];
    });
    if (!c.find((x) => x[0] === p.id)) nextCart.push([p.id, 1]);
    nextCart.forEach(([pid, n]) => {
      const prod = prods.find((x) => x.id === pid);
      if (prod) {
        total += prod.price * n;
        count += n;
      }
    });

    return {
      ok: true,
      msg: `✓ <b>${p.name}</b> added · ${fm(p.price)}<br><small>Cart: ${count} items · ${fm(total)}</small>`,
    };
  };

  const handleCheckoutComplete = async (receipt) => {
    setSavingSale(true);

    const items = cart
      .map(([pid, n]) => {
        const p = products.find((x) => x.id === pid);
        if (!p) return null;
        return {
          product_id: p.id,
          name: p.name,
          sku: p.sku,
          quantity: n,
          unit_price: p.price,
          line_total: p.price * n,
          new_stock: Math.max(0, p.stock - n),
        };
      })
      .filter(Boolean);

    try {
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          receipt_no: receipt.no,
          staff_id: staff?.id ?? null,
          subtotal: receipt.sub,
          discount: receipt.disc,
          tax: receipt.tax,
          total: receipt.total,
          payment_method: receipt.payment_method,
          payment_ref: receipt.payment_ref,
          status: "paid",
        })
        .select("id")
        .single();

      if (saleErr) throw saleErr;

      const { error: itemsErr } = await supabase.from("sale_items").insert(
        items.map((it) => ({
          sale_id: sale.id,
          product_id: it.product_id,
          name: it.name,
          sku: it.sku,
          quantity: it.quantity,
          unit_price: it.unit_price,
          line_total: it.line_total,
        }))
      );

      if (itemsErr) throw itemsErr;

      await Promise.all(
        items.map((it) =>
          supabase
            .from("products")
            .update({ stock: it.new_stock })
            .eq("id", it.product_id)
        )
      );

      setProducts((list) =>
        list.map((p) => {
          const line = items.find((it) => it.product_id === p.id);
          return line ? { ...p, stock: line.new_stock } : p;
        })
      );

      if (ownerId) {
        const soldIds = items.map((it) => it.product_id);

        const { data: refreshed } = await supabase
          .from("products")
          .select("id, name, stock, low_stock_threshold")
          .in("id", soldIds);

        if (refreshed?.length) {
          const alerts = refreshed
            .filter((p) => p.stock <= p.low_stock_threshold)
            .map((p) => ({
              type: p.stock === 0 ? "out_of_stock" : "low_stock",
              title:
                p.stock === 0
                  ? `${p.name} is out of stock`
                  : `${p.name} is running low`,
              body:
                p.stock === 0
                  ? `Sold out. Restock ${p.name} soon.`
                  : `Only ${p.stock} left (min ${p.low_stock_threshold}).`,
              product_id: p.id,
            }));

          if (alerts.length) {
            await supabase.from("notifications").insert(alerts);
          }
        }
      }

      setLastReceipt(receipt);
      setCart([]);
    } catch (err) {
      console.error("Sale save failed:", err);
      alert(`Sale couldn't be saved: ${err.message}`);
    } finally {
      setSavingSale(false);
    }
  };

  /* ----------------------------------------------------------
     Global USB/Bluetooth scanner detection.
     Only active once the user has chosen "USB scanner" mode
     OR when the source picker is open (so we can show the dot).
     ---------------------------------------------------------- */
  const scannerEnabled = usbScanReady || scanSourceOpen;

  const handleUsbScan = (code) => {
    // If the source picker is open, just note the connection.
    // If USB mode is armed, push the scan into the cart.
    if (usbScanReady) {
      handleCode(code);
    }
  };

  const { connected: usbConnected, testConnection: testUsbConnection } =
    useScannerDetection({
      enabled: scannerEnabled,
      onScan: handleUsbScan,
    });

  if (loading || !staffLoaded) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lk border-t-emb" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-[100dvh] items-center justify-center px-4">
        <div className="rounded-xl border border-black bg-black p-4 text-[13px] font-semibold text-emb">
          {loadError}
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex h-[100dvh] items-center justify-center px-4 text-center">
        <div className="max-w-[400px]">
          <h2 className="text-[22px] font-extrabold tracking-[-0.02em]">
            No one is on shift
          </h2>
          <p className="mt-2 text-[13px] text-gray-dim">
            Start a shift from the sidebar to open the till.
          </p>
        </div>
      </div>
    );
  }

  const visibleCats = ["All", ...categories.map((c) => c.name)];

  return (
    <div className="flex h-[100dvh] w-full min-w-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-7 md:px-8">
      <style jsx global>{`
        @media print {
          /* Thermal roll width — 80mm is standard POS paper.
             58mm for smaller units. */
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            background: #fff !important;
          }

          /* Hide everything by default */
          body * {
            visibility: hidden !important;
          }

          /* Only the receipt is visible */
          #rcpt,
          #rcpt * {
            visibility: visible !important;
          }

          #rcpt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 4mm 3mm !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
            font-size: 11px !important;
            line-height: 1.35 !important;
            color: #000 !important;
          }

          /* Don't split the receipt across pages */
          #rcpt, #rcpt * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Hide modal chrome and backdrop while printing */
          .print-hide {
            display: none !important;
          }
        }
      `}</style>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        <div className="flex min-h-0 flex-col">
          <div className="flex flex-none items-center gap-2 rounded-lg border border-lk px-3.5 py-2.5 text-gray focus-within:border-em focus-within:ring-[3px] focus-within:ring-emb/25">
            <button
              type="button"
              onClick={() => setScanSourceOpen(true)}
              className="-my-1 -ml-2 grid h-9 w-9 flex-none place-items-center rounded-lg border border-black bg-black text-emb transition-colors hover:border-emb"
              title="Scan with camera or USB scanner"
            >
              <ScanLine size={20} strokeWidth={1.8} />
            </button>
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                // If USB scanner mode is armed, we let the global hook
                // handle the scan and just clear the visible query.
                if (e.key === "Enter") {
                  if (usbScanReady) {
                    setQ("");
                    return;
                  }
                  const res = handleCode(e.target.value);
                  if (res.ok) setQ("");
                }
              }}
              placeholder={
                usbScanReady
                  ? "USB scanner ready — pull the trigger…"
                  : "Search products or scan barcode..."
              }
              className="w-full border-0 bg-transparent text-[14px] outline-none"
            />
            {usbScanReady && (
              <span
                className={`ml-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  usbConnected
                    ? "bg-emd text-emb"
                    : "bg-black text-gray"
                }`}
                title={
                  usbConnected
                    ? "USB scanner detected"
                    : "Waiting for scanner"
                }
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    usbConnected ? "bg-emd" : "bg-gray"
                  }`}
                />
                {usbConnected ? "Scanner connected" : "Scanner ready"}
              </span>
            )}
          </div>

          {usbScanReady && (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-black bg-black px-3 py-2 text-[12px] font-semibold text-emb">
              <span>
                USB / Bluetooth scanner armed — pull the trigger to scan.
              </span>
              <button
                onClick={() => setUsbScanReady(false)}
                className="ml-3 rounded-md border border-emb/40 px-2 py-0.5 text-[11px]"
              >
                Turn off
              </button>
            </div>
          )}

          <div className="mt-3 flex flex-none flex-wrap gap-2">
            {visibleCats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  c === cat
                    ? "border-black bg-black text-emb"
                    : "border-lk bg-transparent text-gray-dim hover:text-bg"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-auto">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(176px,1fr))] gap-3.5">
              {filtered.length === 0 ? (
                <p className="col-span-full py-8 text-center text-gray-dim">
                  No products match. Try another search or category.
                </p>
              ) : (
                filtered.map((p) => {
                  const qty = (cart.find((x) => x[0] === p.id) || [0, 0])[1];
                  return (
                    <ProductCard
                      key={p.id}
                      p={p}
                      qty={qty}
                      onAdd={addToCart}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-0 flex-col rounded-xl bg-black p-5 text-white">
          <h2 className="mb-3 flex-none text-[16px] font-bold">
            Current Sale
          </h2>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-gray">
                Cart is empty. Tap a product or scan a barcode.
              </p>
            ) : (
              cart.map(([pid, n], k) => {
                const p = products.find((x) => x.id === pid);
                if (!p) return null;
                return (
                  <div
                    key={k}
                    className="flex items-center gap-2.5 border-t border-white/10 py-2.5"
                  >
                    <div className="flex-1 leading-[1.3]">
                      {p.name}
                      <br />
                      <small className="text-gray">{fm(p.price)} each</small>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setQty(k, -1)}
                        className="grid h-[26px] w-[26px] place-items-center rounded-md border border-white/15 bg-white/5 text-white hover:border-emb"
                        aria-label="Less"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-[14px] font-semibold">
                        {n}
                      </span>
                      <button
                        onClick={() => setQty(k, 1)}
                        className="grid h-[26px] w-[26px] place-items-center rounded-md border border-white/15 bg-white/5 text-white hover:border-emb"
                        aria-label="More"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <b className="min-w-[64px] text-right text-[14px]">
                      {fm(p.price * n)}
                    </b>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex-none pt-3">
            <div className="flex justify-between py-0.5 text-[13px] text-gray">
              <span>Subtotal</span>
              <span>{fm(cartTotal)}</span>
            </div>
            <div className="flex justify-between py-0.5 text-[13px] text-gray">
              <span>Discount</span>
              <span>GHS 0.00</span>
            </div>
            <div className="flex justify-between py-0.5 text-[13px] text-gray">
              <span>Tax</span>
              <span>GHS 0.00</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-3">
              <span className="text-[14px] font-semibold">TOTAL</span>
              <b className="text-[30px] font-extrabold tracking-[-0.02em] text-emb">
                {fm(cartTotal)}
              </b>
            </div>
            <button
              onClick={() => {
                if (cart.length === 0) return alert("Add a product first");
                setCheckoutOpen(true);
              }}
              className="mt-3 w-full rounded-lg border border-emb bg-emb py-3.5 text-[14px] font-extrabold tracking-[0.04em] text-bg transition-colors hover:bg-em"
            >
              CHECKOUT
            </button>
            <button
              className="mt-2 w-full rounded-lg border border-white/15 bg-transparent py-2.5 text-[14px] font-semibold text-white"
              onClick={() => alert("Sale held")}
            >
              Hold Sale
            </button>
          </div>
        </div>
      </div>

      {scanSourceOpen && (
        <ScanSourceModal
          onClose={() => setScanSourceOpen(false)}
          onPickCamera={() => {
            setScanSourceOpen(false);
            setUsbScanReady(false);
            setScanOpen(true);
          }}
          onPickUsb={() => {
            setScanSourceOpen(false);
            setUsbScanReady(true);
            requestAnimationFrame(() => searchRef.current?.focus());
          }}
          usbConnected={usbConnected}
          onTestUsb={testUsbConnection}
        />
      )}

      {scanOpen && (
        <ScanModal onClose={() => setScanOpen(false)} onDetect={handleCode} />
      )}

      {checkoutOpen && (
        <CheckoutModal
          lines={cart
            .map(([pid, n]) => {
              const p = products.find((x) => x.id === pid);
              return p ? [p.name, n, p.price] : null;
            })
            .filter(Boolean)}
          total={cartTotal}
          cashier={staff?.name || "Owner"}
          biz={biz}
          logo={logo}
          saving={savingSale}
          paymentMethods={paymentMethods}
          paystackPublicKey={paystackPublicKey}
          customerEmail={customerEmail}
          onClose={() => {
            setCheckoutOpen(false);
            if (lastReceipt) setLastReceipt(null);
          }}
          onComplete={handleCheckoutComplete}
        />
      )}
    </div>
  );
}