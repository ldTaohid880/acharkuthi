"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatTaka } from "@repo/ui/lib/utils";
import { quoteBasket } from "@/app/actions/basket";
import { useBasketUi } from "@/lib/basket-ui";
import { cartTotal, lineName, useCart, type CartLine } from "@/lib/cart-store";
import { useLang } from "@/lib/i18n/lang-context";
import { useHydratedCart } from "@/lib/use-cart-hydrated";
import { EmptyBasketArt } from "./empty-basket-art";
import { Icon } from "./icon";

const TOAST_MS = 5000;

/**
 * Mini-basket (MiniBasket.dc.html desktop drawer, MiniBasketMobile.dc.html phone bottom sheet)
 * and the "added to basket" toast. Mounted once in the root layout. Prices are display-only.
 */
export function MiniBasket() {
  const { lines, count, hydrated } = useHydratedCart();
  const { open, toast, openBasket, closeBasket, hideToast } = useBasketUi();
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const restore = useCart((s) => s.restore);
  // Heat words, counts and labels in the page language (memory: storefront-bilingual).
  const { lang, t: all, href } = useLang();
  const t = all.mini;
  const [undo, setUndo] = useState<{ line: CartLine; index: number } | null>(null);
  const panel = useRef<HTMLElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  /** True while the history entry added on open is still on top of the stack. */
  const pushed = useRef(false);

  // Browser Back closes the open basket instead of leaving the page.
  useEffect(() => {
    if (!open) return;
    window.history.pushState(null, "", window.location.href);
    pushed.current = true;
    const onPop = () => {
      if (!pushed.current) return;
      pushed.current = false;
      setUndo(null);
      closeBasket();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, closeBasket]);

  // The toast hides itself after a few seconds (BasketStates §6).
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hideToast, TOAST_MS);
    return () => clearTimeout(t);
  }, [toast, hideToast]);

  /** Closed by a link: the page navigates on, so the extra history entry is left behind. */
  const close = useCallback(() => {
    pushed.current = false;
    setUndo(null);
    closeBasket();
  }, [closeBasket]);
  /** Closed in place (close button, scrim, Escape): drop the entry added on open. */
  const dismiss = useCallback(() => {
    const wasPushed = pushed.current;
    close();
    if (wasPushed) window.history.back();
  }, [close]);

  // Dialog: focus the close button, trap Tab, close on Escape, lock page scroll, restore focus.
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const f = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = f[0];
      const last = f[f.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [open, dismiss]);

  // Line photos: the same first product photo the basket page shows (quoteBasket). Read once per
  // variant while the drawer is open; null means the product has no photo, so the jar stands in.
  const [images, setImages] = useState<Record<number, string | null>>({});
  const missing = lines
    .map((l) => l.variantId)
    .filter((id) => !(id in images))
    .join(",");
  useEffect(() => {
    if (!open || !missing) return;
    const ids = missing.split(",").map(Number);
    let live = true;
    quoteBasket({ variantIds: ids })
      .then((res) => {
        if (!live) return;
        const next: Record<number, string | null> = {};
        for (const id of ids) next[id] = null;
        if (res.ok) for (const q of res.quotes) next[q.variantId] = q.imageUrl;
        setImages((prev) => ({ ...prev, ...next }));
      })
      .catch(() => {
        if (live)
          setImages((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, null])) }));
      });
    return () => {
      live = false;
    };
  }, [open, missing]);

  const removeLine = (line: CartLine) => {
    setUndo({ line, index: lines.findIndex((l) => l.variantId === line.variantId) });
    remove(line.variantId);
  };

  return (
    <>
      {toast && !open ? (
        <div className="mb-toast" role="status" lang={lang}>
          <span className="ok" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <b>{t.added(toast.name)}</b>
          <button type="button" className="ib" aria-label={t.close} onClick={hideToast}>
            <Icon name="close" />
          </button>
          <button type="button" className="a" onClick={openBasket}>
            {t.viewWithCount(count)}
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="mb" lang={lang}>
          <div className="scrim" onClick={dismiss} aria-hidden="true" />
          <aside
            ref={panel}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mb-h"
          >
            <div className="grab only-mob" aria-hidden="true" />
            <div className="dh">
              <div>
                <h2 id="mb-h">{t.title}</h2>
                <div className="c" aria-live="polite">
                  {hydrated && count > 0 ? t.items(count) : null}
                </div>
              </div>
              <button
                ref={closeBtn}
                type="button"
                className="ib"
                aria-label={t.closeBasket}
                onClick={dismiss}
              >
                <Icon name="close" />
              </button>
            </div>

            <ScrollArea className="db">
              {!hydrated ? (
                <div role="status" aria-label={t.loading}>
                  {[0, 1].map((i) => (
                    <div className="sk-row" key={i}>
                      <div className="skl a" />
                      <div className="l">
                        <div className="skl l1" />
                        <div className="skl l2" />
                        <div className="skl l3" />
                      </div>
                      <div className="skl r" />
                    </div>
                  ))}
                </div>
              ) : null}

              {undo ? (
                <div className="nt" role="status">
                  <span>{t.removed(lineName(undo.line, lang))}</span>
                  <button
                    type="button"
                    onClick={() => {
                      restore(undo.line, undo.index);
                      setUndo(null);
                    }}
                  >
                    {t.undo}
                  </button>
                </div>
              ) : null}

              {hydrated && lines.length > 0 ? (
                <ul className="lines" aria-label={t.lines}>
                  {lines.map((l, i) => {
                    const max = l.maxQty;
                    const atMax = max !== undefined && l.quantity >= max;
                    const meta = [l.variantLabel, l.heat ? all.heat[l.heat] : null]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li className="mrow" key={l.variantId}>
                        <div
                          className={`bk-th ${i % 2 ? "t2" : ""} ${images[l.variantId] ? "ph" : ""}`}
                        >
                          {l.variantId in images ? (
                            // eslint-disable-next-line @next/next/no-img-element -- product photos and the local jar SVG
                            <img src={images[l.variantId] ?? "/jar.svg"} alt="" />
                          ) : null}
                        </div>
                        <div>
                          <p
                            className="bk-nm"
                            lang={lang === "bn" && l.productNameBn ? "bn" : "en"}
                          >
                            {l.slug ? (
                              <Link href={href(`/pickles/${l.slug}`)} onClick={close}>
                                {lineName(l, lang)}
                              </Link>
                            ) : (
                              lineName(l, lang)
                            )}
                          </p>
                          <div className="bk-mt">
                            {meta} · {formatTaka(l.unitPrice)}
                          </div>
                        </div>
                        <div className="bk-ctl">
                          <div className="stp" role="group" aria-label={t.qty(lineName(l, lang))}>
                            <button
                              type="button"
                              aria-label={t.less}
                              aria-disabled={l.quantity <= 1}
                              onClick={() => {
                                if (l.quantity > 1) setQuantity(l.variantId, l.quantity - 1);
                              }}
                            >
                              <Icon name="minus" />
                            </button>
                            <output aria-live="polite">{l.quantity}</output>
                            <button
                              type="button"
                              aria-label={t.more}
                              aria-disabled={atMax}
                              onClick={() => {
                                if (!atMax) setQuantity(l.variantId, l.quantity + 1);
                              }}
                            >
                              <Icon name="plus" />
                            </button>
                          </div>
                          <span className="lt">{formatTaka(l.unitPrice * l.quantity)}</span>
                        </div>
                        <div>
                          <button type="button" className="bk-rm" onClick={() => removeLine(l)}>
                            {t.remove}
                            <span className="sr">: {lineName(l, lang)}</span>
                          </button>
                          {atMax ? (
                            <span className="bk-help" role="status">
                              {t.max(max ?? 0)}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {hydrated && lines.length === 0 ? (
                <div className="empty sm" role="status">
                  <EmptyBasketArt />
                  <h2>{t.emptyTitle}</h2>
                  <p>{t.emptyText}</p>
                  <Link className="ak-btn ak-btn--sun" href={href("/shop")} onClick={close}>
                    {t.browse}
                  </Link>
                </div>
              ) : null}
            </ScrollArea>

            {hydrated && lines.length > 0 ? (
              <div className="df">
                <div className="st">
                  {t.subtotal}
                  <span>{formatTaka(cartTotal(lines))}</span>
                </div>
                <p className="nf">{t.deliveryNote}</p>
                <Link className="ak-btn ak-btn--sun" href={href("/checkout")} onClick={close}>
                  {t.checkout}
                </Link>
                <Link className="ak-btn ak-btn--line" href={href("/basket")} onClick={close}>
                  {t.view}
                </Link>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
