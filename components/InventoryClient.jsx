"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  AlertTriangle,
  PackageX,
  Boxes,
  Plus,
  Minus,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  History,
  X,
  ClipboardList,
  Download,
  Printer,
  ZoomIn,
  Loader2,
} from "lucide-react";
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

const stk = (stock, low) =>
  stock === 0 ? "Out of Stock" : stock <= low ? "Low Stock" : "OK";

const pillClass = (s) =>
  ({
    OK: "bg-emd text-emb",
    "Low Stock": "bg-gray/20 text-gray-dim",
    "Out of Stock": "bg-bg text-gray",
  }[s] || "bg-gray/20 text-gray-dim");

function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${pillClass(
        status
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

const inputCls =
  "block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] font-medium text-black transition-colors focus:border-em focus:outline-none focus:ring-[3px] focus:ring-emb/25 placeholder:text-gray-dim disabled:opacity-60 disabled:cursor-not-allowed";

const LABEL_PRESETS = [
  { key: "50x25", label: "50 × 25 mm", width: 50, height: 25 },
  { key: "58x40", label: "58 × 40 mm", width: 58, height: 40 },
  { key: "40x30", label: "40 × 30 mm", width: 40, height: 30 },
  { key: "custom", label: "Custom…", width: 0, height: 0 },
];

/* ============================================================
   EAN-13
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

function eanOk(v) {
  return /^\d{13}$/.test(v) && ean(v.slice(0, 12)) === v;
}

function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build a self-contained EAN-13 label SVG.
 * Codes sit tight together — no extra horizontal padding around them.
 */
/**
 * Build a standard EAN-13 label SVG.
 */
function buildLabelSvg(code, name, widthMm, heightMm) {
  const safeCode = ean(code);
  if (!eanOk(safeCode)) return "";

  const W = 400;
  const H = Math.max(60, Math.round((W * heightMm) / widthMm));

  // Vertical budget allocation
  const topPad = Math.round(H * 0.06);
  const botPad = Math.round(H * 0.06);
  const gap1 = Math.round(H * 0.04);
  const usableH = H - topPad - botPad - gap1;

  const nameRow = Math.round(usableH * 0.22);
  const barcodeRow = usableH - nameRow;

  const nameTop = topPad;
  const barsTop = nameTop + nameRow + gap1;

  const nameFont = Math.max(8, Math.round(nameRow * 0.65));
  const nameBaseline = nameTop + nameRow * 0.7;

  // EAN-13 structure: 95 modules total (3 guard, 42 left, 5 center, 42 right, 3 guard)
  const padX = Math.round(W * 0.08); // Margins on left and right
  const p = PAR[safeCode[0]];
  let bits = "101";
  for (let i = 0; i < 6; i++) bits += (p[i] === "L" ? L7 : G7)[safeCode[i + 1]];
  bits += "01010";
  for (let i = 7; i < 13; i++) bits += R7[safeCode[i]];
  bits += "101";

  const totalModules = bits.length; // 95 modules
  const moduleW = (W - padX * 2) / totalModules;

  // Bar height settings
  const guardExtra = Math.round(barcodeRow * 0.14);
  const dataBarH = Math.round(barcodeRow * 0.72);
  const guardBarH = dataBarH + guardExtra;

  let bars = "";
  [...bits].forEach((x, i) => {
    if (x === "1") {
      const isGuard = i < 3 || i > bits.length - 4 || (i >= 45 && i < 50);
      const bh = isGuard ? guardBarH : dataBarH;
      const bx = padX + i * moduleW;
      bars += `<rect x="${bx.toFixed(2)}" y="${barsTop}" width="${moduleW.toFixed(2)}" height="${bh}"/>`;
    }
  });

  // Digits positioning
  const leftDigit = safeCode[0];
  const midDigits = safeCode.slice(1, 7);
  const rightDigits = safeCode.slice(7);

  const codeFont = Math.max(8, Math.round(barcodeRow * 0.22));
  const codeBaseline = barsTop + dataBarH + (barcodeRow - dataBarH) * 0.75;

  // Center coordinates for digit groups
  const firstDigitX = padX - moduleW * 4;
  const midGroupX = padX + 24 * moduleW; // Center of left 6 modules (3 + 21)
  const rightGroupX = padX + 71 * moduleW; // Center of right 6 modules (47.5 + 21)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <rect width="${W}" height="${H}" fill="#ffffff"/>
    <text x="${(W / 2).toFixed(2)}" y="${nameBaseline.toFixed(2)}" text-anchor="middle"
      font-family="Manrope, Arial, Helvetica, sans-serif"
      font-size="${nameFont}" font-weight="700" fill="#000000">
      ${escapeXml(name).slice(0, 40)}
    </text>
    <g fill="#000000">${bars}</g>
    <g font-family="ui-monospace, Menlo, Consolas, monospace"
       font-size="${codeFont}" font-weight="600" fill="#000000">
      <!-- First lead digit -->
      <text x="${firstDigitX.toFixed(2)}" y="${codeBaseline.toFixed(2)}" text-anchor="middle">${leftDigit}</text>
      <!-- Left 6 digits under left block -->
      <text x="${midGroupX.toFixed(2)}" y="${codeBaseline.toFixed(2)}" text-anchor="middle" letter-spacing="${(moduleW * 0.9).toFixed(2)}">${midDigits}</text>
      <!-- Right 6 digits under right block -->
      <text x="${rightGroupX.toFixed(2)}" y="${codeBaseline.toFixed(2)}" text-anchor="middle" letter-spacing="${(moduleW * 0.9).toFixed(2)}">${rightDigits}</text>
    </g>
  </svg>`;
}

/* ============================================================
   BarcodeModal
   ============================================================ */
function BarcodeModal({ product, onClose }) {
  const [preset, setPreset] = useState("50x25");
  const [customW, setCustomW] = useState("60");
  const [customH, setCustomH] = useState("30");
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState("");

  const selected = LABEL_PRESETS.find((p) => p.key === preset);
  const widthMm = preset === "custom" ? Number(customW) || 0 : selected.width;
  const heightMm = preset === "custom" ? Number(customH) || 0 : selected.height;
  const validSize = widthMm >= 20 && heightMm >= 15;
  const validCode = eanOk(ean(product.barcode));

  const labelSvg = useMemo(
    () =>
      validCode
        ? buildLabelSvg(product.barcode, product.name, widthMm, heightMm)
        : "",
    [product.barcode, product.name, widthMm, heightMm, validCode]
  );

  const filename = `${(product.sku || product.name || "barcode")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}.svg`;

  const handleDownload = () => {
    if (!labelSvg) return;
    const blob = new Blob([labelSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!labelSvg || !validSize) return;
    setPrintError("");
    setPrinting(true);

    const rootId = "barcode-print-root";
    const styleId = "barcode-print-style";

    document.getElementById(rootId)?.remove();
    document.getElementById(styleId)?.remove();

    const container = document.createElement("div");
    container.id = rootId;
    container.style.cssText =
      "position:fixed;inset:0;background:#fff;z-index:2147483647;display:none;padding:0;margin:0;";

    const inner = document.createElement("div");
    inner.style.cssText = `
      width:${widthMm}mm;
      height:${heightMm}mm;
      box-sizing:border-box;
      overflow:hidden;
      background:#fff;
    `;
    inner.innerHTML = labelSvg;

    container.appendChild(inner);
    document.documentElement.appendChild(container);

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        @page {
          size: ${widthMm}mm ${heightMm}mm;
          margin: 0;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: ${widthMm}mm !important;
          height: ${heightMm}mm !important;
          background: #fff !important;
          overflow: hidden !important;
        }
        body * {
          visibility: hidden !important;
          display: none !important;
        }
        #${rootId},
        #${rootId} * {
          visibility: visible !important;
          display: revert !important;
        }
        #${rootId} {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: ${widthMm}mm !important;
          height: ${heightMm}mm !important;
          overflow: hidden !important;
          background: #fff !important;
        }
        #${rootId} > div {
          width: ${widthMm}mm !important;
          height: ${heightMm}mm !important;
        }
        #${rootId} svg {
          display: block !important;
          width: ${widthMm}mm !important;
          height: ${heightMm}mm !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      }
    `;
    document.head.appendChild(style);

    try {
      window.print();
    } catch {
      setPrintError(
        "Print dialog failed to open. Try downloading the SVG and printing it from a design app."
      );
    } finally {
      setTimeout(() => {
        document.getElementById(rootId)?.remove();
        document.getElementById(styleId)?.remove();
        setPrinting(false);
      }, 500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white">
        <div className="flex items-start justify-between gap-3 border-b border-lk p-5">
          <div className="min-w-0">
            <h2 className="m-0 truncate text-[18px] font-bold text-black">
              {product.name}
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-dim">
              SKU {product.sku || "—"}
              {product.barcode ? (
                <>
                  {" · "}
                  <span className="font-mono">{product.barcode}</span>
                </>
              ) : null}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 flex-none place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:text-black"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <div className="grid place-items-center bg-black/[0.02] p-8">
          {labelSvg ? (
            <div
              className="w-full max-w-[420px] overflow-hidden rounded-xl border border-lk bg-white p-3"
              style={{ aspectRatio: `${widthMm} / ${heightMm}` }}
              dangerouslySetInnerHTML={{ __html: labelSvg }}
            />
          ) : (
            <div className="py-16 text-center">
              <p className="text-[13px] text-gray-dim">
                This product has no valid EAN-13 barcode to print.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-lk px-5 py-4">
          <label className="block text-[12px] font-semibold text-gray-dim">
            Label size
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] font-medium text-black focus:border-em focus:outline-none"
            >
              {LABEL_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          {preset === "custom" && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block text-[12px] font-semibold text-gray-dim">
                Width (mm)
                <input
                  type="number"
                  min="20"
                  value={customW}
                  onChange={(e) => setCustomW(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] text-black focus:border-em focus:outline-none"
                />
              </label>
              <label className="block text-[12px] font-semibold text-gray-dim">
                Height (mm)
                <input
                  type="number"
                  min="15"
                  value={customH}
                  onChange={(e) => setCustomH(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] text-black focus:border-em focus:outline-none"
                />
              </label>
            </div>
          )}

          <p className="mt-2 text-[11px] text-gray-dim">
            One label prints with the product name, barcode bars, and code
            number, all fit inside the dimensions you choose.
          </p>

          {printError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
              {printError}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-lk p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-lk bg-transparent py-2.5 text-[14px] font-semibold text-black transition-colors hover:border-em"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            disabled={!labelSvg || printing || !validSize}
            className="flex items-center justify-center gap-2 rounded-lg border border-black bg-black py-2.5 text-[14px] font-semibold text-white transition-colors hover:border-emb hover:text-emb disabled:opacity-50"
          >
            {printing ? (
              <Loader2 size={15} strokeWidth={2.2} className="animate-spin" />
            ) : (
              <Printer size={15} strokeWidth={2} />
            )}
            {printing ? "Printing…" : "Print barcode"}
          </button>
        </div>

        <div className="border-t border-lk px-4 pb-4 pt-0">
          <button
            onClick={handleDownload}
            disabled={!labelSvg}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-lk bg-transparent py-2.5 text-[13px] font-semibold text-gray-dim transition-colors hover:border-em hover:text-black disabled:opacity-50"
          >
            <Download size={14} strokeWidth={2} />
            Download SVG instead
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ImagePreview
   ============================================================ */
function ImagePreview({ product, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${product.name}`}
    >
      <div className="flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-lk px-4 py-3">
          <div className="min-w-0">
            <b className="block truncate text-[14px] font-bold text-black">
              {product.name}
            </b>
            {product.sku && (
              <small className="block truncate text-[12px] text-gray-dim">
                SKU {product.sku}
              </small>
            )}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 flex-none place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:border-em hover:text-black"
            aria-label="Close preview"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <div className="grid place-items-center bg-[#fafbf9] p-6">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="max-h-[60vh] w-auto max-w-full rounded-lg object-contain shadow-sm"
            />
          ) : (
            <div className="grid h-[240px] w-[240px] place-items-center rounded-xl bg-black text-[36px] font-extrabold text-emb">
              {ini(product.name)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-lk px-4 py-3 text-[12px]">
          <span className="font-mono text-gray-dim">
            {product.barcode || "—"}
          </span>
          <span className="rounded-md bg-black/[0.04] px-2 py-0.5 text-[12px] font-semibold text-black">
            {product.category}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ProductThumb
   ============================================================ */
function ProductThumb({ product }) {
  const [previewing, setPreviewing] = useState(false);
  const hasImage = !!product.imageUrl;

  const onClick = (e) => {
    e.stopPropagation();
    if (!hasImage) return;
    setPreviewing(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={hasImage ? `Preview ${product.name}` : product.name}
        className={`group/thumb relative grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-lg bg-black text-[12px] font-extrabold text-emb ${
          hasImage ? "cursor-zoom-in" : "cursor-default"
        }`}
      >
        {ini(product.name)}

        {hasImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="absolute inset-0 h-full w-full bg-white object-contain p-0.5 transition-transform duration-200 group-hover/thumb:scale-105"
          />
        )}

        {hasImage && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition-all group-hover/thumb:bg-black/40 group-hover/thumb:opacity-100">
            <ZoomIn size={12} strokeWidth={2.2} />
          </span>
        )}
      </button>

      {previewing && (
        <ImagePreview product={product} onClose={() => setPreviewing(false)} />
      )}
    </>
  );
}

/* ============================================================
   AdjustModal
   ============================================================ */
function AdjustModal({ product, onClose, onSave }) {
  const [mode, setMode] = useState(product.mode || "in");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const qtyNum = Number(qty);
  const qtyValid = Number.isFinite(qtyNum) && qtyNum >= 0;

  const projected =
    mode === "in"
      ? product.stock + (qtyValid ? qtyNum : 0)
      : mode === "out"
      ? Math.max(0, product.stock - (qtyValid ? qtyNum : 0))
      : qtyValid
      ? qtyNum
      : product.stock;

  const canSave = qty !== "" && qtyValid && reason.trim() && !saving;

  const submit = async () => {
    if (!canSave) return;
    setError("");
    setSaving(true);

    const res = await onSave({
      mode,
      qty: qtyNum,
      reason: reason.trim(),
      projected,
    });

    if (res && !res.ok) {
      setError(res.error || "Could not update stock. Try again.");
      setSaving(false);
    }
  };

  const modes = [
    { key: "in", label: "Add", icon: ArrowUp },
    { key: "out", label: "Remove", icon: ArrowDown },
    { key: "set", label: "Set", icon: RotateCcw },
  ];

  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="w-full max-w-[480px] rounded-2xl bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="m-0 text-[18px] font-bold text-black">
              Adjust stock
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-dim">
              {product.name} · SKU {product.sku}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:text-black disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between rounded-xl border border-lk p-4">
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim">
              Current stock
            </span>
            <b className="mt-0.5 block text-[24px] font-extrabold tracking-[-0.02em] text-black">
              {product.stock}
            </b>
          </div>
          <div className="text-right">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim">
              After adjustment
            </span>
            <b className="mt-0.5 block text-[24px] font-extrabold tracking-[-0.02em] text-emb">
              {projected}
            </b>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          {modes.map((m) => {
            const Icon = m.icon;
            const active = mode === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                disabled={saving}
                className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-[13px] font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  active
                    ? "border-black bg-black text-emb"
                    : "border-lk bg-transparent text-gray-dim hover:text-black"
                }`}
              >
                <Icon size={14} strokeWidth={2} />
                {m.label}
              </button>
            );
          })}
        </div>

        <label className="block text-[12px] font-semibold text-gray-dim">
          Quantity
          <input
            type="number"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0"
            className={`mt-1 ${inputCls}`}
            autoFocus
            disabled={saving}
          />
        </label>

        <label className="mt-3 block text-[12px] font-semibold text-gray-dim">
          Reason
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. New delivery, damaged, stock count"
            className={`mt-1 ${inputCls}`}
            disabled={saving}
          />
        </label>

        {error && (
          <div className="mt-3 rounded-lg border border-black bg-black px-3 py-2 text-[12px] font-semibold text-emb">
            {error}
          </div>
        )}

        <div className="mt-5 grid grid-cols-[1fr_2fr] gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-lk bg-transparent py-3 text-[14px] font-semibold text-black transition-colors hover:border-em disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSave}
            className={`flex items-center justify-center gap-2 rounded-lg py-3 text-[14px] font-extrabold transition-colors ${
              canSave
                ? "border border-black bg-black text-white hover:border-emb hover:text-emb"
                : "cursor-not-allowed border border-lk bg-lk text-gray-dim opacity-60"
            }`}
          >
            {saving && (
              <Loader2 size={15} strokeWidth={2.2} className="animate-spin" />
            )}
            {saving ? "Updating stock…" : "Update stock"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */
export default function InventoryPage() {
  const supabase = createClient();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [barcodeTarget, setBarcodeTarget] = useState(null);

  async function loadAll() {
    setLoading(true);
    setLoadError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadError("You're not signed in.");
      setLoading(false);
      return;
    }

    const { data: catsData } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
    setCategories(catsData || []);

    const { data: prods, error } = await supabase
      .from("products")
      .select(
        "id, name, sku, barcode, barcode_image_url, category_id, cost_price, selling_price, stock, low_stock_threshold, image_url, updated_at"
      )
      .order("name");

    if (error) {
      setLoadError(error.message);
      setLoading(false);
      return;
    }

    const catMap = new Map((catsData || []).map((c) => [c.id, c.name]));

    setItems(
      (prods || []).map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku || "",
        barcode: p.barcode || "",
        barcodeImageUrl: p.barcode_image_url || "",
        category: catMap.get(p.category_id) || "Other",
        categoryId: p.category_id,
        stock: p.stock,
        low: p.low_stock_threshold,
        cost: Number(p.cost_price) || 0,
        price: Number(p.selling_price) || 0,
        imageUrl: p.image_url || "",
        updatedAt: p.updated_at,
      }))
    );

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((p) => {
        if (catFilter !== "All" && p.category !== catFilter) return false;
        const status = stk(p.stock, p.low);
        if (statusFilter === "Low" && status !== "Low Stock") return false;
        if (statusFilter === "Out" && status !== "Out of Stock") return false;
        if (statusFilter === "In" && status !== "OK") return false;
        if (q) {
          const t = q.toLowerCase();
          if (
            !p.name.toLowerCase().includes(t) &&
            !p.sku.toLowerCase().includes(t) &&
            !(p.barcode || "").includes(q)
          )
            return false;
        }
        return true;
      }),
    [items, q, catFilter, statusFilter]
  );

  const totals = useMemo(() => {
    const units = items.reduce((a, p) => a + p.stock, 0);
    const low = items.filter((p) => stk(p.stock, p.low) === "Low Stock").length;
    const out = items.filter((p) => p.stock === 0).length;
    const value = items.reduce((a, p) => a + p.cost * p.stock, 0);
    return { units, low, out, value };
  }, [items]);

  const applyAdjust = async ({ mode, qty, reason, projected }) => {
    if (!adjustTarget) return { ok: false, error: "No product selected." };

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("products")
      .update({ stock: projected, updated_at: nowIso })
      .eq("id", adjustTarget.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    setItems((list) =>
      list.map((p) =>
        p.id === adjustTarget.id
          ? { ...p, stock: projected, updatedAt: nowIso }
          : p
      )
    );

    setMoves((list) => [
      {
        id: `${Date.now()}`,
        sku: adjustTarget.sku,
        name: adjustTarget.name,
        type: mode,
        qty,
        reason,
        time: "Just now",
        by: "You",
      },
      ...list,
    ]);

    setAdjustTarget(null);
    return { ok: true };
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lk border-t-emb" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 px-4 pb-12 pt-7 md:px-8">
        <div className="rounded-xl border border-black bg-black p-4 text-[13px] font-semibold text-emb">
          {loadError}
        </div>
      </div>
    );
  }

  const catNames = ["All", ...categories.map((c) => c.name)];

  return (
    <div className="flex-1 overflow-auto px-4 pb-12 pt-7 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="m-0 text-[24px] font-extrabold tracking-[-0.02em]">
            Inventory
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-dim">
            Track stock across your catalogue and record every movement.
          </p>
        </div>
        <button
          onClick={() => setHistoryOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-lk bg-transparent px-3.5 py-2 text-[14px] font-semibold text-black transition-colors hover:border-em"
        >
          <History size={16} strokeWidth={1.8} />
          Stock history
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border border-black bg-black p-5 text-white">
          <span className="text-[12px] font-semibold text-gray">
            STOCK VALUE
          </span>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em]">
            {fm(totals.value)}
          </b>
          <em className="text-[12px] font-semibold not-italic text-emb">
            {totals.units} units on hand
          </em>
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emb/20 blur-2xl" />
        </div>

        <div className="rounded-xl border border-lk p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-gray-dim">
              LOW STOCK
            </span>
            <AlertTriangle
              size={16}
              strokeWidth={1.8}
              className="text-gray-dim"
            />
          </div>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em] text-black">
            {totals.low}
          </b>
          <em className="text-[12px] font-semibold not-italic text-gray-dim">
            Reorder soon
          </em>
        </div>

        <div className="rounded-xl border border-lk p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-gray-dim">
              OUT OF STOCK
            </span>
            <PackageX size={16} strokeWidth={1.8} className="text-gray-dim" />
          </div>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em] text-black">
            {totals.out}
          </b>
          <em className="text-[12px] font-semibold not-italic text-gray-dim">
            Unavailable
          </em>
        </div>

        <div className="rounded-xl border border-lk p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-gray-dim">
              ITEMS TRACKED
            </span>
            <Boxes size={16} strokeWidth={1.8} className="text-gray-dim" />
          </div>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em] text-black">
            {items.length}
          </b>
          <em className="text-[12px] font-semibold not-italic text-em">
            Across {categories.length} categories
          </em>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-lk">
        <div className="flex flex-wrap items-center gap-3 border-b border-lk p-4">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-lk px-3 py-2 text-gray transition-colors focus-within:border-em focus-within:ring-[3px] focus-within:ring-emb/25">
            <Search size={16} strokeWidth={1.8} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, SKU or barcode..."
              className="w-full border-0 bg-transparent text-[14px] text-black outline-none placeholder:text-gray-dim"
            />
          </div>

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="rounded-lg border border-lk bg-transparent px-3 py-2 text-[13px] font-semibold text-black transition-colors focus:border-em focus:outline-none"
          >
            {catNames.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All categories" : c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-lk bg-transparent px-3 py-2 text-[13px] font-semibold text-black transition-colors focus:border-em focus:outline-none"
          >
            <option value="All">All status</option>
            <option value="In">In stock</option>
            <option value="Low">Low stock</option>
            <option value="Out">Out of stock</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/[0.02]">
                {[
                  "Product",
                  "Barcode",
                  "Category",
                  "Stock level",
                  "On hand",
                  "Min",
                  "Cost",
                  "Stock value",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center text-gray-dim"
                  >
                    No inventory matches the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const status = stk(p.stock, p.low);
                  const pct = Math.min(
                    100,
                    (p.stock / Math.max(1, p.low * 3)) * 100
                  );
                  const barColor =
                    status === "Out of Stock"
                      ? "bg-gray-dim"
                      : status === "Low Stock"
                      ? "bg-gray"
                      : "bg-em";
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-lk transition-colors hover:bg-black/[0.03]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-[14px]">
                        <div className="flex items-center gap-3">
                          <ProductThumb product={p} />
                          <div>
                            <div className="font-semibold text-black">
                              {p.name}
                            </div>
                            <div className="text-[11px] text-gray-dim">
                              SKU {p.sku || "—"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[12px]">
                        {p.barcodeImageUrl ? (
                          <button
                            onClick={() => setBarcodeTarget(p)}
                            className="group flex flex-col items-start gap-1 rounded-md p-1 transition-colors hover:bg-black/[0.04]"
                            title="View barcode"
                            type="button"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.barcodeImageUrl}
                              alt={p.barcode || "Barcode"}
                              className="h-6 w-auto max-w-[120px] object-contain transition-transform group-hover:scale-105"
                            />
                            <span className="font-mono text-[11px] text-gray-dim group-hover:text-black">
                              {p.barcode || "—"}
                            </span>
                          </button>
                        ) : (
                          <span className="font-mono text-[11px] text-gray-dim">
                            {p.barcode || "—"}
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[13px]">
                        <span className="rounded-md bg-black/[0.04] px-2 py-0.5 text-[12px] font-semibold text-black">
                          {p.category}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[14px]">
                        <div className="flex items-center gap-2.5">
                          <div className="h-1.5 w-[88px] overflow-hidden rounded-full bg-lk">
                            <div
                              className={`h-full rounded-full ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[14px] font-semibold text-black">
                        {p.stock}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-gray-dim">
                        {p.low}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-gray-dim">
                        {fm(p.cost)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-[14px] font-semibold text-black">
                        {fm(p.cost * p.stock)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusPill status={status} />
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() =>
                              setAdjustTarget({ ...p, mode: "in" })
                            }
                            className="flex items-center gap-1.5 rounded-lg border border-lk bg-transparent px-2.5 py-1.5 text-[12px] font-semibold text-black transition-colors hover:border-em"
                          >
                            <Plus size={13} strokeWidth={2} />
                            Stock
                          </button>
                          <button
                            onClick={() =>
                              setAdjustTarget({ ...p, mode: "out" })
                            }
                            className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:border-em hover:text-black"
                            aria-label="Remove stock"
                          >
                            <Minus size={14} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {adjustTarget && (
        <AdjustModal
          key={`${adjustTarget.id}-${adjustTarget.mode}`}
          product={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSave={applyAdjust}
        />
      )}

      {barcodeTarget && (
        <BarcodeModal
          product={barcodeTarget}
          onClose={() => setBarcodeTarget(null)}
        />
      )}

      {historyOpen && (
        <div
          className="fixed inset-0 z-10 grid place-items-end bg-black/60 md:place-items-center"
          onClick={(e) => e.target === e.currentTarget && setHistoryOpen(false)}
        >
          <div className="max-h-[92vh] w-full max-w-[560px] overflow-auto rounded-t-2xl bg-white p-6 md:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="m-0 text-[18px] font-bold text-black">
                  Stock history
                </h2>
                <p className="mt-0.5 text-[13px] text-gray-dim">
                  Recent stock movements in this session.
                </p>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:text-black"
                aria-label="Close"
              >
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>

            {moves.length === 0 ? (
              <div className="rounded-xl border border-lk p-10 text-center">
                <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-black text-emb">
                  <ClipboardList size={20} strokeWidth={1.8} />
                </div>
                <b className="block text-[15px] text-black">
                  No movements yet
                </b>
                <p className="mt-1 text-[13px] text-gray-dim">
                  Adjustments will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {moves.map((m) => {
                  const isIn = m.type === "in";
                  const isSet = m.type === "set";
                  const Icon = isIn ? ArrowUp : isSet ? RotateCcw : ArrowDown;
                  const badge = isIn
                    ? "bg-black text-emb"
                    : isSet
                    ? "bg-gray/20 text-gray-dim"
                    : "bg-black text-gray";
                  const sign = isIn ? "+" : isSet ? "=" : "−";
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 rounded-xl border border-lk p-3"
                    >
                      <span
                        className={`grid h-10 w-10 flex-none place-items-center rounded-lg ${badge}`}
                      >
                        <Icon size={16} strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <b className="truncate text-[14px] text-black">
                            {m.name || m.sku}
                          </b>
                          <span className="flex-none text-[13px] font-extrabold tabular-nums text-black">
                            {sign}
                            {m.qty}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2 text-[12px] text-gray-dim">
                          <span className="truncate">
                            {m.reason} · {m.by}
                          </span>
                          <span className="flex-none">{m.time}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}