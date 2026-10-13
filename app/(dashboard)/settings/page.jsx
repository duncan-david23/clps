"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Building2,
    Users,
    CreditCard,
    Check,
    Upload,
    Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadFileToCloudinary } from "@/lib/cloudinary";
import StaffModal from "@/components/StaffModal";

/* ============================================================
   Sections
   ============================================================ */
const SECTIONS = [
    { key: "business", label: "Business", icon: Building2 },
    { key: "users", label: "Users & Roles", icon: Users },
    { key: "payments", label: "Payments", icon: CreditCard },
];

/* ============================================================
   Reusable primitives
   ============================================================ */
const inputCls =
    "block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] font-medium text-black transition-colors focus:border-em focus:outline-none focus:ring-[3px] focus:ring-emb/25 disabled:opacity-50 placeholder:text-gray-dim";

function Field({ label, hint, children }) {
    return (
        <label className="block text-[12px] font-semibold text-gray-dim">
            {label}
            <div className="mt-1">{children}</div>
            {hint && (
                <p className="mt-1 text-[11px] font-normal text-gray-dim">
                    {hint}
                </p>
            )}
        </label>
    );
}

function SectionCard({ title, description, children, action }) {
    return (
        <div className="overflow-hidden rounded-xl border border-lk">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-lk p-5">
                <div>
                    <h3 className="m-0 text-[16px] font-bold tracking-[-0.01em] text-black">
                        {title}
                    </h3>
                    {description && (
                        <p className="mt-0.5 text-[13px] text-gray-dim">
                            {description}
                        </p>
                    )}
                </div>
                {action}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function SaveBar({ onSave, saved, saving, disabled }) {
    return (
        <div className="mt-5 flex items-center justify-between gap-3">
            <span
                className={`flex items-center gap-1.5 text-[12px] font-semibold transition-opacity ${
                    saved ? "text-em opacity-100" : "opacity-0"
                }`}
            >
                <Check size={14} strokeWidth={2.2} />
                Changes saved
            </span>
            <button
                onClick={onSave}
                disabled={saving || disabled}
                className="rounded-lg border border-black bg-black px-4 py-2.5 text-[14px] font-extrabold text-white transition-colors hover:border-emb hover:text-emb disabled:opacity-60"
            >
                {saving ? "Saving…" : "Save changes"}
            </button>
        </div>
    );
}

/* ============================================================
   Business section
   ============================================================ */
function BusinessSection() {
    const supabase = createClient();
    const fileRef = useRef(null);

    const [profileId, setProfileId] = useState(null);
    const [data, setData] = useState({
        name: "",
        phone: "",
        email: "",
        address: "",
        logo: "",
    });

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

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

            const { data, error } = await supabase
                .from("profiles")
                .select(
                    "id, business_name, phone, address, email, business_logo"
                )
                .eq("id", user.id)
                .single();

            if (error) {
                setLoadError(error.message);
                setLoading(false);
                return;
            }

            setProfileId(data.id);
            setData({
                name: data.business_name || "",
                phone: data.phone || "",
                email: data.email || user.email || "",
                address: data.address || "",
                logo: data.business_logo || "",
            });
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pickLogo = () => fileRef.current?.click();

    const onLogoFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/"))
            return setSaveError("Pick an image file.");
        if (file.size > 2 * 1024 * 1024)
            return setSaveError("Logo must be under 2MB.");

        setSaveError("");
        setUploadingLogo(true);

        try {
            const url = await uploadFileToCloudinary(file, "business-logos");
            set("logo", url);
        } catch (err) {
            setSaveError(err.message || "Logo upload failed.");
        } finally {
            setUploadingLogo(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const removeLogo = () => set("logo", "");

    const save = async () => {
        if (!profileId) return;

        setSaving(true);
        setSaveError("");

        const { error } = await supabase
            .from("profiles")
            .update({
                business_name: data.name.trim() || null,
                phone: data.phone.trim() || null,
                address: data.address.trim() || null,
                email: data.email.trim() || null,
                business_logo: data.logo || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", profileId);

        setSaving(false);

        if (error) return setSaveError(error.message);

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (loading) {
        return (
            <SectionCard
                title="Business information"
                description="Appears on receipts, exports, and reports."
            >
                <p className="py-6 text-center text-[13px] text-gray-dim">
                    Loading…
                </p>
            </SectionCard>
        );
    }

    if (loadError) {
        return (
            <SectionCard
                title="Business information"
                description="Appears on receipts, exports, and reports."
            >
                <div className="rounded-lg border border-black bg-black p-3 text-[12px] font-semibold text-emb">
                    {loadError}
                </div>
            </SectionCard>
        );
    }

    return (
        <SectionCard
            title="Business information"
            description="Appears on receipts, exports, and reports."
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Business name">
                    <input
                        value={data.name}
                        onChange={(e) => set("name", e.target.value)}
                        placeholder="Claukk Mart"
                        className={inputCls}
                    />
                </Field>
                <Field label="Phone">
                    <input
                        value={data.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="024 000 1234"
                        className={inputCls}
                    />
                </Field>
                <Field label="Email">
                    <input
                        type="email"
                        value={data.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="you@email.com"
                        className={inputCls}
                    />
                </Field>
                <Field label="Address">
                    <input
                        value={data.address}
                        onChange={(e) => set("address", e.target.value)}
                        placeholder="Osu, Accra, Ghana"
                        className={inputCls}
                    />
                </Field>
            </div>

            <div className="mt-5 border-t border-lk pt-5">
                <b className="block text-[14px] font-semibold text-black">
                    Business logo
                </b>
                <p className="mt-0.5 text-[12px] text-gray-dim">
                    PNG or SVG, max 2 MB. Shows on printed receipts.
                </p>

                <div className="mt-3 flex items-center gap-3">
                    <div className="relative grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-xl border border-dashed border-lk bg-black/[0.02] text-gray-dim">
                        {data.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={data.logo}
                                alt="Business logo"
                                className="absolute inset-0 h-full w-full bg-white object-contain p-1"
                                onError={(e) => e.currentTarget.remove()}
                            />
                        ) : (
                            <Upload size={18} strokeWidth={1.8} />
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={pickLogo}
                            disabled={uploadingLogo}
                            className="rounded-lg border border-lk bg-transparent px-3 py-2 text-[13px] font-semibold text-black transition-colors hover:border-em disabled:opacity-60"
                        >
                            {uploadingLogo
                                ? "Uploading…"
                                : data.logo
                                ? "Replace logo"
                                : "Upload logo"}
                        </button>
                        {data.logo && (
                            <button
                                type="button"
                                onClick={removeLogo}
                                className="rounded-lg border border-lk bg-transparent px-3 py-2 text-[13px] font-semibold text-gray-dim transition-colors hover:border-em hover:text-black"
                            >
                                Remove
                            </button>
                        )}
                    </div>

                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={onLogoFile}
                        className="hidden"
                    />
                </div>
            </div>

            {saveError && (
                <div className="mt-4 rounded-lg border border-black bg-black px-3 py-2 text-[12px] font-semibold text-emb">
                    {saveError}
                </div>
            )}

            <SaveBar onSave={save} saved={saved} saving={saving} />
        </SectionCard>
    );
}

/* ============================================================
   Users section
   ============================================================ */
function UsersSection() {
    const supabase = createClient();

    const roles = [
        {
            name: "Cashier",
            desc: "Sell, take payments, view products. Cannot delete or edit past sales.",
            tone: "bg-black text-emb",
        },
        {
            name: "Manager",
            desc: "Full access — POS, products, reports, staff, and settings.",
            tone: "bg-black text-emb",
        },
    ];

    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [modal, setModal] = useState(null);
    const [delTarget, setDelTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [toggling, setToggling] = useState(null);
    const [flash, setFlash] = useState("");

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

            const { data, error } = await supabase
                .from("staff")
                .select("id, name, role, staff_code, is_active, created_at")
                .order("name");

            if (error) {
                setLoadError(error.message);
                setLoading(false);
                return;
            }

            setStaff(data || []);
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showFlash = (msg) => {
        setFlash(msg);
        setTimeout(() => setFlash(""), 2000);
    };

    const handleSave = async (data) => {
        if (modal.mode === "add") {
            const { data: inserted, error } = await supabase
                .from("staff")
                .insert({
                    name: data.name,
                    role: data.role,
                    staff_code: data.staff_code,
                })
                .select("id, name, role, staff_code, is_active, created_at")
                .single();

            if (error) {
                if (error.code === "23505") {
                    throw new Error(
                        "That code is already used. Generate a new one."
                    );
                }
                throw new Error(error.message);
            }

            setStaff((list) =>
                [...list, inserted].sort((a, b) =>
                    a.name.localeCompare(b.name)
                )
            );
            setModal(null);
            showFlash("Staff added");
        } else {
            const { data: updated, error } = await supabase
                .from("staff")
                .update({
                    name: data.name,
                    role: data.role,
                    staff_code: data.staff_code,
                })
                .eq("id", modal.staff.id)
                .select("id, name, role, staff_code, is_active, created_at")
                .single();

            if (error) {
                if (error.code === "23505") {
                    throw new Error(
                        "That code is already used. Generate a new one."
                    );
                }
                throw new Error(error.message);
            }

            setStaff((list) =>
                list
                    .map((s) => (s.id === updated.id ? updated : s))
                    .sort((a, b) => a.name.localeCompare(b.name))
            );
            setModal(null);
            showFlash("Staff updated");
        }
    };

    const handleDelete = async () => {
        setDeleting(true);

        const { error } = await supabase
            .from("staff")
            .delete()
            .eq("id", delTarget.id);

        setDeleting(false);

        if (error) return alert(error.message);

        setStaff((list) => list.filter((s) => s.id !== delTarget.id));
        setDelTarget(null);
        showFlash("Staff removed");
    };

    const toggleActive = async (s) => {
        setToggling(s.id);

        const { data: updated, error } = await supabase
            .from("staff")
            .update({ is_active: !s.is_active })
            .eq("id", s.id)
            .select("id, is_active")
            .single();

        setToggling(null);

        if (error) return alert(error.message);

        setStaff((list) =>
            list.map((x) =>
                x.id === updated.id ? { ...x, is_active: updated.is_active } : x
            )
        );
    };

    return (
        <>
            <SectionCard
                title="Roles"
                description="Define what each team member can do inside ClaukkPOS."
            >
                <div className="space-y-3">
                    {roles.map((r) => (
                        <div
                            key={r.name}
                            className="flex items-start gap-3 rounded-xl border border-lk p-4"
                        >
                            <span
                                className={`grid h-9 w-9 flex-none place-items-center rounded-lg text-[12px] font-extrabold ${r.tone}`}
                            >
                                {r.name[0]}
                            </span>
                            <div className="min-w-0 flex-1">
                                <b className="block text-[14px] font-semibold text-black">
                                    {r.name}
                                </b>
                                <p className="mt-0.5 text-[13px] leading-[1.4] text-gray-dim">
                                    {r.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </SectionCard>

            <SectionCard
                title="Team members"
                description="Staff sign in on the POS with their name and 4-character code."
                action={
                    <button
                        onClick={() => setModal({ mode: "add" })}
                        className="flex items-center gap-2 rounded-lg border border-black bg-black px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:border-emb hover:text-emb"
                    >
                        + Add staff
                    </button>
                }
            >
                {loading ? (
                    <p className="py-6 text-center text-[13px] text-gray-dim">
                        Loading staff…
                    </p>
                ) : loadError ? (
                    <div className="rounded-lg border border-black bg-black p-3 text-[12px] font-semibold text-emb">
                        {loadError}
                    </div>
                ) : staff.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-[13px] text-gray-dim">
                            No staff yet. Add your first one.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {staff.map((u) => (
                            <div
                                key={u.id}
                                className="flex items-center gap-3 rounded-xl border border-lk p-3"
                            >
                                <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-black text-[12px] font-bold text-emb">
                                    {u.name
                                        .split(/\s+/)
                                        .filter(Boolean)
                                        .map((w) => w[0])
                                        .join("")
                                        .slice(0, 2)
                                        .toUpperCase()}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <b className="block truncate text-[14px] font-semibold text-black">
                                        {u.name}
                                    </b>
                                    <small className="block text-[12px] capitalize text-gray-dim">
                                        {u.role} · code{" "}
                                        <span className="font-mono">
                                            {u.staff_code}
                                        </span>
                                    </small>
                                </div>
                                <button
                                    onClick={() => toggleActive(u)}
                                    disabled={toggling === u.id}
                                    className={`hidden rounded-full px-2.5 py-0.5 text-[12px] font-semibold transition-colors disabled:opacity-60 sm:inline-flex ${
                                        u.is_active
                                            ? "bg-black text-emb hover:bg-black/80"
                                            : "bg-gray/20 text-gray-dim hover:bg-gray/30"
                                    }`}
                                    title={
                                        u.is_active
                                            ? "Click to disable"
                                            : "Click to enable"
                                    }
                                >
                                    {toggling === u.id
                                        ? "…"
                                        : u.is_active
                                        ? "Active"
                                        : "Disabled"}
                                </button>
                                <button
                                    onClick={() =>
                                        setModal({ mode: "edit", staff: u })
                                    }
                                    className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:border-em hover:text-black"
                                    aria-label="Edit"
                                >
                                    ✎
                                </button>
                                <button
                                    onClick={() => setDelTarget(u)}
                                    className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:border-em hover:text-black"
                                    aria-label="Delete"
                                >
                                    <Trash2 size={14} strokeWidth={1.8} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {flash && (
                    <p className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-em">
                        <Check size={14} strokeWidth={2.2} />
                        {flash}
                    </p>
                )}
            </SectionCard>

            {modal && (
                <StaffModal
                    initial={modal.mode === "edit" ? modal.staff : null}
                    existingStaff={staff}
                    onClose={() => setModal(null)}
                    onSave={handleSave}
                />
            )}

            {delTarget && (
                <div
                    className="fixed inset-0 z-20 grid place-items-center bg-black/60 p-4"
                    onClick={(e) =>
                        e.target === e.currentTarget &&
                        !deleting &&
                        setDelTarget(null)
                    }
                >
                    <div className="w-full max-w-[420px] rounded-2xl bg-white p-6">
                        <div className="mb-3 flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-full bg-black text-[18px] text-emb">
                                <Trash2 size={18} strokeWidth={2} />
                            </div>
                            <div>
                                <h2 className="m-0 text-[16px] font-bold text-black">
                                    Remove staff member?
                                </h2>
                                <p className="mt-0.5 text-[13px] text-gray-dim">
                                    They will no longer be able to sign in on
                                    the POS.
                                </p>
                            </div>
                        </div>
                        <div className="rounded-lg border border-lk p-3">
                            <b className="block text-[14px] text-black">
                                {delTarget.name}
                            </b>
                            <small className="text-gray-dim">
                                {delTarget.role} · code {delTarget.staff_code}
                            </small>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setDelTarget(null)}
                                disabled={deleting}
                                className="rounded-lg border border-lk bg-transparent py-2.5 text-[14px] font-semibold text-black disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="rounded-lg border border-black bg-black py-2.5 text-[14px] font-semibold text-white disabled:opacity-60"
                            >
                                {deleting ? "Removing…" : "Remove"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ============================================================
   Payments section
   ============================================================ */
function PaymentsSection() {
    const supabase = createClient();

    const [profileId, setProfileId] = useState(null);
    const [data, setData] = useState({
        publicKey: "",
        methods: ["cash"],
    });

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

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

            const { data, error } = await supabase
                .from("profiles")
                .select("id, paystack_public_key, payment_methods")
                .eq("id", user.id)
                .single();

            if (error) {
                setLoadError(error.message);
                setLoading(false);
                return;
            }

            setProfileId(data.id);
            setData({
                publicKey: data.paystack_public_key || "",
                methods:
                    Array.isArray(data.payment_methods) &&
                    data.payment_methods.length
                        ? data.payment_methods
                        : ["cash"],
            });
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleMethod = (key) => {
        setData((d) => {
            const on = d.methods.includes(key);
            return {
                ...d,
                methods: on
                    ? d.methods.filter((m) => m !== key)
                    : [...d.methods, key],
            };
        });
    };

    const save = async () => {
        if (!profileId) return;

        if (data.methods.length === 0) {
            return setSaveError("Enable at least one payment method.");
        }

        if (data.methods.includes("paystack")) {
            const key = data.publicKey.trim();

            if (!key) {
                return setSaveError(
                    "Enter your Paystack public key to enable Paystack."
                );
            }
            if (!/^pk_(test|live)_/.test(key)) {
                return setSaveError(
                    "That doesn't look like a Paystack public key. It should start with pk_test_ or pk_live_."
                );
            }
        }

        setSaving(true);
        setSaveError("");

        const { error } = await supabase
            .from("profiles")
            .update({
                paystack_public_key: data.publicKey.trim() || null,
                payment_methods: data.methods,
                updated_at: new Date().toISOString(),
            })
            .eq("id", profileId);

        setSaving(false);

        if (error) return setSaveError(error.message);

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (loading) {
        return (
            <SectionCard
                title="Payments"
                description="Enable the ways customers can pay at your counter."
            >
                <p className="py-6 text-center text-[13px] text-gray-dim">
                    Loading…
                </p>
            </SectionCard>
        );
    }

    if (loadError) {
        return (
            <SectionCard
                title="Payments"
                description="Enable the ways customers can pay at your counter."
            >
                <div className="rounded-lg border border-black bg-black p-3 text-[12px] font-semibold text-emb">
                    {loadError}
                </div>
            </SectionCard>
        );
    }

    const paystackOn = data.methods.includes("paystack");

    return (
        <>
            <SectionCard
                title="Payment methods"
                description="Enable the ways customers can pay at your counter."
            >
                <div className="space-y-2">
                    {[
                        {
                            key: "cash",
                            label: "Cash",
                            desc: "Physical cash at the till",
                        },
                        {
                            key: "paystack",
                            label: "Paystack",
                            desc: "Mobile money and card via Paystack",
                        },
                    ].map((m) => {
                        const on = data.methods.includes(m.key);
                        return (
                            <button
                                key={m.key}
                                onClick={() => toggleMethod(m.key)}
                                className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${
                                    on ? "border-black bg-black text-white" : "border-lk"
                                }`}
                            >
                                <div>
                                    <b
                                        className={`block text-[14px] font-semibold ${
                                            on ? "text-white" : "text-black"
                                        }`}
                                    >
                                        {m.label}
                                    </b>
                                    <p
                                        className={`mt-0.5 text-[12px] ${
                                            on ? "text-gray" : "text-gray-dim"
                                        }`}
                                    >
                                        {m.desc}
                                    </p>
                                </div>
                                <span
                                    className={`grid h-5 w-5 place-items-center rounded-md border-2 ${
                                        on
                                            ? "border-emb bg-emb text-black"
                                            : "border-lk"
                                    }`}
                                >
                                    {on && <Check size={12} strokeWidth={3} />}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {data.methods.length === 0 && (
                    <p className="mt-3 text-[12px] font-semibold text-em">
                        Enable at least one payment method.
                    </p>
                )}
            </SectionCard>

            <SectionCard
                title="Paystack integration"
                description="Add your Paystack public key to accept card and mobile money at the till."
            >
                <Field
                    label="Public key"
                    hint="Find this in your Paystack dashboard → Settings → API Keys & Webhooks. It starts with pk_test_ or pk_live_."
                >
                    <input
                        value={data.publicKey}
                        onChange={(e) => set("publicKey", e.target.value)}
                        placeholder="pk_live_xxxxxxxxxxxxxxxxxxxx"
                        className={inputCls}
                        disabled={!paystackOn}
                    />
                </Field>

                {paystackOn && data.publicKey.trim() ? (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-black bg-black p-3 text-[12px] font-semibold text-emb">
                        <Check size={14} strokeWidth={2.4} />
                        Paystack is configured. Card and MoMo payments will use
                        this key.
                    </div>
                ) : paystackOn ? (
                    <div className="mt-3 rounded-lg border border-lk bg-black/[0.02] p-3 text-[12px] font-semibold text-gray-dim">
                        Paste your public key above and save to activate
                        Paystack at the till.
                    </div>
                ) : (
                    <div className="mt-3 rounded-lg border border-lk bg-black/[0.02] p-3 text-[12px] font-semibold text-gray-dim">
                        Paystack is turned off. Enable it above to add your key.
                    </div>
                )}

                {saveError && (
                    <div className="mt-4 rounded-lg border border-black bg-black px-3 py-2 text-[12px] font-semibold text-emb">
                        {saveError}
                    </div>
                )}

                <SaveBar
                    onSave={save}
                    saved={saved}
                    saving={saving}
                    disabled={data.methods.length === 0}
                />
            </SectionCard>
        </>
    );
}

/* ============================================================
   Page — with role gate
   ============================================================ */
export default function SettingsPage() {
    const router = useRouter();
    const [active, setActive] = useState("business");
    const [allowed, setAllowed] = useState(null);

    useEffect(() => {
        const check = () => {
            const staffId = window.localStorage.getItem("claukk_staff_id");
            const role = (
                window.localStorage.getItem("claukk_staff_role") || ""
            )
                .toLowerCase()
                .trim();

            if (!staffId || !role) {
                setAllowed(true);
                return;
            }

            if (role !== "manager") {
                router.replace("/pos");
                return;
            }

            setAllowed(true);
        };

        check();
        window.addEventListener("storage", check);
        return () => window.removeEventListener("storage", check);
    }, [router]);

    const content = useMemo(() => {
        switch (active) {
            case "business":
                return <BusinessSection />;
            case "users":
                return <UsersSection />;
            case "payments":
                return <PaymentsSection />;
            default:
                return null;
        }
    }, [active]);

    if (allowed === null) {
        return (
            <div className="flex min-h-[60vh] w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-lk border-t-emb" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto px-4 pb-12 pt-7 md:px-8">
            <div className="mb-6">
                <h2 className="m-0 text-[24px] font-extrabold tracking-[-0.02em] text-black">
                    Settings
                </h2>
                <p className="mt-0.5 text-[13px] text-gray-dim">
                    Manage your business, team, payments and preferences.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
                <aside className="lg:sticky lg:top-6 lg:h-fit">
                    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-lk p-2 lg:flex-col lg:overflow-visible">
                        {SECTIONS.map((s) => {
                            const Icon = s.icon;
                            const on = active === s.key;
                            return (
                                <button
                                    key={s.key}
                                    onClick={() => setActive(s.key)}
                                    className={`flex flex-none items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold whitespace-nowrap transition-colors ${
                                        on
                                            ? "bg-black text-emb"
                                            : "text-gray-dim hover:bg-black/[0.03] hover:text-black"
                                    }`}
                                >
                                    <Icon size={16} strokeWidth={1.8} />
                                    {s.label}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                <div className="space-y-6">{content}</div>
            </div>
        </div>
    );
}