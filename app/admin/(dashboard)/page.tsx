"use client";

import { useEffect, useState } from "react";
import { formatCents } from "@/lib/utils";

export default function AdminDashboardPage() {
  const [data, setData] = useState<{
    todayOrders: number;
    totalRevenueCents: number;
    platformCommissionCents: number;
    restaurantPayoutCents: number;
    pendingPayouts: number;
    activeMenuItems: number;
    newCustomers: number;
    orderStatusOverview: { _id: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/summary")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return <p className="text-awok-muted">Loading dashboard…</p>;
  }

  const cards = [
    { label: "Today's orders", value: String(data.todayOrders) },
    { label: "Total revenue", value: formatCents(data.totalRevenueCents) },
    { label: "Platform commission", value: formatCents(data.platformCommissionCents) },
    { label: "Restaurant payout (all-time)", value: formatCents(data.restaurantPayoutCents) },
    { label: "Pending payouts", value: String(data.pendingPayouts) },
    { label: "Active menu items", value: String(data.activeMenuItems) },
    { label: "New customers (today)", value: String(data.newCustomers) },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-awok-muted">Operational snapshot for A Wok.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/8 bg-black/30 p-5">
            <p className="text-xs uppercase tracking-wide text-awok-muted">{c.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-awok-gold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 rounded-2xl border border-white/8 bg-black/30 p-5">
        <p className="text-sm font-semibold">Order status overview</p>
        <ul className="mt-3 space-y-2 text-sm text-awok-muted">
          {data.orderStatusOverview.map((o) => (
            <li key={o._id} className="flex justify-between">
              <span className="capitalize text-awok-cream">{o._id}</span>
              <span>{o.count}</span>
            </li>
          ))}
          {!data.orderStatusOverview.length && <li>No orders yet.</li>}
        </ul>
      </div>
    </div>
  );
}
