import { cache } from "react";
import { and, asc, db, desc, eq, inArray, ne, notInArray, schema, sql } from "@repo/db";
import { slug as slugSchema } from "@repo/validators";

/** Read-only catalog queries for the storefront. Server Components only. */

export const getCategories = cache(async () =>
  db.query.categories.findMany({
    where: eq(schema.categories.isActive, true),
    orderBy: [asc(schema.categories.sortOrder), asc(schema.categories.id)],
  }),
);

const withCatalog = { variants: true, images: true, category: true } as const;

export const getFeaturedProducts = cache(async (limit = 5) =>
  db.query.products.findMany({
    where: and(eq(schema.products.isActive, true), eq(schema.products.isFeatured, true)),
    with: withCatalog,
    orderBy: [asc(schema.products.id)],
    limit,
  }),
);

/**
 * The product with the most units sold in orders that were not cancelled or returned, for the
 * Home featured card's "বেস্টসেলার" badge (owner, 2026-11-21). Undefined before the first sale.
 */
export const getBestsellerProductId = cache(async (): Promise<number | undefined> => {
  const units = sql<number>`sum(${schema.orderItems.quantity})`;
  const [top] = await db
    .select({ productId: schema.productVariants.productId, units })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .innerJoin(schema.productVariants, eq(schema.productVariants.id, schema.orderItems.variantId))
    .where(notInArray(schema.orders.status, ["cancelled", "returned"]))
    .groupBy(schema.productVariants.productId)
    .orderBy(desc(units))
    .limit(1);
  return top && Number(top.units) > 0 ? top.productId : undefined;
});

/** Every active product with its variants, images and shelf. The shop filters these in the browser. */
export const getShopProducts = cache(async () =>
  db.query.products.findMany({
    where: eq(schema.products.isActive, true),
    with: withCatalog,
    orderBy: [asc(schema.products.id)],
  }),
);

export const getCategoryBySlug = cache(async (raw: string) => {
  const parsed = slugSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  return db.query.categories.findFirst({
    where: and(eq(schema.categories.slug, parsed.data), eq(schema.categories.isActive, true)),
  });
});

export const getProductBySlug = cache(async (raw: string) => {
  const parsed = slugSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  return db.query.products.findFirst({
    where: and(eq(schema.products.slug, parsed.data), eq(schema.products.isActive, true)),
    with: withCatalog,
  });
});

/**
 * Approved reviews for one product, newest first, with the reviewer's display name and whether
 * they have a delivered order containing this product ("Verified purchase").
 */
export async function getProductReviews(productId: number) {
  const rows = await db.query.reviews.findMany({
    where: and(eq(schema.reviews.productId, productId), eq(schema.reviews.isApproved, true)),
    with: { user: { columns: { name: true } } },
    orderBy: [desc(schema.reviews.createdAt)],
  });
  const userIds = [...new Set(rows.flatMap((r) => (r.userId ? [r.userId] : [])))];
  const buyers = new Set<string>();
  if (userIds.length > 0) {
    const bought = await db
      .selectDistinct({ userId: schema.orders.userId })
      .from(schema.orders)
      .innerJoin(schema.orderItems, eq(schema.orderItems.orderId, schema.orders.id))
      .innerJoin(schema.productVariants, eq(schema.productVariants.id, schema.orderItems.variantId))
      .where(
        and(
          eq(schema.orders.status, "delivered"),
          eq(schema.productVariants.productId, productId),
          inArray(schema.orders.userId, userIds),
        ),
      );
    for (const b of bought) if (b.userId) buyers.add(b.userId);
  }
  return rows.map((r) => ({
    id: r.id,
    name: r.name || r.user?.name || "",
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    spice: r.spice,
    photoUrl: r.photoUrl,
    reply: r.reply,
    createdAt: r.createdAt,
    verified: r.userId !== null && buyers.has(r.userId),
  }));
}
export type ProductReview = Awaited<ReturnType<typeof getProductReviews>>[number];

export async function getRelatedProducts(productId: number, categoryId: number | null, limit = 4) {
  const rows = await db.query.products.findMany({
    where: and(eq(schema.products.isActive, true), ne(schema.products.id, productId)),
    with: withCatalog,
  });
  // Same shelf first, then the rest.
  rows.sort((a, b) => Number(b.categoryId === categoryId) - Number(a.categoryId === categoryId));
  return rows.slice(0, limit);
}

export type CatalogProduct = Awaited<ReturnType<typeof getFeaturedProducts>>[number];

export interface SiteReview {
  who: string;
  s: number;
  text: string;
  date: string;
  ver: boolean;
  /** "আচারকুঠির উত্তর", when the shop has replied (admin Reviews page). */
  reply?: string | null;
}

const reviewDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Approved "overall experience" reviews, newest first. */
/** Approved site reviews in all: their count and average stars (Home review summary). */
export interface SiteReviewStats {
  count: number;
  /** Average stars, one decimal; 0 when there are none. */
  average: number;
}

export const getSiteReviewStats = cache(async (): Promise<SiteReviewStats> => {
  const [row] = await db
    .select({
      count: sql<number>`count(*)`,
      average: sql<string | null>`avg(${schema.siteReviews.rating})`,
    })
    .from(schema.siteReviews)
    .where(eq(schema.siteReviews.isApproved, true));
  const count = Number(row?.count ?? 0);
  const average = row?.average ? Math.round(Number(row.average) * 10) / 10 : 0;
  return { count, average };
});

export const getSiteReviews = cache(async (): Promise<SiteReview[]> => {
  const rows = await db.query.siteReviews.findMany({
    where: eq(schema.siteReviews.isApproved, true),
    orderBy: [desc(schema.siteReviews.createdAt)],
    limit: 12,
  });
  return rows.map((r) => ({
    who: r.name,
    s: r.rating,
    text: r.body,
    date: reviewDate.format(r.createdAt),
    ver: false,
    reply: r.reply,
  }));
});
