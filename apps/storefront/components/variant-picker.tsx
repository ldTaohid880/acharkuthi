"use client";

import Link from "next/link";
import { useState } from "react";
import { formatTaka } from "@repo/ui/lib/utils";
import { useCart } from "@/lib/cart-store";
import { formatWeight, type HeatWord } from "@/lib/product-view";
import { useBasketUi } from "@/lib/basket-ui";
import { soon } from "@/lib/routes";
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
  heat: { pods: 1 | 2 | 3; word: HeatWord };
  variants: PickerVariant[];
}

const MAX_QTY = 99;

/** Price, availability, size, quantity and add-to-basket for the product page. Prices are display-only. */
export function VariantPicker({ slug, name, heat, variants }: Props) {
  const firstInStock = variants.find((v) => v.stock > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(firstInStock?.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState<{ qty: number; label: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const add = useCart((s) => s.add);
  const openBasket = useBasketUi((s) => s.openBasket);

  const variant = variants.find((v) => v.id === variantId);
  if (!variant) return null;
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
      <span lang="bn">
        কার্টে যোগ হয়েছে: {added.qty} × {added.label}
      </span>
      <Link
        href={soon("/basket")}
        lang="bn"
        onClick={(e) => {
          e.preventDefault();
          openBasket();
        }}
      >
        কার্ট দেখুন
      </Link>
    </div>
  ) : null;
  const errMsg = failed ? (
    <div className="carterr" role="alert">
      <b lang="bn">কার্টে যোগ করা যায়নি</b>
      <span lang="bn">
        <span className="only-desk">আপনার বাছাই আগের মতোই আছে। </span>আবার চেষ্টা করুন।
      </span>
    </div>
  ) : null;

  const qtyPill = (
    <span className="qty" role="group" aria-label="Quantity">
      <button
        type="button"
        aria-label="Decrease quantity"
        aria-disabled={qty <= 1}
        onClick={() => setQty((q) => Math.max(1, q - 1))}
      >
        <Icon name="minus" />
      </button>
      <output aria-live="polite">{qty}</output>
      <button
        type="button"
        aria-label="Increase quantity"
        aria-disabled={qty >= max}
        onClick={() => setQty((q) => Math.min(max, q + 1))}
      >
        <Icon name="plus" />
      </button>
    </span>
  );

  return (
    <>
      <div className="priceRow">
        <span className="p" aria-live="polite" style={sale ? { color: "var(--heat)" } : undefined}>
          {formatTaka(variant.price)}
        </span>
        {sale && variant.compareAtPrice !== null ? (
          <s className="u">{formatTaka(variant.compareAtPrice)}</s>
        ) : null}
        <span className="u" lang="bn">
          {variant.label} সাইজ
        </span>
      </div>
      <div className="meta">
        <Heat pods={heat.pods} word={heat.word} />
        <span className={`avail ${inStock ? "" : "out"}`} aria-live="polite" lang="bn">
          {inStock ? "স্টকে আছে" : "স্টকে নেই"}
        </span>
      </div>

      <div style={{ marginTop: 24 }} role="radiogroup" aria-label="Package size">
        <p className="lab" lang="bn">
          প্যাকেট সাইজ <small>{variant.label}</small>
        </p>
        <div className="vars">
          {variants.map((v) => {
            const on = v.id === variant.id;
            const off = v.stock === 0;
            const detail = off ? (
              "স্টক শেষ"
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
                aria-label={`${v.label}, ${off ? "স্টক শেষ" : formatTaka(v.price)}`}
                className={`var ${on ? "on" : ""} ${off ? "off" : ""}`}
                onClick={() => {
                  if (off) return;
                  setVariantId(v.id);
                  setQty((q) => Math.max(1, Math.min(q, v.stock)));
                  setAdded(null);
                  setFailed(false);
                }}
              >
                <b lang="bn">{v.label}</b>
                <span>{detail}</span>
              </button>
            );
          })}
        </div>
        {variants.some((v) => v.stock === 0) && variants.some((v) => v.stock > 0) ? (
          <p className="ak-help" style={{ marginTop: 10 }} lang="bn">
            এই সাইজ এখন পাওয়া যাচ্ছে না। অন্য সাইজ বেছে নিন।
          </p>
        ) : null}
      </div>

      {inStock ? (
        <>
          <div className="buy">
            {qtyPill}
            <button
              type="button"
              className="ak-btn ak-btn--sun addb"
              lang="bn"
              onClick={addToBasket}
            >
              <span>
                কার্টে যোগ করুন · <span className="pr">{formatTaka(variant.price * qty)}</span>
              </span>
            </button>
          </div>
          <div className="qrow">
            <p className="lab" lang="bn">
              পরিমাণ
            </p>
            {qtyPill}
          </div>
          {/* Buy now: puts the jar in the basket, then goes to checkout (not built yet). */}
          <Link
            className="ak-btn ak-btn--line buynow"
            href={"/checkout"}
            lang="bn"
            onClick={(e) => {
              if (!addToBasket()) e.preventDefault();
            }}
          >
            এখনই কিনুন
          </Link>
        </>
      ) : (
        <div className="outbox">
          <b lang="bn">এই পণ্যটি এখন স্টকে নেই</b>
          <span className="ak-help" lang="bn">
            স্টকে এলে জানাতে পারি, তবে এখনও কোনো সময় বলা যাচ্ছে না।
          </span>
          <RestockAlert key={variant.id} variantId={variant.id} />
        </div>
      )}
      <div className="msg-d">
        {errMsg}
        {okMsg}
      </div>

      {inStock ? (
        <div className="stick" role="region" aria-label="Add to cart">
          {errMsg}
          {okMsg}
          <div className="t">
            <small lang="bn">
              {qty} × {variant.label}
            </small>
            <b>{formatTaka(variant.price * qty)}</b>
          </div>
          <button type="button" className="ak-btn ak-btn--sun addb" lang="bn" onClick={addToBasket}>
            কার্টে যোগ করুন
          </button>
        </div>
      ) : null}
    </>
  );
}
