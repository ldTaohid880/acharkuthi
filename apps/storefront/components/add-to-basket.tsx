"use client";

import { useCart, type CartLine } from "@/lib/cart-store";
import { useBasketUi } from "@/lib/basket-ui";
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
}: {
  line: Omit<CartLine, "quantity">;
  wide?: boolean;
  /** Replaces the round button's plus mark (product card uses the Figma mark). */
  plusIcon?: React.ReactNode;
  className?: string;
}) {
  const { lines } = useHydratedCart();
  const add = useCart((s) => s.add);
  const setQuantity = useCart((s) => s.setQuantity);
  const notifyAdded = useBasketUi((s) => s.notifyAdded);
  const addOne = () => {
    add({ ...line, quantity: 1 });
    notifyAdded(line.productName);
  };
  const qty = lines.find((l) => l.variantId === line.variantId)?.quantity ?? 0;

  if (qty === 0 && wide) {
    return (
      <button type="button" className="ak-btn ak-btn--brand above" onClick={addOne}>
        <Icon name="basket" />
        Add to basket
      </button>
    );
  }
  if (qty === 0) {
    return (
      <button
        type="button"
        className={className}
        aria-label={`Add ${line.productName} to basket`}
        onClick={addOne}
      >
        {plusIcon ?? <Icon name="plus" />}
      </button>
    );
  }
  const pill = (
    <span className="qty above">
      <button
        type="button"
        aria-label={`Remove one ${line.productName}`}
        onClick={() => setQuantity(line.variantId, qty - 1)}
      >
        <Icon name="minus" />
      </button>
      <output aria-live="polite">{qty}</output>
      <button
        type="button"
        aria-label={`Add one more ${line.productName}`}
        onClick={() => setQuantity(line.variantId, qty + 1)}
      >
        <Icon name="plus" />
      </button>
    </span>
  );
  return wide ? (
    <span className="card-acts above">
      <span className="ok">Added</span>
      {pill}
    </span>
  ) : (
    pill
  );
}
