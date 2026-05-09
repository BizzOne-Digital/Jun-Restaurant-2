"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/utils";

type OrderRow = {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMode: string;
  total: number;
  commissionAmount: number;
  restaurantPayoutAmount: number;
  createdAt: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState({ orderStatus: "", paymentStatus: "" });

  async function load() {
    const qs = new URLSearchParams();
    if (filter.orderStatus) qs.set("orderStatus", filter.orderStatus);
    if (filter.paymentStatus) qs.set("paymentStatus", filter.paymentStatus);
    const res = await fetch(`/api/admin/orders?${qs.toString()}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
  }

  useEffect(() => {
    void load();
    // Intentional: initial load only; filters are applied via the "Apply" button (which calls `load`).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load reads `filter`; adding `load` would refetch on every render without useCallback + would duplicate Apply semantics.
  }, []);

  async function updateStatus(id: string, orderStatus: string) {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderStatus }),
    });
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Orders</h1>
      <div className="mt-4 flex flex-wrap gap-3">
        <select
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
          value={filter.orderStatus}
          onChange={(e) => setFilter((f) => ({ ...f, orderStatus: e.target.value }))}
        >
          <option value="">All statuses</option>
          {["new", "accepted", "preparing", "ready", "completed", "cancelled"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
          value={filter.paymentStatus}
          onChange={(e) => setFilter((f) => ({ ...f, paymentStatus: e.target.value }))}
        >
          <option value="">All payments</option>
          {["pending", "paid", "failed", "refunded"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" onClick={load} className="rounded-full bg-awok-ember px-4 py-2 text-xs font-bold text-awok-deep">
          Apply
        </button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/8">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-black/40 text-xs uppercase text-awok-muted">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payout</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-t border-white/5">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/admin/orders/${o._id}`} className="text-awok-gold hover:underline">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize">{o.orderStatus}</td>
                <td className="px-4 py-3">{o.paymentStatus}</td>
                <td className="px-4 py-3 text-xs text-awok-muted">{o.paymentMode}</td>
                <td className="px-4 py-3">{formatCents(o.total)}</td>
                <td className="px-4 py-3 text-awok-gold">{formatCents(o.restaurantPayoutAmount)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <select
                      className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs"
                      value={o.orderStatus}
                      onChange={(e) => updateStatus(o._id, e.target.value)}
                    >
                      {["new", "accepted", "preparing", "ready", "completed", "cancelled"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Link href={`/admin/orders/${o._id}`} className="text-xs text-awok-gold hover:underline">
                      View detail
                    </Link>
                    <Link href={`/admin/orders/${o._id}/print`} className="text-xs text-awok-gold hover:underline">
                      Print ticket
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length && <p className="p-6 text-sm text-awok-muted">No orders match filters.</p>}
      </div>
    </div>
  );
}
