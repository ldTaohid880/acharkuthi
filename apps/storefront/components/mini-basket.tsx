"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatTaka } from "@repo/ui/lib/utils";
import { useBasketUi } from "@/lib/basket-ui";
import { cartTotal, useCart, type CartLine } from "@/lib/cart-store";
import { soon } from "@/lib/routes";
import { useHydratedCart } from "@/lib/use-cart-hydrated";
import { Icon } from "./icon";

/** Heat words as the mini-basket boards write them. */
const HEAT_BN = { Mild: "কম ঝাল", Medium: "মাঝারি ঝাল", Hot: "বেশি ঝাল" } as const;
const TOAST_MS = 5000;

const countText = (n: number) => `${n}টি পণ্য`;

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


  const removeLine = (line: CartLine) => {
    setUndo({ line, index: lines.findIndex((l) => l.variantId === line.variantId) });
    remove(line.variantId);
  };

  return (
    <>
      {toast && !open ? (
        <div className="mb-toast" role="status">
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
          <b lang="bn">{toast.name} ঝুড়িতে যোগ হয়েছে</b>
          <button type="button" className="ib" aria-label="বন্ধ করুন" onClick={hideToast}>
            <Icon name="close" />
          </button>
          <button type="button" className="a" onClick={openBasket} lang="bn">
            ঝুড়ি দেখুন · {countText(count)}
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="mb">
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
                <h2 id="mb-h" lang="bn">
                  আপনার ঝুড়ি
                </h2>
                <div className="c" lang="bn" aria-live="polite">
                  {hydrated && count > 0 ? countText(count) : null}
                </div>
              </div>
              <button
                ref={closeBtn}
                type="button"
                className="ib"
                aria-label="ঝুড়ি বন্ধ করুন"
                onClick={dismiss}
              >
                <Icon name="close" />
              </button>
            </div>

            <ScrollArea className="db">
              {!hydrated ? (
                <div role="status" aria-label="লোড হচ্ছে">
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
                <div className="nt" role="status" lang="bn">
                  <span>{undo.line.productName} সরানো হয়েছে।</span>
                  <button
                    type="button"
                    onClick={() => {
                      restore(undo.line, undo.index);
                      setUndo(null);
                    }}
                  >
                    পূর্বাবস্থায় ফেরান
                  </button>
                </div>
              ) : null}

              {hydrated && lines.length > 0 ? (
                <ul className="lines" aria-label="ঝুড়ির পণ্য">
                  {lines.map((l, i) => {
                    const max = l.maxQty;
                    const atMax = max !== undefined && l.quantity >= max;
                    const meta = [l.variantLabel, l.heat ? HEAT_BN[l.heat] : null]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li className="mrow" key={l.variantId}>
                        <div className={`bk-th ${i % 2 ? "t2" : ""}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- local SVG still-life */}
                          <img src="/jar.svg" alt="" />
                        </div>
                        <div>
                          <p className="bk-nm">
                            {l.slug ? (
                              <Link href={`/pickles/${l.slug}`} onClick={close}>
                                {l.productName}
                              </Link>
                            ) : (
                              l.productName
                            )}
                          </p>
                          <div className="bk-mt" lang="bn">
                            {meta} · {formatTaka(l.unitPrice)}
                          </div>
                        </div>
                        <div className="bk-ctl">
                          <div className="stp" role="group" aria-label={`${l.productName}, সংখ্যা`}>
                            <button
                              type="button"
                              aria-label="কমান"
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
                              aria-label="বাড়ান"
                              aria-disabled={atMax}
                              onClick={() => {
                                if (!atMax) setQuantity(l.variantId, l.quantity + 1);
                              }}
                            >
                              <Icon name="plus" />
                            </button>
                          </div>
                          <span className="lt" lang="bn">
                            {formatTaka(l.unitPrice * l.quantity)}
                          </span>
                        </div>
                        <div>
                          <button
                            type="button"
                            className="bk-rm"
                            onClick={() => removeLine(l)}
                            lang="bn"
                          >
                            সরিয়ে ফেলুন<span className="sr">: {l.productName}</span>
                          </button>
                          {atMax ? (
                            <span className="bk-help" role="status" lang="bn">
                              সর্বোচ্চ {max}টি
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
                  <div className="art" aria-hidden="true">
                    <div className="ak-blot v2 b" />
                    {/* eslint-disable-next-line @next/next/no-img-element -- local SVG still-life */}
                    <img src="/jar.svg" alt="" />
                  </div>
                  <h2 lang="bn">ঝুড়িটা এখনো খালি!</h2>
                  <p lang="bn">চলুন, পছন্দের কিছু আচার খুঁজে নেওয়া যাক।</p>
                  <Link className="ak-btn ak-btn--sun" href="/shop" lang="bn" onClick={close}>
                    আচার দেখুন
                  </Link>
                </div>
              ) : null}
            </ScrollArea>

            {hydrated && lines.length > 0 ? (
              <div className="df">
                <div className="st" lang="bn">
                  পণ্যের মোট<span>{formatTaka(cartTotal(lines))}</span>
                </div>
                <p className="nf" lang="bn">
                  ডেলিভারি চার্জ চেকআউটে হিসাব হবে।
                </p>
                <Link className="ak-btn ak-btn--sun" href={"/checkout"} lang="bn" onClick={close}>
                  চেকআউটে এগিয়ে যান
                </Link>
                <Link
                  className="ak-btn ak-btn--line"
                  href={soon("/basket")}
                  lang="bn"
                  onClick={close}
                >
                  ঝুড়ি দেখুন
                </Link>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
