"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dict } from "@/lib/i18n/dict";
import { useLang } from "@/lib/i18n/lang-context";

const accountNav = (t: Dict["account"]): { href: string; t: string }[] => [
  { href: "/account", t: t.account },
  { href: "/account/orders", t: t.myOrders },
  { href: "/account/addresses", t: t.addresses },
  { href: "/account/reviews", t: t.myReviews },
  { href: "/account/settings", t: t.settings },
];

/** Desktop sidebar list (`nav2`) or the phone's scrolling tabs (`tabsc`). */
export function AccountNav({ variant }: { variant: "side" | "tabs" }) {
  const path = usePathname();
  const { lang, t: all, href } = useLang();
  const t = all.account;
  const links = accountNav(t).map((n) => {
    const on = path === href(n.href);
    return (
      <Link
        key={n.href}
        href={href(n.href)}
        className={on ? "on" : ""}
        aria-current={on ? "page" : undefined}
        lang={lang}
      >
        {n.t}
      </Link>
    );
  });
  if (variant === "tabs") {
    return (
      <nav className="tabsc" aria-label={t.account}>
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
