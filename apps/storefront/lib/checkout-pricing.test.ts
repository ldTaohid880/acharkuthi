import { describe, expect, it } from "vitest";
import { checkCoupon, totalsFor, zoneForDistrict, type CouponRow } from "./checkout-pricing";

const base: CouponRow = {
  code: "TEN",
  type: "percent",
  value: 10,
  minOrderAmount: 0,
  maxUses: null,
  usedCount: 0,
  startsAt: null,
  endsAt: null,
  isActive: true,
};

describe("checkCoupon", () => {
  it("takes a rounded percentage in paisa", () => {
    expect(checkCoupon(base, 68000)).toEqual({ ok: true, discount: 6800 });
  });
  it("caps a fixed discount at the subtotal", () => {
    expect(checkCoupon({ ...base, type: "fixed", value: 99999 }, 5000)).toEqual({
      ok: true,
      discount: 5000,
    });
  });
  it("reports expired and used-up codes as expired", () => {
    expect(checkCoupon({ ...base, endsAt: new Date(0) }, 1000)).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(checkCoupon({ ...base, maxUses: 1, usedCount: 1 }, 1000)).toEqual({
      ok: false,
      reason: "expired",
    });
  });
  it("rejects unknown, inactive and below-minimum codes", () => {
    expect(checkCoupon(undefined, 1000).ok).toBe(false);
    expect(checkCoupon({ ...base, isActive: false }, 1000).ok).toBe(false);
    expect(checkCoupon({ ...base, minOrderAmount: 5000 }, 1000).ok).toBe(false);
  });
});

describe("totalsFor", () => {
  const lines = [
    { unitPrice: 25000, quantity: 2, available: true },
    { unitPrice: 18000, quantity: 1, available: false },
  ];
  it("skips unavailable lines and adds the zone fee", () => {
    expect(totalsFor(lines, 5000, "in")).toEqual({
      subtotal: 50000,
      discount: 5000,
      shippingFee: 6000,
      total: 51000,
    });
  });
  it("leaves the fee out until the district is known", () => {
    expect(totalsFor(lines, 0, null)).toEqual({
      subtotal: 50000,
      discount: 0,
      shippingFee: null,
      total: 50000,
    });
  });
  it("maps Dhaka district to inside", () => {
    expect(zoneForDistrict("ঢাকা")).toBe("in");
    expect(zoneForDistrict("গাজীপুর")).toBe("out");
    expect(zoneForDistrict(undefined)).toBeNull();
  });
});
