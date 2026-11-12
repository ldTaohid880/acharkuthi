"use server";

import { db, eq, schema } from "@repo/db";
import { adminLangInput } from "@repo/validators";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";

/** Saves the signed-in user's admin language. The whole admin re-renders in it. */
export async function setAdminLang(input: unknown) {
  const { session } = await requireAdmin();
  const { lang } = adminLangInput.parse(input);
  await db.update(schema.user).set({ adminLang: lang }).where(eq(schema.user.id, session.user.id));
  revalidatePath("/", "layout");
}
