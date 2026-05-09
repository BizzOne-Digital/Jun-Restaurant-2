"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Cat = { _id: string; name: string; slug: string; displayOrder?: number; isActive?: boolean };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [form, setForm] = useState({ name: "", slug: "", displayOrder: "0" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ name: "", slug: "", displayOrder: "0", isActive: true });

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    setCategories(data.categories ?? []);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name required");
      return;
    }
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        displayOrder: parseInt(form.displayOrder, 10) || 0,
      }),
    });
    if (!res.ok) {
      toast.error("Could not create category");
      return;
    }
    toast.success("Category created");
    setForm({ name: "", slug: "", displayOrder: "0" });
    refresh();
  }

  function startEdit(c: Cat) {
    setEditingId(c._id);
    setEdit({
      name: c.name,
      slug: c.slug,
      displayOrder: String(c.displayOrder ?? 0),
      isActive: c.isActive !== false,
    });
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: edit.name,
        slug: edit.slug,
        displayOrder: parseInt(edit.displayOrder, 10) || 0,
        isActive: edit.isActive,
      }),
    });
    if (!res.ok) toast.error("Save failed");
    else toast.success("Category updated");
    setEditingId(null);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this category? Menu items in it will keep their category ObjectId — prefer reassigning items first.")) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (!res.ok) toast.error("Delete failed");
    else toast.success("Deleted");
    refresh();
  }

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Categories</h1>
        <p className="text-sm text-awok-muted">Create, edit, delete menu sections. Slug is used in URLs and image paths.</p>
      </div>

      <form
        onSubmit={create}
        className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-black/30 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3 sm:p-5"
      >
        <input
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base text-awok-cream sm:text-sm"
          placeholder="Category name (e.g. Appetizer)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="min-h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base text-awok-cream sm:w-40 sm:text-sm"
          placeholder="Slug (optional)"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
        />
        <input
          className="min-h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base text-awok-cream sm:w-24 sm:text-sm"
          placeholder="Order"
          value={form.displayOrder}
          onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
        />
        <button
          type="submit"
          className="min-h-11 touch-manipulation rounded-full bg-awok-gold px-5 py-2 text-sm font-bold text-awok-deep sm:min-h-0"
        >
          Add
        </button>
      </form>

      <div className="w-full min-w-0 overflow-x-auto rounded-2xl border border-white/8 [-webkit-overflow-scrolling:touch]">
        <table className="min-w-[560px] w-full text-left text-sm">
          <thead className="bg-black/40 text-xs uppercase text-awok-muted">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c._id} className="border-t border-white/5">
                {editingId === c._id ? (
                  <>
                    <td className="px-3 py-2">
                      <input className="w-full rounded border border-white/10 bg-black/40 px-2 py-1" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <input className="w-full rounded border border-white/10 bg-black/40 px-2 py-1" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <input className="w-16 rounded border border-white/10 bg-black/40 px-2 py-1" value={edit.displayOrder} onChange={(e) => setEdit({ ...edit, displayOrder: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />
                    </td>
                    <td className="px-3 py-2 space-x-2">
                      <button type="button" className="text-awok-gold hover:underline" onClick={() => saveEdit(c._id)}>
                        Save
                      </button>
                      <button type="button" className="text-awok-muted hover:underline" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-awok-muted">{c.slug}</td>
                    <td className="px-3 py-2">{c.displayOrder ?? 0}</td>
                    <td className="px-3 py-2">{c.isActive === false ? "No" : "Yes"}</td>
                    <td className="px-3 py-2 space-x-2 text-xs">
                      <button type="button" className="text-awok-gold hover:underline" onClick={() => startEdit(c)}>
                        Edit
                      </button>
                      <button type="button" className="text-awok-crimsonglow hover:underline" onClick={() => remove(c._id)}>
                        Delete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
