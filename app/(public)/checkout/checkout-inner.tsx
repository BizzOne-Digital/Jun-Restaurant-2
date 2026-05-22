"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { DEFAULT_TAX_RATE } from "@/lib/constants";
import { formatCents } from "@/lib/utils";
import { checkoutBodySchema } from "@/lib/validators/checkout";
import { cartSubtotalCents, useCart } from "@/components/cart/cart-provider";

const TIP_MAX_CENTS = 500_00;

function checkoutApiErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") return "Checkout failed";
  const err = (data as { error?: unknown }).error;
  const code = (data as { code?: unknown }).code;
  if (typeof err === "string") {
    if (typeof code === "string" && code && code !== "checkout_failed") {
      return `${err} (${code})`;
    }
    return err;
  }
  if (err && typeof err === "object") {
    const f = err as { formErrors?: unknown[]; fieldErrors?: Record<string, unknown> };
    if (Array.isArray(f.formErrors) && f.formErrors.length > 0) {
      const first = f.formErrors[0];
      if (typeof first === "string") return first;
    }
    for (const v of Object.values(f.fieldErrors ?? {})) {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") return v[0];
    }
  }
  return "Checkout failed";
}

type TipPreset = "none" | "pct15" | "pct20" | "pct25" | "custom";
type PickupType = "ASAP" | "SCHEDULED";

function parseCustomTipCents(raw: string): number {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(TIP_MAX_CENTS, Math.round(n * 100));
}

/** Returns the minimum datetime-local value string (30 min from now, rounded to next 15 min). */
function minPickupDatetimeLocal(): string {
  const now = new Date();
  const earliest = new Date(now.getTime() + 30 * 60 * 1000);
  const rounded = Math.ceil(earliest.getMinutes() / 15) * 15;
  earliest.setMinutes(rounded, 0, 0);
  // Format as "YYYY-MM-DDTHH:MM" for datetime-local
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${earliest.getFullYear()}-${pad(earliest.getMonth() + 1)}-${pad(earliest.getDate())}T${pad(earliest.getHours())}:${pad(earliest.getMinutes())}`;
}

/** Format a datetime-local value string into a human-readable pickup time for storage. */
function formatPickupTimeForStorage(datetimeLocal: string): string {
  if (!datetimeLocal) return "";
  const d = new Date(datetimeLocal);
  if (isNaN(d.getTime())) return datetimeLocal;
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function CheckoutInner() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { lines, clear } = useCart();
  const [tipPreset, setTipPreset] = useState<TipPreset>("none");
  const [customTipDollars, setCustomTipDollars] = useState("");
  const [pickupType, setPickupType] = useState<PickupType>("ASAP");
  const [pickupDatetime, setPickupDatetime] = useState(""); // datetime-local value e.g. "2025-06-01T14:30"
  const [customerNotes, setCustomerNotes] = useState(searchParams.get("notes") || "");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  useEffect(() => {
    setCustomerNotes(searchParams.get("notes") || "");
  }, [searchParams]);

  const subtotal = cartSubtotalCents(lines);
  const tax = Math.round(subtotal * DEFAULT_TAX_RATE);

  const tipCents = useMemo(() => {
    if (tipPreset === "none") return 0;
    if (tipPreset === "pct15") return Math.round(subtotal * 0.15);
    if (tipPreset === "pct20") return Math.round(subtotal * 0.2);
    if (tipPreset === "pct25") return Math.round(subtotal * 0.25);
    return parseCustomTipCents(customTipDollars);
  }, [tipPreset, subtotal, customTipDollars]);

  const total = useMemo(() => subtotal + tax + tipCents, [subtotal, tax, tipCents]);

  const selectPreset = useCallback((p: TipPreset) => {
    setTipPreset(p);
    if (p !== "custom") setCustomTipDollars("");
  }, []);

  async function pay() {
    if (!lines.length) {
      toast.error("Your cart is empty");
      return;
    }
    let guestInfo: { name: string; email: string; phone: string } | undefined;
    if (!session?.user?.id) {
      if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
        toast.error("Please complete guest name, email, and phone");
        return;
      }
      guestInfo = { name: guestName.trim(), email: guestEmail.trim(), phone: guestPhone.trim() };
    }

    if (pickupType === "SCHEDULED" && !pickupDatetime.trim()) {
      toast.error("Please select a pickup time");
      return;
    }

    const body = {
      items: lines.map((l) => ({
        menuItemId: l.menuItemId,
        quantity: l.quantity,
        notes: l.notes,
        selectedOptions: l.selectedOptions,
      })),
      fulfillmentType: "pickup" as const,
      pickupType,
      pickupTime: pickupType === "SCHEDULED" ? formatPickupTimeForStorage(pickupDatetime) : undefined,
      customerNotes,
      tipCents,
      guestInfo,
    };

    const parsed = checkoutBodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Please check the form";
      toast.error(msg);
      return;
    }

    const res = await fetch("/api/cart/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });

    let data: { url?: string; error?: unknown } = {};
    try {
      data = (await res.json()) as typeof data;
    } catch {
      toast.error(`Checkout failed (HTTP ${res.status}). Try again.`);
      return;
    }

    if (!res.ok) {
      toast.error(checkoutApiErrorMessage(data));
      return;
    }
    if (!data.url || typeof data.url !== "string") {
      toast.error("Checkout did not return a payment link. Try again.");
      return;
    }
    clear();
    window.location.href = data.url;
  }

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-awok-muted">Your cart is empty.</p>
        <Link href="/menu" className="mt-4 inline-block text-awok-ember2 hover:underline">
          Back to menu
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10 md:px-6 md:pb-10">
      <h1 className="font-display text-3xl font-bold text-awok-cream">Checkout</h1>
      <p className="mt-2 text-sm text-awok-muted">Secure payment powered by Stripe.</p>

      <div className="mt-8 space-y-8">
        {!session?.user && (
          <div className="glass-panel space-y-4 rounded-2xl p-4 sm:p-6">
            <h2 className="font-semibold text-awok-cream">Guest information</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-awok-cream sm:text-sm"
                placeholder="Full name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
              />
              <input
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-awok-cream sm:text-sm"
                placeholder="Email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
              />
              <input
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-awok-cream md:col-span-2 sm:text-sm"
                placeholder="Phone"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Pickup timing ── */}
        <div className="glass-panel space-y-4 rounded-2xl p-4 sm:p-6">
          <h2 className="font-semibold text-awok-cream">Pickup time</h2>
          <p className="text-xs text-awok-muted">Choose when you&apos;d like to pick up your order.</p>

          {/* ASAP / SELECT TIME option cards */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPickupType("ASAP")}
              aria-pressed={pickupType === "ASAP"}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 text-center transition touch-manipulation ${
                pickupType === "ASAP"
                  ? "border-awok-gold bg-awok-gold/10"
                  : "border-white/10 bg-black/20 hover:border-white/25"
              }`}
            >
              <span className="text-2xl" aria-hidden="true">⚡</span>
              <span className={`text-xs font-bold uppercase tracking-widest ${pickupType === "ASAP" ? "text-awok-gold" : "text-awok-cream"}`}>
                Pick Up ASAP
              </span>
              <span className="text-[11px] text-awok-muted">Ready as soon as possible</span>
            </button>

            <button
              type="button"
              onClick={() => setPickupType("SCHEDULED")}
              aria-pressed={pickupType === "SCHEDULED"}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 text-center transition touch-manipulation ${
                pickupType === "SCHEDULED"
                  ? "border-blue-400 bg-blue-500/10"
                  : "border-white/10 bg-black/20 hover:border-white/25"
              }`}
            >
              <span className="text-2xl" aria-hidden="true">🕐</span>
              <span className={`text-xs font-bold uppercase tracking-widest ${pickupType === "SCHEDULED" ? "text-blue-300" : "text-awok-cream"}`}>
                Select Time (Later)
              </span>
              <span className="text-[11px] text-awok-muted">Schedule for later</span>
            </button>
          </div>

          {/* Datetime picker — only shown when SCHEDULED */}
          {pickupType === "SCHEDULED" && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-awok-muted" htmlFor="pickup-datetime">
                Pickup Date &amp; Time
              </label>
              <input
                id="pickup-datetime"
                type="datetime-local"
                value={pickupDatetime}
                min={minPickupDatetimeLocal()}
                onChange={(e) => setPickupDatetime(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-awok-cream [color-scheme:dark] sm:text-sm"
              />
              {!pickupDatetime && (
                <p className="text-[11px] text-awok-ember2" role="alert">
                  Please select a pickup time to continue.
                </p>
              )}
            </div>
          )}

          <textarea
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-awok-cream sm:text-sm"
            placeholder="Special instructions (optional)"
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
          />
        </div>

        <div className="glass-panel space-y-3 rounded-2xl p-4 sm:p-6">
          <h2 className="font-semibold text-awok-cream">Tip</h2>
          <p className="text-xs text-awok-muted">Percentages are based on your order subtotal (before tax).</p>
          <div className="flex flex-wrap gap-2 touch-manipulation">
            {(
              [
                { id: "none" as const, label: "No tip" },
                { id: "pct15" as const, label: "15%" },
                { id: "pct20" as const, label: "20%" },
                { id: "pct25" as const, label: "25%" },
                { id: "custom" as const, label: "Custom" },
              ] satisfies { id: TipPreset; label: string }[]
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectPreset(id)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                  tipPreset === id ? "bg-awok-gold text-awok-deep" : "bg-white/10 text-awok-cream"
                }`}
              >
                {label}
                {id !== "none" && id !== "custom" && subtotal > 0 && (
                  <span className="ml-1 opacity-80">
                    ({formatCents(Math.round(subtotal * (id === "pct15" ? 0.15 : id === "pct20" ? 0.2 : 0.25)))})
                  </span>
                )}
              </button>
            ))}
          </div>
          {tipPreset === "custom" && (
            <div className="mt-2 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-awok-muted" htmlFor="custom-tip">
                Custom amount (USD)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-awok-muted">$</span>
                <input
                  id="custom-tip"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={customTipDollars}
                  onChange={(e) => setCustomTipDollars(e.target.value)}
                  className="min-h-11 w-full max-w-[200px] rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-base text-awok-cream sm:text-sm"
                />
              </div>
              <p className="text-[11px] text-awok-muted">Maximum tip {formatCents(TIP_MAX_CENTS)}.</p>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-6">
          <div className="flex justify-between text-sm text-awok-muted">
            <span>Subtotal</span>
            <span className="text-awok-cream">{formatCents(subtotal)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm text-awok-muted">
            <span>Tax</span>
            <span className="text-awok-cream">{formatCents(tax)}</span>
          </div>
          <div className="mt-2 flex justify-between text-sm text-awok-muted">
            <span>Tip</span>
            <span className="text-awok-cream">{formatCents(tipCents)}</span>
          </div>
          <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-lg font-bold text-awok-cream">
            <span>Total</span>
            <span>{formatCents(total)}</span>
          </div>
          <button
            type="button"
            onClick={pay}
            className="mt-6 w-full rounded-full bg-gradient-to-r from-awok-ember to-awok-ember2 py-3.5 text-sm font-bold text-awok-deep touch-manipulation"
          >
            Pay securely
          </button>
        </div>
      </div>
    </div>
  );
}
