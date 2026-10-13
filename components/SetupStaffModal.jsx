"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
    let out = "";
    for (let i = 0; i < 4; i++) {
        out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return out;
}

const inputCls =
    "block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] font-medium text-bg focus:border-em focus:outline-none focus:ring-[3px] focus:ring-emb/25 transition-colors";

export default function SetupStaffModal({ onSuccess }) {
    const supabase = createClient();

    const [name, setName] = useState("");
    const [role, setRole] = useState("manager");
    const [code, setCode] = useState(makeCode());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const regenerate = () => setCode(makeCode());

    const submit = async (e) => {
        e.preventDefault();
        setError("");

        if (name.trim().length < 2)
            return setError("Enter your name.");
        if (code.trim().length !== 4)
            return setError("The staff code must be exactly 4 characters.");

        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setSaving(false);
            return setError("Session lost. Refresh and try again.");
        }

        const { error: err } = await supabase.from("staff").insert({
            name: name.trim(),
            role,
            staff_code: code.trim().toUpperCase(),
        });

        setSaving(false);

        if (err) {
            if (err.code === "23505")
                return setError(
                    "That code is already used. Generate a new one."
                );
            return setError(err.message);
        }

        onSuccess?.();
    };

    return (
        <div className="fixed inset-0 z-30 grid place-items-center bg-bg/80 p-4">
            <form
                onSubmit={submit}
                className="w-full max-w-[460px] rounded-2xl bg-white p-6"
            >
                <div className="mb-5">
                    <h2 className="m-0 text-[20px] font-extrabold tracking-[-0.01em]">
                        Set up your account
                    </h2>
                    <p className="mt-1 text-[13px] text-gray-dim">
                        Create a staff record for yourself. You&apos;ll use this
                        name and code to access the POS from now on.
                    </p>
                </div>

                <label className="block text-[12px] font-semibold text-gray-dim">
                    Your name
                    <input
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError("");
                        }}
                        placeholder="e.g. David Augustine"
                        className={`${inputCls} mt-1`}
                        autoFocus
                        disabled={saving}
                    />
                </label>

                <label className="mt-3 block text-[12px] font-semibold text-gray-dim">
                    Your role
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className={`${inputCls} mt-1`}
                        disabled={saving}
                    >
                        <option value="manager">
                            Manager — full access to everything
                        </option>
                        <option value="cashier">
                            Cashier — POS and Sales only
                        </option>
                    </select>
                </label>

                <label className="mt-3 block text-[12px] font-semibold text-gray-dim">
                    Your staff code
                    <div className="mt-1 flex gap-2">
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
                            maxLength={4}
                            className={`${inputCls} font-mono tracking-[0.3em] text-[16px]`}
                            disabled={saving}
                        />
                        <button
                            type="button"
                            onClick={regenerate}
                            disabled={saving}
                            className="flex flex-none items-center gap-1.5 rounded-lg border border-lk bg-transparent px-3 text-[12px] font-semibold transition-colors hover:border-em disabled:opacity-50"
                        >
                            <RefreshCw size={13} strokeWidth={2} />
                            New
                        </button>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-dim">
                        You&apos;ll type this code each time you open a shift.
                    </p>
                </label>

                {error && (
                    <div className="mt-4 rounded-lg border border-bg bg-bg px-3 py-2 text-[12px] font-semibold text-emb">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    className="mt-5 w-full rounded-lg border border-emb bg-emb py-3 text-[14px] font-extrabold text-bg transition-colors hover:bg-em disabled:opacity-60"
                >
                    {saving ? "Creating…" : "Create my staff record"}
                </button>
            </form>
        </div>
    );
}