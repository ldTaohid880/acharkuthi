"use client";

import type { AdminRole } from "@repo/auth";
import type { AdminLang } from "@repo/validators";
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import type { Dict } from "@/lib/i18n/dict";

export interface ShellState {
  role: AdminRole;
  lang: AdminLang;
  t: Dict;
  unread: number;
  openSearch: () => void;
  openNotifications: () => void;
  /** Second breadcrumb in the top bar (Topbar crumb2), e.g. the order number. */
  setCrumb: (v: string | null) => void;
}

export const ShellContext = createContext<ShellState | null>(null);

export function useShell(): ShellState {
  const s = useContext(ShellContext);
  if (!s) throw new Error("useShell outside AppShell");
  return s;
}

export type Breakpoint = "phone" | "tab" | "desk";

function subscribe(cb: () => void) {
  const qs = [window.matchMedia("(min-width: 768px)"), window.matchMedia("(min-width: 1024px)")];
  qs.forEach((q) => q.addEventListener("change", cb));
  return () => qs.forEach((q) => q.removeEventListener("change", cb));
}

function current(): Breakpoint {
  if (window.matchMedia("(min-width: 1024px)").matches) return "desk";
  return window.matchMedia("(min-width: 768px)").matches ? "tab" : "phone";
}

/** Same breakpoints as globals.css: phone < 768, tab 768–1023, desk ≥ 1024. */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(subscribe, current, () => "desk");
}

/** Shows `value` as the top bar's second breadcrumb while the calling page is mounted. */
export function Crumb({ value }: { value: string }) {
  const { setCrumb } = useShell();
  useEffect(() => {
    setCrumb(value);
    return () => setCrumb(null);
  }, [setCrumb, value]);
  return null;
}
