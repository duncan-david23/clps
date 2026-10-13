"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  X,
  Pencil,
  Trash2,
  Tag,
  Boxes,
  PackageX,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/* ============================================================
   Category modal (Add / Edit)
   ============================================================ */
function CategoryModal({ initial, existing, onClose, onSave, saving }) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [error, setError] = useState("");

  const validate = () => {
    const n = name.trim().replace(/\s+/g, " ");
    if (!n) return "Category name is required.";
    const dup = existing.some(
      (c) =>
        c.id !== initial?.id && c.name.toLowerCase() === n.toLowerCase()
    );
    if (dup) return "A category with that name already exists.";
    return "";
  };

  const submit = () => {
    const err = validate();
    if (err) return setError(err);
    onSave({
      name: name.trim().replace(/\s+/g, " "),
      description: description.trim() || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-bg/60 p-4"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="m-0 text-[18px] font-bold">
              {editing ? "Edit category" : "Add category"}
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-dim">
              {editing
                ? "Update the name or description."
                : "Group similar products together."}
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

        <label className="block text-[12px] font-semibold text-gray-dim">
          Category name
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="e.g. Beverages"
            className="mt-1 block w-full rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] font-medium text-bg transition-colors focus:border-em focus:outline-none focus:ring-[3px] focus:ring-emb/25"
            autoFocus
          />
        </label>

        <label className="mt-3 block text-[12px] font-semibold text-gray-dim">
          Description{" "}
          <span className="font-normal text-gray-dim/70">(optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short note about what belongs here"
            rows={3}
            className="mt-1 block w-full resize-none rounded-lg border border-lk bg-transparent px-3 py-2 text-[14px] font-medium text-bg transition-colors focus:border-em focus:outline-none focus:ring-[3px] focus:ring-emb/25"
          />
        </label>

        {error && (
          <div className="mt-3 rounded-lg border border-bg bg-bg px-3 py-2 text-[12px] font-semibold text-emb">
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
            {saving
              ? "Saving…"
              : editing
              ? "Save changes"
              : "Add category"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Delete confirm
   ============================================================ */
function DeleteModal({ category, count, onCancel, onConfirm, deleting }) {
  const blocked = count > 0;
  return (
    <div
      className="fixed inset-0 z-10 grid place-items-center bg-bg/60 p-4"
      onClick={(e) => e.target === e.currentTarget && !deleting && onCancel()}
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-bg text-[18px] text-emb">
            <Trash2 size={18} strokeWidth={2} />
          </div>
          <div>
            <h2 className="m-0 text-[16px] font-bold">
              {blocked ? "Can't delete this category" : "Delete category?"}
            </h2>
            <p className="mt-0.5 text-[13px] text-gray-dim">
              {blocked
                ? "Move or delete the products in it first."
                : "This action can't be undone."}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-lk p-3">
          <b className="block text-[14px]">{category.name}</b>
          <small className="text-gray-dim">
            {count} product{count === 1 ? "" : "s"} assigned
          </small>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-lk bg-transparent py-2.5 text-[14px] font-semibold disabled:opacity-50"
          >
            {blocked ? "Close" : "Cancel"}
          </button>
          {!blocked && (
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="rounded-lg border border-bg bg-bg py-2.5 text-[14px] font-semibold text-white disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */
export default function CategoriesPage() {
  const supabase = createClient();

  const [cats, setCats] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* ---------------- Load ---------------- */
  async function loadAll() {
    setLoading(true);
    setLoadError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadError("You're not signed in.");
      setLoading(false);
      return;
    }

    // Fetch categories
    const { data: catsData, error: catsErr } = await supabase
      .from("categories")
      .select("id, name, description, created_at")
      .order("name", { ascending: true });

    if (catsErr) {
      setLoadError(catsErr.message);
      setLoading(false);
      return;
    }

    // Fetch product counts per category.
    // Pull only category_id, then tally client-side.
    const { data: prodRows, error: prodErr } = await supabase
      .from("products")
      .select("category_id");

    if (prodErr) {
      // If products table doesn't exist yet, just show zero counts.
      // Don't block the categories page.
      console.warn("products fetch failed:", prodErr.message);
    }

    const tally = {};
    (prodRows || []).forEach((row) => {
      if (!row.category_id) return;
      tally[row.category_id] = (tally[row.category_id] || 0) + 1;
    });

    setCats(catsData || []);
    setCounts(tally);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Filters & totals ---------------- */
  const filtered = useMemo(
    () =>
      cats.filter((c) =>
        (c.name + " " + (c.description || ""))
          .toLowerCase()
          .includes(q.toLowerCase())
      ),
    [cats, q]
  );

  const totals = useMemo(() => {
    const totalProducts = Object.values(counts).reduce((a, n) => a + n, 0);
    const empty = cats.filter((c) => !counts[c.id]).length;
    const top = cats.reduce(
      (max, c) =>
        !max || (counts[c.id] || 0) > (counts[max.id] || 0) ? c : max,
      null
    );
    return { totalProducts, empty, top };
  }, [cats, counts]);

  const countOf = (id) => counts[id] || 0;

  /* ---------------- Save (add / edit) ---------------- */
  const handleSave = async (data) => {
    setSaving(true);

    if (modal.mode === "add") {
      const { data: inserted, error } = await supabase
        .from("categories")
        .insert({ name: data.name, description: data.description })
        .select("id, name, description, created_at")
        .single();

      setSaving(false);

      if (error) {
        alert(error.message);
        return;
      }

      setCats((list) =>
        [...list, inserted].sort((a, b) => a.name.localeCompare(b.name))
      );
    } else {
      const { data: updated, error } = await supabase
        .from("categories")
        .update({ name: data.name, description: data.description })
        .eq("id", modal.category.id)
        .select("id, name, description, created_at")
        .single();

      setSaving(false);

      if (error) {
        alert(error.message);
        return;
      }

      setCats((list) =>
        list
          .map((c) => (c.id === updated.id ? updated : c))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }

    setModal(null);
  };

  /* ---------------- Delete ---------------- */
  const handleDelete = async () => {
    setDeleting(true);

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", delTarget.id);

    setDeleting(false);

    if (error) {
      alert(error.message);
      return;
    }

    setCats((list) => list.filter((c) => c.id !== delTarget.id));
    setDelTarget(null);
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="flex-1 overflow-auto px-4 pb-12 pt-7 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="m-0 text-[24px] font-extrabold tracking-[-0.02em]">
            Categories
          </h2>
          <p className="mt-0.5 text-[13px] text-gray-dim">
            Group your products so they&apos;re easy to find and report on.
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "add" })}
          className="flex items-center gap-2 rounded-lg border border-emb bg-emb px-3.5 py-2 text-[14px] font-bold text-bg transition-colors hover:bg-em"
        >
          <Plus size={16} strokeWidth={2.2} />
          Add category
        </button>
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="mb-6 rounded-xl border border-lk p-8 text-center text-[13px] text-gray-dim">
          Loading categories…
        </div>
      )}

      {loadError && (
        <div className="mb-6 rounded-xl border border-bg bg-bg p-4 text-[13px] font-semibold text-emb">
          {loadError}
        </div>
      )}

      {/* Summary */}
      {!loading && !loadError && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative overflow-hidden rounded-xl border border-bg bg-bg p-5 text-white">
              <span className="text-[12px] font-semibold text-gray">
                TOTAL CATEGORIES
              </span>
              <b className="my-1.5 block text-[26px] tracking-[-0.02em]">
                {cats.length}
              </b>
              <em className="text-[12px] font-semibold not-italic text-emb">
                Organised catalogue
              </em>
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emd/40 blur-2xl" />
            </div>

            <div className="rounded-xl border border-lk p-5">
              <span className="text-[12px] font-semibold text-gray-dim">
                TOTAL PRODUCTS
              </span>
              <b className="my-1.5 block text-[26px] tracking-[-0.02em]">
                {totals.totalProducts}
              </b>
              <em className="text-[12px] font-semibold not-italic text-em">
                Across all categories
              </em>
            </div>

            <div className="rounded-xl border border-lk p-5">
              <span className="text-[12px] font-semibold text-gray-dim">
                MOST STOCKED
              </span>
              <b className="my-1.5 block truncate text-[26px] tracking-[-0.02em]">
                {totals.top?.name || "—"}
              </b>
              <em className="text-[12px] font-semibold not-italic text-gray-dim">
                {totals.top
                  ? `${countOf(totals.top.id)} products`
                  : "—"}
              </em>
            </div>

            <div className="rounded-xl border border-lk p-5">
              <span className="text-[12px] font-semibold text-gray-dim">
                EMPTY
              </span>
              <b className="my-1.5 block text-[26px] tracking-[-0.02em]">
                {totals.empty}
              </b>
              <em className="text-[12px] font-semibold not-italic text-gray-dim">
                No products assigned
              </em>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-lk bg-transparent px-3 py-2 text-gray transition-colors focus-within:border-em focus-within:ring-[3px] focus-within:ring-emb/25">
              <Search size={16} strokeWidth={1.8} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search categories..."
                className="w-full border-0 bg-transparent text-[14px] outline-none"
              />
            </div>
            <span className="text-[13px] text-gray-dim">
              {filtered.length} of {cats.length}
            </span>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-lk p-12 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emd text-emb">
                <Tag size={20} strokeWidth={1.8} />
              </div>
              <b className="block text-[15px]">No categories found</b>
              <p className="mt-1 text-[13px] text-gray-dim">
                Try a different search or add a new one.
              </p>
              <button
                onClick={() => setModal({ mode: "add" })}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emb bg-emb px-3.5 py-2 text-[13px] font-bold text-bg transition-colors hover:bg-em"
              >
                <Plus size={14} strokeWidth={2.2} />
                Add category
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((c) => {
                const count = countOf(c.id);
                return (
                  <div
                    key={c.id}
                    className="group relative overflow-hidden rounded-xl border border-lk bg-white p-5 transition-all hover:-translate-y-px hover:border-em hover:shadow-[0_6px_24px_-14px_rgba(31,174,122,0.4)]"
                  >
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emd/30 blur-2xl" />

                    <div className="relative flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-emd text-emb">
                        <Tag size={18} strokeWidth={2} />
                      </span>
                      <div className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() =>
                            setModal({ mode: "edit", category: c })
                          }
                          className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:border-em hover:text-bg"
                          aria-label="Edit"
                        >
                          <Pencil size={14} strokeWidth={1.8} />
                        </button>
                        <button
                          onClick={() => setDelTarget(c)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-lk bg-transparent text-gray-dim transition-colors hover:border-em hover:text-bg"
                          aria-label="Delete"
                        >
                          <Trash2 size={14} strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>

                    <b className="relative mt-3 block text-[16px] font-extrabold tracking-[-0.01em]">
                      {c.name}
                    </b>
                    <p className="relative mt-1 min-h-[36px] text-[13px] leading-[1.4] text-gray-dim">
                      {c.description || "No description provided."}
                    </p>

                    <div className="relative mt-4 flex items-center justify-between border-t border-lk pt-3">
                      <div className="flex items-center gap-2">
                        <Boxes
                          size={14}
                          strokeWidth={1.8}
                          className="text-gray-dim"
                        />
                        <span className="text-[13px] font-semibold">
                          {count} product{count === 1 ? "" : "s"}
                        </span>
                      </div>
                      {count === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray/20 px-2 py-0.5 text-[11px] font-semibold text-gray-dim">
                          <PackageX size={11} strokeWidth={2} />
                          Empty
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emd px-2 py-0.5 text-[11px] font-semibold text-emb">
                          <TrendingUp size={11} strokeWidth={2} />
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {modal && (
        <CategoryModal
          initial={modal.mode === "edit" ? modal.category : null}
          existing={cats}
          onClose={() => setModal(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {delTarget && (
        <DeleteModal
          category={delTarget}
          count={countOf(delTarget.id)}
          onCancel={() => setDelTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}