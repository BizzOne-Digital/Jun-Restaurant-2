"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [restaurant, setRestaurant] = useState<Record<string, unknown> | null>(null);

  async function load() {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    setRestaurant(data.restaurant ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveGeneral(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      address: fd.get("address"),
      phone: fd.get("phone"),
      logoUrl: fd.get("logoUrl"),
      heroImageUrl: fd.get("heroImageUrl"),
      isAcceptingOrders: fd.get("isAcceptingOrders") === "on",
    };
    const res = await fetch("/api/admin/settings/general", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) toast.error("Save failed");
    else toast.success("Restaurant updated");
    load();
  }

  async function savePayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      paymentMode: fd.get("paymentMode"),
      stripeConnectedAccountId: fd.get("stripeConnectedAccountId"),
      hasSubmittedVoidCheckAndId: fd.get("hasSubmittedVoidCheckAndId") === "on",
    };
    const res = await fetch("/api/admin/settings/payment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Save failed");
    } else toast.success("Payment settings updated");
    load();
  }

  if (!restaurant) return <p className="text-sm text-awok-muted">Loading…</p>;

  return (
    <div className="space-y-10">
      <h1 className="font-display text-2xl font-bold">Restaurant settings</h1>

      <form onSubmit={saveGeneral} className="space-y-4 rounded-2xl border border-white/8 bg-black/30 p-6">
        <h2 className="text-lg font-semibold">General</h2>
        <input name="name" defaultValue={restaurant.name as string} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
        <input name="address" defaultValue={restaurant.address as string} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
        <input name="phone" defaultValue={restaurant.phone as string} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
        <input name="logoUrl" defaultValue={(restaurant.logoUrl as string) || ""} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
        <input name="heroImageUrl" defaultValue={(restaurant.heroImageUrl as string) || ""} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isAcceptingOrders" defaultChecked={restaurant.isAcceptingOrders as boolean} />
          Accepting orders
        </label>
        <button type="submit" className="rounded-full bg-awok-ember px-6 py-2 text-sm font-bold text-awok-deep">
          Save general
        </button>
      </form>

      <form onSubmit={savePayment} className="space-y-4 rounded-2xl border border-white/8 bg-black/30 p-6">
        <h2 className="text-lg font-semibold">Payments & Stripe Connect</h2>
        <p className="text-xs text-awok-crimsonglow">
          Use stripe_connect_split only after void check, ID, and connected account verification are complete.
        </p>
        <select
          name="paymentMode"
          defaultValue={restaurant.paymentMode as string}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
        >
          <option value="platform_collect">platform_collect</option>
          <option value="stripe_connect_split">stripe_connect_split</option>
        </select>
        <input
          name="stripeConnectedAccountId"
          defaultValue={(restaurant.stripeConnectedAccountId as string) || ""}
          placeholder="acct_..."
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hasSubmittedVoidCheckAndId" defaultChecked={restaurant.hasSubmittedVoidCheckAndId as boolean} />
          Void check & ID submitted
        </label>
        <button type="submit" className="rounded-full bg-awok-gold px-6 py-2 text-sm font-bold text-awok-deep">
          Save payment settings
        </button>
      </form>
    </div>
  );
}
