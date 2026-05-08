"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PublicPageHero } from "@/components/public-page-hero";

export default function TrackOrderLookupPage() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = value.trim().replace(/^#/, "");
    if (!n) return;
    router.push(`/track-order/${encodeURIComponent(n)}`);
  }

  return (
    <div>
      <PublicPageHero
        eyebrow="Orders"
        title="Track your order"
        subtitle="Enter the order number from your confirmation email or receipt (letters and numbers, no spaces)."
      />
      <div className="mx-auto max-w-lg px-4 pb-20 pt-2 md:px-6">
        <form onSubmit={submit} className="glass-panel rounded-3xl p-6 sm:p-8">
          <label htmlFor="order-num" className="text-xs font-semibold uppercase tracking-widest text-awok-gold">
            Order number
          </label>
          <input
            id="order-num"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. AWOK-XXXX"
            className="mt-3 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-awok-cream outline-none placeholder:text-awok-muted/60 focus:border-awok-ember/50 focus:ring-2 focus:ring-awok-ember/25"
            autoComplete="off"
          />
          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-gradient-to-r from-awok-ember to-awok-ember2 py-3 text-sm font-bold text-awok-deep shadow-glow"
          >
            View status
          </button>
        </form>
      </div>
    </div>
  );
}
