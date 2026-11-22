import "server-only";

import { db, desc, eq, schema } from "@repo/db";

export interface CouponRow {
  id: number;
  code: string;
  type: "percent" | "fixed";
  /** Percent (1–100) or paisa. */
  value: number;
  minOrder: number;
  maxUses: number | null;
  used: number;
  /** "YYYY-MM-DD" in Bangladesh time, or null. */
  startsOn: string | null;
  endsOn: string | null;
  isActive: boolean;
  perPersonLimit: number | null;
  maxDiscount: number | null;
  firstOrderOnly: boolean;
  /** চালু · মেয়াদ শেষ (ended or used up) · বন্ধ (switched off). */
  state: "on" | "ended" | "off";
}

const dhakaDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(d);

function toRow(c: typeof schema.coupons.$inferSelect, now = new Date()): CouponRow {
  const ended =
    (c.endsAt !== null && c.endsAt < now) || (c.maxUses !== null && c.usedCount >= c.maxUses);
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    minOrder: c.minOrderAmount,
    maxUses: c.maxUses,
    used: c.usedCount,
    startsOn: c.startsAt ? dhakaDay(c.startsAt) : null,
    endsOn: c.endsAt ? dhakaDay(c.endsAt) : null,
    isActive: c.isActive,
    perPersonLimit: c.perPersonLimit,
    maxDiscount: c.maxDiscount,
    firstOrderOnly: c.firstOrderOnly,
    state: !c.isActive ? "off" : ended ? "ended" : "on",
  };
}

/** Newest first. */
export async function listCoupons(): Promise<CouponRow[]> {
  const rows = await db.select().from(schema.coupons).orderBy(desc(schema.coupons.createdAt));
  return rows.map((c) => toRow(c));
}

export async function getCoupon(id: number): Promise<CouponRow | null> {
  const [c] = await db.select().from(schema.coupons).where(eq(schema.coupons.id, id));
  return c ? toRow(c) : null;
}

export interface CouponUse {
  id: number;
  at: Date;
  phone: string;
  /** Name on the order. */
  name: string | null;
  /** Signed-in account at checkout. */
  account: string | null;
  orderId: number | null;
  orderNumber: string | null;
  source: string;
  ip: string | null;
  userAgent: string | null;
  deviceId: string | null;
  fingerprint: string | null;
  /** Another use of this coupon shares this device fingerprint (shown as a warning). */
  sameDevice: boolean;
}

/**
 * "কে ব্যবহার করেছেন": the newest 100 uses of a coupon with everything recorded about them
 * (owner decision, 2026-11-15: keep phone, IP, device and fingerprint for the records).
 */
export async function couponUses(couponId: number): Promise<CouponUse[]> {
  const { couponRedemptions: r, orders: o, user: u } = schema;
  const rows = await db
    .select({
      id: r.id,
      at: r.createdAt,
      phone: r.phone,
      name: o.customerName,
      accountName: u.name,
      accountEmail: u.email,
      orderId: r.orderId,
      orderNumber: o.orderNumber,
      source: r.source,
      ip: r.ip,
      userAgent: r.userAgent,
      deviceId: r.deviceId,
      fingerprint: r.fingerprint,
    })
    .from(r)
    .leftJoin(o, eq(o.id, r.orderId))
    .leftJoin(u, eq(u.id, r.userId))
    .where(eq(r.couponId, couponId))
    .orderBy(desc(r.createdAt))
    .limit(100);
  const seen = new Map<string, number>();
  for (const x of rows)
    if (x.fingerprint) seen.set(x.fingerprint, (seen.get(x.fingerprint) ?? 0) + 1);
  return rows.map(({ accountName, accountEmail, ...x }) => ({
    ...x,
    account: accountEmail ? `${accountName ?? ""} · ${accountEmail}`.replace(/^ · /, "") : null,
    sameDevice: x.fingerprint ? (seen.get(x.fingerprint) ?? 0) > 1 : false,
  }));
}
