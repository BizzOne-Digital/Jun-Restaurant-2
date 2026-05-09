"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { formatCents } from "@/lib/utils";

type Cat = { _id: string; name: string; slug: string; displayOrder?: number };
type Item = {
  _id: string;
  name: string;
  slug: string;
  price: number;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  isPopular: boolean;
  bogoEnabled?: boolean;
  purchaseCount?: number;
  spiceLevel?: number;
  category: { _id: string; name: string };
};

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    priceDollars: "",
    categoryId: "",
    imageUrl: "",
    bogoEnabled: false,
    spiceLevel: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    name: "",
    description: "",
    priceDollars: "",
    categoryId: "",
    imageUrl: "",
    bogoEnabled: false,
    isAvailable: true,
    spiceLevel: 0,
  });

  const refresh = useCallback(async () => {
    const [c, i] = await Promise.all([fetch("/api/admin/categories"), fetch("/api/admin/menu-items")]);
    const cj = await c.json();
    const ij = await i.json();
    setCategories(cj.categories ?? []);
    setItems(ij.items ?? []);
    setForm((f) => ({
      ...f,
      categoryId: f.categoryId || cj.categories?.[0]?._id || "",
    }));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    const price = Math.round(parseFloat(form.priceDollars || "0") * 100);
    if (!form.name || !form.categoryId || !price) {
      toast.error("Name, category, and valid price required");
      return;
    }
    const res = await fetch("/api/admin/menu-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        price,
        categoryId: form.categoryId,
        imageUrl: form.imageUrl,
        bogoEnabled: form.bogoEnabled,
        spiceLevel: form.spiceLevel,
      }),
    });
    if (!res.ok) {
      toast.error("Could not create item");
      return;
    }
    toast.success("Menu item created");
    setForm({
      name: "",
      description: "",
      priceDollars: "",
      categoryId: form.categoryId,
      imageUrl: "",
      bogoEnabled: false,
      spiceLevel: 0,
    });
    refresh();
  }

  async function toggle(id: string, field: "isAvailable" | "bogoEnabled", value: boolean) {
    await fetch(`/api/admin/menu-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    refresh();
  }

  async function recomputePopular() {
    const res = await fetch("/api/admin/menu/recompute-popular", { method: "POST" });
    if (!res.ok) toast.error("Could not recalculate");
    else toast.success("Popular flags updated from order history");
    refresh();
  }

  function startEdit(it: Item) {
    setEditingId(it._id);
    setEdit({
      name: it.name,
      description: it.description ?? "",
      priceDollars: (it.price / 100).toFixed(2),
      categoryId: it.category?._id ?? "",
      imageUrl: it.imageUrl ?? "",
      bogoEnabled: Boolean(it.bogoEnabled),
      isAvailable: it.isAvailable,
      spiceLevel: it.spiceLevel ?? 0,
    });
  }

  async function saveEdit(id: string) {
    const price = Math.round(parseFloat(edit.priceDollars || "0") * 100);
    if (!edit.name || !edit.categoryId || !price) {
      toast.error("Invalid edit");
      return;
    }
    const res = await fetch(`/api/admin/menu-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: edit.name,
        description: edit.description,
        price,
        categoryId: edit.categoryId,
        imageUrl: edit.imageUrl,
        bogoEnabled: edit.bogoEnabled,
        isAvailable: edit.isAvailable,
        spiceLevel: edit.spiceLevel,
      }),
    });
    if (!res.ok) toast.error("Save failed");
    else toast.success("Item updated");
    setEditingId(null);
    refresh();
  }

  async function removeItem(id: string) {
    if (!confirm("Delete this menu item?")) return;
    const res = await fetch(`/api/admin/menu-items/${id}`, { method: "DELETE" });
    if (!res.ok) toast.error("Delete failed");
    else toast.success("Deleted");
    refresh();
  }

  return (
    <div className="min-w-0 space-y-8 sm:space-y-10">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Menu management</h1>
          <p className="text-sm text-awok-muted">
            Prices are stored in cents. <strong>Popular</strong> is set automatically from paid orders (top sellers).
            Use <strong>BOGO</strong> for buy-one-get-one-free offers.
          </p>
        </div>
        <button type="button" onClick={recomputePopular} className="rounded-full border border-awok-gold/40 px-4 py-2 text-xs font-semibold text-awok-gold hover:bg-white/5">
          Recalculate popular
        </button>
      </div>

      <form onSubmit={createItem} className="grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-white/8 bg-black/30 p-4 sm:p-5 md:grid-cols-2">
        <input
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
          placeholder="Item name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
          placeholder="Price (USD)"
          value={form.priceDollars}
          onChange={(e) => setForm({ ...form, priceDollars: e.target.value })}
        />
        <select
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm md:col-span-2"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
        >
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          className="md:col-span-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
          placeholder="Image URL — e.g. /menu/spring-rolls.jpg (see README)"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        />
        <textarea
          className="md:col-span-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
          placeholder="Description"
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={form.bogoEnabled} onChange={(e) => setForm({ ...form, bogoEnabled: e.target.checked })} />
          Buy 1, get 1 free (BOGO)
        </label>
        <button type="submit" className="md:col-span-2 rounded-full bg-awok-gold py-2 text-sm font-bold text-awok-deep">
          Add menu item
        </button>
      </form>

      <div className="w-full min-w-0 overflow-x-auto rounded-2xl border border-white/8 [-webkit-overflow-scrolling:touch]">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-black/40 text-xs uppercase text-awok-muted">
            <tr>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Sold</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) =>
              editingId === it._id ? (
                <tr key={it._id} className="border-t border-white/5">
                  <td className="px-3 py-3" colSpan={5}>
                    <div className="grid gap-2 md:grid-cols-2">
                      <input
                        className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm"
                        value={edit.name}
                        onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                      />
                      <input
                        className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm"
                        value={edit.priceDollars}
                        onChange={(e) => setEdit({ ...edit, priceDollars: e.target.value })}
                      />
                      <select
                        className="rounded border border-white/10 bg-black/40 px-2 py-1 text-sm md:col-span-2"
                        value={edit.categoryId}
                        onChange={(e) => setEdit({ ...edit, categoryId: e.target.value })}
                      >
                        {categories.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="md:col-span-2 rounded border border-white/10 bg-black/40 px-2 py-1 text-sm"
                        placeholder="Image URL"
                        value={edit.imageUrl}
                        onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value })}
                      />
                      <textarea
                        className="md:col-span-2 rounded border border-white/10 bg-black/40 px-2 py-1 text-sm"
                        rows={2}
                        value={edit.description}
                        onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                      />
                      <label className="flex items-center gap-2 text-xs md:col-span-2">
                        <input type="checkbox" checked={edit.bogoEnabled} onChange={(e) => setEdit({ ...edit, bogoEnabled: e.target.checked })} />
                        BOGO
                      </label>
                      <label className="flex items-center gap-2 text-xs md:col-span-2">
                        <input type="checkbox" checked={edit.isAvailable} onChange={(e) => setEdit({ ...edit, isAvailable: e.target.checked })} />
                        Available
                      </label>
                      <div className="flex gap-2 md:col-span-2">
                        <button type="button" className="rounded-full bg-awok-ember px-4 py-1.5 text-xs font-bold text-awok-deep" onClick={() => saveEdit(it._id)}>
                          Save
                        </button>
                        <button type="button" className="text-xs text-awok-muted hover:underline" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={it._id} className="border-t border-white/5 align-top">
                  <td className="px-3 py-2">
                    <p className="font-medium">{it.name}</p>
                    <p className="text-xs text-awok-muted line-clamp-2">{it.description}</p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] uppercase">
                      {it.isPopular && <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300">Popular</span>}
                      {it.bogoEnabled && <span className="rounded bg-awok-crimsonglow/30 px-1.5 py-0.5 text-awok-ember2">BOGO</span>}
                      {!it.isAvailable && <span className="rounded bg-white/10 px-1.5 py-0.5">Off</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs">{it.category?.name}</td>
                  <td className="px-3 py-2">{formatCents(it.price)}</td>
                  <td className="px-3 py-2 text-xs text-awok-muted">{it.purchaseCount ?? 0}</td>
                  <td className="px-3 py-2 space-y-1 text-xs">
                    <button type="button" className="block text-awok-gold hover:underline" onClick={() => startEdit(it)}>
                      Edit
                    </button>
                    <button type="button" className="block text-awok-muted hover:underline" onClick={() => toggle(it._id, "isAvailable", !it.isAvailable)}>
                      {it.isAvailable ? "Disable" : "Enable"}
                    </button>
                    <button type="button" className="block text-awok-muted hover:underline" onClick={() => toggle(it._id, "bogoEnabled", !it.bogoEnabled)}>
                      {it.bogoEnabled ? "Disable BOGO" : "Enable BOGO"}
                    </button>
                    <button type="button" className="block text-awok-crimsonglow hover:underline" onClick={() => removeItem(it._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
