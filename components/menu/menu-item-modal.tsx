"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion } from "framer-motion";
import { formatCents } from "@/lib/utils";
import { lineSubtotalCents, listSubtotalWithoutBogoCents } from "@/lib/pricing";
import {
  PROTEIN_OPTION_NAME,
  PROTEIN_OPTIONS,
  requiresProteinChoiceMenuItem,
} from "@/lib/protein-choice";
import type { MenuItemDTO } from "@/components/menu/types";

type Props = {
  item: MenuItemDTO & { categoryName: string };
  popularPickups: MenuItemDTO[];
  onClose: () => void;
  onAddToCart: (payload: {
    menuItemId: string;
    name: string;
    priceCents: number;
    imageUrl?: string;
    quantity: number;
    notes?: string;
    bogoEnabled: boolean;
    selectedOptions?: { name: string; value: string }[];
  }) => void;
  onQuickAdd: (item: MenuItemDTO) => void;
};

export function MenuItemModal({ item, popularPickups, onClose, onAddToCart, onQuickAdd }: Props) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const meat = requiresProteinChoiceMenuItem(item.name);
  const [protein, setProtein] = useState<string>(PROTEIN_OPTIONS[0].value);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const bogo = Boolean(item.bogoEnabled);
  const proteinAddon = PROTEIN_OPTIONS.find((o) => o.value === protein)?.addonCents ?? 0;
  const unitWithProtein = item.price + (meat ? proteinAddon : 0);
  const listTotal = listSubtotalWithoutBogoCents(unitWithProtein, qty);
  const chargeTotal = lineSubtotalCents(unitWithProtein, qty, bogo);
  const savings = listTotal - chargeTotal;

  function addCurrent() {
    onAddToCart({
      menuItemId: item._id,
      name: item.name,
      priceCents: item.price,
      imageUrl: item.imageUrl,
      quantity: qty,
      notes: notes.trim() || undefined,
      bogoEnabled: bogo,
      selectedOptions: meat ? [{ name: PROTEIN_OPTION_NAME, value: protein }] : undefined,
    });
    onClose();
  }

  const modal = (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-item-title"
      className="fixed inset-0 z-[200] isolate"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4 sm:py-6">
        <motion.div
          initial={{ y: "100%", opacity: 0.92 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0.9 }}
          transition={{ type: "spring", stiffness: 420, damping: 38 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[min(100dvh,920px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/12 bg-[#0f1117]/95 shadow-[0_-24px_90px_rgba(0,0,0,0.75)] backdrop-blur-2xl sm:max-h-[min(90dvh,880px)] sm:rounded-3xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-awok-muted transition hover:bg-white/10 hover:text-awok-cream"
              aria-label="Close"
            >
              ✕
            </button>
            <p className="max-w-[70%] truncate text-center text-sm font-semibold text-awok-cream">{item.name}</p>
            <span className="w-9" aria-hidden />
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain lg:flex-row">
            <div className="relative aspect-[4/3] min-h-[200px] w-full min-w-0 shrink-0 bg-gradient-to-br from-black/60 to-awok-graphite/90 lg:aspect-auto lg:w-[46%] lg:min-h-[min(360px,45vh)]">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px)100vw,400px"
                  priority
                />
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center text-awok-muted">No image</div>
              )}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f1117] via-transparent to-transparent lg:bg-gradient-to-r" />
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden p-5 sm:p-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-awok-gold">{item.categoryName}</p>
                <h2 id="menu-item-title" className="mt-1 font-display text-2xl font-bold leading-tight text-awok-cream sm:text-3xl">
                  {item.name}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold text-awok-gold">{formatCents(item.price)}</span>
                  {item.isPopular && (
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                      Popular
                    </span>
                  )}
                  {bogo && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-awok-crimsonglow/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-awok-ember2 ring-1 ring-awok-ember/40">
                      Buy 1, get 1 free
                    </span>
                  )}
                </div>
                {item.description ? (
                  <p className="mt-3 text-sm leading-relaxed text-awok-muted">{item.description}</p>
                ) : (
                  <p className="mt-3 text-sm italic text-awok-muted/80">Chef-crafted. Ask in-store for allergens.</p>
                )}
              </div>

              {meat && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-awok-cream">Choice of Protein</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-awok-muted">
                        Required
                      </span>
                      <span className="text-[10px] font-medium text-awok-muted">Choose 1</span>
                    </div>
                  </div>
                  <ul className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10 bg-black/30">
                    {PROTEIN_OPTIONS.map((opt) => {
                      const selected = protein === opt.value;
                      return (
                        <li key={opt.value}>
                          <label className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 transition hover:bg-white/[0.06]">
                            <input
                              type="radio"
                              name="protein"
                              value={opt.value}
                              checked={selected}
                              onChange={() => setProtein(opt.value)}
                              className="sr-only"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-awok-cream">{opt.label}</span>
                              {opt.addonCents > 0 && (
                                <span className="mt-0.5 block text-xs text-awok-muted">
                                  +{formatCents(opt.addonCents)}
                                </span>
                              )}
                            </span>
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-black/40 ${
                                selected ? "border-awok-ember" : "border-white/25"
                              }`}
                              aria-hidden
                            >
                              {selected ? <span className="h-2.5 w-2.5 rounded-full bg-awok-ember" /> : null}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-awok-muted">Special instructions</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add a note (e.g. extra sauce on the side)"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-awok-cream outline-none transition placeholder:text-awok-muted/60 focus:border-awok-ember/50 focus:ring-2 focus:ring-awok-ember/25"
                />
                <p className="mt-1 text-[11px] text-awok-muted/80">You may be charged for extras.</p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase text-awok-muted">Quantity</span>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 p-1">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-awok-cream transition hover:bg-white/15"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <span className="min-w-[2ch] text-center text-base font-bold text-awok-cream">{qty}</span>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-awok-cream transition hover:bg-white/15"
                    onClick={() => setQty((q) => q + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border border-white/8 bg-black/25 p-4">
                <p className="text-sm font-bold text-awok-cream">Frequently bought together</p>
                <p className="mt-0.5 text-[11px] text-awok-muted">
                  All three sodas plus three random appetizers (changes when you open an item).
                </p>
                <div className="relative mt-3 min-h-[132px] min-w-0">
                  <div
                    className="flex gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2 pt-0.5 [-webkit-overflow-scrolling:touch] touch-pan-x"
                    role="region"
                    aria-label="Suggested add-ons"
                  >
                  {popularPickups.length === 0 && (
                    <p className="text-xs text-awok-muted">No suggestions — menu still loading.</p>
                  )}
                  {popularPickups.map((p) => (
                    <div
                      key={p._id}
                      className="relative w-[140px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-awok-panel/80 transition hover:border-awok-ember/35 hover:shadow-glow"
                    >
                      <div className="relative h-20 w-full bg-black/40">
                        {p.imageUrl ? (
                          <Image src={p.imageUrl} alt="" fill className="object-cover" sizes="140px" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-awok-muted">A Wok</div>
                        )}
                        <button
                          type="button"
                          onClick={() => onQuickAdd(p)}
                          className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/70 text-lg font-light text-awok-cream shadow-lg backdrop-blur transition hover:scale-105 hover:border-awok-gold/50 hover:bg-awok-ember hover:text-awok-deep"
                          aria-label={`Add ${p.name}`}
                        >
                          +
                        </button>
                      </div>
                      <div className="p-2">
                        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-awok-cream">{p.name}</p>
                        <p className="mt-1 text-[11px] font-bold text-awok-gold">{formatCents(p.price)}</p>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5 sm:pb-5">
            <motion.button
              type="button"
              onClick={addCurrent}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full rounded-2xl bg-gradient-to-r from-awok-ember via-awok-ember2 to-awok-gold py-3.5 text-sm font-bold uppercase tracking-wide text-awok-deep shadow-glow transition hover:shadow-[0_0_40px_rgba(255,107,44,0.35)]"
            >
              <span className="block text-center">
                {bogo && qty > 1 && savings > 0 ? (
                  <span className="inline-flex flex-wrap items-center justify-center gap-2">
                    <span>
                      Add {qty} to order · {formatCents(chargeTotal)}
                    </span>
                    <span className="text-awok-deep/70 line-through">{formatCents(listTotal)}</span>
                  </span>
                ) : (
                  <span>
                    Add {qty} to order · {formatCents(chargeTotal)}
                  </span>
                )}
                {meat && proteinAddon > 0 && (
                  <span className="mt-1 block text-[10px] font-normal normal-case opacity-90">
                    Includes protein add-on
                  </span>
                )}
              </span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
