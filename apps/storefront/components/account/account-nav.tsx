"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const ACCOUNT_NAV: { href: Route; t: string }[] = [
  { href: "/account" as Route, t: "অ্যাকাউন্ট" },
  { href: "/account/orders" as Route, t: "আমার অর্ডার" },
  { href: "/account/addresses" as Route, t: "ঠিকানা" },
  { href: "/account/reviews" as Route, t: "আমার রিভিউ" },
  { href: "/account/settings" as Route, t: "সেটিংস" },
];

/** Desktop sidebar list (`nav2`) or the phone's scrolling tabs (`tabsc`). */
export function AccountNav({ variant }: { variant: "side" | "tabs" }) {
  const path = usePathname();
  const links = ACCOUNT_NAV.map((n) => {
    const on = path === n.href;
    return (
      <Link
        key={n.href}
        href={n.href}
        className={on ? "on" : ""}
        aria-current={on ? "page" : undefined}
        lang="bn"
      >
        {n.t}
      </Link>
    );
  });
  if (variant === "tabs") {
    return (
      <nav className="tabsc" aria-label="অ্যাকাউন্ট">
        {links}
      </nav>
    );
  }
  return (
    <ul className="nav2">
      {links.map((l) => (
        <li key={l.key}>{l}</li>
      ))}
    </ul>
  );
}
