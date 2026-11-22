import { eq } from "drizzle-orm";
import { db } from "./index";
import { shopSettings } from "./schema";

/** Delivery charges (paisa) and the COD switch, from Settings. Defaults until the owner saves. */
export interface ShopRules {
  fees: { in: number; out: number };
  codEnabled: boolean;
  /** Stock "সীমা": sizes below this are low. */
  lowStockLimit: number;
}

export const DEFAULT_SHOP_RULES: ShopRules = {
  fees: { in: 6000, out: 12000 },
  codEnabled: true,
  lowStockLimit: 10,
};

export async function getShopRules(): Promise<ShopRules> {
  const [row] = await db
    .select({
      in: shopSettings.deliveryFeeIn,
      out: shopSettings.deliveryFeeOut,
      cod: shopSettings.codEnabled,
      low: shopSettings.lowStockLimit,
    })
    .from(shopSettings)
    .where(eq(shopSettings.id, 1));
  return row
    ? { fees: { in: row.in, out: row.out }, codEnabled: row.cod, lowStockLimit: row.low }
    : DEFAULT_SHOP_RULES;
}
