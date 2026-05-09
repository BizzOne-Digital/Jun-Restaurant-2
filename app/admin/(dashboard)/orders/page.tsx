"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { playOrderNotificationSound } from "@/lib/orderSound";
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
  const [q, setQ] = useState("");
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem("admin-order-alerts-enabled") === "1";
    } catch {
      return false;
    }
  });

  /** Last known paymentStatus per order id — used to detect transitions to `paid`, not “first time we see a paid row”. */
  const lastPaymentStatusByOrderIdRef = useRef<Map<string, string>>(new Map());
  const awaitingPaymentBaselineRef = useRef(true);
  const hasInitialFetchRef = useRef(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (filter.orderStatus) qs.set("orderStatus", filter.orderStatus);
    if (filter.paymentStatus) qs.set("paymentStatus", filter.paymentStatus);
    const res = await fetch(`/api/admin/orders?${qs.toString()}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    hasInitialFetchRef.current = true;
  }, [filter.orderStatus, filter.paymentStatus]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + explicit Apply only
  }, []);

  const setAlerts = (on: boolean) => {
    setAlertsEnabled(on);
    try {
      if (on) localStorage.setItem("admin-order-alerts-enabled", "1");
      else localStorage.removeItem("admin-order-alerts-enabled");
    } catch {
      /* ignore */
    }
  };

  const enableAlertsWithUnlock = async () => {
    setAlerts(true);
    try {
      const audio = new Audio("/sounds/order-notification.mp3");
      audio.volume = 0.01;
      await audio.play();
      audio.pause();
    } catch {
      /* still enable — real chimes will use playOrderNotificationSound */
    }
  };

  useEffect(() => {
    if (!alertsEnabled || q.trim()) return;
    const t = setInterval(() => {
      void load();
    }, 30_000);
    return () => clearInterval(t);
  }, [alertsEnabled, q, load]);

  useEffect(() => {
    if (!hasInitialFetchRef.current) return;

    if (awaitingPaymentBaselineRef.current) {
      orders.forEach((o) => lastPaymentStatusByOrderIdRef.current.set(o._id, o.paymentStatus));
      awaitingPaymentBaselineRef.current = false;
      return;
    }

    let paymentJustSucceeded = false;
    for (const o of orders) {
      const prev = lastPaymentStatusByOrderIdRef.current.get(o._id);
      if (prev !== undefined && prev !== "paid" && o.paymentStatus === "paid") {
        paymentJustSucceeded = true;
      }
      lastPaymentStatusByOrderIdRef.current.set(o._id, o.paymentStatus);
    }

    if (alertsEnabled && paymentJustSucceeded) {
      playOrderNotificationSound();
    }
  }, [orders, alertsEnabled]);

  const displayOrders = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(needle) ||
        o._id.toLowerCase().includes(needle) ||
        o.orderStatus.toLowerCase().includes(needle) ||
        o.paymentStatus.toLowerCase().includes(needle)
    );
  }, [orders, q]);

  async function updateStatus(id: string, orderStatus: string) {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderStatus }),
    });
    void load();
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-display text-2xl font-bold">Orders</h1>
        <div className="max-w-md shrink-0">
          {!alertsEnabled ? (
            <button
              type="button"
              className="w-full rounded-full border border-awok-gold/40 bg-awok-gold/10 px-4 py-2 text-left text-xs font-semibold text-awok-gold transition hover:bg-awok-gold/20"
              onClick={() => void enableAlertsWithUnlock()}
            >
              Enable order alerts
              <span className="mt-0.5 block font-normal text-awok-muted">
                Beeps when payment succeeds (pending → paid), not when a brand-new paid row first appears.
              </span>
            </button>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-awok-cream">
              <input
                type="checkbox"
                checked={alertsEnabled}
                onChange={(e) => setAlerts(e.target.checked)}
                className="rounded border-white/20"
              />
              Order alerts on
            </label>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-awok-muted">Search</label>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Order #, id, status…"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm"
          />
        </div>
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
        <button type="button" onClick={() => void load()} className="rounded-full bg-awok-ember px-4 py-2 text-xs font-bold text-awok-deep">
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
            {displayOrders.map((o) => (
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
        {!displayOrders.length && <p className="p-6 text-sm text-awok-muted">No orders match filters.</p>}
      </div>
    </div>
  );
}
