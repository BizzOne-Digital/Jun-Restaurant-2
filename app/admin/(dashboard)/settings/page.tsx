"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type SiteSettingRow = {
  restaurantName?: string;
  email?: string;
  logo?: string;
  pickupPrepareTimeMinutes?: number;
};

export default function AdminSettingsPage() {
  const [restaurant, setRestaurant] = useState<Record<string, unknown> | null>(null);
  const [siteSetting, setSiteSetting] = useState<SiteSettingRow | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    setRestaurant(data.restaurant ?? null);
    setSiteSetting(data.siteSetting ?? null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  async function saveSiteEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pickup = fd.get("pickupPrepareTimeMinutes");
    const body = {
      restaurantName: fd.get("restaurantName"),
      email: fd.get("orderEmail"),
      logo: fd.get("emailLogoUrl"),
      pickupPrepareTimeMinutes: pickup ? Number(pickup) : undefined,
    };
    const res = await fetch("/api/admin/settings/site-email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) toast.error("Save failed");
    else toast.success("Order email branding saved");
    load();
  }

  async function uploadLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/admin/settings/logo", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Upload failed");
      return;
    }
    toast.success("Logo uploaded");
    await load();
  }

  if (!restaurant) return <p className="text-sm text-awok-muted">Loading…</p>;

  const emailBrandName = (siteSetting?.restaurantName as string) || (restaurant.name as string);
  const emailLogo = (siteSetting?.logo as string) || (restaurant.logoUrl as string) || "";
  const orderEmail = (siteSetting?.email as string) || "";
  const pickupMins = siteSetting?.pickupPrepareTimeMinutes ?? 20;

  return (
    <div className="min-w-0 space-y-8 sm:space-y-10">
      <h1 className="font-display text-2xl font-bold">Restaurant settings</h1>

      <form onSubmit={saveGeneral} className="space-y-4 rounded-2xl border border-white/8 bg-black/30 p-4 sm:p-6">
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

      <form
        key={`email-${emailBrandName}-${emailLogo}-${orderEmail}-${pickupMins}`}
        onSubmit={saveSiteEmail}
        className="space-y-4 rounded-2xl border border-white/8 bg-black/30 p-4 sm:p-6"
      >
        <h2 className="text-lg font-semibold">Order emails &amp; branding</h2>
        <p className="text-xs leading-relaxed text-awok-muted">
          Used for Mailgun / Resend / SMTP templates (customer confirmation, kitchen new order, status updates). For the
          logo in emails, set <code className="text-awok-gold">ORDER_EMAIL_LOGO_URL</code> in Vercel to a full{" "}
          <code className="text-awok-gold">https://</code> URL (e.g. Cloudinary) — it overrides the logo URL below when
          set. Paths like <code className="text-awok-gold">/uploads/…</code> only work in inboxes on a live public
          domain; CDN URLs are best for production.
        </p>
        <label className="block text-xs font-semibold uppercase tracking-wider text-awok-gold">Display name in emails</label>
        <input
          name="restaurantName"
          defaultValue={emailBrandName}
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
        />
        <label className="block text-xs font-semibold uppercase tracking-wider text-awok-gold">Kitchen / order inbox</label>
        <input
          name="orderEmail"
          type="email"
          defaultValue={orderEmail}
          placeholder="orders@yourrestaurant.com"
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
        />
        <p className="text-xs text-awok-muted">Also set RESTAURANT_ORDER_EMAIL in production env if it should override this.</p>
        <label className="block text-xs font-semibold uppercase tracking-wider text-awok-gold">Logo URL (email header)</label>
        <input
          name="emailLogoUrl"
          defaultValue={emailLogo}
          placeholder="https://… or /uploads/…"
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
        />
        {emailLogo ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview for arbitrary /uploads or CDN URLs
          <img src={emailLogo} alt="" className="mt-2 h-16 w-auto max-w-[200px] object-contain object-left" />
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-awok-muted">
            <span className="mr-2">Upload logo file</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="text-xs" onChange={uploadLogoFile} />
          </label>
        </div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-awok-gold">Default pickup prep window (minutes)</label>
        <input
          name="pickupPrepareTimeMinutes"
          type="number"
          min={1}
          max={240}
          defaultValue={pickupMins}
          className="w-full max-w-xs rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-full bg-awok-ember px-6 py-2 text-sm font-bold text-awok-deep">
          Save order email settings
        </button>
      </form>
    </div>
  );
}
