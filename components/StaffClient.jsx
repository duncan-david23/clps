"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Users,
  TrendingUp,
  CreditCard,
  Award,
  Trophy,
  Medal,
  BarChart3,
  Plus,
  ChevronRight,
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

const fmShort = (n) => {
  const num = Number(n) || 0;
  if (num >= 1_000_000) return "GHS " + (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return "GHS " + (num / 1_000).toFixed(1) + "K";
  return "GHS " + num.toFixed(0);
};

const initials = (name) => {
  if (!name) return "··";
  const s = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("");
  return (s.replace(/[^A-Za-z0-9]/g, "").slice(0, 2) || "··").toUpperCase();
};

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

const pillClass = (s) =>
  ({
    active: "bg-emd text-emb",
    disabled: "bg-gray/20 text-gray-dim",
    manager: "bg-black text-emb",
    cashier: "bg-emd text-emb",
  }[s?.toLowerCase()] || "bg-gray/20 text-gray-dim");

function Pill({ children, tone = "active" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${pillClass(
        tone
      )}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}

/* ============================================================
   Mini bar chart — 7-day sales per staff
   ============================================================ */
function MiniChart({ values, max }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="flex items-end gap-1 h-10">
      {values.map((v, i) => {
        const pct = max > 0 ? (v / max) * 100 : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-sm bg-em transition-all duration-300"
              style={{ height: `${Math.max(4, pct)}%`, minHeight: 3 }}
              title={`${days[i]}: ${fm(v)}`}
            />
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   Top performer card
   ============================================================ */
function TopPerformer({ staff, rank, totalRevenue }) {
  const rankIcons = [
    <Trophy key={1} size={16} strokeWidth={2.2} />,
    <Medal key={2} size={16} strokeWidth={2.2} />,
    <Award key={3} size={16} strokeWidth={2.2} />,
  ];
  const rankTones = [
    "bg-emb text-bg",
    "bg-emd text-emb",
    "bg-gray/20 text-gray-dim",
  ];

  const share =
    totalRevenue > 0 ? ((staff.revenue / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div
      className={[
        "rounded-xl border p-5 transition-all",
        rank === 0
          ? "border-black bg-black text-white"
          : "border-lk bg-white",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={[
              "relative grid h-12 w-12 flex-none place-items-center rounded-xl text-[14px] font-extrabold",
              rank === 0 ? "bg-emb text-bg" : "bg-emd text-emb",
            ].join(" ")}
          >
            {initials(staff.name)}
            <span
              className={[
                "absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full ring-2",
                rankTones[rank] || rankTones[2],
                rank === 0 ? "ring-black" : "ring-white",
              ].join(" ")}
            >
              {rankIcons[rank] || <BarChart3 size={14} />}
            </span>
          </div>
          <div className="min-w-0">
            <b
              className={[
                "block truncate text-[15px] font-bold",
                rank === 0 ? "text-white" : "text-black",
              ].join(" ")}
            >
              {staff.name}
            </b>
            <span
              className={[
                "mt-0.5 block text-[12px] capitalize",
                rank === 0 ? "text-gray" : "text-gray-dim",
              ].join(" ")}
            >
              {staff.role}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <span
          className={[
            "text-[11px] font-semibold uppercase tracking-[0.06em]",
            rank === 0 ? "text-gray" : "text-gray-dim",
          ].join(" ")}
        >
          Revenue · 7 days
        </span>
        <b
          className={[
            "mt-1 block text-[24px] font-extrabold tracking-[-0.02em]",
            rank === 0 ? "text-emb" : "text-black",
          ].join(" ")}
        >
          {fm(staff.revenue)}
        </b>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div
          className={[
            "rounded-lg p-2.5",
            rank === 0 ? "bg-white/5" : "bg-black/[0.03]",
          ].join(" ")}
        >
          <span
            className={[
              "block text-[10px] font-semibold uppercase tracking-[0.06em]",
              rank === 0 ? "text-gray" : "text-gray-dim",
            ].join(" ")}
          >
            Sales
          </span>
          <b
            className={[
              "mt-0.5 block text-[16px] font-extrabold",
              rank === 0 ? "text-white" : "text-black",
            ].join(" ")}
          >
            {staff.count}
          </b>
        </div>
        <div
          className={[
            "rounded-lg p-2.5",
            rank === 0 ? "bg-white/5" : "bg-black/[0.03]",
          ].join(" ")}
        >
          <span
            className={[
              "block text-[10px] font-semibold uppercase tracking-[0.06em]",
              rank === 0 ? "text-gray" : "text-gray-dim",
            ].join(" ")}
          >
            Share
          </span>
          <b
            className={[
              "mt-0.5 block text-[16px] font-extrabold",
              rank === 0 ? "text-white" : "text-black",
            ].join(" ")}
          >
            {share}%
          </b>
        </div>
      </div>

      <div className="mt-4">
        <MiniChart values={staff.daily} max={staff.dailyMax} />
      </div>
    </div>
  );
}

/* ============================================================
   Staff row — table view
   ============================================================ */
function StaffRow({ staff, onSelect }) {
  return (
    <tr className="border-t border-lk transition-colors hover:bg-black/[0.03]">
      <td className="whitespace-nowrap px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-emd text-[12px] font-bold text-emb">
            {initials(staff.name)}
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-black">{staff.name}</div>
            <div className="text-[11px] text-gray-dim">
              Code · <span className="font-mono">{staff.staff_code}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <Pill tone={staff.role}>{staff.role}</Pill>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <Pill tone={staff.is_active ? "active" : "disabled"}>
          {staff.is_active ? "Active" : "Disabled"}
        </Pill>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[14px] font-semibold text-black">
        {staff.countToday}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[14px] font-semibold text-black">
        {fm(staff.revenueToday)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[14px] text-gray-dim">
        {staff.countYesterday}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[14px] text-gray-dim">
        {fm(staff.revenueYesterday)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[14px] font-semibold text-black">
        {staff.count}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[14px] font-semibold text-emb">
        {fm(staff.revenue)}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <button
          onClick={() => onSelect(staff)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:border-em hover:text-black"
          aria-label="View"
        >
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </td>
    </tr>
  );
}

/* ============================================================
   Page
   ============================================================ */
export default function StaffPage() {
  const supabase = createClient();

  const [staff, setStaff] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [range, setRange] = useState("7D");
  const [selected, setSelected] = useState(null);

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

      // All staff
      const { data: staffRows, error: staffErr } = await supabase
        .from("staff")
        .select("id, name, role, staff_code, is_active, created_at")
        .order("name");

      if (staffErr) {
        setLoadError(staffErr.message);
        setLoading(false);
        return;
      }

      // Sales, last 365 days
      const since = startOfDaysAgo(365).toISOString();
      const { data: saleRows, error: salesErr } = await supabase
        .from("sales")
        .select("id, total, status, created_at, staff_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (salesErr) {
        setLoadError(salesErr.message);
        setLoading(false);
        return;
      }

      setStaff(staffRows || []);
      setSales(saleRows || []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Compute per-staff stats ---------- */
  const enrichedStaff = useMemo(() => {
    const todayStart = startOfToday().getTime();
    const yesterdayStart = startOfYesterday().getTime();

    // Chart window depends on `range` — 7 days of daily buckets
    const days = 7;
    const now = new Date();

    return staff.map((s) => {
      const mySales = sales.filter((x) => x.staff_id === s.id);

      const paid = mySales.filter((x) => x.status?.toLowerCase() === "paid");

      const todayPaid = paid.filter(
        (x) => new Date(x.created_at).getTime() >= todayStart
      );
      const yesterdayPaid = paid.filter((x) => {
        const t = new Date(x.created_at).getTime();
        return t >= yesterdayStart && t < todayStart;
      });

      const revenueToday = todayPaid.reduce(
        (a, x) => a + (Number(x.total) || 0),
        0
      );
      const revenueYesterday = yesterdayPaid.reduce(
        (a, x) => a + (Number(x.total) || 0),
        0
      );

      // Daily buckets for the mini chart (last 7 days)
      const daily = Array.from({ length: days }, (_, i) => {
        const bucketStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - (days - 1 - i)
        ).getTime();
        const bucketEnd = bucketStart + 86400000;
        return paid
          .filter((x) => {
            const t = new Date(x.created_at).getTime();
            return t >= bucketStart && t < bucketEnd;
          })
          .reduce((a, x) => a + (Number(x.total) || 0), 0);
      });

      const dailyMax = Math.max(...daily, 1);

      const revenue = paid.reduce((a, x) => a + (Number(x.total) || 0), 0);
      const count = paid.length;

      return {
        ...s,
        revenue,
        count,
        revenueToday,
        revenueYesterday,
        countToday: todayPaid.length,
        countYesterday: yesterdayPaid.length,
        daily,
        dailyMax,
      };
    });
  }, [staff, sales]);

  /* ---------- Filtered list ---------- */
  const filtered = useMemo(() => {
    return enrichedStaff.filter((s) => {
      if (roleFilter !== "All" && s.role !== roleFilter) return false;
      if (q) {
        const t = q.toLowerCase();
        if (
          !s.name.toLowerCase().includes(t) &&
          !(s.staff_code || "").toLowerCase().includes(t)
        )
          return false;
      }
      return true;
    });
  }, [enrichedStaff, q, roleFilter]);

  /* ---------- Totals ---------- */
  const totals = useMemo(() => {
    const active = enrichedStaff.filter((s) => s.is_active);
    const managers = enrichedStaff.filter((s) => s.role === "manager");
    const cashiers = enrichedStaff.filter((s) => s.role === "cashier");
    const revenueToday = enrichedStaff.reduce(
      (a, s) => a + s.revenueToday,
      0
    );

    return {
      total: enrichedStaff.length,
      active: active.length,
      managers: managers.length,
      cashiers: cashiers.length,
      revenueToday,
    };
  }, [enrichedStaff]);

  /* ---------- Top performers (7 day window) ---------- */
  const topPerformers = useMemo(() => {
    return [...enrichedStaff]
      .filter((s) => s.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
  }, [enrichedStaff]);

  const topRevenueSum = useMemo(
    () => topPerformers.reduce((a, s) => a + s.revenue, 0),
    [topPerformers]
  );

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

  return (
    <div className="flex-1 overflow-auto px-4 pb-12 pt-7 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="m-0 text-[24px] font-extrabold tracking-[-0.02em]">
            Staff
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-dim">
            Monitor your team&apos;s sales performance.
          </p>
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-lg border border-black bg-black px-3.5 py-2 text-[14px] font-semibold text-white no-underline transition-colors hover:border-emb hover:text-emb"
        >
          <Plus size={16} strokeWidth={2.2} />
          Manage staff
        </Link>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border border-black bg-black p-5 text-white">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-gray">
              TOTAL STAFF
            </span>
            <Users size={16} strokeWidth={1.8} className="text-gray" />
          </div>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em]">
            {totals.total}
          </b>
          <em className="text-[12px] font-semibold not-italic text-emb">
            {totals.active} active
          </em>
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emb/20 blur-2xl" />
        </div>

        <div className="rounded-xl border border-lk p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-gray-dim">
              MANAGERS
            </span>
            <Users size={16} strokeWidth={1.8} className="text-gray-dim" />
          </div>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em] text-black">
            {totals.managers}
          </b>
          <em className="text-[12px] font-semibold not-italic text-em">
            Full access
          </em>
        </div>

        <div className="rounded-xl border border-lk p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-gray-dim">
              CASHIERS
            </span>
            <Users size={16} strokeWidth={1.8} className="text-gray-dim" />
          </div>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em] text-black">
            {totals.cashiers}
          </b>
          <em className="text-[12px] font-semibold not-italic text-gray-dim">
            On the till
          </em>
        </div>

        <div className="rounded-xl border border-lk p-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-gray-dim">
              TEAM SALES TODAY
            </span>
            <TrendingUp size={16} strokeWidth={1.8} className="text-gray-dim" />
          </div>
          <b className="my-1.5 block text-[26px] tracking-[-0.02em] text-black">
            {fmShort(totals.revenueToday)}
          </b>
          <em className="text-[12px] font-semibold not-italic text-em">
            All staff
          </em>
        </div>
      </div>

      {/* Top performers */}
      {topPerformers.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 className="m-0 text-[16px] font-bold tracking-[-0.01em] text-black">
                Top Performers
              </h3>
              <p className="mt-0.5 text-[13px] text-gray-dim">
                By revenue over the last 7 days.
              </p>
            </div>
            <span className="text-[12px] font-semibold text-gray-dim">
              {topPerformers.length}{" "}
              {topPerformers.length === 1 ? "person" : "people"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {topPerformers.map((s, i) => (
              <TopPerformer
                key={s.id}
                staff={s}
                rank={i}
                totalRevenue={topRevenueSum}
              />
            ))}
          </div>
        </div>
      )}

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-lk">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-lk p-4">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-lk px-3 py-2 text-gray transition-colors focus-within:border-em focus-within:ring-[3px] focus-within:ring-emb/25">
            <Search size={16} strokeWidth={1.8} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or staff code..."
              className="w-full border-0 bg-transparent text-[14px] text-black outline-none placeholder:text-gray-dim"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-lk bg-transparent px-3 py-2 text-[13px] font-semibold text-black transition-colors focus:border-em focus:outline-none"
          >
            <option value="All">All roles</option>
            <option value="manager">Managers</option>
            <option value="cashier">Cashiers</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-black/[0.02]">
                {[
                  "Staff",
                  "Role",
                  "Status",
                  "Sales (today)",
                  "Revenue (today)",
                  "Sales (yest.)",
                  "Revenue (yest.)",
                  "Sales (all)",
                  "Revenue (all)",
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
                    No staff match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <StaffRow key={s.id} staff={s} onSelect={setSelected} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="w-full max-w-[520px] rounded-2xl bg-white p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-14 w-14 flex-none place-items-center rounded-2xl bg-emd text-[16px] font-extrabold text-emb">
                {initials(selected.name)}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="m-0 truncate text-[18px] font-bold text-black">
                  {selected.name}
                </h2>
                <p className="mt-0.5 flex items-center gap-2 text-[13px] text-gray-dim">
                  <Pill tone={selected.role}>{selected.role}</Pill>
                  <span>
                    Code · <span className="font-mono">{selected.staff_code}</span>
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:text-black"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Bigger chart */}
            <div className="mb-5 rounded-xl border border-lk p-4">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim">
                Last 7 days
              </span>
              <div className="mt-3 flex items-end gap-2 h-24">
                {selected.daily.map((v, i) => {
                  const pct =
                    selected.dailyMax > 0
                      ? (v / selected.dailyMax) * 100
                      : 0;
                  return (
                    <div
                      key={i}
                      className="flex flex-1 flex-col items-center gap-1.5"
                    >
                      <span className="text-[10px] font-semibold text-gray-dim">
                        {v > 0 ? fmShort(v).replace("GHS ", "") : ""}
                      </span>
                      <div
                        className="w-full rounded-md bg-em transition-all duration-300"
                        style={{
                          height: `${Math.max(6, pct)}%`,
                          minHeight: 6,
                        }}
                      />
                      <span className="text-[10px] text-gray-dim">
                        {
                          ["M", "T", "W", "T", "F", "S", "S"][
                            (new Date().getDay() + 6 - (6 - i)) % 7
                          ]
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-lk p-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim">
                  Sales today
                </span>
                <b className="mt-1 block text-[20px] font-extrabold text-black">
                  {selected.countToday}
                </b>
              </div>
              <div className="rounded-lg border border-lk p-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim">
                  Revenue today
                </span>
                <b className="mt-1 block text-[20px] font-extrabold text-emb">
                  {fm(selected.revenueToday)}
                </b>
              </div>
              <div className="rounded-lg border border-lk p-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim">
                  Sales yesterday
                </span>
                <b className="mt-1 block text-[20px] font-extrabold text-black">
                  {selected.countYesterday}
                </b>
              </div>
              <div className="rounded-lg border border-lk p-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim">
                  Revenue yesterday
                </span>
                <b className="mt-1 block text-[20px] font-extrabold text-emb">
                  {fm(selected.revenueYesterday)}
                </b>
              </div>
              <div className="rounded-lg border border-lk p-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim">
                  Total sales
                </span>
                <b className="mt-1 block text-[20px] font-extrabold text-black">
                  {selected.count}
                </b>
              </div>
              <div className="rounded-lg border border-lk p-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-dim">
                  Total revenue
                </span>
                <b className="mt-1 block text-[20px] font-extrabold text-emb">
                  {fm(selected.revenue)}
                </b>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link
                href="/sales"
                className="rounded-lg border border-black bg-black py-2.5 text-center text-[14px] font-semibold text-white no-underline transition-colors hover:border-emb hover:text-emb"
              >
                View their sales
              </Link>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg border border-lk bg-transparent py-2.5 text-[14px] font-semibold text-black transition-colors hover:border-em"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}