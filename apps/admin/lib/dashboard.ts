import "server-only";

import type { AdminRole } from "@repo/auth";
import { and, asc, count, db, desc, eq, gte, isNull, lt, min, schema, sql, sum } from "@repo/db";
import { latestUnread, unreadCount } from "@/lib/messages";
import { lowStockLimit } from "@/lib/nav-counts";

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
  /** Orders that reached "delivered" today (order history). */
  deliveredToday: number;
  /** Booked parcels Steadfast reports as on hold / unknown. */
  courier: { hold: number; unknown: number };
  /** Owner only: cash marked received today, COD still to settle, Steadfast balance. */
  cash: {
    collectedToday: number;
    pending: { n: number; amount: number };
    balance: number | null;
  } | null;
  /** Unread inbox messages (staff and owner). */
  messages: { n: number; latest: { id: string; name: string; text: string }[] };
  reviews: { n: number; latest: WaitingReview[] } | null;
  restock: { n: number; top: RestockTop[] } | null;
}

/**
 * Everything on Dashboard-*.dc.html that the database can answer today. Delivered/collected
 * today comes from the order history; courier, COD and balance figures from the Steadfast fields.
 * Staff get no reviews or restock data (owner-only pages).
 */
export async function getDashboard(role: AdminRole): Promise<DashboardData> {
  const { orders, orderItems, productVariants, products, reviews, siteReviews, restockRequests } =
    schema;
  const one = async <T>(q: Promise<T[]>) => (await q)[0];
  const limit = await lowStockLimit();

  const openRequests = db
    .select({ variantId: restockRequests.variantId, n: count().as("n") })
    .from(restockRequests)
    .where(isNull(restockRequests.notifiedAt))
    .groupBy(restockRequests.variantId)
    .as("open_requests");

  const [today, fresh, conf, packed, returned, low, unread, unreadLatest] = await Promise.all([
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
          lt(productVariants.stock, limit),
        ),
      )
      .orderBy(asc(productVariants.stock), desc(sql`coalesce(${openRequests.n}, 0)`))
      .limit(5),
    unreadCount(),
    latestUnread(2),
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
    messages: {
      n: unread,
      latest: unreadLatest.map((x) => ({ id: String(x.id), name: x.name, text: x.preview })),
    },
    deliveredToday: 0,
    courier: { hold: 0, unknown: 0 },
    cash: null,
    reviews: null,
    restock: null,
  };
  const since = startOfTodayDhaka();
  const [delivered, hold, unknown] = await Promise.all([
    one(
      db
        .select({ n: sql<number>`count(distinct ${schema.orderStatusEvents.orderId})` })
        .from(schema.orderStatusEvents)
        .where(
          and(
            eq(schema.orderStatusEvents.status, "delivered"),
            gte(schema.orderStatusEvents.createdAt, since),
          ),
        ),
    ),
    one(
      db
        .select({ n: count() })
        .from(orders)
        .where(and(eq(orders.status, "shipped"), eq(orders.courierStatus, "hold"))),
    ),
    one(
      db
        .select({ n: count() })
        .from(orders)
        .where(and(eq(orders.status, "shipped"), sql`${orders.courierStatus} like 'unknown%'`)),
    ),
  ]);
  data.deliveredToday = Number(delivered?.n ?? 0);
  data.courier = { hold: hold?.n ?? 0, unknown: unknown?.n ?? 0 };
  if (role !== "owner") return data;

  const [collected, pendingCod, sf] = await Promise.all([
    one(
      db
        .select({ v: sum(orders.total) })
        .from(orders)
        .where(gte(orders.settledAt, since)),
    ),
    one(
      db
        .select({ n: count(), v: sum(orders.total) })
        .from(orders)
        .where(and(eq(orders.status, "delivered"), isNull(orders.settledAt))),
    ),
    one(db.select({ b: schema.shopSettings.steadfastBalance }).from(schema.shopSettings)),
  ]);
  data.cash = {
    collectedToday: Number(collected?.v ?? 0),
    pending: { n: pendingCod?.n ?? 0, amount: Number(pendingCod?.v ?? 0) },
    balance: sf?.b ?? null,
  };

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
