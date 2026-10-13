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
  "block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] font-medium text-black transition-colors focus:border-em focus:outline-none focus:ring-[3px] focus:ring-emb/25 placeholder:text-gray-dim";

/* ============================================================
   Barcode preview modal
   ============================================================ */
function BarcodeModal({ product, onClose }) {
  const filename = `${(product.sku || product.name || "barcode")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}.svg`;

  const handleDownload = async () => {
    if (!product.barcodeImageUrl) return;

    try {
      const res = await fetch(product.barcodeImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback for cross-origin: open in a new tab so the user can save it
      window.open(product.barcodeImageUrl, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-white">
        {/* Header */}
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

        {/* Preview */}
        <div className="grid place-items-center bg-black/[0.02] p-8">
          {product.barcodeImageUrl ? (
            <div className="w-full max-w-[420px] rounded-xl border border-lk bg-white p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.barcodeImageUrl}
                alt={product.barcode || "Barcode"}
                className="mx-auto block h-auto w-full"
              />
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-[13px] text-gray-dim">
                No barcode image stored for this product.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 border-t border-lk p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-lk bg-transparent py-2.5 text-[14px] font-semibold text-black transition-colors hover:border-em"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            disabled={!product.barcodeImageUrl}
            className="flex items-center justify-center gap-2 rounded-lg border border-black bg-black py-2.5 text-[14px] font-semibold text-white transition-colors hover:border-emb hover:text-emb disabled:opacity-50"
          >
            <Download size={15} strokeWidth={2} />
            Download SVG
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Adjust stock modal
   ============================================================ */
function AdjustModal({ product, onClose, onSave }) {
  const [mode, setMode] = useState(product.mode || "in");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");

  const qtyNum = Number(qty) || 0;
  const projected =
    mode === "in"
      ? product.stock + qtyNum
      : mode === "out"
      ? Math.max(0, product.stock - qtyNum)
      : qtyNum;

  const canSave = qty !== "" && qtyNum >= 0 && reason.trim();

  const submit = () => {
    if (!canSave) return;
    onSave({ mode, qty: qtyNum, reason: reason.trim(), projected });
  };

  const modes = [
    { key: "in", label: "Add", icon: ArrowUp },
    { key: "out", label: "Remove", icon: ArrowDown },
    { key: "set", label: "Set", icon: RotateCcw },
  ];

  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[480px] rounded-2xl bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="m-0 text-[18px] font-bold">Adjust stock</h2>
            <p className="mt-0.5 text-[13px] text-gray-dim">
              {product.name} · SKU {product.sku}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:text-black"
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
            <b className="mt-0.5 block text-[24px] font-extrabold tracking-[-0.02em]">
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
                className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-[13px] font-bold transition-colors ${
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
          />
        </label>

        <label className="mt-3 block text-[12px] font-semibold text-gray-dim">
          Reason
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. New delivery, damaged, stock count"
            className={`mt-1 ${inputCls}`}
          />
        </label>

        <div className="mt-5 grid grid-cols-[1fr_2fr] gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-lk bg-transparent py-3 text-[14px] font-semibold text-black transition-colors hover:border-em"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSave}
            className={`rounded-lg py-3 text-[14px] font-extrabold transition-colors ${
              canSave
                ? "border border-black bg-black text-white hover:border-emb hover:text-emb"
                : "cursor-not-allowed border border-lk bg-lk text-gray-dim opacity-60"
            }`}
          >
            Update stock
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
  const [saving, setSaving] = useState(false);

  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [barcodeTarget, setBarcodeTarget] = useState(null);

  /* ---------- Load ---------- */
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

  /* ---------- Filters ---------- */
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

  /* ---------- Totals ---------- */
  const totals = useMemo(() => {
    const units = items.reduce((a, p) => a + p.stock, 0);
    const low = items.filter((p) => stk(p.stock, p.low) === "Low Stock").length;
    const out = items.filter((p) => p.stock === 0).length;
    const value = items.reduce((a, p) => a + p.cost * p.stock, 0);
    return { units, low, out, value };
  }, [items]);

  /* ---------- Adjust stock ---------- */
  const applyAdjust = async ({ mode, qty, reason, projected }) => {
    if (!adjustTarget) return;

    setSaving(true);

    const { error } = await supabase
      .from("products")
      .update({
        stock: projected,
        updated_at: new Date().toISOString(),
      })
      .eq("id", adjustTarget.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setItems((list) =>
      list.map((p) =>
        p.id === adjustTarget.id
          ? { ...p, stock: projected, updatedAt: new Date().toISOString() }
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
  };

  /* ---------- Loading / error ---------- */
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
      {/* Header */}
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

      {/* Summary */}
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

      {/* Table card */}
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
                          <span className="relative grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-lg bg-black text-[12px] font-extrabold text-emb">
                            {ini(p.name)}
                            {p.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="absolute inset-0 h-full w-full bg-white object-contain p-0.5"
                                onError={(e) => e.currentTarget.remove()}
                              />
                            )}
                          </span>
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

      {/* Adjust modal */}
      {adjustTarget && (
        <AdjustModal
          product={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSave={applyAdjust}
        />
      )}

      {/* Barcode preview modal */}
      {barcodeTarget && (
        <BarcodeModal
          product={barcodeTarget}
          onClose={() => setBarcodeTarget(null)}
        />
      )}

      {/* History drawer */}
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