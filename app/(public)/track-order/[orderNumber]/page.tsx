"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";

const steps = ["new", "accepted", "preparing", "ready", "completed"] as const;

export default function TrackOrderPage() {
  const routeParams = useParams();
  const orderNumber = String(routeParams.orderNumber ?? "");
  const [data, setData] = useState<{
    orderNumber: string;
    orderStatus: string;
    fulfillmentType: string;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (!orderNumber) return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`);
      if (res.ok) setData(await res.json());
    }, 4000);
    fetch(`/api/orders/${encodeURIComponent(orderNumber)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
    return () => clearInterval(id);
  }, [orderNumber]);

  const status = data?.orderStatus ?? "new";
  const cancelled = status === "cancelled";
  const idx = cancelled ? -1 : steps.indexOf(status as (typeof steps)[number]);
  const activeIndex = idx === -1 ? (cancelled ? -1 : 0) : Math.max(0, idx);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 pb-[max(3rem,env(safe-area-inset-bottom))] md:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-awok-gold">Order tracking</p>
      <h1 className="break-all font-display text-2xl font-bold text-awok-cream sm:text-3xl">#{orderNumber}</h1>
      {!data && <p className="mt-6 text-awok-muted">Loading…</p>}
      {cancelled && data && (
        <p className="mt-6 rounded-2xl border border-awok-crimsonglow/40 bg-awok-crimson/20 px-4 py-3 text-sm text-awok-cream">
          This order was cancelled. If you believe this is a mistake, contact the restaurant.
        </p>
      )}
      {data && !cancelled && (
        <div className="mt-10 glass-panel rounded-3xl p-5 sm:p-8">
          <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            {steps.map((s, i) => {
              const done = i <= activeIndex;
              return (
                <div key={s} className="flex flex-1 flex-col items-center text-center">
                  <motion.div
                    initial={false}
                    animate={{ scale: done ? 1.05 : 1 }}
                    className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 text-xs font-bold uppercase ${
                      done
                        ? "border-awok-gold bg-awok-gold/20 text-awok-gold"
                        : "border-white/15 text-awok-muted"
                    }`}
                  >
                    {i + 1}
                  </motion.div>
                  <p className={`text-sm font-semibold capitalize ${done ? "text-awok-cream" : "text-awok-muted"}`}>
                    {s}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-sm text-awok-muted">
            {data.fulfillmentType === "pickup" ? "Pickup" : "Delivery"} · Total charged:{" "}
            <span className="font-semibold text-awok-cream">
              {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(data.total / 100)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
