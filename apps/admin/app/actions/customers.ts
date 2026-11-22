"use server";

import { and, db, eq, schema } from "@repo/db";
import { customerBanInput, customerNoteInput, customerUnbanInput } from "@repo/validators";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-admin";

const customer = (userId: string) => and(eq(schema.user.id, userId), eq(schema.user.role, "user"));

function refresh(userId: string) {
  revalidatePath("/customers");
  revalidatePath(`/customers/${userId}`);
}

/** Switch off: the customer can sign in and order again. */
export async function unbanCustomer(input: unknown): Promise<void> {
  await requireRole("owner");
  const { userId } = customerUnbanInput.parse(input);
  await db
    .update(schema.user)
    .set({ banned: false, banReason: null, banExpires: null })
    .where(customer(userId));
  refresh(userId);
}

export type BanResult = { ok: true } | { ok: false; reason: "past" };

/**
 * "সংরক্ষণ" on the ban card (owner decision, 2026-11-14: a save button at every width). Bans until
 * the end of the chosen day in Bangladesh time, or for good when no day is given, and signs the
 * customer out everywhere so the ban takes effect at once.
 */
export async function banCustomer(input: unknown): Promise<BanResult> {
  await requireRole("owner");
  const { userId, reason, until } = customerBanInput.parse(input);
  const expires = until ? new Date(`${until}T23:59:59+06:00`) : null;
  if (expires && expires.getTime() <= Date.now()) return { ok: false, reason: "past" };
  const [target] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(customer(userId));
  if (!target) throw new Error("Not a customer");
  await db.transaction(async (tx) => {
    await tx
      .update(schema.user)
      .set({ banned: true, banReason: reason || null, banExpires: expires })
      .where(customer(userId));
    await tx.delete(schema.session).where(eq(schema.session.userId, userId));
  });
  refresh(userId);
  return { ok: true };
}

/** "নোট যোগ করুন": an internal note, shown with the author's name and time. */
export async function addCustomerNote(input: unknown): Promise<void> {
  const { session } = await requireRole("owner");
  const { userId, body } = customerNoteInput.parse(input);
  await db.insert(schema.customerNotes).values({
    customerId: userId,
    authorId: session.user.id,
    body,
  });
  refresh(userId);
}
