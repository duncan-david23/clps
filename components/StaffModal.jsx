"use client";

import { useState } from "react";
import { X, RefreshCw, Eye, EyeOff } from "lucide-react";

/* 4-char code from an unambiguous alphabet: no I, O, 0, 1 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
    let out = "";
    for (let i = 0; i < 4; i++) {
        out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return out;
}

function Field({ label, children, hint }) {
    return (
        <label className="block text-[12px] font-semibold text-gray-dim">
            {label}
            <div className="mt-1">{children}</div>
            {hint && <p className="mt-1 text-[11px] text-gray-dim">{hint}</p>}
        </label>
    );
}

const inputCls =
    "block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] font-medium text-bg focus:border-em focus:outline-none focus:ring-[3px] focus:ring-emb/25 transition-colors";

export default function StaffModal({
    initial,
    existingStaff = [],
    onClose,
    onSave,
}) {
    const editing = !!initial;

    const [name, setName] = useState(initial?.name || "");
    const [role, setRole] = useState(initial?.role || "cashier");
    const [code, setCode] = useState(initial?.staff_code || makeCode());
    const [showCode, setShowCode] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const regenerate = () => {
        let attempts = 0;
        let candidate = makeCode();
        const taken = new Set(
            existingStaff
                .filter((s) => s.id !== initial?.id)
                .map((s) => (s.staff_code || "").toUpperCase())
        );
        while (taken.has(candidate) && attempts < 20) {
            candidate = makeCode();
            attempts++;
        }
        setCode(candidate);
        setShowCode(true);
        setError("");
    };

    const submit = async () => {
        setError("");

        if (name.trim().length < 2)
            return setError("Enter the staff member's name.");
        if (code.trim().length !== 4)
            return setError("The staff code must be exactly 4 characters.");

        const cleanCode = code.trim().toUpperCase();
        const cleanName = name.trim().replace(/\s+/g, " ");

        const dupCode = existingStaff.some(
            (s) =>
                s.id !== initial?.id &&
                (s.staff_code || "").toUpperCase() === cleanCode
        );
        if (dupCode)
            return setError("That code is already used. Generate a new one.");

        setSaving(true);

        try {
            await onSave({
                name: cleanName,
                role,
                staff_code: cleanCode,
            });
        } catch (e) {
            setError(e.message || "Save failed.");
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-20 grid place-items-center bg-bg/60 p-4"
            onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
        >
            <div className="max-h-[92vh] w-full max-w-[480px] overflow-auto rounded-2xl bg-white p-6">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="m-0 text-[18px] font-bold">
                            {editing ? "Edit staff" : "Add staff"}
                        </h2>
                        <p className="mt-0.5 text-[13px] text-gray-dim">
                            {editing
                                ? "Update the staff member's details."
                                : "They'll use their name and code to sign in on the POS."}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:text-bg disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X size={16} strokeWidth={1.8} />
                    </button>
                </div>

                <Field label="Full name">
                    <input
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError("");
                        }}
                        placeholder="e.g. Efua Asante"
                        className={inputCls}
                        autoFocus
                    />
                </Field>

                <div className="mt-3">
                    <Field label="Role">
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className={inputCls}
                        >
                            <option value="cashier">
                                Cashier — can sell and take payments
                            </option>
                            <option value="manager">
                                Manager — can also manage products
                            </option>
                        </select>
                    </Field>
                </div>

                <div className="mt-3">
                    <Field
                        label="Staff code"
                        hint="4 characters. They'll type this to sign in on the POS."
                    >
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    value={showCode ? code : "••••"}
                                    onChange={(e) => {
                                        const v = e.target.value
                                            .toUpperCase()
                                            .replace(/[^A-Z0-9]/g, "")
                                            .slice(0, 4);
                                        setCode(v);
                                        setError("");
                                    }}
                                    onFocus={() => setShowCode(true)}
                                    inputMode="text"
                                    maxLength={4}
                                    className={`${inputCls} pr-10 font-mono tracking-[0.3em] text-[16px]`}
                                    placeholder="XXXX"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCode((v) => !v)}
                                    className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-gray-dim transition-colors hover:text-bg"
                                    aria-label={showCode ? "Hide code" : "Show code"}
                                >
                                    {showCode ? (
                                        <EyeOff size={14} strokeWidth={1.8} />
                                    ) : (
                                        <Eye size={14} strokeWidth={1.8} />
                                    )}
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={regenerate}
                                className="flex flex-none items-center gap-1.5 rounded-lg border border-lk bg-transparent px-3 text-[12px] font-semibold transition-colors hover:border-em"
                            >
                                <RefreshCw size={13} strokeWidth={2} />
                                New
                            </button>
                        </div>
                    </Field>
                </div>

                {error && (
                    <div className="mt-4 rounded-lg border border-bg bg-bg px-3 py-2 text-[12px] font-semibold text-emb">
                        {error}
                    </div>
                )}

                <div className="mt-5 grid grid-cols-[1fr_2fr] gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-lg border border-lk bg-transparent py-3 text-[14px] font-semibold transition-colors hover:border-em disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={saving}
                        className="rounded-lg border border-emb bg-emb py-3 text-[14px] font-extrabold text-bg transition-colors hover:bg-em disabled:opacity-60"
                    >
                        {saving ? "Saving…" : editing ? "Save changes" : "Add staff"}
                    </button>
                </div>
            </div>
        </div>
    );
}