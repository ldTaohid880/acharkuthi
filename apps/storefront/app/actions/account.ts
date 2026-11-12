"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { APIError } from "better-auth/api";
import { auth } from "@repo/auth";
import { and, db, eq, ne, schema } from "@repo/db";
import {
  addressIdInput,
  addressInput,
  changePasswordInput,
  profileInput,
  reorderInput,
  type AddressField,
} from "@repo/validators";
import { isKnownLocation } from "@/lib/bd-locations";
import { reorderLines, requireUser } from "@/lib/account";

type Errors<K extends string> = Partial<Record<K, string>>;
export type ActionResult<K extends string = never> =
  { status: "ok" } | { status: "invalid"; errors: Errors<K> } | { status: "fail" };

function fieldErrors<K extends string>(
  issues: { path: PropertyKey[]; message: string }[],
): Errors<K> {
  const errors: Errors<K> = {};
  for (const i of issues) {
    const k = i.path[0] as K | undefined;
    if (k && !errors[k]) errors[k] = i.message;
  }
  return errors;
}

/** Add or edit a saved address. The first address is always the default. */
export async function saveAddress(raw: unknown): Promise<ActionResult<AddressField>> {
  const user = await requireUser();
  const parsed = addressInput.safeParse(raw);
  if (!parsed.success) return { status: "invalid", errors: fieldErrors(parsed.error.issues) };
  const a = parsed.data;
  if (!isKnownLocation(a.division, a.district, a.upazila)) {
    return { status: "invalid", errors: { upazila: "উপজেলা / থানা বেছে নিন" } };
  }
  try {
    await db.transaction(async (tx) => {
      const others = await tx.query.addresses.findMany({
        where: and(
          eq(schema.addresses.userId, user.id),
          a.id ? ne(schema.addresses.id, a.id) : undefined,
        ),
        columns: { id: true, isDefault: true },
      });
      const makeDefault = a.isDefault || !others.some((o) => o.isDefault);
      if (makeDefault) {
        await tx
          .update(schema.addresses)
          .set({ isDefault: false })
          .where(eq(schema.addresses.userId, user.id));
      }
      const values = {
        label: a.label,
        fullName: a.name,
        phone: a.phone,
        line1: a.line,
        division: a.division,
        district: a.district,
        city: a.upazila,
        isDefault: makeDefault,
      };
      if (a.id) {
        await tx
          .update(schema.addresses)
          .set(values)
          .where(and(eq(schema.addresses.id, a.id), eq(schema.addresses.userId, user.id)));
      } else {
        await tx.insert(schema.addresses).values({ ...values, userId: user.id });
      }
    });
  } catch (err) {
    console.error("save address failed", err);
    return { status: "fail" };
  }
  revalidatePath("/account", "layout");
  return { status: "ok" };
}

export async function deleteAddress(raw: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addressIdInput.safeParse(raw);
  if (!parsed.success) return { status: "fail" };
  try {
    await db.transaction(async (tx) => {
      const own = and(
        eq(schema.addresses.id, parsed.data.id),
        eq(schema.addresses.userId, user.id),
      );
      const row = await tx.query.addresses.findFirst({ where: own, columns: { isDefault: true } });
      if (!row) return;
      await tx.delete(schema.addresses).where(own);
      if (row.isDefault) {
        const next = await tx.query.addresses.findFirst({
          where: eq(schema.addresses.userId, user.id),
        });
        if (next)
          await tx
            .update(schema.addresses)
            .set({ isDefault: true })
            .where(eq(schema.addresses.id, next.id));
      }
    });
  } catch (err) {
    console.error("delete address failed", err);
    return { status: "fail" };
  }
  revalidatePath("/account", "layout");
  return { status: "ok" };
}

export async function setDefaultAddress(raw: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addressIdInput.safeParse(raw);
  if (!parsed.success) return { status: "fail" };
  try {
    await db.transaction(async (tx) => {
      const own = and(
        eq(schema.addresses.id, parsed.data.id),
        eq(schema.addresses.userId, user.id),
      );
      const row = await tx.query.addresses.findFirst({ where: own, columns: { id: true } });
      if (!row) return;
      await tx
        .update(schema.addresses)
        .set({ isDefault: false })
        .where(eq(schema.addresses.userId, user.id));
      await tx.update(schema.addresses).set({ isDefault: true }).where(own);
    });
  } catch (err) {
    console.error("set default address failed", err);
    return { status: "fail" };
  }
  revalidatePath("/account", "layout");
  return { status: "ok" };
}

export async function updateProfile(raw: unknown): Promise<ActionResult<"name" | "phone">> {
  const user = await requireUser();
  const parsed = profileInput.safeParse(raw);
  if (!parsed.success) return { status: "invalid", errors: fieldErrors(parsed.error.issues) };
  try {
    await db
      .update(schema.user)
      .set({ name: parsed.data.name, phone: parsed.data.phone || null })
      .where(eq(schema.user.id, user.id));
  } catch (err) {
    console.error("update profile failed", err);
    return { status: "fail" };
  }
  revalidatePath("/account", "layout");
  return { status: "ok" };
}

export async function changePassword(
  raw: unknown,
): Promise<ActionResult<"current" | "next" | "confirm">> {
  await requireUser();
  const parsed = changePasswordInput.safeParse(raw);
  if (!parsed.success) return { status: "invalid", errors: fieldErrors(parsed.error.issues) };
  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.current,
        newPassword: parsed.data.next,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (err) {
    if (err instanceof APIError && err.body?.code === "INVALID_PASSWORD") {
      // ErrorPatterns.dc.html §2, wrong password.
      return {
        status: "invalid",
        errors: {
          current: "পাসওয়ার্ডটি মেলেনি। আবার লিখুন, অথবা “পাসওয়ার্ড ভুলে গেছেন?” চাপুন।",
        },
      };
    }
    console.error("change password failed", err);
    return { status: "fail" };
  }
  return { status: "ok" };
}

export type ReorderResult =
  | {
      status: "ok";
      lines: {
        variantId: number;
        slug: string;
        productName: string;
        variantLabel: string;
        unitPrice: number;
        quantity: number;
        maxQty: number;
      }[];
    }
  | { status: "fail" };

/** Current DB prices for a delivered order's items. The basket and checkout re-price again anyway. */
export async function reorder(raw: unknown): Promise<ReorderResult> {
  const user = await requireUser();
  const parsed = reorderInput.safeParse(raw);
  if (!parsed.success) return { status: "fail" };
  try {
    const lines = await reorderLines(user.id, parsed.data.orderNumber);
    return lines ? { status: "ok", lines } : { status: "fail" };
  } catch (err) {
    console.error("reorder failed", err);
    return { status: "fail" };
  }
}
