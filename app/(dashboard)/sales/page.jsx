"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, Download, Printer, Eye, X, Store, Globe,
  Trash2, Loader2, AlertTriangle, Check,
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

const pillClass = (s) =>
  ({
    paid: "bg-emd text-emb",
    pending: "bg-gray/20 text-gray-dim",
    failed: "bg-bg text-gray",
    refunded: "bg-gray/20 text-gray-dim",
  }[s?.toLowerCase()] || "bg-gray/20 text-gray-dim");

function StatusPill({ status }) {
  const label = status
    ? status[0].toUpperCase() + status.slice(1).toLowerCase()
    : "—";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${pillClass(
        status
      )}`}
    >
      {label}
    </span>
  );
}

/* ============================================================
   Receipt (printable)
   ============================================================ */
function Receipt({ r, biz, logo, id = "rcpt" }) {
  return (
    <div
      id={id}
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
        <small className="text-gray-dim">Powered by ClaukkSuite</small>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-b border-dashed border-lk py-3">
        <span className="text-gray-dim">Receipt</span>
        <b className="text-right font-semibold">{r.receipt_no}</b>
        <span className="text-gray-dim">Date</span>
        <b className="text-right font-semibold">{r.shortDate}</b>
        <span className="text-gray-dim">Time</span>
        <b className="text-right font-semibold">{r.timeLabel}</b>
        <span className="text-gray-dim">Cashier</span>
        <b className="text-right font-semibold">{r.cashier}</b>
        <span className="text-gray-dim">Customer</span>
        <b className="text-right font-semibold">
          {r.customer_type === "online" ? "Online" : "Walk-in"}
        </b>
      </div>

      <div className="border-b border-dashed border-lk py-2">
        <div className="flex justify-between gap-3 pb-1 text-gray-dim">
          <span>Item</span>
          <span>Amount</span>
        </div>
        {r.lines.length === 0 ? (
          <p className="py-2 text-center text-gray-dim">No items on record.</p>
        ) : (
          r.lines.map((l, i) => (
            <div key={i} className="flex justify-between gap-3 py-1">
              <span>
                {l.name}
                <small className="block text-gray-dim">
                  {l.quantity} × {Number(l.unit_price).toFixed(2)}
                </small>
              </span>
              <b className="tabular-nums">
                {Number(l.line_total).toFixed(2)}
              </b>
            </div>
          ))
        )}
      </div>

      <div className="border-b border-dashed border-lk py-2.5">
        <div className="flex justify-between gap-3 py-0.5 text-gray-dim">
          <span>Subtotal</span>
          <span>{fm(r.subtotal)}</span>
        </div>
        {r.discount > 0 && (
          <div className="flex justify-between gap-3 py-0.5 text-gray-dim">
            <span>Discount</span>
            <span>−{fm(r.discount)}</span>
          </div>
        )}
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
        <div className="flex justify-between gap-3 py-0.5 text-gray-dim">
          <span>Payment</span>
          <span>{r.payment_method}</span>
        </div>
        {r.payment_ref && (
          <div className="flex justify-between gap-3 py-0.5 text-gray-dim">
            <span>Ref</span>
            <span className="font-mono">{r.payment_ref}</span>
          </div>
        )}
        <div className="flex justify-between gap-3 py-0.5 text-gray-dim">
          <span>Status</span>
          <span>
            {r.status ? r.status[0].toUpperCase() + r.status.slice(1) : "—"}
          </span>
        </div>
      </div>

      <div className="pt-3.5 text-center">
        <p className="mb-0.5 mt-2.5 font-semibold">
          Thank you for your business.
        </p>
        <small className="text-gray-dim">ClaukkPOS · ClaukkSuite</small>
      </div>
    </div>
  );
}

/* ============================================================
   Segmented control
   ============================================================ */
function Seg({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-lk p-0.5">
      {options.map((x) => (
        <button
          key={x}
          onClick={() => onChange(x)}
          className={[
            "rounded-md border-0 px-3 py-1.5 text-[12px] font-semibold transition-colors",
            x === value
              ? "bg-bg text-emb"
              : "bg-transparent text-gray-dim hover:text-bg",
          ].join(" ")}
        >
          {x}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   Delete confirmation modal
   ============================================================ */
function DeleteConfirmModal({ title, description, count, busy, onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-30 grid place-items-center bg-bg/60 p-4"
      onClick={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle size={20} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h2 className="m-0 text-[18px] font-bold text-black">{title}</h2>
            <p className="mt-1 text-[13px] text-gray-dim">{description}</p>
          </div>
        </div>

        {count > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
            {count} sale{count === 1 ? "" : "s"} will be permanently deleted.
            Stock quantities will be restored.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-lk bg-transparent py-2.5 text-[14px] font-semibold text-black transition-colors hover:border-em disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-lg border border-red-600 bg-red-600 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={15} strokeWidth={2.2} className="animate-spin" />
            ) : (
              <Trash2 size={15} strokeWidth={2} />
            )}
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Date helpers
   ============================================================ */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfYesterday() {
  const d = startOfToday();
  d.setDate(d.getDate() - 1);
  return d;
}

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ============================================================
   Page
   ============================================================ */
export default function SalesPage() {
  const supabase = createClient();

  const [sales, setSales] = useState([]);
  const [biz, setBiz] = useState("ClaukkPOS");
  const [logo, setLogo] = useState("");
  const [currentStaff, setCurrentStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [q, setQ] = useState("");
  const [range, setRange] = useState("Today");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [preview, setPreview] = useState(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null); // single sale
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [toast, setToast] = useState(null); // { kind, msg }

  /* ---------- Load ---------- */
  useEffect(() => {
    (async () => {
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("business_name, business_logo")
        .eq("id", user.id)
        .single();
      if (profile?.business_name) setBiz(profile.business_name);
      if (profile?.business_logo) setLogo(profile.business_logo);

      const staffId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("claukk_staff_id")
          : null;

      let staffName = null;
      if (staffId) {
        const { data: st } = await supabase
          .from("staff")
          .select("id, name")
          .eq("id", staffId)
          .single();
        if (st) {
          setCurrentStaff(st);
          staffName = st.name;
        }
      }

      const { data: saleRows, error: saleErr } = await supabase
        .from("sales")
        .select(
          "id, receipt_no, subtotal, discount, tax, total, payment_method, payment_ref, status, created_at, staff_id, customer_type"
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (saleErr) {
        setLoadError(saleErr.message);
        setLoading(false);
        return;
      }

      const saleIds = (saleRows || []).map((s) => s.id);
      let itemRows = [];
      if (saleIds.length) {
        const { data: items } = await supabase
          .from("sale_items")
          .select(
            "sale_id, product_id, name, sku, quantity, unit_price, line_total"
          )
          .in("sale_id", saleIds);
        itemRows = items || [];
      }

      const staffIds = [
        ...new Set((saleRows || []).map((s) => s.staff_id).filter(Boolean)),
      ];
      const staffMap = new Map();
      if (staffIds.length) {
        const { data: staffRows } = await supabase
          .from("staff")
          .select("id, name")
          .in("id", staffIds);
        (staffRows || []).forEach((s) => staffMap.set(s.id, s.name));
      }

      const linesBySale = new Map();
      itemRows.forEach((it) => {
        if (!linesBySale.has(it.sale_id)) linesBySale.set(it.sale_id, []);
        linesBySale.get(it.sale_id).push(it);
      });

      const shaped = (saleRows || []).map((s) => {
        const lines = linesBySale.get(s.id) || [];
        const itemsCount = lines.reduce(
          (a, l) => a + (l.quantity || 0),
          0
        );
        return {
          id: s.id,
          receipt_no: s.receipt_no,
          subtotal: Number(s.subtotal) || 0,
          discount: Number(s.discount) || 0,
          tax: Number(s.tax) || 0,
          total: Number(s.total) || 0,
          payment_method: s.payment_method,
          payment_ref: s.payment_ref,
          status: s.status,
          created_at: s.created_at,
          timeLabel: timeLabel(s.created_at),
          shortDate: shortDate(s.created_at),
          cashier: staffMap.get(s.staff_id) || staffName || "Owner",
          customer_type: s.customer_type || "walk_in",
          lines,
          items: itemsCount,
        };
      });

      setSales(shaped);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Toast auto-dismiss ---------- */
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  /* ---------- Filters ---------- */
  const filtered = useMemo(() => {
    const todayStart = startOfToday();
    const yesterdayStart = startOfYesterday();

    return sales.filter((s) => {
      const created = new Date(s.created_at);

      if (range === "Today" && created < todayStart) return false;
      if (
        range === "Yesterday" &&
        (created < yesterdayStart || created >= todayStart)
      )
        return false;
      if (
        statusFilter !== "All" &&
        s.status?.toLowerCase() !== statusFilter.toLowerCase()
      )
        return false;
      if (
        methodFilter !== "All" &&
        s.payment_method?.toLowerCase() !== methodFilter.toLowerCase()
      )
        return false;
      if (customerFilter !== "All") {
        const want =
          customerFilter === "Online" ? "online" : "walk_in";
        if (s.customer_type !== want) return false;
      }
      if (q) {
        const t = q.toLowerCase();
        if (
          !s.receipt_no.toLowerCase().includes(t) &&
          !s.cashier.toLowerCase().includes(t)
        )
          return false;
      }
      return true;
    });
  }, [sales, q, range, statusFilter, methodFilter, customerFilter]);

  const totals = useMemo(() => {
    const paid = filtered.filter(
      (s) => s.status?.toLowerCase() === "paid"
    );
    const pending = filtered.filter(
      (s) => s.status?.toLowerCase() === "pending"
    );
    const failed = filtered.filter(
      (s) => s.status?.toLowerCase() === "failed"
    );
    return {
      count: filtered.length,
      revenue: paid.reduce((a, s) => a + s.total, 0),
      paid: paid.length,
      pending: pending.reduce((a, s) => a + s.total, 0),
      failed: failed.length,
    };
  }, [filtered]);

  /* ---------- Export ---------- */
  const exportCsv = () => {
    const rows = [
      [
        "Receipt",
        "Cashier",
        "Customer Type",
        "Items",
        "Payment",
        "Subtotal",
        "Discount",
        "Total",
        "Status",
        "Date",
        "Time",
      ],
      ...filtered.map((s) => [
        s.receipt_no,
        s.cashier,
        s.customer_type === "online" ? "Online" : "Walk-in",
        s.items,
        s.payment_method,
        s.subtotal.toFixed(2),
        s.discount.toFixed(2),
        s.total.toFixed(2),
        s.status,
        s.shortDate,
        s.timeLabel,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------- Escape closes overlays ---------- */
  useEffect(() => {
    if (!preview && !deleteTarget && !bulkDeleteOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (deleting) return;
      if (preview) setPreview(null);
      if (deleteTarget) setDeleteTarget(null);
      if (bulkDeleteOpen) setBulkDeleteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, deleteTarget, bulkDeleteOpen, deleting]);

  /* ============================================================
     DELETE — core operations
     ============================================================ */

  /**
   * Restore stock for a set of sales. Each sale's line items are
   * summed by product_id and added back to the product's stock.
   * Best-effort: if stock restoration fails, we still continue
   * deleting so the user isn't blocked, but we report it.
   */
  const restoreStockForSales = async (saleRows) => {
    // saleRows: array of { id, lines: [{ product_id, quantity }] }
    const qtyByProduct = new Map();
    saleRows.forEach((s) => {
      (s.lines || []).forEach((l) => {
        if (!l.product_id) return;
        const q = Number(l.quantity) || 0;
        if (q <= 0) return;
        qtyByProduct.set(
          l.product_id,
          (qtyByProduct.get(l.product_id) || 0) + q
        );
      });
    });

    if (qtyByProduct.size === 0) return { ok: true, restored: 0 };

    // Fetch current stock for all affected products in one query
    const productIds = [...qtyByProduct.keys()];
    const { data: products, error: fetchErr } = await supabase
      .from("products")
      .select("id, stock")
      .in("id", productIds);

    if (fetchErr) return { ok: false, error: fetchErr.message };

    const stockMap = new Map((products || []).map((p) => [p.id, p.stock]));

    // Update each product's stock back up
    const updates = await Promise.all(
      productIds.map(async (pid) => {
        const current = stockMap.get(pid);
        if (current === undefined) return { ok: true };
        const add = qtyByProduct.get(pid) || 0;
        const newStock = Number(current) + add;
        const { error } = await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", pid);
        return { ok: !error, error: error?.message };
      })
    );

    const failed = updates.filter((u) => !u.ok);
    if (failed.length) {
      return { ok: false, error: failed[0].error || "Stock restore failed" };
    }
    return { ok: true, restored: productIds.length };
  };

  /**
   * Delete one sale:
   *  1. Fetch its sale_items (to know how much stock to restore)
   *  2. Restore product stock
   *  3. Delete sale_items (FK)
   *  4. Delete sale row
   *  5. Update local state
   */
  const deleteOneSale = async (sale) => {
    setDeleteError("");

    // 1. Fetch the sale_items for this sale
    const { data: itemRows, error: itemFetchErr } = await supabase
      .from("sale_items")
      .select("product_id, quantity")
      .eq("sale_id", sale.id);

    if (itemFetchErr) {
      return { ok: false, error: itemFetchErr.message };
    }

    // 2. Restore stock
    const restore = await restoreStockForSales([
      { id: sale.id, lines: itemRows || [] },
    ]);
    if (!restore.ok) {
      // Non-fatal: we log but still delete. The user asked to delete.
      console.warn("Stock restore warning:", restore.error);
    }

    // 3. Delete sale_items
    const { error: itemsDelErr } = await supabase
      .from("sale_items")
      .delete()
      .eq("sale_id", sale.id);
    if (itemsDelErr) {
      return { ok: false, error: itemsDelErr.message };
    }

    // 4. Delete the sale row
    const { error: saleDelErr } = await supabase
      .from("sales")
      .delete()
      .eq("id", sale.id);
    if (saleDelErr) {
      return { ok: false, error: saleDelErr.message };
    }

    // 5. Update local state
    setSales((list) => list.filter((s) => s.id !== sale.id));
    if (preview?.id === sale.id) setPreview(null);

    return { ok: true };
  };

  /**
   * Bulk delete the currently filtered sales.
   * Batched to avoid hitting URL length limits on `.in()`.
   */
  const deleteFilteredSales = async () => {
    setDeleteError("");
    const targets = filtered;
    if (targets.length === 0) return { ok: true, deleted: 0 };

    const ids = targets.map((s) => s.id);
    const BATCH = 100;
    let deletedCount = 0;

    // Fetch ALL sale_items in batches so we can restore stock in one go
    const allItems = [];
    for (let i = 0; i < ids.length; i += BATCH) {
      const slice = ids.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from("sale_items")
        .select("sale_id, product_id, quantity")
        .in("sale_id", slice);
      if (error) return { ok: false, error: error.message };
      allItems.push(...(data || []));
    }

    const itemsBySale = new Map();
    allItems.forEach((it) => {
      if (!itemsBySale.has(it.sale_id)) itemsBySale.set(it.sale_id, []);
      itemsBySale.get(it.sale_id).push(it);
    });

    // Restore stock once for all affected products
    const restore = await restoreStockForSales(
      targets.map((s) => ({
        id: s.id,
        lines: itemsBySale.get(s.id) || [],
      }))
    );
    if (!restore.ok) {
      console.warn("Bulk stock restore warning:", restore.error);
    }

    // Delete in batches
    for (let i = 0; i < ids.length; i += BATCH) {
      const slice = ids.slice(i, i + BATCH);

      const { error: itemsErr } = await supabase
        .from("sale_items")
        .delete()
        .in("sale_id", slice);
      if (itemsErr) return { ok: false, error: itemsErr.message };

      const { error: saleErr } = await supabase
        .from("sales")
        .delete()
        .in("id", slice);
      if (saleErr) return { ok: false, error: saleErr.message };

      deletedCount += slice.length;
    }

    // Update local state
    const idSet = new Set(ids);
    setSales((list) => list.filter((s) => !idSet.has(s.id)));
    if (preview && idSet.has(preview.id)) setPreview(null);

    return { ok: true, deleted: deletedCount };
  };

  /* ============================================================
     Handlers for the confirm modals
     ============================================================ */
  const handleConfirmDeleteOne = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const res = await deleteOneSale(deleteTarget);
    setDeleting(false);

    if (!res.ok) {
      setDeleteError(res.error || "Could not delete sale.");
      return;
    }
    setDeleteTarget(null);
    setToast({ kind: "ok", msg: `Sale ${deleteTarget.receipt_no} deleted.` });
  };

  const handleConfirmBulkDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    const res = await deleteFilteredSales();
    setDeleting(false);

    if (!res.ok) {
      setDeleteError(res.error || "Could not delete sales.");
      return;
    }
    setBulkDeleteOpen(false);
    setToast({ kind: "ok", msg: `${res.deleted} sale${res.deleted === 1 ? "" : "s"} deleted.` });
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
      {/* Print scope */}
      <style jsx global>{`
        @media print {
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

          body * { visibility: hidden !important; }

          #rcpt,
          #rcpt * { visibility: visible !important; }

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

          #rcpt, #rcpt * {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .no-print { display: none !important; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold shadow-lg ${
            toast.kind === "ok"
              ? "bg-black text-emb"
              : "bg-red-600 text-white"
          }`}
          role="status"
        >
          {toast.kind === "ok" ? (
            <Check size={15} strokeWidth={2.4} />
          ) : (
            <AlertTriangle size={15} strokeWidth={2.4} />
          )}
          {toast.msg}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="m-0 text-[24px] font-extrabold tracking-[-0.02em]">
            Sales
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-dim">
            Every transaction, newest first.
            {currentStaff && (
              <>
                {" "}
                Showing as <b className="text-bg">{currentStaff.name}</b>.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-lg border border-lk bg-transparent px-3.5 py-2 text-[14px] font-semibold transition-colors hover:border-em"
          >
            <Download size={16} strokeWidth={1.8} />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-bg bg-bg px-3.5 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-emd"
          >
            <Printer size={16} strokeWidth={1.8} />
            Print
          </button>
          <button
            onClick={() => {
              if (filtered.length === 0) return;
              setDeleteError("");
              setBulkDeleteOpen(true);
            }}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-[14px] font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={16} strokeWidth={1.8} />
            Delete filtered ({filtered.length})
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-bg bg-bg p-5 text-white">
          <span className="text-[12px] font-semibold text-gray">
            REVENUE ({range})
          </span>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em]">
            {fm(totals.revenue)}
          </b>
          <em className="text-[12px] font-semibold not-italic text-emb">
            {totals.count} transactions
          </em>
        </div>
        <div className="rounded-xl border border-lk p-5">
          <span className="text-[12px] font-semibold text-gray-dim">
            PAID
          </span>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em]">
            {totals.paid}
          </b>
          <em className="text-[12px] font-semibold not-italic text-em">
            Collected
          </em>
        </div>
        <div className="rounded-xl border border-lk p-5">
          <span className="text-[12px] font-semibold text-gray-dim">
            PENDING
          </span>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em]">
            {fm(totals.pending)}
          </b>
          <em className="text-[12px] font-semibold not-italic text-gray-dim">
            Awaiting payment
          </em>
        </div>
        <div className="rounded-xl border border-lk p-5">
          <span className="text-[12px] font-semibold text-gray-dim">
            FAILED
          </span>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em]">
            {totals.failed}
          </b>
          <em className="text-[12px] font-semibold not-italic text-gray-dim">
            Needs attention
          </em>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-lk p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-lk px-3 py-2 text-gray focus-within:border-em focus-within:ring-[3px] focus-within:ring-emb/25">
            <Search size={16} strokeWidth={1.8} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by receipt or cashier..."
              className="w-full border-0 bg-transparent text-[14px] outline-none"
            />
          </div>

          <Seg
            options={["Today", "Yesterday", "All"]}
            value={range}
            onChange={setRange}
          />
          <Seg
            options={["All", "Paid", "Pending", "Failed"]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <Seg
            options={["All", "Cash", "Paystack", "Split"]}
            value={methodFilter}
            onChange={setMethodFilter}
          />
          <Seg
            options={["All", "Walk-in", "Online"]}
            value={customerFilter}
            onChange={setCustomerFilter}
          />
        </div>

        {deleteError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
            {deleteError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {[
                  "Receipt",
                  "Cashier",
                  "Customer",
                  "Items",
                  "Payment",
                  "Amount",
                  "Status",
                  "Date",
                  "Time",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border-b border-lk px-3 py-2 text-left text-[12px] font-semibold text-gray-dim"
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
                    className="px-3 py-10 text-center text-gray-dim"
                  >
                    No sales match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="transition-colors hover:bg-bg/[0.03]"
                  >
                    <td className="whitespace-nowrap border-b border-lk px-3 py-2.5 text-[14px] font-semibold">
                      {s.receipt_no}
                    </td>
                    <td className="whitespace-nowrap border-b border-lk px-3 py-2.5 text-[14px]">
                      {s.cashier}
                    </td>
                    <td className="whitespace-nowrap border-b border-lk px-3 py-2.5 text-[14px]">
                      <span className="inline-flex items-center gap-1.5">
                        {s.customer_type === "online" ? (
                          <Globe
                            size={13}
                            strokeWidth={2}
                            className="text-em"
                          />
                        ) : (
                          <Store
                            size={13}
                            strokeWidth={2}
                            className="text-gray-dim"
                          />
                        )}
                        {s.customer_type === "online" ? "Online" : "Walk-in"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap border-b border-lk px-3 py-2.5 text-[14px]">
                      {s.items}
                    </td>
                    <td className="whitespace-nowrap border-b border-lk px-3 py-2.5 text-[14px]">
                      {s.payment_method}
                    </td>
                    <td className="whitespace-nowrap border-b border-lk px-3 py-2.5 text-[14px] font-semibold">
                      {fm(s.total)}
                      {s.discount > 0 && (
                        <span className="ml-2 inline-block rounded bg-emd px-1.5 py-0.5 text-[10px] font-bold text-emb">
                          −{fm(s.discount)}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap border-b border-lk px-3 py-2.5 text-[14px]">
                      <StatusPill status={s.status} />
                    </td>
                    <td className="whitespace-nowrap border-b border-lk px-3 py-2.5 text-[14px] text-gray-dim">
                      {s.shortDate}
                    </td>
                    <td className="whitespace-nowrap border-b border-lk px-3 py-2.5 text-[14px] text-gray-dim">
                      {s.timeLabel}
                    </td>
                    <td className="whitespace-nowrap border-b border-lk px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setPreview(s)}
                          className="flex items-center gap-1.5 rounded-lg border border-lk bg-transparent px-2.5 py-1.5 text-[12px] font-semibold transition-colors hover:border-em"
                        >
                          <Eye size={14} strokeWidth={1.8} />
                          View
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError("");
                            setDeleteTarget(s);
                          }}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete sale ${s.receipt_no}`}
                          title="Delete sale"
                        >
                          <Trash2 size={14} strokeWidth={1.8} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-10 grid place-items-center bg-bg/60 p-4"
          onClick={(e) => e.target === e.currentTarget && setPreview(null)}
        >
          <div className="max-h-[92vh] w-full max-w-[440px] overflow-auto rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="m-0 text-[18px] font-bold">Sale details</h2>
                <p className="mt-0.5 text-[13px] text-gray-dim">
                  {preview.receipt_no} · {preview.shortDate},{" "}
                  {preview.timeLabel}
                </p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:text-bg"
                aria-label="Close"
              >
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-lg border border-lk p-3">
                <span className="block text-[11px] font-semibold text-gray-dim">
                  Cashier
                </span>
                <b className="mt-0.5 block truncate text-[13px] font-bold">
                  {preview.cashier}
                </b>
              </div>
              <div className="rounded-lg border border-lk p-3">
                <span className="block text-[11px] font-semibold text-gray-dim">
                  Customer
                </span>
                <b className="mt-0.5 block text-[13px] font-bold">
                  {preview.customer_type === "online"
                    ? "Online"
                    : "Walk-in"}
                </b>
              </div>
              <div className="rounded-lg border border-lk p-3">
                <span className="block text-[11px] font-semibold text-gray-dim">
                  Payment
                </span>
                <b className="mt-0.5 block text-[13px] font-bold">
                  {preview.payment_method}
                </b>
              </div>
              <div className="rounded-lg border border-lk p-3">
                <span className="block text-[11px] font-semibold text-gray-dim">
                  Status
                </span>
                <div className="mt-0.5">
                  <StatusPill status={preview.status} />
                </div>
              </div>
              {preview.discount > 0 && (
                <div className="col-span-2 rounded-lg border border-emd bg-emd/30 p-3">
                  <span className="block text-[11px] font-semibold text-gray-dim">
                    Discount applied
                  </span>
                  <b className="mt-0.5 block text-[14px] font-extrabold text-em">
                    −{fm(preview.discount)}
                  </b>
                </div>
              )}
            </div>

            <div className="mb-4 rounded-lg border border-lk bg-white p-3">
              <Receipt r={preview} biz={biz} logo={logo} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                className="flex items-center justify-center gap-2 rounded-lg border border-bg bg-bg py-2.5 text-[13px] font-semibold text-white"
                onClick={() =>
                  requestAnimationFrame(() =>
                    requestAnimationFrame(() =>
                      setTimeout(() => window.print(), 50)
                    )
                  )
                }
              >
                <Printer size={14} strokeWidth={1.8} />
                Print
              </button>
              <button
                className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-2.5 text-[13px] font-semibold text-red-700 transition-colors hover:border-red-400 hover:bg-red-100"
                onClick={() => {
                  setDeleteError("");
                  setDeleteTarget(preview);
                }}
              >
                <Trash2 size={14} strokeWidth={1.8} />
                Delete
              </button>
              <button
                className="rounded-lg border border-lk bg-transparent py-2.5 text-[13px] font-semibold"
                onClick={() => setPreview(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single delete confirmation */}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete this sale?"
          description={`Sale ${deleteTarget.receipt_no} (${fm(
            deleteTarget.total
          )}) will be removed from the database.`}
          count={1}
          busy={deleting}
          onCancel={() => {
            if (deleting) return;
            setDeleteTarget(null);
            setDeleteError("");
          }}
          onConfirm={handleConfirmDeleteOne}
        />
      )}

      {/* Bulk delete confirmation */}
      {bulkDeleteOpen && (
        <DeleteConfirmModal
          title={`Delete ${filtered.length} sale${
            filtered.length === 1 ? "" : "s"
          }?`}
          description="This will permanently delete all sales matching the current filters."
          count={filtered.length}
          busy={deleting}
          onCancel={() => {
            if (deleting) return;
            setBulkDeleteOpen(false);
            setDeleteError("");
          }}
          onConfirm={handleConfirmBulkDelete}
        />
      )}
    </div>
  );
}