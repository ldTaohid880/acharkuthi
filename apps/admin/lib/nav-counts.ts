import "server-only";

import type { AdminRole } from "@repo/auth";
import { and, count, db, eq, getShopRules, isNull, lt, schema } from "@repo/db";
import type { NavCounts } from "@/components/shell/nav-model";
import { unreadCount } from "@/lib/messages";

/** Stock below the Stock page's "সীমা" is low (default 10, saved in Settings storage). */
export async function lowStockLimit(): Promise<number> {
  return (await getShopRules()).lowStockLimit;
}

/**
 * Live counts beside menu entries: new orders, low-stock sizes, unread messages, reviews waiting
 * for approval and open restock requests.
 */
export async function getNavCounts(role: AdminRole): Promise<NavCounts> {
  const { orders, productVariants, products, reviews, siteReviews, restockRequests } = schema;
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const limit = await lowStockLimit();

  const [newOrders, lowStock, messages] = await Promise.all([
    one(db.select({ n: count() }).from(orders).where(eq(orders.status, "pending"))),
    one(
      db
        .select({ n: count() })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(
          and(
            eq(productVariants.isActive, true),
            eq(products.isActive, true),
            lt(productVariants.stock, limit),
          ),
        ),
    ),
    unreadCount(),
  ]);
  if (role !== "owner") return { orders: newOrders, stock: lowStock, messages };

  const [productReviews, shopReviews, restock] = await Promise.all([
    one(db.select({ n: count() }).from(reviews).where(eq(reviews.isApproved, false))),
    one(db.select({ n: count() }).from(siteReviews).where(eq(siteReviews.isApproved, false))),
    one(db.select({ n: count() }).from(restockRequests).where(isNull(restockRequests.notifiedAt))),
  ]);
  return {
    orders: newOrders,
    stock: lowStock,
    messages,
    reviews: productReviews + shopReviews,
    restock,
  };
}
