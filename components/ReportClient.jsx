"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Printer,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Download,
  Calendar,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
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

const fmShort = (n) => {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return "GHS " + (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return "GHS " + (num / 1_000).toFixed(1) + "K";
  return "GHS " + num.toFixed(0);
};

const ini = (n) =>
  n
    .split(/[ -]/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

const PIE_COLORS = ["#1fae7a", "#3fe0a6", "#0c3626", "#8b968f", "#5c6560"];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfDaysAgo(n) {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

const RANGES = [
  { key: "today", label: "Today", days: 0 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "1y", label: "1 year", days: 365 },
];

/* ============================================================
   Reusable pieces
   ============================================================ */
function Card({ children, className = "", title, subtitle, action }) {
  return (
    <div className={`rounded-xl border border-lk bg-white ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-lk p-5">
          <div>
            {title && (
              <h3 className="m-0 text-[16px] font-bold tracking-[-0.01em] text-black">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[13px] text-gray-dim">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function Metric({ label, value, hint, icon: Icon, dark, changePct }) {
  const positive = changePct == null || changePct >= 0;
  return (
    <div
      className={`rounded-xl border p-5 ${
        dark ? "border-black bg-black text-white" : "border-lk"
      }`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`text-[12px] font-semibold ${
            dark ? "text-gray" : "text-gray-dim"
          }`}
        >
          {label}
        </span>
        {Icon && (
          <Icon
            size={16}
            strokeWidth={1.8}
            className={dark ? "text-gray" : "text-gray-dim"}
          />
        )}
      </div>
      <b className="my-1.5 block text-[26px] tracking-[-0.02em]">{value}</b>
      {hint && (
        <em
          className={`flex items-center gap-1 text-[12px] font-semibold not-italic ${
            dark
              ? "text-emb"
              : changePct == null
              ? "text-gray-dim"
              : positive
              ? "text-em"
              : "text-red-600"
          }`}
        >
          {changePct != null &&
            (positive ? (
              <TrendingUp size={12} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={12} strokeWidth={2.5} />
            ))}
          {hint}
        </em>
      )}
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */
export default function ReportsPage() {
  const supabase = createClient();
  const printRef = useRef(null);

  const [range, setRange] = useState("30d");
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [bizName, setBizName] = useState("ClaukkPOS");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
      if (profile?.business_name) setBizName(profile.business_name);

      const since = startOfDaysAgo(365).toISOString();

      const { data: saleRows, error: salesErr } = await supabase
        .from("sales")
        .select(
          "id, receipt_no, total, subtotal, discount, tax, payment_method, payment_ref, status, created_at, staff_id"
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (salesErr) {
        setLoadError(salesErr.message);
        setLoading(false);
        return;
      }

      const saleIds = (saleRows || []).map((s) => s.id);
      let itemRows = [];
      if (saleIds.length) {
        const { data: items } = await supabase
          .from("sale_items")
          .select("sale_id, product_id, name, sku, quantity, unit_price, line_total")
          .in("sale_id", saleIds);
        itemRows = items || [];
      }

      const { data: prodRows } = await supabase
        .from("products")
        .select("id, name, sku, stock, low_stock_threshold, cost_price, selling_price")
        .order("name");

      const { data: staffRows } = await supabase
        .from("staff")
        .select("id, name, role, staff_code");

      const itemsBySale = new Map();
      itemRows.forEach((it) => {
        if (!itemsBySale.has(it.sale_id)) itemsBySale.set(it.sale_id, []);
        itemsBySale.get(it.sale_id).push(it);
      });

      const staffMap = new Map((staffRows || []).map((s) => [s.id, s]));

      setSales(
        (saleRows || []).map((s) => ({
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
          staff_id: s.staff_id,
          staff_name: staffMap.get(s.staff_id)?.name || "Owner",
          items: itemsBySale.get(s.id) || [],
        }))
      );

      setProducts(
        (prodRows || []).map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          low: p.low_stock_threshold,
          cost: Number(p.cost_price) || 0,
          price: Number(p.selling_price) || 0,
        }))
      );

      setStaff(staffRows || []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Filter sales by range ---------- */
  const scopedSales = useMemo(() => {
    const cfg = RANGES.find((r) => r.key === range);
    if (!cfg) return sales;

    if (cfg.key === "today") {
      const start = startOfToday().getTime();
      return sales.filter((s) => new Date(s.created_at).getTime() >= start);
    }

    const start = startOfDaysAgo(cfg.days).getTime();
    return sales.filter((s) => new Date(s.created_at).getTime() >= start);
  }, [sales, range]);

  /* ---------- Compute all metrics ---------- */
  const data = useMemo(() => {
    const paid = scopedSales.filter((s) => s.status?.toLowerCase() === "paid");
    const failed = scopedSales.filter(
      (s) => s.status?.toLowerCase() === "failed"
    );
    const pending = scopedSales.filter(
      (s) => s.status?.toLowerCase() === "pending"
    );

    const revenue = paid.reduce((a, s) => a + s.total, 0);
    const transactions = paid.length;
    const itemsSold = paid.reduce(
      (a, s) => a + s.items.reduce((sum, it) => sum + (it.quantity || 0), 0),
      0
    );
    const avgOrder = transactions > 0 ? revenue / transactions : 0;

    // Previous period comparison
    const cfg = RANGES.find((r) => r.key === range);
    let prevRevenue = 0;
    let prevTransactions = 0;
    if (cfg && cfg.key !== "today") {
      const periodEnd = startOfDaysAgo(cfg.days).getTime();
      const periodStart = startOfDaysAgo(cfg.days * 2).getTime();
      const prevPaid = sales.filter((s) => {
        const t = new Date(s.created_at).getTime();
        return (
          t >= periodStart &&
          t < periodEnd &&
          s.status?.toLowerCase() === "paid"
        );
      });
      prevRevenue = prevPaid.reduce((a, s) => a + s.total, 0);
      prevTransactions = prevPaid.length;
    }

    const pctChange = (a, b) => {
      if (b === 0) return a > 0 ? 100 : 0;
      return ((a - b) / b) * 100;
    };

    // Payment method breakdown
    const payMap = new Map();
    paid.forEach((s) => {
      const key = s.payment_method || "Cash";
      const existing = payMap.get(key) || { method: key, total: 0, count: 0 };
      existing.total += s.total;
      existing.count += 1;
      payMap.set(key, existing);
    });
    const paymentBreakdown = Array.from(payMap.values()).sort(
      (a, b) => b.total - a.total
    );

    // Top products
    const prodMap = new Map();
    paid.forEach((s) => {
      s.items.forEach((it) => {
        const key = it.name || "Unknown";
        const existing = prodMap.get(key) || {
          name: key,
          sku: it.sku || "",
          units: 0,
          revenue: 0,
        };
        existing.units += it.quantity || 0;
        existing.revenue += Number(it.line_total) || 0;
        prodMap.set(key, existing);
      });
    });
    const topProducts = Array.from(prodMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Staff performance
    const staffMap = new Map();
    staff.forEach((s) => {
      staffMap.set(s.id, {
        id: s.id,
        name: s.name,
        role: s.role,
        staff_code: s.staff_code,
        revenue: 0,
        count: 0,
        itemsSold: 0,
      });
    });
    paid.forEach((s) => {
      const rec = staffMap.get(s.staff_id) || {
        id: s.staff_id || "owner",
        name: s.staff_name,
        role: "owner",
        staff_code: "—",
        revenue: 0,
        count: 0,
        itemsSold: 0,
      };
      rec.revenue += s.total;
      rec.count += 1;
      rec.itemsSold += s.items.reduce(
        (sum, it) => sum + (it.quantity || 0),
        0
      );
      staffMap.set(rec.id, rec);
    });
    const staffPerformance = Array.from(staffMap.values())
      .filter((s) => s.count > 0)
      .sort((a, b) => b.revenue - a.revenue);

    // Time series for chart
    const days =
      cfg?.key === "today"
        ? 1
        : cfg?.key === "7d"
        ? 7
        : cfg?.key === "30d"
        ? 30
        : cfg?.key === "90d"
        ? 90
        : 365;
    const bucketSize = days <= 7 ? 1 : days <= 30 ? 1 : days <= 90 ? 7 : 30;
    const bucketCount = Math.ceil(days / bucketSize);

    const now = new Date();
    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const bucketDate = new Date(
        now.getTime() - (bucketCount - 1 - i) * bucketSize * 86400000
      );
      return {
        date: bucketDate,
        revenue: 0,
        transactions: 0,
      };
    });

    paid.forEach((s) => {
      const t = new Date(s.created_at).getTime();
      const diffDays = Math.floor((now.getTime() - t) / 86400000);
      if (diffDays < 0 || diffDays >= days) return;
      const idx = bucketCount - 1 - Math.floor(diffDays / bucketSize);
      if (idx < 0 || idx >= bucketCount) return;
      buckets[idx].revenue += s.total;
      buckets[idx].transactions += 1;
    });

    const timeSeries = buckets.map((b) => ({
      name: b.date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      Revenue: Math.round(b.revenue),
      Transactions: b.transactions,
    }));

    // Inventory summary
    const totalStockValue = products.reduce(
      (a, p) => a + p.cost * p.stock,
      0
    );
    const retailValue = products.reduce((a, p) => a + p.price * p.stock, 0);
    const lowStock = products.filter(
      (p) => p.stock > 0 && p.stock <= p.low
    ).length;
    const outOfStock = products.filter((p) => p.stock === 0).length;

    return {
      revenue,
      transactions,
      itemsSold,
      avgOrder,
      failedCount: failed.length,
      pendingCount: pending.length,
      prevRevenue,
      prevTransactions,
      revenueChange: pctChange(revenue, prevRevenue),
      transactionsChange: pctChange(transactions, prevTransactions),
      paymentBreakdown,
      topProducts,
      staffPerformance,
      timeSeries,
      inventory: {
        products: products.length,
        totalStockValue,
        retailValue,
        lowStock,
        outOfStock,
      },
    };
  }, [scopedSales, sales, products, staff, range]);

  /* ---------- Print ---------- */
  const handlePrint = () => {
    window.print();
  };

  /* ---------- Export CSV ---------- */
  const exportCsv = () => {
    const rows = [
      ["Report", bizName],
      ["Range", RANGES.find((r) => r.key === range)?.label || range],
      ["Generated", new Date().toLocaleString("en-GB")],
      [],
      ["Metric", "Value"],
      ["Revenue", data.revenue.toFixed(2)],
      ["Transactions", data.transactions],
      ["Items sold", data.itemsSold],
      ["Average order value", data.avgOrder.toFixed(2)],
      [],
      ["Top products"],
      ["Name", "SKU", "Units", "Revenue"],
      ...data.topProducts.map((p) => [
        p.name,
        p.sku,
        p.units,
        p.revenue.toFixed(2),
      ]),
      [],
      ["Staff performance"],
      ["Name", "Role", "Sales", "Revenue"],
      ...data.staffPerformance.map((s) => [
        s.name,
        s.role,
        s.count,
        s.revenue.toFixed(2),
      ]),
      [],
      ["Payment methods"],
      ["Method", "Count", "Total"],
      ...data.paymentBreakdown.map((p) => [
        p.method,
        p.count,
        p.total.toFixed(2),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const rangeLabel = RANGES.find((r) => r.key === range)?.label || "";

  return (
    <>
      {/* ============================================================
          PRINT STYLES
          ============================================================ */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm 12mm;
          }
          html,
          body {
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          #report-print-root,
          #report-print-root * {
            visibility: visible !important;
          }
          #report-print-root {
            position: absolute !important;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print-page {
            page-break-after: always;
          }
        }
      `}</style>

      <div className="flex-1 overflow-auto px-4 pb-12 pt-7 md:px-8">
        {/* ===== Header (hidden in print) ===== */}
        <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="m-0 text-[24px] font-extrabold tracking-[-0.02em] text-black">
              Reports
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-dim">
              Business performance, staff output, inventory and sales — all in
              one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 rounded-lg border border-lk bg-transparent px-3.5 py-2 text-[14px] font-semibold text-black transition-colors hover:border-em"
            >
              <Download size={16} strokeWidth={1.8} />
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg border border-black bg-black px-3.5 py-2 text-[14px] font-semibold text-white transition-colors hover:border-emb hover:text-emb"
            >
              <Printer size={16} strokeWidth={1.8} />
              Print / PDF
            </button>
          </div>
        </div>

        {/* ===== Range picker (hidden in print) ===== */}
        <div className="no-print mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-lk bg-white p-4">
          <Calendar size={16} strokeWidth={1.8} className="text-gray-dim" />
          <span className="text-[13px] font-semibold text-gray-dim">
            Period
          </span>
          <div className="inline-flex rounded-lg border border-lk p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={[
                  "rounded-md border-0 px-3 py-1.5 text-[12px] font-semibold transition-colors",
                  r.key === range
                    ? "bg-black text-emb"
                    : "bg-transparent text-gray-dim hover:text-black",
                ].join(" ")}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================
            PRINTABLE CONTENT
            ============================================================ */}
        <div id="report-print-root" ref={printRef}>
          {/* Report header — visible in print */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-lk pb-5">
            <div>
              <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.02em] text-black">
                {bizName}
              </h1>
              <p className="mt-1 text-[13px] text-gray-dim">
                Business Report · {rangeLabel}
              </p>
              <p className="mt-0.5 text-[12px] text-gray-dim">
                Generated on{" "}
                {new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}{" "}
                ·{" "}
                {new Date().toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim">
                Powered by
              </span>
              <b className="mt-0.5 block text-[15px] font-extrabold text-black">
                ClaukkPOS
              </b>
            </div>
          </div>

          {/* KPI grid */}
          <div className="print-break mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric
              dark
              label="REVENUE"
              value={fm(data.revenue)}
              hint={`${
                data.revenueChange >= 0 ? "+" : ""
              }${data.revenueChange.toFixed(1)}% vs previous`}
              changePct={data.revenueChange}
              icon={DollarSign}
            />
            <Metric
              label="TRANSACTIONS"
              value={String(data.transactions)}
              hint={`${
                data.transactionsChange >= 0 ? "+" : ""
              }${data.transactionsChange.toFixed(1)}% vs previous`}
              changePct={data.transactionsChange}
              icon={ShoppingCart}
            />
            <Metric
              label="ITEMS SOLD"
              value={String(data.itemsSold)}
              hint={rangeLabel}
              icon={Package}
            />
            <Metric
              label="AVG. ORDER VALUE"
              value={fm(data.avgOrder)}
              hint={rangeLabel}
              icon={BarChart3}
            />
          </div>

          {/* Revenue chart */}
          <Card
            title="Revenue over time"
            subtitle={`Daily revenue and transaction count across the selected period.`}
            className="print-break mb-6"
          >
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.timeSeries}
                  margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="reportFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#3fe0a6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3fe0a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(0,0,0,0.08)"
                    strokeDasharray="0"
                  />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#5c6560", fontSize: 11, fontWeight: 600 }}
                    dy={6}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#5c6560", fontSize: 11, fontWeight: 600 }}
                    width={48}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                    }
                  />
                  <Tooltip
                    cursor={{
                      stroke: "rgba(0,0,0,0.15)",
                      strokeDasharray: "3 3",
                    }}
                    contentStyle={{
                      background: "#000000",
                      border: "1px solid #0c3626",
                      borderRadius: 8,
                      color: "#f3f5f2",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "8px 12px",
                    }}
                    labelStyle={{
                      color: "#8b968f",
                      fontSize: 11,
                      marginBottom: 2,
                    }}
                    formatter={(v, k) => [k === "Revenue" ? fm(v) : v, k]}
                  />
                  <Area
                    type="monotone"
                    dataKey="Revenue"
                    stroke="#1fae7a"
                    strokeWidth={2.5}
                    fill="url(#reportFill)"
                    activeDot={{
                      r: 5,
                      fill: "#3fe0a6",
                      stroke: "#000000",
                      strokeWidth: 2,
                    }}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Payment methods + staff performance */}
          <div className="print-break mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card
              title="Sales by payment method"
              subtitle="How customers paid."
            >
              <div className="flex flex-wrap items-center gap-6">
                <div className="h-[200px] w-[200px] flex-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.paymentBreakdown}
                        dataKey="total"
                        nameKey="method"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {data.paymentBreakdown.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#000000",
                          border: "1px solid #0c3626",
                          borderRadius: 8,
                          color: "#f3f5f2",
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "8px 12px",
                        }}
                        formatter={(v) => fm(v)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="min-w-0 flex-1">
                  {data.paymentBreakdown.length === 0 ? (
                    <p className="text-[13px] text-gray-dim">
                      No paid sales in this period.
                    </p>
                  ) : (
                    <ul className="space-y-2.5">
                      {data.paymentBreakdown.map((p, i) => (
                        <li key={p.method} className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 flex-none rounded-sm"
                            style={{
                              background:
                                PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                          <span className="flex-1 truncate text-[13px] font-semibold text-black">
                            {p.method}
                          </span>
                          <span className="text-[12px] text-gray-dim">
                            {p.count} sale{p.count === 1 ? "" : "s"}
                          </span>
                          <b className="w-24 text-right text-[13px] font-extrabold tabular-nums text-black">
                            {fm(p.total)}
                          </b>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>

            <Card
              title="Staff performance"
              subtitle="Revenue by cashier."
            >
              {data.staffPerformance.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-gray-dim">
                  No staff sales in this period.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.staffPerformance.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg border border-lk p-3"
                    >
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-emd text-[11px] font-extrabold text-emb">
                        {ini(s.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <b className="block truncate text-[13px] font-semibold text-black">
                          {s.name}
                        </b>
                        <span className="text-[11px] capitalize text-gray-dim">
                          {s.role} · {s.count} sale
                          {s.count === 1 ? "" : "s"} · {s.itemsSold} items
                        </span>
                      </div>
                      <b className="text-[14px] font-extrabold tabular-nums text-emb">
                        {fm(s.revenue)}
                      </b>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Top products */}
          <Card
            title="Top products"
            subtitle="Best sellers by revenue."
            className="print-break mb-6"
          >
            {data.topProducts.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-gray-dim">
                No products sold in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {["#", "Product", "SKU", "Units", "Revenue"].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap border-b border-lk px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((p, i) => (
                      <tr
                        key={p.name}
                        className="border-t border-lk"
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 text-[13px] text-gray-dim tabular-nums">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2.5 text-[14px] font-semibold text-black">
                          {p.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[13px] text-gray-dim">
                          {p.sku || "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[14px] font-semibold text-black tabular-nums">
                          {p.units}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[14px] font-extrabold text-emb tabular-nums">
                          {fm(p.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Inventory status */}
          <div className="print-break mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="PRODUCTS"
              value={String(data.inventory.products)}
              hint="In catalogue"
              icon={Package}
            />
            <Metric
              label="STOCK VALUE (COST)"
              value={fmShort(data.inventory.totalStockValue)}
              hint="What you paid"
              icon={CreditCard}
            />
            <Metric
              label="RETAIL VALUE"
              value={fmShort(data.inventory.retailValue)}
              hint="At full price"
              icon={DollarSign}
            />
            <Metric
              label="LOW / OUT OF STOCK"
              value={`${data.inventory.lowStock} / ${data.inventory.outOfStock}`}
              hint={
                data.inventory.lowStock + data.inventory.outOfStock > 0
                  ? "Needs attention"
                  : "All good"
              }
              icon={Package}
            />
          </div>

          {/* Sales summary table — extra detail */}
          <Card
            title="Sales summary"
            subtitle="Detailed totals for the selected period."
            className="print-break"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-lk p-4">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim">
                  Paid sales
                </span>
                <b className="mt-1 block text-[22px] font-extrabold text-black tabular-nums">
                  {data.transactions}
                </b>
                <span className="mt-0.5 block text-[12px] text-gray-dim">
                  {fm(data.revenue)}
                </span>
              </div>
              <div className="rounded-lg border border-lk p-4">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim">
                  Pending
                </span>
                <b className="mt-1 block text-[22px] font-extrabold text-black tabular-nums">
                  {data.pendingCount}
                </b>
                <span className="mt-0.5 block text-[12px] text-gray-dim">
                  Awaiting payment
                </span>
              </div>
              <div className="rounded-lg border border-lk p-4">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim">
                  Failed
                </span>
                <b className="mt-1 block text-[22px] font-extrabold text-black tabular-nums">
                  {data.failedCount}
                </b>
                <span className="mt-0.5 block text-[12px] text-gray-dim">
                  Needs attention
                </span>
              </div>
            </div>
          </Card>

          {/* Print footer */}
          <div className="mt-8 border-t border-lk pt-4 text-center text-[11px] text-gray-dim">
            <p className="m-0">
              {bizName} · Report generated by ClaukkPOS on{" "}
              {new Date().toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}