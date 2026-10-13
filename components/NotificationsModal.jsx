"use client";

import { useEffect } from "react";
import {
  X,
  Package,
  Check,
  AlertTriangle,
  PackageX,
  Bell,
  CreditCard,
} from "lucide-react";

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function iconFor(type) {
  if (type === "out_of_stock") {
    return { Icon: PackageX, wrap: "bg-black text-gray" };
  }
  if (type === "low_stock") {
    return { Icon: AlertTriangle, wrap: "bg-emd text-emb" };
  }
  if (type === "credit_critical") {
    return { Icon: CreditCard, wrap: "bg-black text-emb" };
  }
  if (type === "credit_low") {
    return { Icon: CreditCard, wrap: "bg-emd text-emb" };
  }
  return { Icon: Package, wrap: "bg-emd text-emb" };
}

export default function NotificationsModal({
  notifications,
  unreadCount,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onDelete,
}) {
  /* ---- Close on Escape ---- */
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* ---- Prevent body scroll while open ---- */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-lk p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-black text-emb">
              <Bell size={18} strokeWidth={2} />
            </div>
            <div>
              <h2 className="m-0 text-[18px] font-extrabold tracking-[-0.01em] text-black">
                Notifications
              </h2>
              <p className="mt-0.5 text-[13px] text-gray-dim">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1.5 rounded-lg border border-lk bg-transparent px-3 py-1.5 text-[12px] font-semibold text-black transition-colors hover:border-em"
              >
                <Check size={13} strokeWidth={2.5} />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:text-black"
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-black text-emb">
                <Bell size={22} strokeWidth={1.8} />
              </div>
              <div>
                <b className="block text-[15px] text-black">No notifications</b>
                <p className="mt-1 text-[13px] text-gray-dim">
                  Alerts about low stock and credits will appear here.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-lk">
              {notifications.map((n) => {
                const { Icon, wrap } = iconFor(n.type);
                return (
                  <li
                    key={n.id}
                    className={[
                      "group relative flex items-start gap-3 px-5 py-4 transition-colors",
                      n.read ? "opacity-70" : "bg-black/[0.015]",
                    ].join(" ")}
                  >
                    <span
                      className={`mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-lg ${wrap}`}
                    >
                      <Icon size={16} strokeWidth={2} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <b className="flex-1 text-[14px] font-semibold text-black">
                          {n.title}
                        </b>
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-emb" />
                        )}
                      </div>
                      {n.body && (
                        <p className="mt-0.5 text-[13px] leading-[1.4] text-gray-dim">
                          {n.body}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-dim">
                        <span>{timeAgo(n.created_at)}</span>
                        {!n.read && (
                          <button
                            onClick={() => onMarkRead(n.id)}
                            className="font-semibold text-black underline decoration-lk underline-offset-2 hover:decoration-emb"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(n.id)}
                          className="ml-auto font-semibold text-gray-dim opacity-0 transition-opacity hover:text-black group-hover:opacity-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="flex justify-end border-t border-lk p-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-black bg-black px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:border-emb hover:text-emb"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}