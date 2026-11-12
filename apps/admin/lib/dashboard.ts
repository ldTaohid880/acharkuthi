import "server-only";

import type { AdminRole } from "@repo/auth";
import { and, asc, count, db, desc, eq, gte, isNull, lt, min, schema, sql, sum } from "@repo/db";
import { LOW_STOCK_LIMIT } from "@/lib/nav-counts";

/** Start of today in Bangladesh time (UTC+6, no DST), as a Date. */
function startOfTodayDhaka(now = new Date()): Date {
  const offset = 6 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offset);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - offset);
}

export interface LowStockRow {
  variantId: number;
  bn: string;
  en: string;
  size: string;
  stock: number;
  requests: number;
}

export interface WaitingReview {
  id: string;
  rating: number;
  text: string;
  name: string;
}

export interface RestockTop {
  bn: string;
  en: string;
  size: string;
  people: number;
}

export interface DashboardData {
  ordersToday: number;
  newOrders: { n: number; oldest: Date | null };
  confirmed: { n: number; items: number };
  packed: number;
  returned: number;
  lowStock: LowStockRow[];
  reviews: { n: number; latest: WaitingReview[] } | null;
  restock: { n: number; top: RestockTop[] } | null;
}

/**
 * Everything on Dashboard-*.dc.html that the database can answer today. Delivered/collected
 * today, Steadfast, courier holds, COD settling and unread messages need storage (shown so).
 * Staff get no reviews or restock data (owner-only pages).
 */
export async function getDashboard(role: AdminRole): Promise<DashboardData> {
  const { orders, orderItems, productVariants, products, reviews, siteReviews, restockRequests } =
    schema;
  const one = async <T>(q: Promise<T[]>) => (await q)[0];

  const openRequests = db
    .select({ variantId: restockRequests.variantId, n: count().as("n") })
    .from(restockRequests)
    .where(isNull(restockRequests.notifiedAt))
    .groupBy(restockRequests.variantId)
    .as("open_requests");

  const [today, fresh, conf, packed, returned, low] = await Promise.all([
    one(db.select({ n: count() }).from(orders).where(gte(orders.createdAt, startOfTodayDhaka()))),
    one(
      db
        .select({ n: count(), oldest: min(orders.createdAt) })
        .from(orders)
        .where(eq(orders.status, "pending")),
    ),
    one(
      db
        .select({ n: sql<number>`count(distinct ${orders.id})`, items: sum(orderItems.quantity) })
        .from(orders)
        .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(eq(orders.status, "confirmed")),
    ),
    one(db.select({ n: count() }).from(orders).where(eq(orders.status, "processing"))),
    one(db.select({ n: count() }).from(orders).where(eq(orders.status, "returned"))),
    db
      .select({
        variantId: productVariants.id,
        bn: products.nameBn,
        en: products.name,
        size: productVariants.label,
        stock: productVariants.stock,
        requests: sql<number>`coalesce(${openRequests.n}, 0)`,
      })
      .from(productVariants)
      .innerJoin(products, eq(products.id, productVariants.productId))
      .leftJoin(openRequests, eq(openRequests.variantId, productVariants.id))
      .where(
        and(
          eq(productVariants.isActive, true),
          eq(products.isActive, true),
          lt(productVariants.stock, LOW_STOCK_LIMIT),
        ),
      )
      .orderBy(asc(productVariants.stock), desc(sql`coalesce(${openRequests.n}, 0)`))
      .limit(5),
  ]);

  const data: DashboardData = {
    ordersToday: today?.n ?? 0,
    newOrders: { n: fresh?.n ?? 0, oldest: fresh?.oldest ?? null },
    confirmed: { n: Number(conf?.n ?? 0), items: Number(conf?.items ?? 0) },
    packed: packed?.n ?? 0,
    returned: returned?.n ?? 0,
    lowStock: low.map((v) => ({
      ...v,
      bn: v.bn ?? v.en,
      requests: Number(v.requests),
    })),
    reviews: null,
    restock: null,
  };
  if (role !== "owner") return data;

  const [pr, sr, prLatest, srLatest, restockN, restockTop] = await Promise.all([
    one(db.select({ n: count() }).from(reviews).where(eq(reviews.isApproved, false))),
    one(db.select({ n: count() }).from(siteReviews).where(eq(siteReviews.isApproved, false))),
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        title: reviews.title,
        comment: reviews.comment,
        name: reviews.name,
        at: reviews.createdAt,
      })
      .from(reviews)
      .where(eq(reviews.isApproved, false))
      .orderBy(desc(reviews.createdAt))
      .limit(2),
    db
      .select({
        id: siteReviews.id,
        rating: siteReviews.rating,
        body: siteReviews.body,
        name: siteReviews.name,
        at: siteReviews.createdAt,
      })
      .from(siteReviews)
      .where(eq(siteReviews.isApproved, false))
      .orderBy(desc(siteReviews.createdAt))
      .limit(2),
    one(db.select({ n: count() }).from(restockRequests).where(isNull(restockRequests.notifiedAt))),
    db
      .select({
        bn: products.nameBn,
        en: products.name,
        size: productVariants.label,
        people: count(restockRequests.id),
      })
      .from(restockRequests)
      .innerJoin(productVariants, eq(productVariants.id, restockRequests.variantId))
      .innerJoin(products, eq(products.id, productVariants.productId))
      .where(isNull(restockRequests.notifiedAt))
      .groupBy(productVariants.id)
      .orderBy(desc(count(restockRequests.id)))
      .limit(2),
  ]);

  const latest = [
    ...prLatest.map((r) => ({
      id: `p${r.id}`,
      rating: r.rating,
      text: r.title ?? r.comment ?? "",
      name: r.name,
      at: r.at,
    })),
    ...srLatest.map((r) => ({
      id: `s${r.id}`,
      rating: r.rating,
      text: r.body,
      name: r.name,
      at: r.at,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 2)
    .map(({ at: _at, ...r }) => r);

  data.reviews = { n: (pr?.n ?? 0) + (sr?.n ?? 0), latest };
  data.restock = {
    n: restockN?.n ?? 0,
    top: restockTop.map((r) => ({ ...r, bn: r.bn ?? r.en })),
  };
  return data;
}
