"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { lineSubtotalCents } from "@/lib/pricing";
import { proteinAddonFromSelected } from "@/lib/protein-choice";

export type CartLine = {
  menuItemId: string;
  name: string;
  priceCents: number;
  imageUrl?: string;
  quantity: number;
  notes?: string;
  /** When true, list-price BOGO applies at checkout (server re-validates). */
  bogoEnabled?: boolean;
  selectedOptions?: { name: string; value: string }[];
};

function optionsKey(selected?: { name: string; value: string }[]) {
  return JSON.stringify(selected ?? []);
}

function lineMatches(a: CartLine, b: Pick<CartLine, "menuItemId" | "notes" | "selectedOptions">) {
  return (
    a.menuItemId === b.menuItemId &&
    (a.notes ?? "") === (b.notes ?? "") &&
    optionsKey(a.selectedOptions) === optionsKey(b.selectedOptions)
  );
}

export function cartLineEffectiveUnitCents(line: CartLine): number {
  return line.priceCents + proteinAddonFromSelected(line.selectedOptions);
}

type CartContextValue = {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, "quantity"> & { quantity?: number }) => void;
  updateQty: (menuItemId: string, notes: string | undefined, selectedOptions: CartLine["selectedOptions"], quantity: number) => void;
  removeLine: (menuItemId: string, notes: string | undefined, selectedOptions?: CartLine["selectedOptions"]) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "awok-cart-v3";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const addLine = useCallback((line: Omit<CartLine, "quantity"> & { quantity?: number }) => {
    const qty = line.quantity ?? 1;
    setLines((prev) => {
      const idx = prev.findIndex((l) => lineMatches(l, line));
      if (idx === -1) {
        return [...prev, { ...line, bogoEnabled: line.bogoEnabled ?? false, quantity: qty }];
      }
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        quantity: next[idx].quantity + qty,
        bogoEnabled: next[idx].bogoEnabled ?? line.bogoEnabled ?? false,
      };
      return next;
    });
  }, []);

  const updateQty = useCallback(
    (menuItemId: string, notes: string | undefined, selectedOptions: CartLine["selectedOptions"], quantity: number) => {
      setLines((prev) =>
        prev
          .map((l) =>
            lineMatches(l, { menuItemId, notes, selectedOptions })
              ? { ...l, quantity: Math.max(1, quantity) }
              : l
          )
          .filter((l) => l.quantity > 0)
      );
    },
    []
  );

  const removeLine = useCallback((menuItemId: string, notes: string | undefined, selectedOptions?: CartLine["selectedOptions"]) => {
    setLines((prev) => prev.filter((l) => !lineMatches(l, { menuItemId, notes, selectedOptions })));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, addLine, updateQty, removeLine, clear }),
    [lines, addLine, updateQty, removeLine, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function cartLineCount(lines: CartLine[]) {
  return lines.reduce((n, l) => n + l.quantity, 0);
}

export function cartSubtotalCents(lines: CartLine[]) {
  return lines.reduce(
    (s, l) =>
      s + lineSubtotalCents(cartLineEffectiveUnitCents(l), l.quantity, Boolean(l.bogoEnabled)),
    0
  );
}
