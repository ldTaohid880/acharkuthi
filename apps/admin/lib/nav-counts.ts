import "server-only";

import type { AdminRole } from "@repo/auth";
import { and, count, db, eq, isNull, lt, schema } from "@repo/db";
import type { NavCounts } from "@/components/shell/nav-model";

/** Stock below this is "low" (Dashboard-Desktop.dc.html: "সীমা: ১০টির কম"). */
export const LOW_STOCK_LIMIT = 10;

/**
 * Live counts beside menu entries: new orders, low-stock sizes, reviews waiting for approval and
 * open restock requests. Unread messages need storage that doesn't exist yet, so no count.
 */
export async function getNavCounts(role: AdminRole): Promise<NavCounts> {
  const { orders, productVariants, products, reviews, siteReviews, restockRequests } = schema;
  const one = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;

  const [newOrders, lowStock] = await Promise.all([
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
            lt(productVariants.stock, LOW_STOCK_LIMIT),
          ),
        ),
    ),
  ]);
  if (role !== "owner") return { orders: newOrders, stock: lowStock };

  const [productReviews, shopReviews, restock] = await Promise.all([
    one(db.select({ n: count() }).from(reviews).where(eq(reviews.isApproved, false))),
    one(db.select({ n: count() }).from(siteReviews).where(eq(siteReviews.isApproved, false))),
    one(db.select({ n: count() }).from(restockRequests).where(isNull(restockRequests.notifiedAt))),
  ]);
  return { orders: newOrders, stock: lowStock, reviews: productReviews + shopReviews, restock };
}
