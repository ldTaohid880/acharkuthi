"use client";

import { usePathname } from "next/navigation";
import { useBasketUi } from "@/lib/basket-ui";
import { useHydratedCart } from "@/lib/use-cart-hydrated";
import { Icon } from "./icon";

/** Sticky bottom bar on phones once something is in the basket (hidden on desktop by CSS). Off on the basket, checkout and product pages, which have their own bars. */
export function BasketBar() {
  const { count } = useHydratedCart();
  const openBasket = useBasketUi((s) => s.openBasket);
  const pathname = usePathname();
  // Product pages have their own sticky add bar and "added" snackbar (BasketStates: one snackbar).
  if (count === 0 || pathname === "/basket" || pathname === "/checkout" || pathname.startsWith("/pickles/"))
    return null;
  return (
    <div className="bbar" role="status">
      <Icon name="basket" />
      <span className="t">
        {count} in your basket
        <small>Pay in cash when it arrives</small>
      </span>
      <button
        type="button"
        className="ak-btn ak-btn--sun"
        onClick={openBasket}
        style={{ minHeight: 44 }}
      >
        View basket
      </button>
    </div>
  );
}
