"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatCents } from "@/lib/utils";

type Payout = {
  _id: string;
  status: string;
  commissionAmount: number;
  restaurantPayoutAmount: number;
  stripeTransferId?: string;
  payoutScenario: string;
  order?: { orderNumber?: string };
};

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);

  async function load() {
    const res = await fetch("/api/admin/payouts");
    const data = await res.json();
    setPayouts(data.payouts ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function transfer(id: string) {
    const res = await fetch(`/api/admin/payouts/${id}/transfer`, { method: "POST" });
    if (!res.ok) toast.error("Transfer failed");
    else toast.success("Transfer created");
    load();
  }

  async function manual(id: string) {
    const res = await fetch(`/api/admin/payouts/${id}/manual-paid`, { method: "POST" });
    if (!res.ok) toast.error("Update failed");
    else toast.success("Marked paid");
    load();
  }

  return (
    <div className="min-w-0">
      <h1 className="font-display text-2xl font-bold">Payout ledger</h1>
      <div className="mt-6 w-full min-w-0 overflow-x-auto rounded-2xl border border-white/8 [-webkit-overflow-scrolling:touch]">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="bg-black/40 text-xs uppercase text-awok-muted">
            <tr>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Scenario</th>
              <th className="px-3 py-2">Commission</th>
              <th className="px-3 py-2">Restaurant</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Transfer</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p._id} className="border-t border-white/5">
                <td className="px-3 py-2 font-mono text-xs">{p.order?.orderNumber}</td>
                <td className="px-3 py-2 text-xs">{p.payoutScenario}</td>
                <td className="px-3 py-2">{formatCents(p.commissionAmount)}</td>
                <td className="px-3 py-2 text-awok-gold">{formatCents(p.restaurantPayoutAmount)}</td>
                <td className="px-3 py-2 capitalize">{p.status}</td>
                <td className="px-3 py-2 text-xs text-awok-muted">{p.stripeTransferId || "—"}</td>
                <td className="px-3 py-2 space-x-2 text-xs">
                  {p.status === "pending" && p.payoutScenario === "platform_collect_then_later_payout" && (
                    <>
                      <button type="button" className="text-awok-gold hover:underline" onClick={() => transfer(p._id)}>
                        Stripe transfer
                      </button>
                      <button type="button" className="text-awok-muted hover:underline" onClick={() => manual(p._id)}>
                        Mark manual paid
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!payouts.length && <p className="p-6 text-sm text-awok-muted">No payout records yet.</p>}
      </div>
    </div>
  );
}
