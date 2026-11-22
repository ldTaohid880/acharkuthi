"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatTaka } from "@repo/ui/lib/utils";
import { quoteBasket } from "@/app/actions/basket";
import type { BasketQuote } from "@/lib/basket-quote";
import { type CartLine, useCart } from "@/lib/cart-store";
import { heatOf } from "@/lib/product-view";
import { useLang } from "@/lib/i18n/lang-context";
import { productHref } from "@/lib/routes";
import { useHydratedCart } from "@/lib/use-cart-hydrated";
import { EmptyBasketArt } from "./empty-basket-art";
import { Icon } from "./icon";

/** A thrown error (offline, server down) counts as a failed update, the same as { ok: false }. */
const fetchQuotes = (lines: CartLine[]) =>
  quoteBasket({ variantIds: lines.map((l) => l.variantId) }).catch(() => ({ ok: false as const }));

type Quotes = Record<number, BasketQuote>;
interface Notice {
  line: CartLine;
  index: number;
}

function toQuotes(list: BasketQuote[]): Quotes {
  const map: Quotes = {};
  for (const q of list) map[q.variantId] = q;
  return map;
}

/**
 * The basket list, order summary and sticky checkout bar (Basket.dc.html, BasketMobile.dc.html and
 * BasketStates). Lines live in the cart store on the device. Names, prices, stock and availability
 * come from the database through quoteBasket(); the cart's own price is only used to show a change.
 */
export function BasketView() {
  const { lines, hydrated } = useHydratedCart();
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const restore = useCart((s) => s.restore);
  const acceptPrice = useCart((s) => s.acceptPrice);
  // Every label in the page language (memory: storefront-bilingual).
  const { lang, t: all, href } = useLang();
  const t = all.basket;

  const [quotes, setQuotes] = useState<Quotes | null>(null);
  const [busy, setBusy] = useState<Record<number, true>>({});
  const [failed, setFailed] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const latest = useRef(0);

  /** Re-reads prices for these lines. A newer request supersedes an older one. */
  const reprice = useCallback(async (next: CartLine[], changed?: number) => {
    const mine = ++latest.current;
    if (changed !== undefined) setBusy((b) => ({ ...b, [changed]: true }));
    const res = await fetchQuotes(next);
    if (mine !== latest.current) return undefined;
    setBusy({});
    if (!res.ok) {
      setFailed(true);
      return false;
    }
    setFailed(false);
    setQuotes(toQuotes(res.quotes));
    return true;
  }, []);

  // First load, once the cart has come back from localStorage.
  useEffect(() => {
    if (!hydrated) return;
    const mine = ++latest.current;
    fetchQuotes(useCart.getState().lines).then((res) => {
      if (mine !== latest.current) return;
      if (!res.ok) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setQuotes(toQuotes(res.quotes));
    });
  }, [hydrated]);

  /** Quantity change: shown at once, kept only if the database confirms the new basket. */
  const changeQty = async (id: number, next: number) => {
    const prev = useCart.getState().lines.find((l) => l.variantId === id)?.quantity;
    if (prev === undefined || prev === next || next < 1 || busy[id]) return;
    setNotice(null);
    setQuantity(id, next);
    const ok = await reprice(useCart.getState().lines, id);
    if (ok === false) setQuantity(id, prev);
  };

  const removeLine = (line: CartLine, index: number) => {
    setNotice({ line, index });
    remove(line.variantId);
  };

  const undo = () => {
    if (!notice) return;
    restore(notice.line, notice.index);
    setNotice(null);
  };

  const loading = !hydrated || (lines.length > 0 && quotes === null && !failed);
  const empty = hydrated && lines.length === 0;
  const showSum = hydrated && lines.length > 0;

  const rows = lines.map((line, index) => {
    const q = quotes?.[line.variantId];
    const ok = q?.kind === "ok";
    const priceChanged = !!q && ok && q.unitPrice !== line.unitPrice;
    const overStock = !!q && ok && line.quantity > q.stock;
    const atMax = !!q && ok && !overStock && line.quantity >= q.stock;
    const heatWord = q ? heatOf(q.spiceLevel).word : line.heat;
    const label = q?.variantLabel || line.variantLabel;
    return {
      index,
      line,
      q,
      ok,
      priceChanged,
      overStock,
      atMax,
      isBusy: !!busy[line.variantId],
      name:
        lang === "bn" && q?.productName
          ? (q.productNameBn ?? q.productName)
          : q?.productName || line.productName,
      hasBn: lang === "bn" && !!(q?.productName && q.productNameBn),
      meta: [label, heatWord ? all.heat[heatWord] : null].filter(Boolean).join(" · "),
      img: q?.imageUrl ?? "/jar.svg",
      lineTotal: ok && q ? q.unitPrice * line.quantity : null,
    };
  });

  const count = rows.reduce((n, r) => (r.ok ? n + r.line.quantity : n), 0);
  const sub = rows.reduce((n, r) => (r.lineTotal !== null ? n + r.lineTotal : n), 0);
  const issueCount = quotes ? rows.filter((r) => !r.ok || r.priceChanged || r.overStock).length : 0;
  const blocked =
    lines.length === 0 || quotes === null || issueCount > 0 || Object.keys(busy).length > 0;
  const noticeQuote = notice ? quotes?.[notice.line.variantId] : undefined;
  const noticeName = notice
    ? lang === "bn"
      ? (noticeQuote?.productNameBn ?? notice.line.productName)
      : (noticeQuote?.productName ?? notice.line.productName)
    : "";

  return (
    <>
      {loading ? (
        <div className="bk-grid">
          <section aria-label={t.section}>
            <div role="status" aria-label={t.loading}>
              <span className="sr">{t.loadingSr}</span>
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
          </section>
          <aside className="bk-side" aria-label={t.summary}>
            <section className="sum" aria-labelledby="sm-skel-h">
              <h2 id="sm-skel-h" lang={lang}>
                {t.summary}
              </h2>
              <div style={{ display: "grid", gap: 12 }}>
                <div className="skl" style={{ height: 18 }} />
                <div className="skl" style={{ height: 18, width: "70%" }} />
                <div className="skl" style={{ height: 28, marginTop: 8 }} />
              </div>
              <span className="ak-btn ak-btn--sun go" aria-disabled="true" lang={lang}>
                {t.checkout}
              </span>
            </section>
          </aside>
        </div>
      ) : null}

      {!loading && empty ? (
        <div className="empty" role="status">
          <EmptyBasketArt />
          <h2 lang={lang}>{all.mini.emptyTitle}</h2>
          <p lang={lang}>{all.mini.emptyText}</p>
          <Link className="ak-btn ak-btn--sun" href={href("/shop")} lang={lang}>
            {all.mini.browse}
          </Link>
          {notice ? (
            <div
              className="nt"
              role="status"
              lang={lang}
              style={{ margin: "22px 0 0", textAlign: "left" }}
            >
              <span>{all.mini.removed(noticeName)}</span>
              <button type="button" onClick={undo}>
                {all.mini.undo}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!loading && !empty && (showSum || failed || notice) ? (
        <div className="bk-grid">
          <section aria-label={t.section}>
            {failed ? (
              <div className="nt err" role="alert" lang={lang}>
                <span>
                  <b>{t.failTitle}</b>
                  {t.failText}
                </span>
                <button type="button" onClick={() => void reprice(useCart.getState().lines)}>
                  {t.retry}
                </button>
              </div>
            ) : null}

            {notice ? (
              <div className="nt" role="status" lang={lang}>
                <span>{all.mini.removed(noticeName)}</span>
                <button type="button" onClick={undo}>
                  {all.mini.undo}
                </button>
              </div>
            ) : null}

            {showSum ? (
              <ul className="lines" aria-label={all.mini.lines}>
                {rows.map((r) => {
                  const { line, q } = r;
                  const was = q && r.ok && q.compareAtPrice ? q.compareAtPrice : null;
                  const stock = q?.stock ?? 0;
                  const canQty = !!q && r.ok;
                  const decDis = line.quantity <= 1 || r.isBusy || !canQty;
                  const incDis = !canQty || line.quantity >= stock || r.isBusy;
                  const cls = ["bk-row", q && !r.ok ? "gone" : "", r.isBusy ? "is-busy" : ""]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <li className={cls} key={line.variantId}>
                      <div
                        className={`bk-th ${r.index % 2 ? "t2" : ""} ${r.img === "/jar.svg" ? "" : "ph"}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- product photos and the local jar SVG */}
                        <img src={r.img} alt="" />
                      </div>
                      <div>
                        <p className="bk-nm" lang={r.hasBn ? "bn" : "en"}>
                          {r.name}
                        </p>
                        <div className="bk-mt" lang={lang}>
                          {r.meta}
                        </div>
                        <div className="bk-un" lang={lang}>
                          {q && r.ok ? formatTaka(q.unitPrice) : "—"}
                          {was !== null ? <s>{formatTaka(was)}</s> : null}
                          {q && r.ok ? t.each : null}
                        </div>
                      </div>
                      <div className="bk-lt" aria-live="polite" lang={lang}>
                        {r.lineTotal !== null ? formatTaka(r.lineTotal) : "—"}
                        {r.isBusy ? <small>{t.updating}</small> : null}
                      </div>
                      <div className="bk-ctl">
                        {canQty ? (
                          <div className="stp" role="group" aria-label={all.mini.qty(r.name)}>
                            <button
                              type="button"
                              aria-label={all.mini.less}
                              aria-disabled={decDis}
                              onClick={() => {
                                if (!decDis) void changeQty(line.variantId, line.quantity - 1);
                              }}
                            >
                              <Icon name="minus" />
                            </button>
                            <output aria-live="polite">{line.quantity}</output>
                            <button
                              type="button"
                              aria-label={all.mini.more}
                              aria-disabled={incDis}
                              onClick={() => {
                                if (!incDis) void changeQty(line.variantId, line.quantity + 1);
                              }}
                            >
                              <Icon name="plus" />
                            </button>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          className="bk-rm"
                          onClick={() => removeLine(line, r.index)}
                          lang={lang}
                        >
                          {all.mini.remove}
                          <span className="sr">: {r.name}</span>
                        </button>
                      </div>
                      {r.atMax ? (
                        <div
                          className="bk-help"
                          style={{ gridColumn: "2 / -1" }}
                          role="status"
                          lang={lang}
                        >
                          {t.max(stock)}
                        </div>
                      ) : null}
                      {r.priceChanged && q ? (
                        <div className="flag" role="status" lang={lang}>
                          <span>
                            <b>{t.priceTitle}</b>
                            {t.priceText(formatTaka(line.unitPrice), formatTaka(q.unitPrice))}
                          </span>
                          <button
                            type="button"
                            onClick={() => acceptPrice(line.variantId, q.unitPrice)}
                          >
                            {t.ok}
                          </button>
                        </div>
                      ) : null}
                      {q?.kind === "novariant" ? (
                        <div className="flag err" role="alert" lang={lang}>
                          <span>
                            <b>{t.noSizeTitle}</b>
                            {t.noSizeText}
                          </span>
                          <Link
                            className="ak-btn ak-btn--line"
                            href={href(q.slug ? productHref(q.slug) : "/shop")}
                            style={{ minHeight: 44 }}
                          >
                            {t.changeSize}
                          </Link>
                        </div>
                      ) : null}
                      {q?.kind === "gone" ? (
                        <div className="flag err" role="alert" lang={lang}>
                          <span>
                            <b>{t.goneTitle}</b>
                            {t.goneText}
                          </span>
                        </div>
                      ) : null}
                      {r.overStock && q ? (
                        <div className="flag err" role="alert" lang={lang}>
                          <span>
                            <b>{t.overTitle(stock)}</b>
                            {t.overText(line.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => void changeQty(line.variantId, stock)}
                          >
                            {t.setTo(stock)}
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {showSum ? (
              <Link className="keep" href={href("/shop")} lang={lang}>
                <Icon name="arrow" />
                {t.keep}
              </Link>
            ) : null}
          </section>

          {showSum ? (
            <aside className="bk-side" aria-label={t.summary}>
              <section className="sum" aria-labelledby="sm-h">
                <h2 id="sm-h" lang={lang}>
                  {t.summary}
                </h2>
                <dl>
                  <div className="r" lang={lang}>
                    <dt>{t.items(count)}</dt>
                    <dd>{quotes ? formatTaka(sub) : "—"}</dd>
                  </div>
                  <div className="r soft" lang={lang}>
                    <dt>{t.delivery}</dt>
                    <dd>{t.deliveryLater}</dd>
                  </div>
                  <div className="r soft" lang={lang}>
                    <dt>{t.coupon}</dt>
                    <dd>{t.couponLater}</dd>
                  </div>
                  <div className="r tot" lang={lang}>
                    <dt>
                      {t.total}
                      <span className="est">{t.est}</span>
                    </dt>
                    <dd>{quotes ? formatTaka(sub) : "—"}</dd>
                  </div>
                </dl>
                <Link
                  className="ak-btn ak-btn--sun go"
                  href={href("/checkout")}
                  aria-disabled={blocked}
                  onClick={(e) => {
                    if (blocked) e.preventDefault();
                  }}
                  lang={lang}
                >
                  {t.checkout}
                </Link>
                {quotes && issueCount > 0 ? (
                  <p className="why" role="status" lang={lang}>
                    {t.why(issueCount)}
                  </p>
                ) : null}
                <Link className="ak-btn ak-btn--line sec2" href={href("/shop")} lang={lang}>
                  {t.keep}
                </Link>
                <p className="fine" lang={lang}>
                  {t.fine}
                </p>
              </section>
            </aside>
          ) : null}
        </div>
      ) : null}

      {showSum ? (
        <div className="bar" lang={lang}>
          <div className="t">
            {t.total}
            <b>{quotes ? formatTaka(sub) : "—"}</b>
          </div>
          <Link
            className="ak-btn ak-btn--sun"
            href={href("/checkout")}
            aria-disabled={blocked}
            onClick={(e) => {
              if (blocked) e.preventDefault();
            }}
            lang={lang}
          >
            {t.checkout}
          </Link>
        </div>
      ) : null}
    </>
  );
}
