import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import type { CouponPerson } from "@repo/db";
import { env } from "@/env";

/** Long-lived device cookie for the coupon per-person limit (owner decision, 2026-11-15). */
const DEVICE_COOKIE = "ak_did";
const TWO_YEARS = 60 * 60 * 24 * 730;

const keyed = (v: string) => createHmac("sha256", env.BETTER_AUTH_SECRET).update(v).digest("hex");

/** "01XXXXXXXXX" from +8801… / 8801… / 01…; undefined if it isn't a BD mobile number. */
export function coupon11(phone: string | undefined): string | undefined {
  const d = (phone ?? "").replace(/\D/g, "").replace(/^88/, "");
  return /^01[3-9]\d{8}$/.test(d) ? d : undefined;
}

/**
 * Who is checking out: device cookie (set here when missing; server actions may set cookies),
 * keyed hash of the client IP, the browser fingerprint sent by checkout, the account and phone.
 * The raw IP is never stored.
 */
export async function couponPerson(opts: {
  userId: string | null;
  phone?: string | undefined;
  fingerprint?: string | undefined;
}): Promise<
  CouponPerson & { tries: string; liveChecks: string; ip: string | null; userAgent: string | null }
> {
  const jar = await cookies();
  let deviceId = jar.get(DEVICE_COOKIE)?.value;
  if (!deviceId || !/^[0-9a-f-]{36}$/.test(deviceId)) {
    deviceId = randomUUID();
    jar.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: TWO_YEARS,
      path: "/",
    });
  }
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  const ipHash = keyed(`ip:${ip}`);
  return {
    phone: coupon11(opts.phone),
    userId: opts.userId,
    deviceId,
    fingerprint: opts.fingerprint ?? null,
    ipHash,
    // Wrong-code guessing is counted per device + network.
    tries: keyed(`tries:${ip}:${deviceId}`),
    // Live checks while typing are counted separately (COUPON_LIVE_CHECKS).
    liveChecks: keyed(`live:${ip}:${deviceId}`),
    // Kept with each coupon use for the owner's records (owner decision, 2026-11-15).
    ip: ip === "unknown" ? null : ip,
    userAgent: h.get("user-agent"),
  };
}
