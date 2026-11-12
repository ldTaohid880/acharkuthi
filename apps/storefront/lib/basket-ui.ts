"use client";

import { create } from "zustand";

/** Open state of the mini-basket and the "added to basket" toast. Not persisted. */
interface BasketUi {
  open: boolean;
  /** Name of the product just added; null hides the toast. `at` re-arms the timer on repeat adds. */
  toast: { name: string; at: number } | null;
  openBasket: () => void;
  closeBasket: () => void;
  notifyAdded: (name: string) => void;
  hideToast: () => void;
}

export const useBasketUi = create<BasketUi>()((set) => ({
  open: false,
  toast: null,
  openBasket: () => set({ open: true, toast: null }),
  closeBasket: () => set({ open: false }),
  notifyAdded: (name) => set({ toast: { name, at: Date.now() } }),
  hideToast: () => set({ toast: null }),
}));
