"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { productHref, shopHref, soon } from "@/lib/routes";
import { useBasketUi } from "@/lib/basket-ui";
import { useHydratedCart } from "@/lib/use-cart-hydrated";
import { Icon } from "./icon";
import { MobileDrawer } from "./mobile-drawer";
import { shelfBlurb, shelfIcon } from "./shelf-icon";

interface Shelf {
  slug: string;
  name: string;
  nameBn: string | null;
}
interface Feature {
  slug: string;
  name: string;
  meta: string;
}

const NAV = [
  { href: "/our-story", label: "Our story" },
  { href: "/recipes", label: "Recipes" },
  { href: "/contact", label: "Contact" },
] as const;

const BLOT = ["", "v2", "v3", ""] as const;

export function HeaderClient({ shelves, feature }: { shelves: Shelf[]; feature: Feature | null }) {
  const menuId = useId();
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count } = useHydratedCart();
  const openBasket = useBasketUi((s) => s.openBasket);

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
      <header className="hd">
        <div className="wrap hd-in">
          <button
            type="button"
            className="ib hd-menu"
            aria-expanded={mobileOpen}
            aria-controls={`${menuId}-m`}
            aria-label="Open menu"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <Icon name="menu" />
          </button>
          <Link className="ak-logo" href="/" aria-label="Acharkuthi home" onClick={close}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand art */}
            <img src="/brand/mark-96.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand art */}
            <img className="wm" src="/brand/wordmark-80.png" alt="" />
          </Link>
          <nav className="nv" aria-label="Main">
            <button
              type="button"
              className={megaOpen ? "on" : undefined}
              aria-expanded={megaOpen}
              aria-controls={menuId}
              onClick={() => setMegaOpen((o) => !o)}
            >
              Shop <span className={megaOpen ? "chev up" : "chev"} aria-hidden="true" />
            </button>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href === "/recipes" ? "/recipes" : soon(n.href)}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="tools">
            {/* The language toggle is hidden until the Bengali version exists (owner decision). */}
            <Link className="ib hd-acct" href={soon("/account")} aria-label="Your account">
              <Icon name="user" />
            </Link>
            <button
              type="button"
              className="ib"
              aria-label={`Basket, ${count} ${count === 1 ? "item" : "items"}`}
              aria-haspopup="dialog"
              onClick={openBasket}
            >
              <Icon name="basket" />
              {count > 0 ? <span className="ak-count hd-count">{count}</span> : null}
            </button>
          </div>
        </div>

        {megaOpen ? (
          <div className="mega" id={menuId}>
            <div className="wrap mega-in">
              {shelves.map((s, i) => (
                <Link key={s.slug} className="mcat" href={shopHref(s.slug)} onClick={close}>
                  <span className={`db ${i % 2 ? "b" : "f"} ak-blot ${BLOT[i % 4]}`}>
                    <Icon name={shelfIcon(s.slug)} />
                  </span>
                  <span>
                    <b>{s.name}</b>
                    <small>{shelfBlurb(s.slug)}</small>
                  </span>
                </Link>
              ))}
              {feature ? (
                <Link className="mfeat" href={productHref(feature.slug)} onClick={close}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- static brand art */}
                  <img src="/jar.svg" alt="" />
                  <span>
                    <span className="ak-eyebrow">Bestseller</span>
                    <span className="peek-n" style={{ display: "block", marginTop: 6 }}>
                      {feature.name}
                    </span>
                    <span className="peek-m">{feature.meta}</span>
                  </span>
                </Link>
              ) : null}
              <div className="mall">
                <Link href={shopHref()} onClick={close}>
                  Shop all pickles <Icon name="arrow" />
                </Link>
              </div>
            </div>
          </div>
        ) : null}
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
