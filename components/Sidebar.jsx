"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Monitor,
  Package,
  Warehouse,
  TrendingUp,
  CreditCard,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ListTodo,
  PlayCircle,
  StopCircle,
  Lock,
  Bell,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import StaffLoginModal from "@/components/StaffLoginModal";
import NotificationsModal from "@/components/NotificationsModal";

const NAV = [
  {
    label: "MAIN",
    items: [
      { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { key: "pos", label: "POS", href: "/pos", icon: Monitor, primary: true, staffVisible: true },
      { key: "products", label: "Products", href: "/products", icon: Package },
      { key: "categories", label: "Categories", href: "/categories", icon: ListTodo },
      { key: "inventory", label: "Inventory", href: "/inventory", icon: Warehouse },
      { key: "sales", label: "Sales", href: "/sales", icon: TrendingUp, staffVisible: true },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { key: "reports", label: "Reports", href: "/reports", icon: BarChart3 },
      { key: "staff", label: "Staff", href: "/staff", icon: UserCog },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { key: "credits", label: "Buy credits", href: "/credits", icon: CreditCard },
      {
        key: "settings",
        label: "Settings",
        href: "/settings",
        icon: Settings,
        alwaysAllowed: true,
        managerOnly: true,
      },
    ],
  },
];

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

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bizName, setBizName] = useState("");
  const [email, setEmail] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [pendingHref, setPendingHref] = useState(null);

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const currentUserRef = useRef(null);

  /* ---- pendingHref cleanup ---- */
  useEffect(() => {
    if (!pendingHref) return;
    if (pathname === pendingHref || pathname.startsWith(pendingHref + "/")) {
      setPendingHref(null);
    }
  }, [pathname, pendingHref]);

  /* ---- Load biz info + watch localStorage for staff changes ---- */
  useEffect(() => {
    let cancelled = false;

    const loadBiz = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      currentUserRef.current = user.id;
      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("business_name")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      setBizName(
        profile?.business_name ||
          user.user_metadata?.business_name ||
          "Your business"
      );
    };

    const syncStaff = async () => {
      const localId = window.localStorage.getItem("claukk_staff_id");

      if (!localId) {
        if (!cancelled) setStaff(null);
        return;
      }

      const { data: st } = await supabase
        .from("staff")
        .select("id, name, role, is_active")
        .eq("id", localId)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;

      if (st) {
        setStaff({ ...st, role: (st.role || "").toLowerCase().trim() });
      } else {
        window.localStorage.removeItem("claukk_staff_id");
        window.localStorage.removeItem("claukk_staff_name");
        window.localStorage.removeItem("claukk_staff_role");
        setStaff(null);
      }
    };

    const boot = async () => {
      await loadBiz();
      await syncStaff();
      if (!cancelled) setLoading(false);
    };

    boot();

    const onStorage = () => {
      syncStaff();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Notifications: load + realtime ---- */
  useEffect(() => {
    let cancelled = false;
    let channel = null;

    const loadNotifications = async (uid) => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, product_id, read, created_at")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error || cancelled) return;

      setNotifications(data || []);
      setUnreadCount((data || []).filter((n) => !n.read).length);
    };

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      currentUserRef.current = user.id;
      await loadNotifications(user.id);

      if (cancelled) return;

      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `owner_id=eq.${user.id}`,
          },
          (payload) => {
            const n = payload.new;
            setNotifications((list) => [n, ...list].slice(0, 20));
            setUnreadCount((c) => c + 1);
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = (href) => {
    if (pendingHref) return pendingHref === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    window.localStorage.removeItem("claukk_staff_id");
    window.localStorage.removeItem("claukk_staff_name");
    window.localStorage.removeItem("claukk_staff_role");
    window.dispatchEvent(new Event("storage"));
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const endShift = () => {
    window.localStorage.removeItem("claukk_staff_id");
    window.localStorage.removeItem("claukk_staff_name");
    window.localStorage.removeItem("claukk_staff_role");
    window.dispatchEvent(new Event("storage"));
    window.location.reload();
  };

  /* ---- Notification actions ---- */
  const markRead = async (id) => {
    const n = notifications.find((x) => x.id === id);
    if (!n || n.read) return;

    setNotifications((list) =>
      list.map((x) => (x.id === id ? { ...x, read: true } : x))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    const uid = currentUserRef.current;
    if (!uid) return;

    setNotifications((list) => list.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("owner_id", uid)
      .eq("read", false);
  };

  const deleteNotification = async (id) => {
    const n = notifications.find((x) => x.id === id);
    if (!n) return;

    setNotifications((list) => list.filter((x) => x.id !== id));
    if (!n.read) setUnreadCount((c) => Math.max(0, c - 1));

    await supabase.from("notifications").delete().eq("id", id);
  };

  const staffRole = staff?.role;
  const locked = !staff;
  const isManager = staffRole === "manager";
  const isCashier = staffRole === "cashier";

  const itemLocked = (item) => {
    if (isManager) return false;
    if (isCashier) return !item.staffVisible;
    return !item.alwaysAllowed;
  };

  const showStartShift = !loading && !staff;

  // Hide notifications for cashiers — they're for the owner
  const showNotifications = !isCashier;

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="fixed left-4 top-4 z-[9] grid h-9 w-9 place-items-center rounded-lg border border-lk bg-white md:hidden"
      >
        <Menu size={18} strokeWidth={1.8} />
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-[7] bg-black/50 md:hidden"
          aria-hidden
        />
      )}

      <aside
        className={[
          "flex flex-none flex-col overflow-auto bg-side text-white",
          "h-screen sticky top-0 transition-[width] duration-200",
          collapsed ? "w-[78px] px-2 py-6" : "w-[250px] px-3 py-6",
          "max-md:fixed max-md:z-[8] max-md:inset-y-0 max-md:left-0 max-md:w-[250px] max-md:px-3",
          "max-md:transition-transform max-md:duration-200",
          "max-md:pt-[calc(24px+env(safe-area-inset-top,0px))]",
          mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full",
        ].join(" ")}
      >
        <div
          className={[
            "flex items-center justify-between gap-2 pb-5",
            collapsed ? "justify-center px-0" : "px-3",
          ].join(" ")}
        >
          {!collapsed && (
            <div>
              <b className="text-[20px] font-extrabold tracking-[-0.02em]">
                Claukk<i className="not-italic text-emb">POS</i>
              </b>
              <small className="block text-[11px] text-gray-dim">ClaukkSuite</small>
            </div>
          )}

          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-7 w-7 flex-none place-items-center rounded-md border border-line bg-graphite text-gray transition-colors hover:border-emd hover:text-emb md:grid"
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.8} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.8} />
            )}
          </button>

          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="grid h-7 w-7 flex-none place-items-center rounded-md border border-line bg-graphite text-gray transition-colors hover:border-emd hover:text-emb md:hidden"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {locked && !loading && !collapsed && (
          <div className="mx-1 mb-3 rounded-lg border border-line bg-graphite px-3 py-2.5">
            <b className="block text-[12px] font-semibold text-white">
              No one on shift
            </b>
            <small className="mt-0.5 block text-[11px] text-gray-dim">
              Sign in with a staff code to unlock the app.
            </small>
            <button
              onClick={() => setShowShiftModal(true)}
              className="mt-2 flex w-full items-center justify-center rounded-md border border-emb bg-emb py-1.5 text-[11px] font-bold text-bg"
            >
              Start shift
            </button>
          </div>
        )}

        {staff && !collapsed && (
          <div className="mx-1 mb-3 rounded-lg border border-emd bg-emd/30 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-emd text-[10px] font-bold text-emb">
                {initials(staff.name)}
              </span>
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[12px] font-semibold">
                  {staff.name}
                </b>
                <small className="block text-[10px] capitalize text-emb">
                  {staff.role} on shift
                </small>
              </div>
            </div>
            <button
              onClick={endShift}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-emd bg-transparent py-1.5 text-[11px] font-bold text-emb transition-colors hover:bg-emd/60"
            >
              <StopCircle size={12} strokeWidth={2.2} />
              End shift
            </button>
          </div>
        )}

        <nav>
          {NAV.map((group) => (
            <div key={group.label}>
              <div
                className={[
                  "text-[11px] font-semibold text-gray-dim",
                  collapsed
                    ? "px-0 pb-1.5 pt-4 text-center text-[9px] tracking-[0.05em]"
                    : "px-3 pb-1.5 pt-4",
                ].join(" ")}
              >
                {collapsed ? group.label.slice(0, 3) : group.label}
              </div>

              {group.items.map((item) => {
                const { key, label, href, icon: Icon, primary } = item;
                const active = isActive(href);
                const isLocked = itemLocked(item);

                if (isLocked) {
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled
                      title={
                        collapsed
                          ? `${label} — locked`
                          : locked
                          ? "Sign in to unlock"
                          : "Managers only"
                      }
                      className={[
                        "relative flex w-full cursor-not-allowed items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-left font-medium opacity-40",
                        collapsed ? "justify-center gap-0 px-0 py-2" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <Icon size={18} strokeWidth={1.6} />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{label}</span>
                          <Lock size={12} strokeWidth={1.8} />
                        </>
                      )}
                    </button>
                  );
                }

                return (
                  <Link
                    key={key}
                    href={href}
                    title={collapsed ? label : undefined}
                    onClick={() => {
                      setPendingHref(href);
                      setMobileOpen(false);
                    }}
                    className={[
                      "relative flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-left font-medium no-underline transition-colors",
                      primary
                        ? "my-1.5 rounded-[10px] border border-emd py-[18px] font-bold text-white"
                        : "",
                      active
                        ? primary
                          ? "bg-transparent text-emb"
                          : "bg-emd text-emb"
                        : "text-gray hover:bg-graphite hover:text-white",
                      active && !primary
                        ? "before:absolute before:-left-3 before:bottom-2 before:top-2 before:w-[3px] before:rounded-r-[3px] before:bg-emb before:content-['']"
                        : "",
                      collapsed ? "justify-center gap-0 px-0 py-2 before:-left-2" : "",
                      collapsed && primary ? "py-3.5" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.6}
                      className={primary ? "text-emb" : ""}
                    />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Notifications bell — opens a modal */}
        {showNotifications && (
          <button
            onClick={() => setNotifModalOpen(true)}
            className={[
              "relative mt-3 flex w-full items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-left font-medium transition-colors",
              "text-gray hover:bg-graphite hover:text-white",
              collapsed ? "justify-center gap-0 px-0 py-2" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title="Notifications"
          >
            <span className="relative flex-none">
              <Bell size={18} strokeWidth={1.6} />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-emb px-1 text-[9px] font-extrabold text-bg">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            {!collapsed && (
              <>
                <span className="flex-1">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-emb px-2 py-0.5 text-[10px] font-extrabold text-bg">
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </button>
        )}

        <div
          className={[
            "mt-auto flex items-center gap-2.5 border-t border-line pt-4",
            collapsed ? "justify-center px-0" : "px-3",
          ].join(" ")}
        >
          <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-emd text-[12px] font-bold text-emb">
            {initials(staff ? staff.name : bizName)}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 leading-[1.2]">
                <span className="block truncate">
                  {staff ? staff.name : bizName || "—"}
                </span>
                <small className="block truncate text-gray">
                  {staff ? `${staff.role} on shift` : email || "Owner"}
                </small>
              </div>
              {staff ? (
                <button
                  onClick={endShift}
                  aria-label="End shift"
                  title="End shift"
                  className="grid place-items-center border-0 bg-transparent text-emb transition-colors hover:text-em"
                >
                  <StopCircle size={16} strokeWidth={1.8} />
                </button>
              ) : (
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  aria-label="Log out"
                  title="Log out"
                  className="grid place-items-center border-0 bg-transparent text-gray transition-colors hover:text-emb disabled:opacity-50"
                >
                  <LogOut size={16} strokeWidth={1.8} />
                </button>
              )}
            </>
          )}
        </div>

        <div
          className={[
            "pt-2.5 text-[10px] text-gray-dim",
            collapsed ? "px-0 text-center text-[9px]" : "px-3",
          ].join(" ")}
        >
          ClaukkPOS
          <br />
          v1.0.0
        </div>
      </aside>

      {showShiftModal && (
        <StaffLoginModal
          onClose={() => setShowShiftModal(false)}
          onSuccess={(s) => {
            window.localStorage.setItem("claukk_staff_id", s.id);
            window.localStorage.setItem("claukk_staff_name", s.name);
            window.localStorage.setItem(
              "claukk_staff_role",
              (s.role || "").toLowerCase().trim()
            );
            window.dispatchEvent(new Event("storage"));
            window.location.reload();
          }}
        />
      )}

      {notifModalOpen && (
        <NotificationsModal
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={() => setNotifModalOpen(false)}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onDelete={deleteNotification}
        />
      )}

      {showStartShift && (
        <button
          onClick={() => setShowShiftModal(true)}
          className="fixed bottom-5 right-5 z-[9] flex items-center gap-2 rounded-full border border-emb bg-emb px-5 py-3 text-[13px] font-extrabold text-bg shadow-lg shadow-emd/30 transition-transform hover:scale-105"
          title="Sign in with a staff code"
        >
          <PlayCircle size={18} strokeWidth={2.2} />
          Start shift
        </button>
      )}
    </>
  );
}