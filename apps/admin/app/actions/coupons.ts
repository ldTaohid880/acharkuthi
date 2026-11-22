"use server";

import { and, db, eq, ne, schema } from "@repo/db";
import { couponIdInput, couponSaveInput } from "@repo/validators";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-admin";

const { coupons: c } = schema;

/** Bangladesh day boundaries (UTC+6, no DST). */
const dayStart = (iso: string) => new Date(`${iso}T00:00:00+06:00`);
const dayEnd = (iso: string) => new Date(`${iso}T23:59:59+06:00`);

export type CouponSaveResult = { ok: true; id: number } | { ok: false; reason: "code" | "missing" };

/** "সংরক্ষণ করুন": new or edited coupon. The used count is never set here (checkout counts it). */
export async function saveCoupon(input: unknown): Promise<CouponSaveResult> {
  await requireRole("owner");
  const v = couponSaveInput.parse(input);
  const [taken] = await db
    .select({ id: c.id })
    .from(c)
    .where(v.id ? and(eq(c.code, v.code), ne(c.id, v.id)) : eq(c.code, v.code));
  if (taken) return { ok: false, reason: "code" };
  const values = {
    code: v.code,
    type: v.type,
    value: v.value,
    minOrderAmount: v.minOrder,
    maxUses: v.maxUses ?? null,
    perPersonLimit: v.perPersonLimit ?? null,
    maxDiscount: v.type === "percent" ? (v.maxDiscount ?? null) : null,
    firstOrderOnly: v.firstOrderOnly,
    startsAt: v.startsOn ? dayStart(v.startsOn) : null,
    endsAt: v.endsOn ? dayEnd(v.endsOn) : null,
    isActive: v.isActive,
  };
  let id = v.id;
  if (id) {
    const [res] = await db.update(c).set(values).where(eq(c.id, id));
    if (res.affectedRows === 0) return { ok: false, reason: "missing" };
  } else {
    const [row] = await db.insert(c).values(values).$returningId();
    id = row?.id;
    if (!id) return { ok: false, reason: "missing" };
  }
  revalidatePath("/coupons");
  return { ok: true, id };
}

export type CouponDeleteResult = { ok: true } | { ok: false; reason: "used" };

/** "কুপন মুছুন": only a coupon no order has used (owner decision, 2026-11-14). */
export async function deleteCoupon(input: unknown): Promise<CouponDeleteResult> {
  await requireRole("owner");
  const { id } = couponIdInput.parse(input);
  const [res] = await db.delete(c).where(and(eq(c.id, id), eq(c.usedCount, 0)));
  if (res.affectedRows === 0) return { ok: false, reason: "used" };
  revalidatePath("/coupons");
  return { ok: true };
}
