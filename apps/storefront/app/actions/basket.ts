"use server";

import { basketQuoteInput } from "@repo/validators";
import { type BasketQuote, quoteVariants } from "@/lib/basket-quote";

export type BasketQuoteResult = { ok: true; quotes: BasketQuote[] } | { ok: false };

/** Re-reads the basket's variants from the database. The client never supplies a price. */
export async function quoteBasket(input: unknown): Promise<BasketQuoteResult> {
  const parsed = basketQuoteInput.safeParse(input);
  if (!parsed.success) return { ok: false };
  try {
    return { ok: true, quotes: await quoteVariants(parsed.data.variantIds) };
  } catch (err) {
    console.error("basket quote failed", err);
    return { ok: false };
  }
}
