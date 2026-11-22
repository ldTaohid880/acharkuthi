"use client";

import Link from "next/link";
import { useState } from "react";
import { formatTaka } from "@repo/ui/lib/utils";
import { useCart } from "@/lib/cart-store";
import { formatWeight, type HeatWord } from "@/lib/product-view";
import { useBasketUi } from "@/lib/basket-ui";
import { useLang } from "@/lib/i18n/lang-context";
import { Heat, Icon } from "./icon";
import { RestockAlert } from "./restock-alert";

export interface PickerVariant {
  id: number;
  label: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  weightGrams: number | null;
}
interface Props {
  slug: string;
  name: string;
  /** Bangla name: basket lines show it first on the Bangla site. */
  nameBn?: string | null;
  heat: { pods: 0 | 1 | 2 | 3; word: HeatWord };
  variants: PickerVariant[];
}

const MAX_QTY = 99;

/**
 * Price, availability, size, quantity and add-to-basket for the product page. Prices are
 * display-only. Owner (2026-11-22): every pickle has one size for now, so the size shows once, next
 * to the price; the size buttons only appear when a pickle has two or more.
 */
export function VariantPicker({ slug, name, nameBn, heat, variants }: Props) {
  const firstInStock = variants.find((v) => v.stock > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(firstInStock?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState<{ qty: number; label: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const add = useCart((s) => s.add);
  const openBasket = useBasketUi((s) => s.openBasket);
  // Labels in the page language; prices keep their Latin face (product-gallery-fit-and-prices).
  const { lang, t: all, href } = useLang();
  const t = all.picker;

  const variant = variants.find((v) => v.id === variantId);
  if (!variant) return null;
  /** More than one size: show the size buttons (not the case for now). */
  const many = variants.length > 1;
  const inStock = variant.stock > 0;
  const max = Math.min(MAX_QTY, variant.stock);
  const sale = variant.compareAtPrice !== null && variant.compareAtPrice > variant.price;

  /** Puts the chosen size and quantity in the basket. Returns false if the basket could not be updated. */
  const addToBasket = () => {
    try {
      add({
        variantId: variant.id,
        slug,
        productName: name,
        productNameBn: nameBn ?? undefined,
        variantLabel: variant.label,
        unitPrice: variant.price,
        quantity: qty,
        heat: heat.word,
        maxQty: max,
      });
      setAdded({ qty, label: variant.label });
      setFailed(false);
      return true;
    } catch {
      setAdded(null);
      setFailed(true);
      return false;
    }
  };

  const okMsg = added ? (
    <div className="cartok" role="status">
      <span lang={lang}>{t.added(added.qty, added.label)}</span>
      <Link
        href={href("/basket")}
        lang={lang}
        onClick={(e) => {
          e.preventDefault();
          openBasket();
        }}
      >
        {t.viewCart}
      </Link>
    </div>
  ) : null;
  const errMsg = failed ? (
    <div className="carterr" role="alert">
      <b lang={lang}>{t.failTitle}</b>
      <span lang={lang}>
        <span className="only-desk">{t.failKeep}</span>
        {t.tryAgain}
      </span>
    </div>
  ) : null;

  const qtyPill = (
    <span className="qty" role="group" aria-label={t.qty}>
      <button
        type="button"
        aria-label={t.less}
        aria-disabled={qty <= 1}
        onClick={() => setQty((q) => Math.max(1, q - 1))}
      >
        <Icon name="minus" />
      </button>
      <output aria-live="polite">{qty}</output>
      <button
        type="button"
        aria-label={t.more}
        aria-disabled={qty >= max}
        onClick={() => setQty((q) => Math.min(max, q + 1))}
      >
        <Icon name="plus" />
      </button>
    </span>
  );

  return (
    <>
      <div className="pv">
        <div className="pv-price">
          <span className="p" aria-live="polite" style={sale ? { color: "var(--heat)" } : undefined}>
            {formatTaka(variant.price)}
          </span>
          {sale && variant.compareAtPrice !== null ? (
            <s className="u">{formatTaka(variant.compareAtPrice)}</s>
          ) : null}
        </div>
        {/* The one place the size is shown (weight if known, else the size label). */}
        <span className="pv-size" lang={lang}>
          {variant.weightGrams ? formatWeight(variant.weightGrams) : variant.label}
        </span>
      </div>
      <div className="meta">
        <Heat pods={heat.pods} word={all.heat[heat.word]} />
        <span className={`avail ${inStock ? "" : "out"}`} aria-live="polite" lang={lang}>
          {inStock ? t.inStock : t.out}
        </span>
      </div>

      {many ? (
      <div style={{ marginTop: 24 }} role="radiogroup" aria-label={t.packageSize}>
        <p className="lab" lang={lang}>
          {t.packageSize}
        </p>
        <div className="vars">
          {variants.map((v) => {
            const on = v.id === variant.id;
            const off = v.stock === 0;
            const detail = off ? (
              <span lang={lang}>{t.soldOut}</span>
            ) : (
              <>
                <span className="pr">{formatTaka(v.price)}</span>
                {v.weightGrams ? ` · ${formatWeight(v.weightGrams)}` : null}
              </>
            );
            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-disabled={off}
                aria-label={`${v.label}, ${off ? t.soldOut : formatTaka(v.price)}`}
                className={`var ${on ? "on" : ""} ${off ? "off" : ""}`}
                onClick={() => {
                  if (off) return;
                  setVariantId(v.id);
                  setQty((q) => Math.max(1, Math.min(q, v.stock)));
                  setAdded(null);
                  setFailed(false);
                }}
              >
                <b lang={lang}>{v.label}</b>
                <span>{detail}</span>
              </button>
            );
          })}
        </div>
        {variants.some((v) => v.stock === 0) && variants.some((v) => v.stock > 0) ? (
          <p className="ak-help" style={{ marginTop: 10 }} lang={lang}>
            {t.sizeUnavailable}
          </p>
        ) : null}
      </div>
      ) : null}

      {inStock ? (
        <>
          <div className="buy">
            {qtyPill}
            <button
              type="button"
              className="ak-btn ak-btn--sun addb"
              lang={lang}
              onClick={addToBasket}
            >
              <span>
                {t.add} · <span className="pr">{formatTaka(variant.price * qty)}</span>
              </span>
            </button>
          </div>
          <div className="qrow">
            <p className="lab" lang={lang}>
              {t.qty}
            </p>
            {qtyPill}
          </div>
          {/* Buy now: puts the jar in the basket, then goes to checkout (not built yet). */}
          <Link
            className="ak-btn ak-btn--line buynow"
            href={href("/checkout")}
            lang={lang}
            onClick={(e) => {
              if (!addToBasket()) e.preventDefault();
            }}
          >
            {t.buyNow}
          </Link>
        </>
      ) : (
        <div className="outbox">
          <b lang={lang}>{t.outTitle}</b>
          <span className="ak-help" lang={lang}>
            {t.outText}
          </span>
          <RestockAlert key={variant.id} variantId={variant.id} />
        </div>
      )}
      <div className="msg-d">
        {errMsg}
        {okMsg}
      </div>

      {inStock ? (
        <div className="stick" role="region" aria-label={t.add}>
          {errMsg}
          {okMsg}
          <div className="t">
            <small lang={lang}>{lang === "bn" && nameBn ? nameBn : name}</small>
            <b>{formatTaka(variant.price * qty)}</b>
          </div>
          <button
            type="button"
            className="ak-btn ak-btn--sun addb"
            lang={lang}
            onClick={addToBasket}
          >
            {t.add}
          </button>
        </div>
      ) : null}
    </>
  );
}
