"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { splitLangPath } from "@/lib/i18n/lang";
import { useLang } from "@/lib/i18n/lang-context";
import { shopHref } from "@/lib/routes";
import { useBasketUi } from "@/lib/basket-ui";
import { Icon } from "./icon";
import { LangToggle } from "./lang-toggle";
import { ShelfArt } from "./shelf-art";
import { RECIPES_LIVE } from "@/lib/features";

interface Shelf {
  slug: string;
  name: string;
  nameBn: string | null;
  imageUrl: string | null;
}

const PAGES = [
  ["/", "home"],
  ["/our-story", "ourStory"],
  ...(RECIPES_LIVE ? ([["/recipes", "recipes"]] as const) : []),
  ["/contact", "contact"],
] as const;

const HELP = [
  ["/track", "track"],
  ["/faq", "faq"],
  ["/shipping-policy", "shipping"],
  ["/return-refund-policy", "returns"],
  ["/privacy-policy", "privacy"],
  ["/terms-and-conditions", "terms"],
] as const;

/** Blot tint per tile, alternating like the desktop mega menu (.db.f / .db.b, v1-v3). */
const TILE = ["db f ak-blot", "db b ak-blot v2", "db f ak-blot v3", "db b ak-blot"] as const;

/**
 * Left drawer menu for phones. Redesigned at the user's request ("pickle shelf"): category tiles
 * first, then pages, a cash-on-delivery band, login and basket tiles, and help links.
 * Visual language (blots, field/band tints, display type) comes from the design system.
 */
export function MobileDrawer({
  id,
  open,
  onClose,
  shelves,
  count,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  shelves: Shelf[];
  count: number;
}) {
  const openBasket = useBasketUi((s) => s.openBasket);
  const { lang, t, href } = useLang();
  // Language-free path, so "current page" works in both versions.
  const pathname = splitLangPath(usePathname()).path;
  const inShop = pathname.startsWith("/shop") || pathname.startsWith("/pickles");

  return (
    <>
      <div className={`mn-s ${open ? "open" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside
        id={id}
        className={`mn-d ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t.menu.label}
        aria-hidden={!open}
        lang={lang}
        inert={!open}
      >
        <div className="mn-h">
          <Link
            className="ak-logo"
            href={href("/")}
            aria-label={t.menu.home}
            style={{ height: 36 }}
            onClick={onClose}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand art */}
            <img src="/brand/mark-96.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand art */}
            <img src="/brand/wordmark-80.png" alt="" style={{ height: 28 }} />
          </Link>
          <button type="button" className="ib" aria-label={t.menu.close} onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <ScrollArea className="mn-b">
          <section className="mn-shelf" aria-labelledby="mn-sh">
            <div className="mn-sh-h">
              <h2 id="mn-sh">{t.menu.shelf}</h2>
              <Link
                className={`mn-all ${inShop ? "is-cur" : ""}`}
                href={href(shopHref())}
                onClick={onClose}
              >
                {t.menu.all} <Icon name="arrow" />
              </Link>
            </div>
            <ul className="mn-tiles">
              {shelves.map((s, i) => {
                const path = shopHref(s.slug);
                const localeHref = href(path);
                return (
                  <li key={s.slug}>
                    <Link
                      className={`mn-tile ${pathname === path ? "is-cur" : ""}`}
                      href={localeHref}
                      onClick={onClose}
                    >
                      <span className={TILE[i % TILE.length]}>
                        <ShelfArt slug={s.slug} imageUrl={s.imageUrl} />
                      </span>
                      {t.shelf.label[s.slug] ?? (lang === "bn" ? (s.nameBn ?? s.name) : s.name)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
          <nav aria-label={t.menu.main}>
            <ul className="mn-l">
              {PAGES.map(([path, key]) => (
                <li key={path} className={pathname === path ? "is-cur" : undefined}>
                  <Link className="mn-a" href={href(path)} onClick={onClose}>
                    {t.nav[key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mn-cod">
            {/* Brand line: Bangla take on the tagline "The taste of tradition." */}
            <Icon name="jar" />
            {t.menu.tagline}
          </p>
          <div className="mn-acts">
            <Link className="mn-act" href={href("/account")} onClick={onClose}>
              <Icon name="user" />
              {t.menu.login}
            </Link>
            <button
              type="button"
              className="mn-act"
              onClick={() => {
                onClose();
                openBasket();
              }}
              aria-label={t.menu.basketCount(count)}
            >
              <Icon name="basket" />
              <span>{t.menu.basket}</span>
              {count > 0 ? (
                <span className="mn-n" aria-hidden="true">
                  {count}
                </span>
              ) : (
                <span className="mn-e">{t.menu.empty}</span>
              )}
            </button>
          </div>
          {/* Owner, 2026-11-22: the header toggle is hidden on phones, so the menu carries it. */}
          <div className="mn-lang">
            <span aria-hidden="true">{t.lang.label}</span>
            <LangToggle />
          </div>
          <nav className="mn-help" aria-labelledby="mn-hh">
            <h2 id="mn-hh">{t.menu.help}</h2>
            <ul>
              {HELP.map(([path, key]) => (
                <li key={path}>
                  <Link href={href(path)} onClick={onClose}>
                    {t.nav[key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
