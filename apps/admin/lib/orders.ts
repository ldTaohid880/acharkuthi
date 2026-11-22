import "server-only";

import {
  and,
  count,
  db,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  or,
  schema,
  sql,
  type SQL,
} from "@repo/db";
import type { OrderListQuery, OrderTab } from "@repo/validators";

type DbStatus = (typeof schema.orders.$inferSelect)["status"];

/** Which database statuses each tab shows. Booked vs in transit splits "shipped" by consignment. */
export const TAB_STATUSES: Record<OrderTab, DbStatus[] | null> = {
  all: null,
  new: ["pending"],
  confirmed: ["confirmed"],
  packed: ["processing"],
  booked: ["shipped"],
  transit: ["shipped"],
  delivered: ["delivered"],
  problem: ["returned"],
  cancelled: ["cancelled"],
};

/** Booked = shipped with a Steadfast consignment; in transit = shipped some other way. */
function tabCond(tab: OrderTab): SQL | undefined {
  const { orders } = schema;
  const statuses = TAB_STATUSES[tab];
  if (statuses === null) return undefined;
  const base = statuses.length ? inArray(orders.status, statuses) : sql`false`;
  if (tab === "booked") return and(base, isNotNull(orders.consignmentId));
  if (tab === "transit") return and(base, isNull(orders.consignmentId));
  return base;
}

export const PAGE_SIZE = 10;
const DHAKA_MS = 6 * 60 * 60 * 1000;

/** Midnight in Bangladesh time for a YYYY-MM-DD day, or for today offset by `days`. */
function dhakaMidnight(day?: string, days = 0): Date {
  if (day) return new Date(new Date(`${day}T00:00:00Z`).getTime() - DHAKA_MS);
  const local = new Date(Date.now() + DHAKA_MS);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() + days);
  return new Date(local.getTime() - DHAKA_MS);
}

function dateRange(q: OrderListQuery): [Date, Date | null] | null {
  switch (q.date) {
    case "today":
      return [dhakaMidnight(), null];
    case "yesterday":
      return [dhakaMidnight(undefined, -1), dhakaMidnight()];
    case "7d":
      return [dhakaMidnight(undefined, -6), null];
    case "month": {
      const local = new Date(Date.now() + DHAKA_MS);
      const first = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-01`;
      return [dhakaMidnight(first), null];
    }
    case "range": {
      if (!q.from && !q.to) return null;
      const start = q.from ? dhakaMidnight(q.from) : new Date(0);
      const end = q.to ? new Date(dhakaMidnight(q.to).getTime() + 86400000) : null;
      return [start, end];
    }
    default:
      return null;
  }
}

/** Search, date and area conditions (everything except the status tab). */
function filterWhere(q: OrderListQuery): SQL | undefined {
  const { orders } = schema;
  const parts: (SQL | undefined)[] = [];
  if (q.q) {
    const pat = `%${q.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    parts.push(
      or(
        like(orders.orderNumber, pat),
        like(orders.customerName, pat),
        like(orders.customerPhone, pat),
      ),
    );
  }
  const range = dateRange(q);
  if (range) {
    parts.push(gte(orders.createdAt, range[0]));
    if (range[1]) parts.push(lt(orders.createdAt, range[1]));
  }
  if (q.zone) parts.push(eq(orders.deliveryZone, q.zone));
  return and(...parts);
}

function tabWhere(tab: OrderTab, multi?: OrderTab[]): SQL | undefined {
  if (multi && multi.length) {
    const conds = multi.map(tabCond).filter((c): c is SQL => c !== undefined);
    return conds.length ? or(...conds) : undefined;
  }
  return tabCond(tab);
}

export interface OrderRow {
  id: number;
  number: string;
  createdAt: Date;
  name: string;
  phone: string;
  area: string;
  zone: "in" | "out" | null;
  status: DbStatus;
  /** Has a Steadfast consignment ("কুরিয়ারে বুক" while shipped). */
  booked: boolean;
  /** "টাকা পাওয়া গেছে" marked. */
  settled: boolean;
  courier: string | null;
  tracking: string | null;
  total: number;
  items: number;
}

/** Display area: "মিরপুর ১০", or "আগ্রাবাদ, চট্টগ্রাম" outside Dhaka. Old orders: first address part. */
function areaOf(o: {
  shipArea: string | null;
  shipUpazila: string | null;
  shipDistrict: string | null;
  deliveryZone: "in" | "out" | null;
  shippingAddress: string;
}): string {
  const place = o.shipArea ?? o.shipUpazila;
  if (!place) return o.shippingAddress.split(",")[0]?.trim() ?? "";
  return o.deliveryZone === "out" && o.shipDistrict ? `${place}, ${o.shipDistrict}` : place;
}

/** Tab counts for the current search/date/area filters. */
export async function tabCounts(q: OrderListQuery): Promise<Record<OrderTab, number>> {
  const booked = sql<number>`(${schema.orders.consignmentId} is not null)`;
  const rows = await db
    .select({ status: schema.orders.status, booked, n: count() })
    .from(schema.orders)
    .where(filterWhere(q))
    .groupBy(schema.orders.status, booked);
  const out = {} as Record<OrderTab, number>;
  for (const [tab, statuses] of Object.entries(TAB_STATUSES) as [OrderTab, DbStatus[] | null][]) {
    out[tab] = rows
      .filter((r) => statuses === null || statuses.includes(r.status))
      .filter((r) =>
        tab === "booked"
          ? Number(r.booked) === 1
          : tab === "transit"
            ? Number(r.booked) === 0
            : true,
      )
      .reduce((n, r) => n + r.n, 0);
  }
  return out;
}

/** How many orders a filter set matches (the filter sheet's "৩২টি অর্ডার দেখুন"). */
export async function countOrders(q: OrderListQuery): Promise<number> {
  const [r] = await db
    .select({ n: count() })
    .from(schema.orders)
    .where(and(filterWhere(q), tabWhere(q.status, q.multi)));
  return r?.n ?? 0;
}

/** One page of orders, newest first. `limit` overrides the page size (phone "আরও দেখুন"). */
export async function listOrders(
  q: OrderListQuery,
  opts: { offset: number; limit: number },
): Promise<OrderRow[]> {
  const { orders, orderItems } = schema;
  const rows = await db
    .select({
      id: orders.id,
      number: orders.orderNumber,
      createdAt: orders.createdAt,
      name: orders.customerName,
      phone: orders.customerPhone,
      shipArea: orders.shipArea,
      shipUpazila: orders.shipUpazila,
      shipDistrict: orders.shipDistrict,
      deliveryZone: orders.deliveryZone,
      shippingAddress: orders.shippingAddress,
      status: orders.status,
      consignmentId: orders.consignmentId,
      settledAt: orders.settledAt,
      courier: orders.courierName,
      tracking: orders.trackingRef,
      total: orders.total,
      // Correlated subquery with explicit table names: in a single-table select Drizzle renders
      // columns unqualified, and a bare `id` here would mean order_items.id.
      items: sql<number>`(select coalesce(sum(${sql.identifier("oi")}.${sql.identifier("quantity")}), 0) from ${orderItems} ${sql.identifier("oi")} where ${sql.identifier("oi")}.${sql.identifier("order_id")} = ${orders}.${sql.identifier("id")})`,
    })
    .from(orders)
    .where(and(filterWhere(q), tabWhere(q.status, q.multi)))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(opts.limit)
    .offset(opts.offset);
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    createdAt: r.createdAt,
    name: r.name,
    phone: r.phone,
    area: areaOf(r),
    zone: r.deliveryZone,
    status: r.status,
    booked: r.consignmentId !== null,
    settled: r.settledAt !== null,
    courier: r.courier,
    tracking: r.tracking,
    total: r.total,
    items: Number(r.items),
  }));
}

export interface OrderPreview {
  id: number;
  number: string;
  createdAt: Date;
  status: DbStatus;
  booked: boolean;
  settled: boolean;
  courier: {
    consignmentId: string | null;
    trackingCode: string | null;
    status: string | null;
    bookedAt: Date | null;
    syncedAt: Date | null;
  };
  settledAt: Date | null;
  payoutRef: string | null;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  note: string | null;
  items: { id: number; name: string; size: string; unit: number; qty: number }[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shippingFee: number;
  total: number;
  payment: {
    method: (typeof schema.payments.$inferSelect)["method"];
    status: (typeof schema.payments.$inferSelect)["status"];
    amount: number;
  } | null;
}

/** The 1194 split view's right side (Orders-Tablet1194). */
export async function getOrderPreview(id: number): Promise<OrderPreview | null> {
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, id),
    with: { items: true, payments: true },
  });
  if (!order) return null;
  const coupon = order.couponId
    ? await db.query.coupons.findFirst({
        where: eq(schema.coupons.id, order.couponId),
        columns: { code: true },
      })
    : undefined;
  const pay = order.payments[0];
  return {
    id: order.id,
    number: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    booked: order.consignmentId !== null,
    settled: order.settledAt !== null,
    courier: {
      consignmentId: order.consignmentId,
      trackingCode: order.trackingRef,
      status: order.courierStatus,
      bookedAt: order.courierBookedAt,
      syncedAt: order.courierSyncedAt,
    },
    settledAt: order.settledAt,
    payoutRef: order.payoutRef,
    name: order.customerName,
    phone: order.customerPhone,
    email: order.customerEmail,
    address: order.shippingAddress,
    note: order.note,
    items: order.items.map((i) => ({
      id: i.id,
      name: i.productName,
      size: i.variantLabel,
      unit: i.unitPrice,
      qty: i.quantity,
    })),
    subtotal: order.subtotal,
    discount: order.discount,
    couponCode: coupon?.code ?? null,
    shippingFee: order.shippingFee,
    total: order.total,
    payment: pay ? { method: pay.method, status: pay.status, amount: pay.amount } : null,
  };
}
