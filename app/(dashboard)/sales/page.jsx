"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Download, Printer, Eye, X } from "lucide-react";
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
   Receipt
   ============================================================ */
function Receipt({ r, biz }) {
    return (
        <div className="mx-auto w-full max-w-[320px] rounded-md border border-lk bg-white px-[18px] py-5 text-[12px] text-bg">
            <div className="flex flex-col gap-0.5 border-b border-dashed border-lk pb-3 text-center">
                <b className="text-[18px] font-extrabold tracking-[-0.02em]">
                    ClaukkPOS
                </b>
                <span>{biz || "ClaukkPOS"}</span>
                <small className="text-gray-dim">
                    Powered by ClaukkSuite
                </small>
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-b border-dashed border-lk py-3">
                <span className="text-gray-dim">Receipt</span>
                <b className="text-right font-semibold">{r.receipt_no}</b>
                <span className="text-gray-dim">Date</span>
                <b className="text-right font-semibold">{r.dateLabel}</b>
                <span className="text-gray-dim">Time</span>
                <b className="text-right font-semibold">{r.timeLabel}</b>
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
                            {l.name}
                            <small className="block text-gray-dim">
                                {l.quantity} × {Number(l.unit_price).toFixed(2)}
                            </small>
                        </span>
                        <b className="tabular-nums">
                            {Number(l.line_total).toFixed(2)}
                        </b>
                    </div>
                ))}
            </div>

            <div className="border-b border-dashed border-lk py-2.5">
                <div className="flex justify-between gap-3 py-0.5 text-gray-dim">
                    <span>Subtotal</span>
                    <span>{fm(r.subtotal)}</span>
                </div>
                <div className="flex justify-between gap-3 py-0.5 text-gray-dim">
                    <span>Discount</span>
                    <span>{fm(r.discount)}</span>
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
                        {r.status
                            ? r.status[0].toUpperCase() + r.status.slice(1)
                            : "—"}
                    </span>
                </div>
            </div>

            <div className="pt-3.5 text-center">
                <p className="mb-0.5 mt-2.5 font-semibold">
                    Thank you for your business.
                </p>
                <small className="text-gray-dim">
                    ClaukkPOS · ClaukkSuite
                </small>
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

function dateLabel(iso) {
    const d = new Date(iso);
    const today = startOfToday();
    const yesterday = startOfYesterday();

    if (d >= today) return "Today";
    if (d >= yesterday) return "Yesterday";
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function timeLabel(iso) {
    return new Date(iso).toLocaleTimeString("en", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

/* Full "07 Oct 2026" style — used in the new Date column */
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
    const [currentStaff, setCurrentStaff] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [q, setQ] = useState("");
    const [range, setRange] = useState("Today");
    const [statusFilter, setStatusFilter] = useState("All");
    const [methodFilter, setMethodFilter] = useState("All");
    const [preview, setPreview] = useState(null);

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
                .select("business_name")
                .eq("id", user.id)
                .single();
            if (profile?.business_name) setBiz(profile.business_name);

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
                    "id, receipt_no, subtotal, discount, tax, total, payment_method, payment_ref, status, created_at, staff_id"
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
                ...new Set(
                    (saleRows || []).map((s) => s.staff_id).filter(Boolean)
                ),
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
                if (!linesBySale.has(it.sale_id))
                    linesBySale.set(it.sale_id, []);
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
                    dateLabel: dateLabel(s.created_at),
                    timeLabel: timeLabel(s.created_at),
                    shortDate: shortDate(s.created_at),
                    cashier:
                        staffMap.get(s.staff_id) || staffName || "Owner",
                    lines,
                    items: itemsCount,
                };
            });

            setSales(shaped);
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ---------- Filters ---------- */
    const filtered = useMemo(() => {
        return sales.filter((s) => {
            if (range === "Today" && s.dateLabel !== "Today") return false;
            if (range === "Yesterday" && s.dateLabel !== "Yesterday")
                return false;
            if (
                statusFilter !== "All" &&
                s.status?.toLowerCase() !== statusFilter.toLowerCase()
            )
                return false;
            if (
                methodFilter !== "All" &&
                s.payment_method?.toLowerCase() !==
                    methodFilter.toLowerCase()
            )
                return false;
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
    }, [sales, q, range, statusFilter, methodFilter]);

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
                "Method",
                "Status",
                "Amount",
                "Items",
                "Date",
                "Time",
            ],
            ...filtered.map((s) => [
                s.receipt_no,
                s.cashier,
                s.payment_method,
                s.status,
                s.total.toFixed(2),
                s.items,
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
                        Sales
                    </h2>
                    <p className="mt-0.5 text-[13px] text-gray-dim">
                        Every transaction, newest first.
                        {currentStaff && (
                            <>
                                {" "}
                                Showing as{" "}
                                <b className="text-bg">{currentStaff.name}</b>.
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
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                {[
                                    "Receipt",
                                    "Cashier",
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
                                        colSpan={9}
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
                                            {s.items}
                                        </td>
                                        <td className="whitespace-nowrap border-b border-lk px-3 py-2.5 text-[14px]">
                                            {s.payment_method}
                                        </td>
                                        <td className="whitespace-nowrap border-b border-lk px-3 py-2.5 text-[14px] font-semibold">
                                            {fm(s.total)}
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
                                            <button
                                                onClick={() => setPreview(s)}
                                                className="flex items-center gap-1.5 rounded-lg border border-lk bg-transparent px-2.5 py-1.5 text-[12px] font-semibold transition-colors hover:border-em"
                                            >
                                                <Eye
                                                    size={14}
                                                    strokeWidth={1.8}
                                                />
                                                View
                                            </button>
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
                    onClick={(e) =>
                        e.target === e.currentTarget && setPreview(null)
                    }
                >
                    <div className="max-h-[92vh] w-full max-w-[440px] overflow-auto rounded-2xl bg-white p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="m-0 text-[18px] font-bold">
                                    Sale details
                                </h2>
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

                        <div className="mb-4 grid grid-cols-3 gap-3">
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
                        </div>

                        <div className="mb-4 rounded-lg border border-lk bg-white p-3">
                            <Receipt r={preview} biz={biz} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                className="flex items-center justify-center gap-2 rounded-lg border border-bg bg-bg py-2.5 text-[14px] font-semibold text-white"
                                onClick={() => window.print()}
                            >
                                <Printer size={16} strokeWidth={1.8} />
                                Print
                            </button>
                            <button
                                className="rounded-lg border border-lk bg-transparent py-2.5 text-[14px] font-semibold"
                                onClick={() => setPreview(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
}