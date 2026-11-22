"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { splitLangPath } from "@/lib/i18n/lang";
import { useLang } from "@/lib/i18n/lang-context";
import { productHref, shopHref } from "@/lib/routes";
import { useBasketUi } from "@/lib/basket-ui";
import { useHydratedCart } from "@/lib/use-cart-hydrated";
import { Icon } from "./icon";
import { LangToggle } from "./lang-toggle";
import { MobileDrawer } from "./mobile-drawer";
import { ShelfArt } from "./shelf-art";
import { RECIPES_LIVE } from "@/lib/features";

interface Shelf {
  slug: string;
  name: string;
  nameBn: string | null;
  imageUrl: string | null;
}
interface Feature {
  slug: string;
  /** The product main photo from admin; the drawn jar when it has none. */
  photo: string | null;
  name: string;
  /** Language of `name` (the Bangla name in Bangla when there is one). */
  nameLang: "bn" | "en";
  meta: string;
}

const NAV = [
  { href: "/our-story", key: "ourStory" },
  ...(RECIPES_LIVE ? ([{ href: "/recipes", key: "recipes" }] as const) : []),
  { href: "/contact", key: "contact" },
] as const;

const BLOT = ["", "v2", "v3", ""] as const;

export function HeaderClient({ shelves, feature }: { shelves: Shelf[]; feature: Feature | null }) {
  const menuId = useId();
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count } = useHydratedCart();
  const openBasket = useBasketUi((s) => s.openBasket);
  const { lang, t, href } = useLang();
  const headerRef = useRef<HTMLElement>(null);
  // Current page without its language prefix, for the active nav item.
  const path = splitLangPath(usePathname()).path;
  const isOn = (p: string) => path === p || path.startsWith(`${p}/`);
  const shopOn = isOn("/shop") || isOn("/pickles");

  // Close the shop menu when the page changes (also on back/forward), adjusting state during
  // render rather than in an effect.
  const [menuPath, setMenuPath] = useState(path);
  if (menuPath !== path) {
    setMenuPath(path);
    setMegaOpen(false);
  }

  // Close the shop menu on a click or tap anywhere outside the header.
  useEffect(() => {
    if (!megaOpen) return;
    const onDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMegaOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [megaOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMegaOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Keep the page from scrolling behind the open drawer.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const close = () => {
    setMegaOpen(false);
    setMobileOpen(false);
  };
  return (
    <>
      <header className="hd" lang={lang} ref={headerRef}>
        <div className="wrap hd-in">
          <button
            type="button"
            className="ib hd-menu"
            aria-expanded={mobileOpen}
            aria-controls={`${menuId}-m`}
            aria-label={t.header.openMenu}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <Icon name="menu" />
          </button>
          <Link className="ak-logo" href={href("/")} aria-label={t.header.home} onClick={close}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand art */}
            <img src="/brand/mark-96.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand art */}
            <img className="wm" src="/brand/wordmark-80.png" alt="" />
          </Link>
          <nav className="nv" aria-label={t.header.main}>
            <button
              type="button"
              className={megaOpen || shopOn ? "on" : undefined}
              aria-expanded={megaOpen}
              aria-controls={menuId}
              onClick={() => setMegaOpen((o) => !o)}
            >
              {t.nav.shop} <span className={megaOpen ? "chev up" : "chev"} aria-hidden="true" />
            </button>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={href(n.href)}
                className={isOn(n.href) ? "on" : undefined}
                aria-current={isOn(n.href) ? "page" : undefined}
              >
                {t.nav[n.key]}
              </Link>
            ))}
          </nav>
          <div className="tools">
            {/* EN / বাং (Main.dc.html header tools); the phone boards show it in the footer only. */}
            <LangToggle className="hd-lang" />
            <Link className="ib hd-acct" href={href("/account")} aria-label={t.header.account}>
              <Icon name="user" />
            </Link>
            <button
              type="button"
              className="ib"
              aria-label={t.header.basket(count)}
              aria-haspopup="dialog"
              onClick={openBasket}
            >
              <Icon name="basket" />
              {count > 0 ? <span className="ak-count hd-count">{count}</span> : null}
            </button>
          </div>
        </div>

        {/* Always rendered so it can fade out; inert while closed. */}
        <div className={megaOpen ? "mega is-open" : "mega"} id={menuId} inert={!megaOpen}>
          <div className="wrap mega-in">
            {shelves.map((s, i) => (
              <Link key={s.slug} className="mcat" href={href(shopHref(s.slug))} onClick={close}>
                <span className={`db ${i % 2 ? "b" : "f"} ak-blot ${BLOT[i % 4]}`}>
                  <ShelfArt slug={s.slug} imageUrl={s.imageUrl} />
                </span>
                <span>
                  {/* Short shelf names, like the English "Mango" (the menu tiles use the longer labels). */}
                  <b>{lang === "bn" ? (s.nameBn ?? t.shelf.label[s.slug] ?? s.name) : s.name}</b>
                  <small>{t.shelf.blurb[s.slug] ?? ""}</small>
                </span>
              </Link>
            ))}
            {feature ? (
              <Link className="mfeat" href={href(productHref(feature.slug))} onClick={close}>
                {/* eslint-disable-next-line @next/next/no-img-element -- admin photo or static brand art */}
                <img
                  className={feature.photo ? "is-photo" : undefined}
                  src={feature.photo ?? "/jar.svg"}
                  alt=""
                />
                <span>
                  <span className="ak-eyebrow">{t.header.bestseller}</span>
                  <span
                    className="peek-n"
                    lang={feature.nameLang}
                    style={{ display: "block", marginTop: 6 }}
                  >
                    {feature.name}
                  </span>
                  <span className="peek-m">{feature.meta}</span>
                </span>
              </Link>
            ) : null}
            <div className="mall">
              <Link href={href(shopHref())} onClick={close}>
                {t.header.shopAll} <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </div>
      </header>
      <MobileDrawer
        id={`${menuId}-m`}
        open={mobileOpen}
        onClose={close}
        shelves={shelves}
        count={count}
      />
    </>
  );
}
