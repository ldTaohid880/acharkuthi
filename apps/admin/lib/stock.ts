import "server-only";

import { and, asc, count, db, eq, isNull, schema } from "@repo/db";

export interface StockRow {
  id: number;
  bn: string;
  en: string;
  size: string;
  stock: number;
  /** Open "স্টকে এলে জানান" requests (not yet told). */
  requests: number;
  /** The product is hidden from the shop ("পণ্য লুকানো"). */
  hidden: boolean;
}

/** Every active size, product by product (Stock-* boards). */
export async function listStock(): Promise<StockRow[]> {
  const { productVariants: v, products: p, restockRequests: r } = schema;
  const [rows, reqs] = await Promise.all([
    db
      .select({
        id: v.id,
        name: p.name,
        nameBn: p.nameBn,
        size: v.label,
        stock: v.stock,
        productActive: p.isActive,
      })
      .from(v)
      .innerJoin(p, eq(p.id, v.productId))
      .where(eq(v.isActive, true))
      .orderBy(asc(p.name), asc(v.price), asc(v.id)),
    db
      .select({ variantId: r.variantId, n: count() })
      .from(r)
      .where(isNull(r.notifiedAt))
      .groupBy(r.variantId),
  ]);
  const byVariant = new Map(reqs.map((x) => [x.variantId, x.n]));
  return rows.map((x) => ({
    id: x.id,
    bn: x.nameBn ?? x.name,
    en: x.name,
    size: x.size,
    stock: x.stock,
    requests: byVariant.get(x.id) ?? 0,
    hidden: !x.productActive,
  }));
}

/** Open requests for one size (used after a save to word the restock notification). */
export async function openRequests(variantId: number): Promise<number> {
  const { restockRequests: r } = schema;
  return db.$count(r, and(eq(r.variantId, variantId), isNull(r.notifiedAt)));
}
