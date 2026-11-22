import { and, count, eq, gte, ne, or, sql, type SQL } from "drizzle-orm";
import type { db as Db } from "./index";
import { couponAttempts, couponRedemptions, orders } from "./schema";

/** `db` or a transaction: both can run these queries. */
type Exec = Pick<typeof Db, "select" | "insert">;

/**
 * Who is using a coupon. Each field is matched on its own: the same phone, the same account or the
 * same device cookie counts as the same person; the fingerprint counts only together with the same
 * network (owner decision, 2026-11-15: a fingerprint alone could match strangers with the same
 * phone model).
 */
export interface CouponPerson {
  phone?: string | undefined;
  userId?: string | null | undefined;
  deviceId?: string | null | undefined;
  fingerprint?: string | null | undefined;
  ipHash?: string | null | undefined;
}

function samePerson(p: CouponPerson): SQL | undefined {
  const r = couponRedemptions;
  const parts = [
    p.phone ? eq(r.phone, p.phone) : undefined,
    p.userId ? eq(r.userId, p.userId) : undefined,
    p.deviceId ? eq(r.deviceId, p.deviceId) : undefined,
    p.fingerprint && p.ipHash
      ? and(eq(r.fingerprint, p.fingerprint), eq(r.ipHash, p.ipHash))
      : undefined,
  ].filter((x): x is SQL => x !== undefined);
  return parts.length ? or(...parts) : undefined;
}

/** How many times this person has used this coupon. */
export async function couponUsesBy(exec: Exec, couponId: number, p: CouponPerson): Promise<number> {
  const who = samePerson(p);
  if (!who) return 0;
  const [row] = await exec
    .select({ n: count() })
    .from(couponRedemptions)
    .where(and(eq(couponRedemptions.couponId, couponId), who));
  return row?.n ?? 0;
}

/**
 * An order's phone as 01XXXXXXXXX, whatever was typed (+8801…, 8801…, spaces, dashes): digits
 * only, last 11. Orders keep the phone as written, so the match normalises it here.
 */
const orderPhone11 = sql`right(regexp_replace(${orders.customerPhone}, '[^0-9]', ''), 11)`;

/**
 * "শুধু প্রথম অর্ডারে": has this phone or account placed an order before (cancelled ones excepted)?
 * `p.phone` must already be 01XXXXXXXXX (coupon11 / phone11).
 */
export async function hasEarlierOrder(exec: Exec, p: CouponPerson): Promise<boolean> {
  const who = or(
    p.phone ? sql`${orderPhone11} = ${p.phone}` : undefined,
    p.userId ? eq(orders.userId, p.userId) : undefined,
  );
  if (!p.phone && !p.userId) return false;
  const [row] = await exec
    .select({ n: count() })
    .from(orders)
    .where(and(who, ne(orders.status, "cancelled")));
  return (row?.n ?? 0) > 0;
}

export async function recordRedemption(
  exec: Exec,
  v: CouponPerson & {
    couponId: number;
    orderId: number;
    phone: string;
    source: "web" | "admin";
    /** Kept as written for the owner's records (not used for matching). */
    ip?: string | null | undefined;
    userAgent?: string | null | undefined;
  },
): Promise<void> {
  await exec.insert(couponRedemptions).values({
    couponId: v.couponId,
    orderId: v.orderId,
    phone: v.phone,
    userId: v.userId ?? null,
    deviceId: v.deviceId ?? null,
    fingerprint: v.fingerprint ?? null,
    ipHash: v.ipHash ?? null,
    ip: v.ip ? v.ip.slice(0, 45) : null,
    userAgent: v.userAgent ? v.userAgent.slice(0, 400) : null,
    source: v.source,
  });
}

export interface TryLimit {
  max: number;
  minutes: number;
}

/**
 * Wrong codes allowed per device + network before checkout stops checking for a while. Only a
 * code the customer applies ("প্রয়োগ") or orders with counts; the live check while typing has its
 * own allowance below, so typing a code slowly no longer locks a customer out.
 */
export const COUPON_TRIES = { max: 15, minutes: 15 } as const satisfies TryLimit;

/**
 * Live checks while typing (every lookup counts, right or wrong) per device + network. Generous
 * for a person typing a few codes, but it still caps guessing through the live check.
 */
export const COUPON_LIVE_CHECKS = { max: 60, minutes: 15 } as const satisfies TryLimit;

/** True when `who` (a keyed hash) has used up `limit` lately (wrong codes, or live checks). */
export async function tooManyCouponTries(
  exec: Exec,
  who: string,
  limit: TryLimit = COUPON_TRIES,
): Promise<boolean> {
  const since = new Date(Date.now() - limit.minutes * 60_000);
  const [row] = await exec
    .select({ n: count() })
    .from(couponAttempts)
    .where(and(eq(couponAttempts.who, who), gte(couponAttempts.createdAt, since)));
  return (row?.n ?? 0) >= limit.max;
}

/** Records one wrong code (key `tries`) or one live check (key `liveChecks`) for `who`. */
export async function recordWrongCoupon(exec: Exec, who: string): Promise<void> {
  await exec.insert(couponAttempts).values({ who });
}
