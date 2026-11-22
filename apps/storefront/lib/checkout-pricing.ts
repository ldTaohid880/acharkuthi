/** Moved to @repo/validators so the admin's manual orders price the same way. */
export {
  checkCoupon,
  DELIVERY_FEES,
  totalsFor,
  zoneForDistrict,
  type CouponCheck,
  type CouponRow,
  type PricedLine,
  type Totals,
} from "@repo/validators";

/**
 * True when an item is unavailable now but the customer wasn't shown it as unavailable: it sold
 * out or was switched off after their last quote, so placing the order would drop it silently.
 */
export function newlyUnavailable(
  lines: { variantId: number; available: boolean }[],
  seenGone: readonly number[],
): boolean {
  return lines.some((l) => !l.available && !seenGone.includes(l.variantId));
}
