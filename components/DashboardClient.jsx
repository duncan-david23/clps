"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { createClient } from "@/lib/supabase/client";

/* ---------- helpers ---------- */

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

const pillClass = (s) =>
  ({
    paid: "bg-emd text-emb",
    pending: "bg-gray/20 text-gray-dim",
    failed: "bg-bg text-gray",
    refunded: "bg-gray/20 text-gray-dim",
    OK: "bg-emd text-emb",
    "Low Stock": "bg-gray/20 text-gray-dim",
    "Out of Stock": "bg-bg text-gray",
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

/* ---------- date helpers ---------- */

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
function startOfDaysAgo(n) {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString("en", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- chart data generator ---------- */

function makeChartData(range, metric, sales) {
  const days = { "7D": 7, "30D": 30, "90D": 90, "1Y": 365 }[range] || 7;
  const bucketSize = days <= 7 ? 1 : days <= 30 ? 2 : days <= 90 ? 7 : 30;
  const bucketCount = Math.ceil(days / bucketSize);

  const now = new Date();
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    date: new Date(
      now.getTime() - (bucketCount - 1 - i) * bucketSize * 86400000
    ),
    value: 0,
  }));

  const isRev = metric === "Revenue";

  sales.forEach((s) => {
    const t = new Date(s.created_at).getTime();
    const diffDays = Math.floor((now.getTime() - t) / 86400000);
    if (diffDays >= days) return;

    const idx = bucketCount - 1 - Math.floor(diffDays / bucketSize);
    if (idx < 0 || idx >= bucketCount) return;

    if (isRev) {
      if (s.status?.toLowerCase() === "paid") {
        buckets[idx].value += Number(s.total) || 0;
      }
    } else {
      buckets[idx].value += 1;
    }
  });

  return buckets.map((b) => ({
    name: b.date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
    value: Math.round(b.value),
  }));
}

/* ---------- small UI pieces ---------- */

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
              ? "bg-black text-emb"
              : "bg-transparent text-gray-dim hover:text-black",
          ].join(" ")}
        >
          {x}
        </button>
      ))}
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-xl border border-lk p-5 ${className}`}>
      {children}
    </div>
  );
}

function Metric({ label, value, hint, dark }) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        dark ? "border-black bg-black text-white" : "border-lk"
      }`}
    >
      <span
        className={`text-[12px] font-semibold ${
          dark ? "text-gray" : "text-gray-dim"
        }`}
      >
        {label}
      </span>
      <b className="my-1.5 block text-[26px] tracking-[-0.02em]">{value}</b>
      {hint && (
        <em
          className={`text-[12px] font-semibold not-italic ${
            dark ? "text-emb" : "text-em"
          }`}
        >
          {hint}
        </em>
      )}
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {headers.map((h) => (
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
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-8 text-center text-[13px] text-gray-dim"
              >
                Nothing here yet.
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={i}
                className="transition-colors last:[&>td]:border-0 hover:bg-black/[0.03]"
              >
                {r.map((c, j) => (
                  <td
                    key={j}
                    className="whitespace-nowrap border-b border-lk px-3 py-2.5 text-[14px]"
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- page ---------- */

export default function DashboardPage() {
  const supabase = createClient();

  const [metric, setMetric] = useState("Revenue");
  const [range, setRange] = useState("7D");
  const [dateFilter, setDateFilter] = useState("Today");

  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [bizName, setBizName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  /* ---- Load everything ---- */
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
          "id, receipt_no, total, payment_method, status, created_at, staff_id"
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
          .select("sale_id, product_id, name, sku, quantity, line_total")
          .in("sale_id", saleIds);
        itemRows = items || [];
      }

      const { data: prodRows, error: prodsErr } = await supabase
        .from("products")
        .select("id, name, sku, stock, low_stock_threshold, selling_price")
        .order("stock", { ascending: true });

      if (prodsErr) {
        setLoadError(prodsErr.message);
        setLoading(false);
        return;
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

      const itemsBySale = new Map();
      itemRows.forEach((it) => {
        if (!itemsBySale.has(it.sale_id)) itemsBySale.set(it.sale_id, []);
        itemsBySale.get(it.sale_id).push(it);
      });

      const shapedSales = (saleRows || []).map((s) => ({
        id: s.id,
        receipt_no: s.receipt_no,
        total: Number(s.total) || 0,
        payment_method: s.payment_method,
        status: s.status,
        created_at: s.created_at,
        cashier: staffMap.get(s.staff_id) || "Owner",
        items: itemsBySale.get(s.id) || [],
      }));

      setSales(shapedSales);

      setProducts(
        (prodRows || []).map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          low: p.low_stock_threshold,
          price: Number(p.selling_price) || 0,
        }))
      );

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Apply the date filter ---- */
  const filteredSales = useMemo(() => {
    if (dateFilter === "All") return sales;

    const todayStart = startOfToday().getTime();
    const yesterdayStart = startOfYesterday().getTime();

    if (dateFilter === "Today") {
      return sales.filter(
        (s) => new Date(s.created_at).getTime() >= todayStart
      );
    }

    // Yesterday
    return sales.filter((s) => {
      const t = new Date(s.created_at).getTime();
      return t >= yesterdayStart && t < todayStart;
    });
  }, [sales, dateFilter]);

  /* ---- Derived stats (from filtered sales) ---- */
  const stats = useMemo(() => {
    const todayStart = startOfToday().getTime();
    const yesterdayStart = startOfYesterday().getTime();

    const todaySales = sales.filter(
      (s) => new Date(s.created_at).getTime() >= todayStart
    );
    const yesterdaySales = sales.filter((s) => {
      const t = new Date(s.created_at).getTime();
      return t >= yesterdayStart && t < todayStart;
    });

    const paidToday = todaySales.filter(
      (s) => s.status?.toLowerCase() === "paid"
    );
    const paidYesterday = yesterdaySales.filter(
      (s) => s.status?.toLowerCase() === "paid"
    );

    const revenueToday = paidToday.reduce((a, s) => a + s.total, 0);
    const revenueYesterday = paidYesterday.reduce((a, s) => a + s.total, 0);

    // Current period revenue = sum of filtered paid sales
    const paidFiltered = filteredSales.filter(
      (s) => s.status?.toLowerCase() === "paid"
    );
    const revenueFiltered = paidFiltered.reduce((a, s) => a + s.total, 0);

    const productsSoldFiltered = paidFiltered.reduce(
      (a, s) => a + s.items.reduce((sum, it) => sum + (it.quantity || 0), 0),
      0
    );

    const lowStockProducts = products.filter(
      (p) => p.stock > 0 && p.stock <= p.low
    );
    const outOfStock = products.filter((p) => p.stock === 0);

    const pct = (a, b) => {
      if (b === 0) return a > 0 ? "+100%" : "0%";
      const change = ((a - b) / b) * 100;
      const sign = change >= 0 ? "+" : "";
      return `${sign}${change.toFixed(1)}%`;
    };

    // Hint text depends on the filter
    let revenueHint = "";
    let transactionsHint = "";
    if (dateFilter === "Today") {
      revenueHint = `${pct(revenueToday, revenueYesterday)} from yesterday`;
      transactionsHint = pct(todaySales.length, yesterdaySales.length);
    } else if (dateFilter === "Yesterday") {
      revenueHint = "Yesterday's revenue";
      transactionsHint = "Yesterday's transactions";
    } else {
      revenueHint = "All-time revenue";
      transactionsHint = "All-time transactions";
    }

    return {
      revenue: dateFilter === "All" ? revenueFiltered : revenueFiltered,
      revenueToday,
      revenueYesterday,
      transactions: filteredSales.length,
      transactionsToday: todaySales.length,
      transactionsYesterday: yesterdaySales.length,
      productsSold: productsSoldFiltered,
      lowStock: lowStockProducts.length + outOfStock.length,
      revenueHint,
      transactionsHint,
      lowStockHint:
        lowStockProducts.length + outOfStock.length > 0
          ? "Needs attention"
          : "All good",
    };
  }, [sales, products, filteredSales, dateFilter]);

  /* ---- Top products (uses all-time sales, ignores the date filter) ---- */
  const topProducts = useMemo(() => {
    const since = startOfDaysAgo(30).getTime();
    const recentSales = sales.filter(
      (s) =>
        new Date(s.created_at).getTime() >= since &&
        s.status?.toLowerCase() === "paid"
    );

    const tally = new Map();
    recentSales.forEach((s) => {
      s.items.forEach((it) => {
        const key = it.name || "Unknown";
        const existing = tally.get(key) || { units: 0, revenue: 0 };
        existing.units += it.quantity || 0;
        existing.revenue += Number(it.line_total) || 0;
        tally.set(key, existing);
      });
    });

    return Array.from(tally.entries())
      .map(([name, { units, revenue }]) => ({ name, units, revenue }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 3);
  }, [sales]);

  /* ---- Recent sales (uses filtered sales, latest 6) ---- */
  const recentSales = useMemo(() => {
    return filteredSales.slice(0, 6);
  }, [filteredSales]);

  /* ---- Low stock products ---- */
  const lowStockList = useMemo(() => {
    return products
      .filter((p) => p.stock <= p.low)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 4);
  }, [products]);

  /* ---- Chart ---- */
  const chartData = useMemo(
    () => makeChartData(range, metric, sales),
    [range, metric, sales]
  );
  const isRev = metric === "Revenue";

  /* ---- Greeting ---- */
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = (bizName || "there").split(" ")[0];

  const periodLabel =
    dateFilter === "Today"
      ? "today"
      : dateFilter === "Yesterday"
      ? "yesterday"
      : "all time";

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

  return (
    <div className="flex-1 overflow-auto px-4 pb-12 pt-7 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="m-0 text-[24px] font-extrabold tracking-[-0.02em]">
            {greeting}, {firstName}.
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-dim">
            Here&apos;s what&apos;s happening with your business {periodLabel}.
          </p>
        </div>

        <Seg
          options={["Today", "Yesterday", "All"]}
          value={dateFilter}
          onChange={setDateFilter}
        />
      </div>

      {/* KPI grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          dark
          label="TOTAL SALES"
          value={fm(stats.revenue)}
          hint={stats.revenueHint}
        />
        <Metric
          label="TRANSACTIONS"
          value={String(stats.transactions)}
          hint={stats.transactionsHint}
        />
        <Metric
          label="PRODUCTS SOLD"
          value={String(stats.productsSold)}
          hint={periodLabel}
        />
        <Metric
          label="LOW STOCK"
          value={String(stats.lowStock)}
          hint={stats.lowStockHint}
        />
      </div>

      {/* Sales overview */}
      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-[16px] font-bold tracking-[-0.01em]">
              Sales Overview
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-dim">
              Revenue performance over the selected period.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Seg
              options={["Revenue", "Transactions"]}
              value={metric}
              onChange={setMetric}
            />
            <Seg
              options={["7D", "30D", "90D", "1Y"]}
              value={range}
              onChange={setRange}
            />
          </div>
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3fe0a6" stopOpacity={0.25} />
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
                  isRev ? (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v) : v
                }
              />
              <Tooltip
                cursor={{ stroke: "rgba(0,0,0,0.15)", strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "#000000",
                  border: "1px solid #0c3626",
                  borderRadius: 8,
                  color: "#f3f5f2",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 12px",
                }}
                labelStyle={{ color: "#8b968f", fontSize: 11, marginBottom: 2 }}
                formatter={(v) => [isRev ? fm(v) : v, metric]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#1fae7a"
                strokeWidth={2.5}
                fill="url(#chartFill)"
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

      {/* Recent sales */}
      <Card className="mb-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="m-0 text-[16px] font-bold tracking-[-0.01em]">
            Recent Sales
          </h2>
          <Link
            href="/sales"
            className="rounded-lg border border-lk bg-transparent px-3.5 py-2 text-[14px] font-semibold no-underline transition-colors hover:border-em"
          >
            View all
          </Link>
        </div>

        <Table
          headers={[
            "Receipt",
            "Cashier",
            "Amount",
            "Payment",
            "Status",
            "Time",
          ]}
          rows={recentSales.map((s) => [
            s.receipt_no,
            s.cashier,
            fm(s.total),
            s.payment_method,
            <StatusPill key={s.id} status={s.status} />,
            timeLabel(s.created_at),
          ])}
        />
      </Card>

      {/* Bottom two columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-[16px] font-bold tracking-[-0.01em]">
            Top Products
          </h2>
          <Table
            headers={["Product", "Units Sold", "Revenue"]}
            rows={topProducts.map((r) => [
              <span key={r.name} className="flex items-center">
                <span className="mr-2.5 grid h-8 w-8 flex-none place-items-center rounded-lg bg-black text-[12px] font-extrabold text-emb">
                  {ini(r.name)}
                </span>
                {r.name}
              </span>,
              r.units,
              fm(r.revenue),
            ])}
          />
        </Card>

        <Card>
          <h2 className="mb-3 text-[16px] font-bold tracking-[-0.01em]">
            Low Stock
          </h2>
          <Table
            headers={["Product", "Stock", "Min", "Status"]}
            rows={lowStockList.map((p) => [
              p.name.split(" ")[0],
              p.stock,
              p.low,
              <StatusPill
                key={p.id}
                status={
                  p.stock === 0
                    ? "Out of Stock"
                    : p.stock <= p.low
                    ? "Low Stock"
                    : "OK"
                }
              />,
            ])}
          />
        </Card>
      </div>
    </div>
  );
}