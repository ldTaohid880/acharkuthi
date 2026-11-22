"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartLine {
  variantId: number;
  slug?: string; // product slug, for linking back to the product page
  productName: string;
  /** Bangla name, shown first on the Bangla site (display only, like the basket page). */
  productNameBn?: string | undefined;
  variantLabel: string;
  unitPrice: number; // paisa — display only; the server re-prices at checkout
  quantity: number;
  heat?: "Not spicy" | "Mild" | "Medium" | "Hot"; // display only, for the mini-basket row
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

/** The name to show for a basket line in this language: Bangla first on the Bangla site. */
export const lineName = (l: Pick<CartLine, "productName" | "productNameBn">, lang: string) =>
  lang === "bn" && l.productNameBn ? l.productNameBn : l.productName;

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

/**
 * Empty basket art (drawer and basket page), owner 2026-11-22: a watercolour of an empty jar, its
 * lid, a raw mango and two dried chillies, in the shelf-disc illustration style, on white paper.
 * components/empty-basket-art.tsx clips it to a blob.
 */
export const EMPTY_JAR = "/images/basket/empty-illustration.webp";
