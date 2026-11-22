"use server";

import { auth } from "@repo/auth";
import { and, db, eq, ne, schema } from "@repo/db";
import {
  adminEmailChangeInput,
  adminPasswordInput,
  adminSessionIdInput,
  profileInput,
} from "@repo/validators";
import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  deleteProductImage,
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  putProductImage,
  uploadsEnabled,
} from "@/lib/r2";
import { requireAdmin, requireRole } from "@/lib/require-admin";

/** "আমার অ্যাকাউন্ট" (Account-*.dc.html): every action acts on the signed-in user only. */

export type FieldResult<F extends string> = { ok: true } | { ok: false; field: F | null };

const done = () => {
  // Name and photo show in the top bar and user menu, so the whole layout re-renders.
  revalidatePath("/", "layout");
  return { ok: true } as const;
};

const codeOf = (e: unknown) => (e instanceof APIError ? e.body?.code : undefined);

/** Profile "সংরক্ষণ": name and phone. */
export async function saveProfile(input: unknown): Promise<FieldResult<"name" | "phone">> {
  const { session } = await requireAdmin();
  const parsed = profileInput.safeParse(input);
  if (!parsed.success) {
    const f = parsed.error.issues[0]?.path[0];
    return { ok: false, field: f === "name" || f === "phone" ? f : null };
  }
  await db
    .update(schema.user)
    .set({ name: parsed.data.name, phone: parsed.data.phone || null })
    .where(eq(schema.user.id, session.user.id));
  return done();
}

/**
 * "পাসওয়ার্ড বদলান". Admins who only use Google have no password yet: then there is no current
 * password and this sets their first one (owner decision 2026-11-22).
 */
export async function changePassword(
  input: unknown,
): Promise<FieldResult<"current" | "next" | "confirm">> {
  const { session } = await requireAdmin();
  const parsed = adminPasswordInput.safeParse(input);
  if (!parsed.success) {
    const f = parsed.error.issues[0]?.path[0];
    return { ok: false, field: f === "current" || f === "next" || f === "confirm" ? f : null };
  }
  const { current, next } = parsed.data;
  const credential = await db.query.account.findFirst({
    where: and(
      eq(schema.account.userId, session.user.id),
      eq(schema.account.providerId, "credential"),
    ),
  });
  const h = await headers();
  try {
    if (credential?.password) {
      if (!current) return { ok: false, field: "current" };
      await auth.api.changePassword({
        body: { currentPassword: current, newPassword: next },
        headers: h,
      });
    } else {
      await auth.api.setPassword({ body: { newPassword: next }, headers: h });
    }
  } catch (e) {
    if (codeOf(e) === "INVALID_PASSWORD") return { ok: false, field: "current" };
    if (codeOf(e) === "PASSWORD_TOO_SHORT" || codeOf(e) === "PASSWORD_TOO_LONG")
      return { ok: false, field: "next" };
    throw e;
  }
  return done();
}

/** Email "বদলান" (owner only): Better Auth emails a link to the new address. */
export async function requestEmailChange(input: unknown): Promise<FieldResult<"email">> {
  const { session } = await requireRole("owner");
  const parsed = adminEmailChangeInput.safeParse(input);
  if (!parsed.success) return { ok: false, field: "email" };
  if (parsed.data.email === session.user.email.toLowerCase()) return { ok: false, field: "email" };
  await auth.api.changeEmail({
    body: { newEmail: parsed.data.email, callbackURL: "/account?email=changed" },
    headers: await headers(),
  });
  return { ok: true };
}

/** "বের করুন": signs one other device out. This device uses "সাইন আউট" instead. */
export async function signOutDevice(input: unknown): Promise<void> {
  const { session } = await requireAdmin();
  const { id } = adminSessionIdInput.parse(input);
  await db
    .delete(schema.session)
    .where(
      and(
        eq(schema.session.id, id),
        eq(schema.session.userId, session.user.id),
        ne(schema.session.id, session.session.id),
      ),
    );
  revalidatePath("/account");
}

/** "অন্য সব থেকে বের হোন": every device except this one. */
export async function signOutOtherDevices(): Promise<void> {
  const { session } = await requireAdmin();
  await db
    .delete(schema.session)
    .where(
      and(eq(schema.session.userId, session.user.id), ne(schema.session.id, session.session.id)),
    );
  revalidatePath("/account");
}

/** Google "বিচ্ছিন্ন করুন". Refused when Google is the only way in (no password yet). */
export async function unlinkGoogle(): Promise<{ ok: true } | { ok: false; reason: "last" }> {
  const { session } = await requireAdmin();
  const google = await db.query.account.findFirst({
    where: and(eq(schema.account.userId, session.user.id), eq(schema.account.providerId, "google")),
  });
  if (!google) return { ok: true };
  try {
    // Better Auth 1.7 unlinks by the account row's id.
    await auth.api.unlinkAccount({ body: { accountId: google.id }, headers: await headers() });
  } catch (e) {
    if (codeOf(e) === "FAILED_TO_UNLINK_LAST_ACCOUNT") return { ok: false, reason: "last" };
    throw e;
  }
  revalidatePath("/account");
  return { ok: true };
}

export type AvatarResult =
  { ok: true } | { ok: false; reason: "disabled" | "type" | "size" | "failed" };

/** "ছবি বদলান": one JPG / PNG / WebP up to 5 MB, stored in R2 (like product photos). */
export async function uploadAvatar(form: FormData): Promise<AvatarResult> {
  const { session } = await requireAdmin();
  if (!uploadsEnabled()) return { ok: false, reason: "disabled" };
  const file = form.get("file");
  if (!(file instanceof File) || !(file.type in IMAGE_TYPES)) return { ok: false, reason: "type" };
  if (file.size > IMAGE_MAX_BYTES) return { ok: false, reason: "size" };
  let url: string;
  try {
    url = await putProductImage(
      "avatar",
      await file.arrayBuffer(),
      file.type as keyof typeof IMAGE_TYPES,
      "avatars",
    );
  } catch (e) {
    console.error(e);
    return { ok: false, reason: "failed" };
  }
  await replaceImage(session.user.id, session.user.image ?? null, url);
  return done();
}

/** "সরান": back to initials. */
export async function removeAvatar(): Promise<void> {
  const { session } = await requireAdmin();
  await replaceImage(session.user.id, session.user.image ?? null, null);
  done();
}

async function replaceImage(userId: string, old: string | null, next: string | null) {
  await db.update(schema.user).set({ image: next }).where(eq(schema.user.id, userId));
  // Only our own R2 photos are deleted (a Google profile picture is left alone).
  if (old) await deleteProductImage(old).catch((e: unknown) => console.error(e));
}
