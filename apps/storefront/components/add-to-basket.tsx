"use client";

import { lineName, useCart, type CartLine } from "@/lib/cart-store";
import { useBasketUi } from "@/lib/basket-ui";
import { useLang } from "@/lib/i18n/lang-context";
import { useHydratedCart } from "@/lib/use-cart-hydrated";
import { Icon } from "./icon";

/**
 * Round "+" that becomes a − qty + pill once the variant is in the basket.
 * `line` carries display data only; the server re-prices at checkout.
 */
export function AddToBasket({
  line,
  wide = false,
  plusIcon,
  className = "ak-btn ak-btn--round above",
  label,
}: {
  line: Omit<CartLine, "quantity">;
  wide?: boolean;
  /** Replaces the round button's plus mark (product card uses the Figma mark). */
  plusIcon?: React.ReactNode;
  className?: string;
  /** Wide button text when it differs from the card's (Home featured picks: "কার্টে যোগ করুন"). */
  label?: string;
}) {
  const { lines } = useHydratedCart();
  const add = useCart((s) => s.add);
  const setQuantity = useCart((s) => s.setQuantity);
  const notifyAdded = useBasketUi((s) => s.notifyAdded);
  const { lang, t: all } = useLang();
  const t = all.card;
  const name = lineName(line, lang);
  const addOne = () => {
    add({ ...line, quantity: 1 });
    notifyAdded(name);
  };
  const qty = lines.find((l) => l.variantId === line.variantId)?.quantity ?? 0;

  if (qty === 0 && wide) {
    return (
      <button type="button" className="ak-btn ak-btn--brand above" onClick={addOne}>
        <Icon name="basket" />
        {label ?? t.add}
      </button>
    );
  }
  if (qty === 0) {
    return (
      <button type="button" className={className} aria-label={t.addName(name)} onClick={addOne}>
        {plusIcon ?? <Icon name="plus" />}
      </button>
    );
  }
  const pill = (
    <span className="qty above">
      <button
        type="button"
        aria-label={t.lessName(name)}
        onClick={() => setQuantity(line.variantId, qty - 1)}
      >
        <Icon name="minus" />
      </button>
      <output aria-live="polite">{qty}</output>
      <button
        type="button"
        aria-label={t.moreName(name)}
        onClick={() => setQuantity(line.variantId, qty + 1)}
      >
        <Icon name="plus" />
      </button>
    </span>
  );
  return wide ? (
    <span className="card-acts above">
      <span className="ok">{t.added}</span>
      {pill}
    </span>
  ) : (
    pill
  );
}
