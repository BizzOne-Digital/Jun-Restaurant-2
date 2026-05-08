"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { formatCents, shuffleArray } from "@/lib/utils";
import Link from "next/link";
import { cartLineCount, cartSubtotalCents, useCart } from "@/components/cart/cart-provider";
import { MenuItemModal } from "@/components/menu/menu-item-modal";
import type { MenuItemDTO } from "@/components/menu/types";
import { PROTEIN_OPTION_NAME, requiresProteinChoiceMenuItem } from "@/lib/protein-choice";

type ApiCategory = {
  _id: string;
  name: string;
  slug: string;
  items: MenuItemDTO[];
};

export function MenuPageClient() {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string>("");
  const [query, setQuery] = useState("");
  const [modalItem, setModalItem] = useState<(MenuItemDTO & { categoryName: string }) | null>(null);
  const [fbtNonce, setFbtNonce] = useState(0);
  const { lines, addLine } = useCart();

  useEffect(() => {
    fetch("/api/menu")
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories ?? []);
        const first = d.categories?.[0]?.slug;
        if (first) setActiveSlug(first);
      })
      .catch(() => toast.error("Could not load menu"))
      .finally(() => setLoading(false));
  }, []);

  const activeCategory = categories.find((c) => c.slug === activeSlug) ?? categories[0];

  const frequentlyBoughtTogether = useMemo(() => {
    void fbtNonce;
    if (!modalItem) return [];
    const drinksCat = categories.find((c) => c.slug === "drinks");
    const appCat = categories.find((c) => c.slug === "appetizer");
    const drinks = [...(drinksCat?.items ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    const appPool = (appCat?.items ?? []).filter((i) => i._id !== modalItem._id);
    const threeApps = shuffleArray(appPool).slice(0, 3);
    return [...drinks, ...threeApps];
  }, [categories, modalItem, fbtNonce]);

  const filteredItems = useMemo(() => {
    const list = activeCategory?.items ?? [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((i) => i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q));
  }, [activeCategory, query]);

  const subtotal = cartSubtotalCents(lines);
  const count = cartLineCount(lines);

  const openModal = useCallback((item: MenuItemDTO, categoryName: string) => {
    setFbtNonce((n) => n + 1);
    setModalItem({ ...item, categoryName });
  }, []);

  const handleQuickAdd = useCallback(
    (p: MenuItemDTO) => {
      addLine({
        menuItemId: p._id,
        name: p.name,
        priceCents: p.price,
        imageUrl: p.imageUrl,
        quantity: 1,
        bogoEnabled: Boolean(p.bogoEnabled),
        selectedOptions: requiresProteinChoiceMenuItem(p.name)
          ? [{ name: PROTEIN_OPTION_NAME, value: "Vegetarian" }]
          : undefined,
      });
      toast.success(`${p.name} added`);
    },
    [addLine]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-8 md:flex md:gap-8 md:px-6 md:pb-16">
      <div className="flex-1">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-awok-gold">Menu</p>
            <h1 className="font-display text-3xl font-bold text-awok-cream md:text-4xl">Crafted for craving</h1>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes…"
            className="w-full rounded-full border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-awok-cream outline-none ring-awok-ember/40 placeholder:text-awok-muted focus:ring-2 md:max-w-xs"
          />
        </div>

        <div className="sticky top-28 z-30 -mx-1 mb-6 flex gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] md:static md:flex-wrap">
          {categories.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => setActiveSlug(c.slug)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                activeSlug === c.slug
                  ? "bg-gradient-to-r from-awok-ember to-awok-ember2 text-awok-deep shadow-glow"
                  : "border border-white/10 bg-white/5 text-awok-muted hover:border-awok-gold/40 hover:text-awok-cream"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {filteredItems.map((item) => (
              <motion.button
                type="button"
                key={item._id}
                layout
                onClick={() => openModal(item, activeCategory?.name ?? "")}
                className="group flex w-full flex-col overflow-hidden rounded-2xl border border-white/6 bg-awok-panel/80 text-left shadow-lift transition hover:border-awok-ember/35 hover:shadow-glow sm:flex-row"
              >
                <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-black/40 sm:aspect-auto sm:h-auto sm:min-h-[140px] sm:w-40">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 160px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-awok-muted">A Wok</div>
                  )}
                  {item.bogoEnabled && (
                    <span className="absolute left-2 top-2 rounded-full bg-awok-crimsonglow/90 px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow-md">
                      BOGO
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-awok-cream">{item.name}</h3>
                    {item.isPopular && (
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-awok-muted">{item.description}</p>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <p className="text-sm font-bold text-awok-gold">{formatCents(item.price)}</p>
                    <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-awok-cream transition group-hover:bg-awok-ember group-hover:text-awok-deep">
                      View
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <aside className="hidden w-80 shrink-0 md:block">
        <div className="sticky top-28 rounded-2xl border border-white/8 bg-black/40 p-5 glass-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-awok-gold">Your order</p>
          <p className="mt-1 font-display text-2xl font-bold text-awok-cream">{formatCents(subtotal)}</p>
          <p className="text-xs text-awok-muted">{count} items</p>
          <Link
            href="/cart"
            className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-awok-ember to-awok-ember2 py-2.5 text-sm font-bold text-awok-deep"
          >
            View cart
          </Link>
        </div>
      </aside>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-awok-deep/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-awok-muted">Subtotal</p>
            <p className="font-display text-lg font-bold text-awok-cream">{formatCents(subtotal)}</p>
          </div>
          <Link
            href="/cart"
            className="rounded-full bg-gradient-to-r from-awok-ember to-awok-ember2 px-5 py-2.5 text-sm font-bold text-awok-deep"
          >
            Cart ({count})
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {modalItem && (
          <MenuItemModal
            key={modalItem._id}
            item={modalItem}
            popularPickups={frequentlyBoughtTogether}
            onClose={() => setModalItem(null)}
            onAddToCart={(payload) => {
              addLine(payload);
              toast.success("Added to cart");
            }}
            onQuickAdd={handleQuickAdd}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
