import type { AdminRole } from "@repo/auth";
import type { Dict } from "@/lib/i18n/dict";

/** Every admin menu entry, in Sidebar.dc.html order. Routes follow the canvas site map. */
export type NavKey = keyof Dict["nav"]["items"];
export type NavGroup = keyof Dict["nav"]["groups"] | "start";

export interface NavItem {
  key: NavKey;
  href: string;
  ownerOnly: boolean;
}

const item = (key: NavKey, href: string, ownerOnly: boolean): NavItem => ({ key, href, ownerOnly });

export const NAV: { group: NavGroup; items: NavItem[] }[] = [
  { group: "start", items: [item("dash", "/", false), item("reports", "/reports", true)] },
  { group: "orders", items: [item("orders", "/orders", false), item("coupons", "/coupons", true)] },
  {
    group: "products",
    items: [
      item("products", "/products", true),
      item("stock", "/stock", false),
      item("categories", "/categories", true),
      item("restock", "/restock-alerts", true),
    ],
  },
  {
    group: "customers",
    items: [
      item("customers", "/customers", true),
      item("reviews", "/reviews", true),
      item("messages", "/messages", false),
    ],
  },
  {
    group: "content",
    items: [
      item("recipes", "/content/recipes", true),
      item("home", "/content/home", true),
      item("legal", "/content/policies", true),
      item("faq", "/content/faq", true),
      item("story", "/content/our-story", true),
      // Share Studio: owner and staff (owner, 2026-11-26).
      item("share", "/content/share", false),
    ],
  },
  {
    group: "settings",
    items: [item("staff", "/staff", true), item("settings", "/settings", true)],
  },
];

/** Other routes that belong to a menu entry (for the active state and breadcrumb). */
export const EXTRA_ROUTES: { href: string; key: NavKey }[] = [
  { href: "/account", key: "account" },
  // Subscribers-* boards: the page sits under মেসেজ (sidebar, breadcrumb, bottom nav). The first
  // match wins in activeKey; the "subscribers" entry keeps hrefOf("subscribers") for the More page.
  { href: "/messages/subscribers", key: "messages" },
  { href: "/messages/subscribers", key: "subscribers" },
];

export function navFor(role: AdminRole) {
  return NAV.map((g) => ({
    group: g.group,
    items: g.items.filter((i) => role === "owner" || !i.ownerOnly),
  })).filter((g) => g.items.length > 0);
}

/** Bottom nav on phones (BottomNav.dc.html). "more" opens /more. */
export function bottomNavFor(role: AdminRole): (NavKey | "more")[] {
  return role === "owner"
    ? ["dash", "orders", "products", "stock", "more"]
    : ["dash", "orders", "stock", "messages", "more"];
}

/** The menu entry a pathname belongs to: the longest matching route. */
export function activeKey(pathname: string): NavKey | "more" | null {
  if (pathname === "/more") return "more";
  const all = [...EXTRA_ROUTES, ...NAV.flatMap((g) => g.items)];
  let best: { href: string; key: NavKey } | null = null;
  for (const r of all) {
    const hit =
      r.href === "/" ? pathname === "/" : pathname === r.href || pathname.startsWith(`${r.href}/`);
    if (hit && (!best || r.href.length > best.href.length)) best = r;
  }
  return best?.key ?? null;
}

export function hrefOf(key: NavKey): string {
  return [...EXTRA_ROUTES, ...NAV.flatMap((g) => g.items)].find((i) => i.key === key)?.href ?? "/";
}

/** Live counts next to menu entries (Sidebar.dc.html N map). */
export type NavCounts = Partial<Record<NavKey, number>>;
