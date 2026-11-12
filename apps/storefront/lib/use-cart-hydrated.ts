"use client";

import { useSyncExternalStore } from "react";
import { useCart, type CartLine } from "./cart-store";

const subscribe = (onChange: () => void) => useCart.persist.onFinishHydration(onChange);
const getSnapshot = () => useCart.persist.hasHydrated();
const getServerSnapshot = () => false;

/**
 * Cart lines that are safe to render in SSR'd markup: empty on the server and
 * on the first client render, then the persisted lines once localStorage has loaded.
 */
export function useHydratedCart(): { lines: CartLine[]; count: number; hydrated: boolean } {
  const lines = useCart((s) => s.lines);
  const hydrated = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const safe = hydrated ? lines : [];
  return { lines: safe, count: safe.reduce((n, l) => n + l.quantity, 0), hydrated };
}
