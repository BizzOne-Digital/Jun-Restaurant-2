"use client";

import Link from "next/link";
import { DEFAULT_TAX_RATE } from "@/lib/constants";
import { formatCents } from "@/lib/utils";
import { lineSubtotalCents } from "@/lib/pricing";
import { cartLineEffectiveUnitCents, cartSubtotalCents, useCart } from "@/components/cart/cart-provider";
import { PROTEIN_OPTION_NAME } from "@/lib/protein-choice";
import { useState } from "react";

export default function CartPage() {
  const { lines, updateQty, removeLine } = useCart();
  const [notes, setNotes] = useState("");

  const subtotal = cartSubtotalCents(lines);
  const tax = Math.round(subtotal * DEFAULT_TAX_RATE);
  const total = subtotal + tax;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-awok-cream">Your cart is empty</h1>
        <p className="mt-3 text-awok-muted">Browse the menu and add something delicious.</p>
        <Link
          href="/menu"
          className="mt-8 inline-flex rounded-full bg-gradient-to-r from-awok-ember to-awok-ember2 px-8 py-3 text-sm font-bold text-awok-deep"
        >
          View menu
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-8 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-10 md:px-6 md:pb-10">
      <h1 className="font-display text-3xl font-bold text-awok-cream">Cart</h1>
      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {lines.map((l) => {
            const protein = l.selectedOptions?.find((o) => o.name === PROTEIN_OPTION_NAME);
            const unit = cartLineEffectiveUnitCents(l);
            return (
              <div
                key={`${l.menuItemId}-${l.notes ?? ""}-${JSON.stringify(l.selectedOptions ?? [])}`}
                className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-awok-panel/80 p-4 glass-panel sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-awok-cream">{l.name}</p>
                  {protein && (
                    <p className="text-xs text-awok-gold/90">
                      Protein: <span className="text-awok-cream">{protein.value}</span>
                    </p>
                  )}
                  {l.notes && <p className="text-xs text-awok-muted">Note: {l.notes}</p>}
                  <p className="text-sm text-awok-gold">
                    Line: {formatCents(lineSubtotalCents(unit, l.quantity, Boolean(l.bogoEnabled)))}
                    {l.bogoEnabled && <span className="ml-2 text-[10px] uppercase text-awok-ember2">BOGO</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-white/10 text-awok-cream"
                    onClick={() => updateQty(l.menuItemId, l.notes, l.selectedOptions, l.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-awok-cream">{l.quantity}</span>
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full bg-white/10 text-awok-cream"
                    onClick={() => updateQty(l.menuItemId, l.notes, l.selectedOptions, l.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="ml-2 text-xs text-awok-crimsonglow hover:underline"
                    onClick={() => removeLine(l.menuItemId, l.notes, l.selectedOptions)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}

          <div>
            <p className="text-xs font-semibold uppercase text-awok-muted">Order notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-awok-cream outline-none focus:ring-2 focus:ring-awok-ember/40"
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs font-semibold uppercase text-awok-muted">Fulfillment</p>
            <p className="mt-1 text-sm font-semibold text-awok-cream">Pickup at the restaurant</p>
            <p className="mt-0.5 text-[11px] text-awok-muted">We do not offer delivery.</p>
          </div>
        </div>

        <div className="h-fit rounded-2xl border border-white/8 bg-black/40 p-6 glass-panel">
          <p className="text-xs font-semibold uppercase tracking-widest text-awok-gold">Summary</p>
          <div className="mt-4 space-y-2 text-sm text-awok-muted">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-awok-cream">{formatCents(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Est. tax</span>
              <span className="text-awok-cream">{formatCents(tax)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-3 text-base font-bold text-awok-cream">
              <span>Due at checkout</span>
              <span>{formatCents(total)}</span>
            </div>
            <p className="text-[11px] text-awok-muted">Tip can be added on the next step.</p>
          </div>
          <Link
            href={{
              pathname: "/checkout",
              query: { notes: notes || undefined },
            }}
            className="mt-6 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-awok-ember to-awok-ember2 py-3 text-sm font-bold text-awok-deep"
          >
            Continue to checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
