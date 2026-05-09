"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

export default function OrderSuccessInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "ready" | "timeout">("loading");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus("timeout");
      return;
    }
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      tries += 1;
      const res = await fetch(`/api/orders/lookup?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (cancelled) return;
      if (data.found && data.paymentStatus === "paid" && data.orderNumber) {
        setOrderNumber(data.orderNumber);
        setStatus("ready");
        return;
      }
      // Webhook can lag; server also syncs with Stripe on each poll — allow ~90s total
      if (tries > 45) {
        setStatus("timeout");
        return;
      }
      setTimeout(tick, 2000);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 pb-[max(5rem,env(safe-area-inset-bottom))] text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mx-auto mb-8 h-24 w-24 rounded-full bg-gradient-to-br from-awok-ember to-awok-gold p-[2px]"
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-awok-deep text-2xl">✓</div>
      </motion.div>
      <h1 className="font-display text-3xl font-bold text-awok-cream">Thank you</h1>
      {status === "loading" && <p className="mt-4 text-awok-muted">Confirming your payment…</p>}
      {status === "ready" && orderNumber && (
        <>
          <p className="mt-4 text-awok-muted">Your order is in the wok queue.</p>
          <p className="mt-6 break-all font-display text-2xl font-extrabold tracking-wide text-gradient-fire sm:text-4xl">
            {orderNumber}
          </p>
          <p className="mt-2 text-sm text-awok-muted">Show this number when you pick up your order.</p>
          <Link
            href={`/track-order/${orderNumber}`}
            className="mt-10 inline-flex rounded-full bg-gradient-to-r from-awok-ember to-awok-ember2 px-8 py-3 text-sm font-bold text-awok-deep"
          >
            Track order
          </Link>
        </>
      )}
      {status === "timeout" && (
        <p className="mt-4 text-awok-muted">
          We could not confirm payment yet. If you were charged, please contact the restaurant with your email receipt.
        </p>
      )}
    </div>
  );
}
