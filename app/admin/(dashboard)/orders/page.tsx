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
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  guestInfo?: { name: string; email: string; phone: string } | null;
  customer?: { _id: string; name?: string; email?: string; phone?: string } | null;
};

function customerLines(o: OrderRow): { name: string; email: string } {
  if (o.guestInfo?.name) {
    return { name: o.guestInfo.name, email: o.guestInfo.email ?? "" };
  }
  const c = o.customer;
  if (c && typeof c === "object") {
    return {
      name: (c.name && String(c.name).trim()) || "Customer",
      email: (c.email && String(c.email)) || "",
    };
  }
  return { name: "—", email: "" };
}

function formatStripeRef(o: OrderRow): string {
  const pi = o.stripePaymentIntentId?.trim();
  if (pi) return pi;
  const sess = o.stripeCheckoutSessionId?.trim();
  if (sess) return sess.length > 28 ? `${sess.slice(0, 14)}…${sess.slice(-8)}` : sess;
  return "—";
}

function paymentPillClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-[#1a3a5a] text-white";
    case "pending":
      return "bg-[#4a3f1d] text-white";
    case "failed":
      return "bg-[#5c1a1a] text-red-100";
    case "refunded":
      return "bg-[#2d2d35] text-slate-200";
    default:
      return "bg-white/10 text-awok-cream";
  }
}

function orderStatusPillClass(status: string): string {
  switch (status) {
    case "completed":
      return "bg-[#333333] text-white";
    case "cancelled":
      return "bg-[#4a2a2a] text-red-100";
    default:
      return "bg-[#4a3f1d] text-white";
  }
}

function labelizeStatus(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
    return orders.filter((o) => {
      const { name, email } = customerLines(o);
      const pi = (o.stripePaymentIntentId ?? "").toLowerCase();
      const cs = (o.stripeCheckoutSessionId ?? "").toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(needle) ||
        o._id.toLowerCase().includes(needle) ||
        o.orderStatus.toLowerCase().includes(needle) ||
        o.paymentStatus.toLowerCase().includes(needle) ||
        name.toLowerCase().includes(needle) ||
        email.toLowerCase().includes(needle) ||
        pi.includes(needle) ||
        cs.includes(needle)
      );
    });
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-awok-muted">Dashboard · Operations</p>
      <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <h1 className="font-display text-2xl font-bold text-white md:text-3xl">Orders</h1>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:w-auto lg:shrink-0">
          {!alertsEnabled ? (
            <button
              type="button"
              className="w-full rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-left text-xs font-semibold text-blue-200 transition hover:bg-blue-500/20 sm:w-auto sm:min-w-[180px]"
              onClick={() => void enableAlertsWithUnlock()}
            >
              Enable order alerts
              <span className="mt-0.5 block font-normal text-awok-muted">
                Chime when a payment moves to paid (not on first load).
              </span>
            </button>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm text-awok-cream">
              <input
                type="checkbox"
                checked={alertsEnabled}
                onChange={(e) => setAlerts(e.target.checked)}
                className="size-4 rounded border-white/25 bg-[#1e1e1e] text-blue-500 accent-blue-500"
              />
              <span className="text-blue-300">Order alerts on</span>
            </label>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="min-h-10 w-full min-w-0 rounded-lg border border-white/10 bg-[#1e1e1e] px-3 py-2 text-sm text-white placeholder:text-awok-muted/80 sm:min-w-[200px] md:min-w-[260px]"
            />
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-10 shrink-0 rounded-lg border border-white/15 bg-[#2a2a2a] px-5 py-2 text-sm font-semibold text-awok-cream transition hover:bg-[#333]"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <select
          className="min-h-10 rounded-lg border border-white/10 bg-[#1e1e1e] px-3 py-2 text-sm text-white"
          value={filter.orderStatus}
          onChange={(e) => setFilter((f) => ({ ...f, orderStatus: e.target.value }))}
        >
          <option value="">All order statuses</option>
          {["new", "accepted", "preparing", "ready", "completed", "cancelled"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="min-h-10 rounded-lg border border-white/10 bg-[#1e1e1e] px-3 py-2 text-sm text-white"
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
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-10 rounded-lg bg-awok-ember px-4 py-2 text-xs font-bold text-awok-deep"
        >
          Apply filters
        </button>
      </div>

      <div className="mt-6 w-full min-w-0 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#121212] [-webkit-overflow-scrolling:touch]">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="border-b border-white/[0.06] bg-[#1a1a1a]">
            <tr>
              {["Order", "Customer", "Total", "Payment", "Status", "Stripe PI", "Update", "View"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-awok-muted/90"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {displayOrders.map((o) => {
              const { name, email } = customerLines(o);
              const stripeRef = formatStripeRef(o);
              return (
                <tr key={o._id} className="bg-[#141414] transition hover:bg-[#1a1a1f]">
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/admin/orders/${o._id}`}
                      className="font-mono text-sm font-semibold text-[#d4af37] hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 align-top">
                    <p className="font-medium text-white">{name}</p>
                    {email ? <p className="mt-0.5 truncate text-xs text-awok-muted">{email}</p> : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 align-top font-medium text-white">{formatCents(o.total)}</td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${paymentPillClass(o.paymentStatus)}`}
                    >
                      {labelizeStatus(o.paymentStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${orderStatusPillClass(o.orderStatus)}`}
                    >
                      {labelizeStatus(o.orderStatus)}
                    </span>
                  </td>
                  <td className="max-w-[200px] px-4 py-3 align-top">
                    <span className="break-all font-mono text-[11px] leading-snug text-awok-muted" title={stripeRef}>
                      {stripeRef}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <select
                      className="w-full min-w-[120px] max-w-[160px] cursor-pointer rounded-lg border border-white/15 bg-[#1e1e1e] px-2 py-1.5 text-xs capitalize text-white outline-none ring-blue-500/30 focus:ring-2"
                      value={o.orderStatus}
                      onChange={(e) => updateStatus(o._id, e.target.value)}
                    >
                      {["new", "accepted", "preparing", "ready", "completed", "cancelled"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/admin/orders/${o._id}`}
                      className="inline-flex flex-col gap-0.5 text-sm font-medium text-blue-400 hover:text-blue-300"
                    >
                      <span>Details</span>
                      <span className="text-lg leading-none" aria-hidden>
                        →
                      </span>
                    </Link>
                    <Link
                      href={`/admin/orders/${o._id}/print`}
                      className="mt-2 block text-[11px] text-awok-muted underline-offset-2 hover:text-awok-cream hover:underline"
                    >
                      Print
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!displayOrders.length && <p className="p-6 text-sm text-awok-muted">No orders match filters.</p>}
      </div>
    </div>
  );
}
