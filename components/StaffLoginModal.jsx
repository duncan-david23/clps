"use client";

import { useEffect, useState } from "react";
import { X, KeyRound, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const inputCls =
    "block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] font-medium text-bg focus:border-em focus:outline-none focus:ring-[3px] focus:ring-emb/25 transition-colors";

export default function StaffLoginModal({ onClose, onSuccess }) {
    const supabase = createClient();

    const [staffList, setStaffList] = useState([]);
    const [listLoaded, setListLoaded] = useState(false);
    const [picked, setPicked] = useState(null);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    // Load the list of active staff the first time the modal opens
    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setListLoaded(true);
                return;
            }

            const { data } = await supabase
                .from("staff")
                .select("id, name, role, is_active")
                .eq("owner_id", user.id)
                .eq("is_active", true)
                .order("name");

            setStaffList(data || []);
            setListLoaded(true);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        if (!picked) return;

        setError("");
        if (code.trim().length !== 4)
            return setError("Enter the 4-character staff code.");

        setBusy(true);

        const { data: staff, error: err } = await supabase
            .from("staff")
            .select("id, name, role, is_active")
            .eq("id", picked.id)
            .eq("staff_code", code.trim().toUpperCase())
            .eq("is_active", true)
            .maybeSingle();

        setBusy(false);

        if (err) return setError(err.message);
        if (!staff) return setError("Wrong code. Try again.");

        onSuccess?.(staff);
    };

    return (
        <div
            className="fixed inset-0 z-30 grid place-items-center bg-bg/70 p-4"
            onClick={(e) =>
                e.target === e.currentTarget && !busy && onClose?.()
            }
        >
            <div className="w-full max-w-[440px] rounded-2xl bg-white p-6">
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {picked && (
                            <button
                                onClick={() => {
                                    setPicked(null);
                                    setCode("");
                                    setError("");
                                }}
                                className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:text-bg"
                                aria-label="Back"
                            >
                                <ChevronLeft size={16} strokeWidth={2} />
                            </button>
                        )}
                        <div>
                            <h2 className="m-0 text-[18px] font-bold">
                                {picked ? "Enter your code" : "Who's on shift?"}
                            </h2>
                            <p className="mt-0.5 text-[13px] text-gray-dim">
                                {picked
                                    ? `Confirm ${picked.name} to open the till.`
                                    : "Pick your name to start selling."}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={busy}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:text-bg disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X size={16} strokeWidth={1.8} />
                    </button>
                </div>

                {!listLoaded && (
                    <div className="rounded-lg border border-lk p-6 text-center text-[13px] text-gray-dim">
                        Loading…
                    </div>
                )}

                {listLoaded && !picked && staffList.length === 0 && (
                    <div className="rounded-lg border border-lk p-6 text-center">
                        <p className="text-[13px] font-semibold">
                            No staff records yet.
                        </p>
                        <p className="mt-1 text-[12px] text-gray-dim">
                            Add yourself as a staff member in Settings first.
                        </p>
                        <a
                            href="/settings"
                            className="mt-3 inline-block rounded-lg border border-emb bg-emb px-4 py-2 text-[13px] font-bold text-bg no-underline"
                        >
                            Go to Settings
                        </a>
                    </div>
                )}

                {!picked && staffList.length > 0 && (
                    <div className="space-y-2">
                        {staffList.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setPicked(s)}
                                className="flex w-full items-center gap-3 rounded-xl border border-lk p-3 text-left transition-colors hover:border-em"
                            >
                                <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-emd text-[12px] font-bold text-emb">
                                    {s.name
                                        .split(/\s+/)
                                        .filter(Boolean)
                                        .map((w) => w[0])
                                        .join("")
                                        .slice(0, 2)
                                        .toUpperCase()}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <b className="block truncate text-[14px] font-semibold">
                                        {s.name}
                                    </b>
                                    <small className="block text-[12px] capitalize text-gray-dim">
                                        {s.role}
                                    </small>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {picked && (
                    <form onSubmit={submit}>
                        <div className="mb-4 flex items-center gap-3 rounded-lg border border-lk p-3">
                            <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-emd text-[12px] font-bold text-emb">
                                {picked.name
                                    .split(/\s+/)
                                    .filter(Boolean)
                                    .map((w) => w[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                            </span>
                            <div>
                                <b className="block text-[14px] font-semibold">
                                    {picked.name}
                                </b>
                                <small className="block text-[12px] capitalize text-gray-dim">
                                    {picked.role}
                                </small>
                            </div>
                        </div>

                        <label className="block text-[12px] font-semibold text-gray-dim">
                            Staff code
                            <div className="relative mt-1">
                                <KeyRound
                                    size={15}
                                    strokeWidth={1.8}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-dim"
                                />
                                <input
                                    value={code}
                                    onChange={(e) => {
                                        const v = e.target.value
                                            .toUpperCase()
                                            .replace(/[^A-Z0-9]/g, "")
                                            .slice(0, 4);
                                        setCode(v);
                                        setError("");
                                    }}
                                    placeholder="XXXX"
                                    maxLength={4}
                                    inputMode="text"
                                    className={`${inputCls} pl-9 font-mono tracking-[0.3em] text-[16px]`}
                                    autoFocus
                                    disabled={busy}
                                />
                            </div>
                        </label>

                        {error && (
                            <div className="mt-4 rounded-lg border border-bg bg-bg px-3 py-2 text-[12px] font-semibold text-emb">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={busy}
                            className="mt-5 w-full rounded-lg border border-emb bg-emb py-3 text-[14px] font-extrabold text-bg transition-colors hover:bg-em disabled:opacity-60"
                        >
                            {busy ? "Checking…" : "Start shift"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}