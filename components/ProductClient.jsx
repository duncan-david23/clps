"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Plus,
  X,
  Pencil,
  Trash2,
  Download,
  LayoutGrid,
  List,
  ArrowUpDown,
  Upload,
  ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  uploadSvgToCloudinary,
  uploadFileToCloudinary,
} from "@/lib/cloudinary";

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
   SKU generator
   ============================================================ */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function bizPrefix(bizName) {
  const s = (bizName || "CP")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase();
  return s.padEnd(3, "X") || "CPX";
}

function randSuffix(len = 6) {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

function makeSku(bizName) {
  return `${bizPrefix(bizName)}-${randSuffix(6)}`;
}

/* ============================================================
   Field
   ============================================================ */
function Field({ label, children }) {
  return (
    <label className="block text-[12px] font-semibold text-gray-dim">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  "block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] font-medium text-bg focus:border-em focus:outline-none focus:ring-[3px] focus:ring-emb/25 transition-colors";

/* ============================================================
   ImageUploader (Cloudinary)
   ============================================================ */
function ImageUploader({ value, onChange, folder = "product-images" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const pick = () => inputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) return setError("Pick an image file.");
    if (file.size > 5 * 1024 * 1024) return setError("Image must be under 5MB.");

    setError("");
    setUploading(true);

    try {
      const url = await uploadFileToCloudinary(file, folder);
      onChange(url);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const remove = () => {
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="relative grid h-[88px] w-[88px] flex-none place-items-center overflow-hidden rounded-xl border border-lk bg-[#fafbf9]">
          {value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt="Product"
                className="absolute inset-0 h-full w-full object-contain p-1.5"
              />
              <button
                type="button"
                onClick={remove}
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-bg text-white shadow"
                aria-label="Remove image"
              >
                <X size={11} strokeWidth={2.4} />
              </button>
            </>
          ) : (
            <ImageIcon size={22} strokeWidth={1.6} className="text-gray-dim" />
          )}
        </div>

        <div className="flex-1">
          <button
            type="button"
            onClick={pick}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg border border-lk bg-transparent px-3 py-2 text-[13px] font-semibold transition-colors hover:border-em disabled:opacity-60"
          >
            <Upload size={14} strokeWidth={1.8} />
            {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
          </button>
          <p className="mt-1.5 text-[11px] text-gray-dim">
            PNG or JPG, up to 5MB.
          </p>
          {error && (
            <p className="mt-1 text-[11px] font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}

/* ============================================================
   ProductModal
   ============================================================ */
function ProductModal({
  initial,
  categories,
  businessName,
  existingSkus,
  onClose,
  onSave,
}) {
  const editing = !!initial;

  const [form, setForm] = useState(
    initial || {
      name: "",
      sku: makeSku(businessName),
      barcode: "",
      barcode_image_url: "",
      category_id: "",
      cost: "",
      price: "",
      stock: "",
      low: "",
      image_url: "",
    }
  );

  const [skuError, setSkuError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [lastUploadedCode, setLastUploadedCode] = useState(
    initial?.barcode_image_url ? initial.barcode : ""
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const regenerateSku = () => {
    let candidate;
    let attempts = 0;
    do {
      candidate = makeSku(businessName);
      attempts++;
    } while (existingSkus.includes(candidate.toLowerCase()) && attempts < 20);
    set("sku", candidate);
    setSkuError("");
  };

  const onSkuChange = (v) => {
    const clean = v.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
    set("sku", clean);
    setSkuError(
      existingSkus.includes(clean.toLowerCase()) ? "That SKU is already used." : ""
    );
  };

  const code = ean(form.barcode);
  const validBarcode = eanOk(code);
  const previewSvg = validBarcode ? eanSvg(code) : null;

  const genBarcode = () => {
    const c = ean("603" + String(Math.random()).slice(2, 11));
    set("barcode", c);
  };

  const canSave =
    form.name.trim() &&
    form.sku.trim() &&
    !skuError &&
    form.category_id &&
    form.price !== "" &&
    form.cost !== "" &&
    form.stock !== "" &&
    form.low !== "" &&
    validBarcode;

  const submit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setSaveError("");

    try {
      let barcodeUrl = form.barcode_image_url;

      if (!barcodeUrl || lastUploadedCode !== code) {
        barcodeUrl = await uploadSvgToCloudinary(previewSvg, `barcode_${code}`);
        setLastUploadedCode(code);
      }

      await onSave({
        ...form,
        cost: Number(form.cost),
        price: Number(form.price),
        stock: Number(form.stock),
        low: Number(form.low),
        barcode: code,
        category_id: form.category_id,
        barcode_image_url: barcodeUrl,
      });
    } catch (e) {
      setSaveError(e.message || "Save failed.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-bg/60 p-4"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="max-h-[92vh] w-full max-w-[620px] overflow-auto rounded-2xl bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="m-0 text-[18px] font-bold">
              {editing ? "Edit product" : "Add product"}
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-dim">
              {editing
                ? "Update the details and save."
                : "Fill in the details to add a new item to your catalogue."}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:text-bg disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <Field label="Product image">
          <ImageUploader
            value={form.image_url}
            onChange={(url) => set("image_url", url)}
          />
        </Field>

        <div className="mt-4">
          <Field label="Product name">
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Coca-Cola 500ml"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="SKU">
            <div className="flex gap-2">
              <input
                value={form.sku}
                onChange={(e) => onSkuChange(e.target.value)}
                placeholder="ABC-X1Y2Z3"
                className={inputCls}
              />
              <button
                type="button"
                onClick={regenerateSku}
                className="flex-none rounded-lg border border-lk bg-transparent px-3 text-[12px] font-semibold transition-colors hover:border-em hover:text-bg"
                title="Generate a new SKU"
              >
                New
              </button>
            </div>
            {skuError && (
              <p className="mt-1 text-[11px] font-semibold text-red-600">
                {skuError}
              </p>
            )}
          </Field>

          <Field label="Barcode (EAN-13)">
            <div className="flex gap-2">
              <input
                value={form.barcode}
                onChange={(e) =>
                  set("barcode", e.target.value.replace(/\D/g, "").slice(0, 13))
                }
                inputMode="numeric"
                placeholder="12 or 13 digits"
                className={inputCls}
              />
              <button
                type="button"
                onClick={genBarcode}
                className="flex-none rounded-lg border border-lk bg-transparent px-3 text-[12px] font-semibold transition-colors hover:border-em hover:text-bg"
              >
                Gen
              </button>
            </div>
          </Field>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Category">
            <select
              value={form.category_id}
              onChange={(e) => set("category_id", e.target.value)}
              className={inputCls}
            >
              <option value="" disabled>
                Select category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cost price">
            <input
              type="number"
              min="0"
              value={form.cost}
              onChange={(e) => set("cost", e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <Field label="Selling price">
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </Field>
          <Field label="Stock">
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => set("stock", e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </Field>
          <Field label="Low threshold">
            <input
              type="number"
              min="0"
              value={form.low}
              onChange={(e) => set("low", e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-4 rounded-xl border border-lk bg-white p-4 text-center">
          {previewSvg ? (
            <>
              <div
                className="mx-auto w-[220px] max-w-full"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
              <p className="mt-2 text-[12px] text-gray-dim">
                Barcode ready · <span className="font-mono">{code}</span>
              </p>
            </>
          ) : form.barcode ? (
            <p className="py-4 text-[12px] text-gray-dim">
              Enter a valid 12 or 13-digit EAN-13 number, or press <b>Gen</b> to
              generate one.
            </p>
          ) : (
            <p className="py-4 text-[12px] text-gray-dim">
              Fill in a barcode to preview it here.
            </p>
          )}
        </div>

        {saveError && (
          <div className="mt-3 rounded-lg border border-bg bg-bg px-3 py-2 text-[12px] font-semibold text-emb">
            {saveError}
          </div>
        )}

        <div className="mt-5 grid grid-cols-[1fr_2fr] gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-lk bg-transparent py-3 text-[14px] font-semibold transition-colors hover:border-em disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSave || saving}
            className={`rounded-lg py-3 text-[14px] font-extrabold transition-colors ${
              canSave && !saving
                ? "border border-emb bg-emb text-bg hover:bg-em"
                : "cursor-not-allowed border border-lk bg-lk text-gray-dim opacity-60"
            }`}
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add product"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DeleteModal
   ============================================================ */
function DeleteModal({ product, onCancel, onConfirm, deleting }) {
  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-bg/60 p-4"
      onClick={(e) => e.target === e.currentTarget && !deleting && onCancel()}
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-bg text-[18px] text-emb">
            <Trash2 size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="m-0 text-[16px] font-bold">Delete product?</h2>
            <p className="mt-0.5 text-[13px] text-gray-dim">
              This action can&apos;t be undone.
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-lk p-3">
          <b className="block text-[14px]">{product.name}</b>
          <small className="text-gray-dim">
            SKU {product.sku} · {product.category}
          </small>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-lk bg-transparent py-2.5 text-[14px] font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg border border-bg bg-bg py-2.5 text-[14px] font-semibold text-white disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */
export default function ProductsPage() {
  const supabase = createClient();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [businessName, setBusinessName] = useState("ClaukkPOS");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [sort, setSort] = useState("name");
  const [view, setView] = useState("table");
  const [modal, setModal] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadAll() {
    setLoading(true);
    setLoadError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadError("You're not signed in.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name")
      .eq("id", user.id)
      .single();

    if (profile?.business_name) setBusinessName(profile.business_name);

    const { data: catsData, error: catsErr } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    if (catsErr) {
      setLoadError(catsErr.message);
      setLoading(false);
      return;
    }
    setCategories(catsData || []);

    const { data: prodsData, error: prodsErr } = await supabase
      .from("products")
      .select(
        "id, name, sku, barcode, barcode_image_url, category_id, cost_price, selling_price, stock, low_stock_threshold, image_url"
      )
      .order("name");

    if (prodsErr) {
      setLoadError(prodsErr.message);
      setLoading(false);
      return;
    }

    const catMap = new Map((catsData || []).map((c) => [c.id, c.name]));
    setProducts(
      (prodsData || []).map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        barcode_image_url: p.barcode_image_url,
        category_id: p.category_id,
        category: catMap.get(p.category_id) || "—",
        cost: p.cost_price,
        price: p.selling_price,
        stock: p.stock,
        low: p.low_stock_threshold,
        image_url: p.image_url,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const existingSkus = useMemo(
    () => products.map((p) => (p.sku || "").toLowerCase()).filter(Boolean),
    [products]
  );

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      if (catFilter !== "All" && p.category !== catFilter) return false;
      if (stockFilter === "Low" && stk(p.stock, p.low) !== "Low Stock")
        return false;
      if (stockFilter === "Out" && p.stock !== 0) return false;
      if (stockFilter === "In" && p.stock === 0) return false;
      if (q) {
        const t = q.toLowerCase();
        if (
          !p.name.toLowerCase().includes(t) &&
          !(p.sku || "").toLowerCase().includes(t) &&
          !(p.barcode || "").includes(q)
        )
          return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sort === "price") return b.price - a.price;
      if (sort === "stock") return a.stock - b.stock;
      return a.name.localeCompare(b.name);
    });
  }, [products, q, catFilter, stockFilter, sort]);

  const totals = useMemo(
    () => ({
      units: products.reduce((a, p) => a + p.stock, 0),
      low: products.filter((p) => stk(p.stock, p.low) === "Low Stock").length,
      out: products.filter((p) => p.stock === 0).length,
      value: products.reduce((a, p) => a + p.price * p.stock, 0),
    }),
    [products]
  );

  const handleSave = async (data) => {
    if (modal.mode === "add") {
      const { data: inserted, error } = await supabase
        .from("products")
        .insert({
          name: data.name,
          sku: data.sku,
          barcode: data.barcode,
          barcode_image_url: data.barcode_image_url,
          category_id: data.category_id,
          cost_price: data.cost,
          selling_price: data.price,
          stock: data.stock,
          low_stock_threshold: data.low,
          image_url: data.image_url || null,
        })
        .select(
          "id, name, sku, barcode, barcode_image_url, category_id, cost_price, selling_price, stock, low_stock_threshold, image_url"
        )
        .single();

      if (error) throw new Error(error.message);

      const catName =
        categories.find((c) => c.id === inserted.category_id)?.name || "—";

      setProducts((list) =>
        [
          ...list,
          {
            id: inserted.id,
            name: inserted.name,
            sku: inserted.sku,
            barcode: inserted.barcode,
            barcode_image_url: inserted.barcode_image_url,
            category_id: inserted.category_id,
            category: catName,
            cost: inserted.cost_price,
            price: inserted.selling_price,
            stock: inserted.stock,
            low: inserted.low_stock_threshold,
            image_url: inserted.image_url,
          },
        ].sort((a, b) => a.name.localeCompare(b.name))
      );
    } else {
      const { data: updated, error } = await supabase
        .from("products")
        .update({
          name: data.name,
          sku: data.sku,
          barcode: data.barcode,
          barcode_image_url: data.barcode_image_url,
          category_id: data.category_id,
          cost_price: data.cost,
          selling_price: data.price,
          stock: data.stock,
          low_stock_threshold: data.low,
          image_url: data.image_url || null,
        })
        .eq("id", modal.product.id)
        .select(
          "id, name, sku, barcode, barcode_image_url, category_id, cost_price, selling_price, stock, low_stock_threshold, image_url"
        )
        .single();

      if (error) throw new Error(error.message);

      const catName =
        categories.find((c) => c.id === updated.category_id)?.name || "—";

      setProducts((list) =>
        list
          .map((p) =>
            p.id === updated.id
              ? {
                  id: updated.id,
                  name: updated.name,
                  sku: updated.sku,
                  barcode: updated.barcode,
                  barcode_image_url: updated.barcode_image_url,
                  category_id: updated.category_id,
                  category: catName,
                  cost: updated.cost_price,
                  price: updated.selling_price,
                  stock: updated.stock,
                  low: updated.low_stock_threshold,
                  image_url: updated.image_url,
                }
              : p
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }

    setModal(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", delTarget.id);
    setDeleting(false);

    if (error) return alert(error.message);

    setProducts((list) => list.filter((p) => p.id !== delTarget.id));
    setDelTarget(null);
  };

  const exportCsv = () => {
    const rows = [
      ["Name", "SKU", "Barcode", "Category", "Cost", "Price", "Stock", "Low"],
      ...filtered.map((p) => [
        p.name,
        p.sku,
        p.barcode,
        p.category,
        p.cost,
        p.price,
        p.stock,
        p.low,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="rounded-xl border border-bg bg-bg p-4 text-[13px] font-semibold text-emb">
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto px-4 pb-12 pt-7 md:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="m-0 text-[24px] font-extrabold tracking-[-0.02em]">
            Products
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-dim">
            {products.length} item{products.length === 1 ? "" : "s"} ·{" "}
            {categories.length} categories
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-lg border border-lk bg-transparent px-3.5 py-2 text-[14px] font-semibold transition-colors hover:border-em"
          >
            <Download size={16} strokeWidth={1.8} />
            Export
          </button>
          <button
            onClick={() => setModal({ mode: "add" })}
            className="flex items-center gap-2 rounded-lg border border-emb bg-emb px-3.5 py-2 text-[14px] font-bold text-bg transition-colors hover:bg-em"
          >
            <Plus size={16} strokeWidth={2.2} />
            Add product
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border border-bg bg-bg p-5 text-white">
          <span className="text-[12px] font-semibold text-gray">
            RETAIL VALUE
          </span>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em]">
            {fm(totals.value)}
          </b>
          <em className="text-[12px] font-semibold not-italic text-emb">
            {totals.units} units in stock
          </em>
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emd/40 blur-2xl" />
        </div>
        <div className="rounded-xl border border-lk p-5">
          <span className="text-[12px] font-semibold text-gray-dim">
            TOTAL PRODUCTS
          </span>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em]">
            {products.length}
          </b>
          <em className="text-[12px] font-semibold not-italic text-em">
            Across {categories.length} categories
          </em>
        </div>
        <div className="rounded-xl border border-lk p-5">
          <span className="text-[12px] font-semibold text-gray-dim">
            LOW STOCK
          </span>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em]">
            {totals.low}
          </b>
          <em className="text-[12px] font-semibold not-italic text-gray-dim">
            Needs reorder
          </em>
        </div>
        <div className="rounded-xl border border-lk p-5">
          <span className="text-[12px] font-semibold text-gray-dim">
            OUT OF STOCK
          </span>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em]">
            {totals.out}
          </b>
          <em className="text-[12px] font-semibold not-italic text-gray-dim">
            Unavailable
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
              className="w-full border-0 bg-transparent text-[14px] outline-none"
            />
          </div>

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="rounded-lg border border-lk bg-transparent px-3 py-2 text-[13px] font-semibold focus:border-em focus:outline-none"
          >
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="rounded-lg border border-lk bg-transparent px-3 py-2 text-[13px] font-semibold focus:border-em focus:outline-none"
          >
            <option value="All">All stock</option>
            <option value="In">In stock</option>
            <option value="Low">Low stock</option>
            <option value="Out">Out of stock</option>
          </select>

          <div className="flex items-center gap-1 rounded-lg border border-lk p-0.5">
            <button
              onClick={() => setSort("name")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                sort === "name" ? "bg-bg text-emb" : "text-gray-dim"
              }`}
            >
              <ArrowUpDown size={13} strokeWidth={1.8} />
              Name
            </button>
            <button
              onClick={() => setSort("price")}
              className={`rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                sort === "price" ? "bg-bg text-emb" : "text-gray-dim"
              }`}
            >
              Selling Price
            </button>
            <button
              onClick={() => setSort("stock")}
              className={`rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                sort === "stock" ? "bg-bg text-emb" : "text-gray-dim"
              }`}
            >
              Stock
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-lk p-0.5">
            <button
              onClick={() => setView("table")}
              aria-label="Table view"
              className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${
                view === "table" ? "bg-bg text-emb" : "text-gray-dim"
              }`}
            >
              <List size={14} strokeWidth={1.8} />
            </button>
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${
                view === "grid" ? "bg-bg text-emb" : "text-gray-dim"
              }`}
            >
              <LayoutGrid size={14} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {view === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-bg/[0.02]">
                  {[
                    "Product",
                    "SKU",
                    "Category",
                    "Selling Price",
                    "Stock",
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
                      colSpan={7}
                      className="px-4 py-12 text-center text-gray-dim"
                    >
                      No products match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const status = stk(p.stock, p.low);
                    return (
                      <tr
                        key={p.id}
                        className="border-t border-lk transition-colors hover:bg-bg/[0.03]"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-[14px]">
                          <div className="flex items-center gap-3">
                            <span className="relative grid h-10 w-10 flex-none place-items-center overflow-hidden rounded-lg bg-emd text-[12px] font-extrabold text-emb">
                              {ini(p.name)}
                              {p.image_url && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="absolute inset-0 h-full w-full bg-white object-contain p-1"
                                />
                              )}
                            </span>
                            <div>
                              <div className="font-semibold">{p.name}</div>
                              <div className="font-mono text-[11px] text-gray-dim">
                                {p.barcode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-gray-dim">
                          {p.sku}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px]">
                          <span className="rounded-md bg-bg/[0.04] px-2 py-0.5 text-[12px] font-semibold">
                            {p.category}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[14px] font-semibold">
                          {fm(p.price)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[14px]">
                          {p.stock}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusPill status={status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() =>
                                setModal({ mode: "edit", product: p })
                              }
                              className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:border-em hover:text-bg"
                              aria-label="Edit"
                            >
                              <Pencil size={14} strokeWidth={1.8} />
                            </button>
                            <button
                              onClick={() => setDelTarget(p)}
                              className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:border-em hover:text-bg"
                              aria-label="Delete"
                            >
                              <Trash2 size={14} strokeWidth={1.8} />
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
        )}

        {view === "grid" && (
          <div className="p-4">
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-gray-dim">
                No products match the current filters.
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                {filtered.map((p) => {
                  const status = stk(p.stock, p.low);
                  return (
                    <div
                      key={p.id}
                      className="group rounded-xl border border-lk p-4 transition-all hover:-translate-y-px hover:border-em hover:shadow-[0_4px_16px_-8px_rgba(31,174,122,0.35)]"
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <span className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-emd text-[15px] font-extrabold text-emb">
                          {ini(p.name)}
                          {p.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="absolute inset-0 h-full w-full bg-white object-contain p-1"
                            />
                          )}
                        </span>
                        <StatusPill status={status} />
                      </div>
                      <b className="block truncate text-[14px]">{p.name}</b>
                      <small className="block text-[12px] text-gray-dim">
                        {p.category} · {p.sku}
                      </small>
                      <div className="mt-3 flex items-baseline justify-between">
                        <span className="text-[16px] font-extrabold">
                          {fm(p.price)}
                        </span>
                        <small className="text-[12px] text-gray-dim">
                          {p.stock} in stock
                        </small>
                      </div>
                      <div className="mt-3 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() =>
                            setModal({ mode: "edit", product: p })
                          }
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-lk bg-transparent py-1.5 text-[12px] font-semibold transition-colors hover:border-em"
                        >
                          <Pencil size={12} strokeWidth={1.8} />
                          Edit
                        </button>
                        <button
                          onClick={() => setDelTarget(p)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:border-em hover:text-bg"
                          aria-label="Delete"
                        >
                          <Trash2 size={13} strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <ProductModal
          initial={modal.mode === "edit" ? modal.product : null}
          categories={categories}
          businessName={businessName}
          existingSkus={existingSkus}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {delTarget && (
        <DeleteModal
          product={delTarget}
          onCancel={() => setDelTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}