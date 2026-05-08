"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatCents } from "@/lib/utils";

export default function PrintOrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.order ?? null))
      .then(() => setTimeout(() => window.print(), 400));
  }, [id]);

  if (!order) return <p className="p-8 text-sm">Loading ticket…</p>;

  const items = (order.items as { name: string; quantity: number; lineTotalCents: number; notes?: string }[]) ?? [];

  return (
    <div className="max-w-md p-6 text-black">
      <h1 className="text-2xl font-bold">A Wok</h1>
      <p className="text-sm">1025 A St, Hayward, CA 94541</p>
      <p className="mt-4 font-mono text-lg font-bold">{order.orderNumber as string}</p>
      <p className="text-xs capitalize">{(order.orderStatus as string) ?? ""}</p>
      <hr className="my-4" />
      <ul className="space-y-2 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex justify-between gap-4">
            <span>
              {it.quantity}× {it.name}
              {it.notes ? <span className="block text-xs text-gray-600">{it.notes}</span> : null}
            </span>
            <span>{formatCents(it.lineTotalCents)}</span>
          </li>
        ))}
      </ul>
      <hr className="my-4" />
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCents(order.subtotal as number)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>{formatCents(order.tax as number)}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery</span>
          <span>{formatCents((order.deliveryFee as number) ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tip</span>
          <span>{formatCents((order.tip as number) ?? 0)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>{formatCents(order.total as number)}</span>
        </div>
      </div>
      <p className="mt-6 text-xs text-gray-600">{(order.customerNotes as string) || ""}</p>
    </div>
  );
}
