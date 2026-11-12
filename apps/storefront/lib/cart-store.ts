"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartLine {
  variantId: number;
  slug?: string; // product slug, for linking back to the product page
  productName: string;
  variantLabel: string;
  unitPrice: number; // paisa — display only; the server re-prices at checkout
  quantity: number;
  heat?: "Mild" | "Medium" | "Hot"; // display only, for the mini-basket row
  maxQty?: number; // stock cap seen when added — display only; checkout re-checks stock
}

interface CartState {
  lines: CartLine[];
  add: (line: CartLine) => void;
  setQuantity: (variantId: number, quantity: number) => void;
  remove: (variantId: number) => void;
  /** Puts a removed line back at its old position (mini-basket undo). */
  restore: (line: CartLine, index: number) => void;
  /** Basket page: the customer accepted the price that is now on sale, so the line shows it. */
  acceptPrice: (variantId: number, unitPrice: number) => void;
  clear: () => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((s) => {
          const existing = s.lines.find((l) => l.variantId === line.variantId);
          if (!existing) return { lines: [...s.lines, line] };
          return {
            lines: s.lines.map((l) =>
              l.variantId === line.variantId ? { ...l, quantity: l.quantity + line.quantity } : l,
            ),
          };
        }),
      setQuantity: (variantId, quantity) =>
        set((s) => ({
          lines:
            quantity <= 0
              ? s.lines.filter((l) => l.variantId !== variantId)
              : s.lines.map((l) => (l.variantId === variantId ? { ...l, quantity } : l)),
        })),
      remove: (variantId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),
      restore: (line, index) =>
        set((s) => {
          if (s.lines.some((l) => l.variantId === line.variantId)) return s;
          const lines = s.lines.slice();
          lines.splice(Math.min(index, lines.length), 0, line);
          return { lines };
        }),
      acceptPrice: (variantId, unitPrice) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.variantId === variantId ? { ...l, unitPrice } : l)),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: "acharkuthi-cart" },
  ),
);

export const cartTotal = (lines: CartLine[]) =>
  lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
