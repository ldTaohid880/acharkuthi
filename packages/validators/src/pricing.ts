import type { DeliveryZone } from "./index";
import { DHAKA_DISTRICT } from "./bd-locations";

/** Pure pricing rules shared by storefront checkout and admin manual orders. Every amount is integer paisa. */

/**
 * Default delivery charges (৳60 inside Dhaka district, ৳120 outside). The live values are set in
 * admin Settings (shop_settings) and passed to totalsFor; these are only the fallback.
 */
export const DELIVERY_FEES: Record<DeliveryZone, number> = { in: 6000, out: 12000 };

export const zoneForDistrict = (district: string | undefined): DeliveryZone | null =>
  district ? (district === DHAKA_DISTRICT ? "in" : "out") : null;

export interface CouponRow {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  /** Percent coupons: the most they take off (paisa). */
  maxDiscount?: number | null;
}

/**
 * invalid · expired (ended or used up) · used (this person reached the per-person limit) ·
 * first (first order only) · tries (too many wrong codes, checkout waits a while) ·
 * min (the basket is below the coupon's minimum order; `need` says how much more to add).
 */
export type CouponProblem = "invalid" | "expired" | "used" | "first" | "tries" | "min";
export type CouponCheck =
  | { ok: true; discount: number }
  | { ok: false; reason: CouponProblem; /** Paisa still to add, for "min". */ need?: number };

/** Decides whether a coupon applies to this subtotal and how much it takes off (never more than the subtotal). */
export function checkCoupon(
  c: CouponRow | undefined,
  subtotal: number,
  now = new Date(),
): CouponCheck {
  if (!c || !c.isActive) return { ok: false, reason: "invalid" };
  if (c.endsAt && c.endsAt < now) return { ok: false, reason: "expired" };
  if (c.startsAt && c.startsAt > now) return { ok: false, reason: "invalid" };
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return { ok: false, reason: "expired" };
  if (subtotal < c.minOrderAmount)
    return { ok: false, reason: "min", need: c.minOrderAmount - subtotal };
  const pct = Math.round((subtotal * Math.min(c.value, 100)) / 100);
  const raw = c.type === "percent" ? Math.min(pct, c.maxDiscount ?? pct) : c.value;
  return { ok: true, discount: Math.min(raw, subtotal) };
}

export interface PricedLine {
  unitPrice: number;
  quantity: number;
  available: boolean;
}

export interface Totals {
  subtotal: number;
  discount: number;
  /** Null until the district is known. */
  shippingFee: number | null;
  total: number;
}

export function totalsFor(
  lines: PricedLine[],
  discount: number,
  zone: DeliveryZone | null,
  fees: Record<DeliveryZone, number> = DELIVERY_FEES,
): Totals {
  const subtotal = lines.reduce((s, l) => s + (l.available ? l.unitPrice * l.quantity : 0), 0);
  const d = Math.min(discount, subtotal);
  const shippingFee = zone ? fees[zone] : null;
  return { subtotal, discount: d, shippingFee, total: subtotal - d + (shippingFee ?? 0) };
}
