"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { formatCents } from "@/lib/utils";

type PopulatedCustomer = { name?: string; email?: string; phone?: string };
type OrderItemRow = {
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  chargedQuantity?: number;
  bogoApplied?: boolean;
  notes?: string;
  selectedOptions?: { name: string; value: string }[];
};

type OrderDetail = {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentType: string;
  pickupType?: string | null;
  pickupTime?: string;
  subtotal: number;
  tax: number;
  deliveryFee?: number;
  tip?: number;
  total: number;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  customerNotes?: string;
  adminNotes?: string;
  guestInfo?: { name: string; email: string; phone: string } | null;
  customer?: PopulatedCustomer | null;
  items: OrderItemRow[];
  deliveryAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  createdAt?: string;
  confirmationEmailSent?: boolean;
  confirmationEmailStatus?: string;
  merchantNotificationEmailSent?: boolean;
};

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id || typeof id !== "string") return;
    setLoading(true);
    const res = await fetch(`/api/admin/orders/${id}`);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Could not load order");
      setOrder(null);
      setLoading(false);
      return;
    }
    setOrder(data.order ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(orderStatus: string) {
    if (!id || typeof id !== "string") return;
    const res = await fetch(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderStatus }),
    });
    if (!res.ok) {
      toast.error("Could not update status");
      return;
    }
    toast.success("Order status updated");
    void load();
  }

  if (loading) return <p className="text-sm text-awok-muted">Loading order…</p>;
  if (!order) {
    return (
      <div className="space-y-4">
        <Link href="/admin/orders" className="text-sm text-awok-gold hover:underline">
          ← Back to orders
        </Link>
        <p className="text-sm text-awok-muted">Order not found or not in this store.</p>
      </div>
    );
  }

  const guest = order.guestInfo;
  const cust = order.customer as PopulatedCustomer | null | undefined;
  const stripePi = order.stripePaymentIntentId?.trim();
  const stripeDash =
    stripePi && stripePi.startsWith("pi_")
      ? `https://dashboard.stripe.com/payments/${stripePi}`
      : null;

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link href="/admin/orders" className="text-xs font-semibold uppercase tracking-wider text-awok-gold hover:underline">
            ← Orders
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold text-awok-cream">Order {order.orderNumber}</h1>
          <p className="mt-1 text-xs text-awok-muted">
            Placed {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 touch-manipulation">
          <Link
            href={`/admin/orders/${order._id}/print`}
            className="rounded-full border border-white/15 px-4 py-2.5 text-center text-sm font-semibold text-awok-cream hover:border-awok-gold/40 sm:py-2"
          >
            Print ticket
          </Link>
          <Link
            href={`/track-order/${encodeURIComponent(order.orderNumber)}`}
            className="rounded-full border border-white/15 px-4 py-2.5 text-center text-sm font-semibold text-awok-cream hover:border-awok-gold/40 sm:py-2"
          >
            Public track
          </Link>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/30 p-4 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-awok-gold">Status</h2>
          <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <label className="text-sm text-awok-muted">Kitchen / order status</label>
            <select
              className="min-h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-base capitalize text-awok-cream sm:w-auto sm:text-sm"
              value={order.orderStatus}
              onChange={(e) => updateStatus(e.target.value)}
            >
              {["new", "accepted", "preparing", "ready", "completed", "cancelled"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-awok-muted">Payment</dt>
              <dd className="font-medium capitalize text-awok-cream">{order.paymentStatus}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-awok-muted">Fulfillment</dt>
              <dd className="capitalize text-awok-cream">{order.fulfillmentType}</dd>
            </div>
            {order.fulfillmentType === "pickup" && (
              <div className="flex justify-between gap-4">
                <dt className="text-awok-muted">Pickup</dt>
                <dd className="text-awok-cream">
                  {order.pickupType === "SCHEDULED" && order.pickupTime
                    ? order.pickupTime
                    : order.pickupType === "ASAP"
                    ? "ASAP"
                    : order.pickupTime
                    ? order.pickupTime
                    : "ASAP"}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/30 p-4 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-awok-gold">Customer</h2>
          {guest ? (
            <ul className="mt-4 space-y-2 text-sm text-awok-cream">
              <li>{guest.name}</li>
              <li>
                <a href={`mailto:${guest.email}`} className="text-awok-gold hover:underline">
                  {guest.email}
                </a>
              </li>
              {guest.phone ? <li>{guest.phone}</li> : null}
            </ul>
          ) : cust ? (
            <ul className="mt-4 space-y-2 text-sm text-awok-cream">
              <li>{cust.name}</li>
              <li>
                <a href={`mailto:${cust.email}`} className="text-awok-gold hover:underline">
                  {cust.email}
                </a>
              </li>
              {cust.phone ? <li>{cust.phone}</li> : null}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-awok-muted">No contact on file</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-black/30 p-4 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-awok-gold">Line items</h2>
        <ul className="mt-4 divide-y divide-white/5">
          {order.items.map((it, i) => (
            <li key={i} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:justify-between">
              <div>
                <span className="font-medium text-awok-cream">
                  {it.quantity}× {it.name}
                </span>
                {it.bogoApplied ? (
                  <span className="ml-2 text-xs text-awok-muted">BOGO</span>
                ) : null}
                {it.selectedOptions?.length ? (
                  <p className="mt-1 text-xs text-awok-muted">
                    {it.selectedOptions.map((o) => `${o.name}: ${o.value}`).join(" · ")}
                  </p>
                ) : null}
                {it.notes?.trim() ? <p className="mt-1 text-xs text-awok-muted">Notes: {it.notes}</p> : null}
              </div>
              <span className="shrink-0 font-medium text-awok-gold">{formatCents(it.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between text-awok-muted">
            <span>Subtotal</span>
            <span className="text-awok-cream">{formatCents(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-awok-muted">
            <span>Tax</span>
            <span className="text-awok-cream">{formatCents(order.tax)}</span>
          </div>
          <div className="flex justify-between text-awok-muted">
            <span>Tip</span>
            <span className="text-awok-cream">{formatCents(order.tip ?? 0)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-awok-cream">
            <span>Total</span>
            <span>{formatCents(order.total)}</span>
          </div>
        </div>
      </div>

      {(order.customerNotes?.trim() || order.adminNotes?.trim()) && (
        <div className="rounded-2xl border border-white/8 bg-black/30 p-4 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-awok-gold">Notes</h2>
          {order.customerNotes?.trim() ? (
            <p className="mt-3 text-sm text-awok-cream">
              <span className="text-awok-muted">Customer: </span>
              {order.customerNotes}
            </p>
          ) : null}
          {order.adminNotes?.trim() ? (
            <p className="mt-3 text-sm text-awok-cream">
              <span className="text-awok-muted">Admin: </span>
              {order.adminNotes}
            </p>
          ) : null}
        </div>
      )}

      <div className="rounded-2xl border border-white/8 bg-black/30 p-4 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-awok-gold">Payment &amp; email</h2>
        <dl className="mt-4 space-y-2 font-mono text-xs text-awok-muted break-all">
          {order.stripeCheckoutSessionId ? (
            <div>
              <dt className="text-awok-gold/80">Checkout session</dt>
              <dd>{order.stripeCheckoutSessionId}</dd>
            </div>
          ) : null}
          {stripePi ? (
            <div>
              <dt className="text-awok-gold/80">PaymentIntent</dt>
              <dd>
                {stripeDash ? (
                  <a href={stripeDash} target="_blank" rel="noreferrer" className="text-awok-gold hover:underline">
                    {stripePi}
                  </a>
                ) : (
                  stripePi
                )}
              </dd>
            </div>
          ) : null}
          <div className="pt-2 text-[11px] text-awok-muted">
            Customer confirmation: {order.confirmationEmailSent ? "sent" : "not sent"} ({order.confirmationEmailStatus ?? "—"}
            ) · Kitchen email: {order.merchantNotificationEmailSent ? "sent" : "not sent"}
          </div>
        </dl>
      </div>
    </div>
  );
}
