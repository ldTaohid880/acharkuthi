"use server";

import { and, db, eq, schema } from "@repo/db";
import { reviewKeyInput, reviewReplyInput } from "@repo/validators";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-admin";

const parseKey = (key: string) => ({ site: key.startsWith("s"), id: Number(key.slice(1)) });

async function setApproved(input: unknown, approved: boolean) {
  await requireRole("owner");
  const { site, id } = parseKey(reviewKeyInput.parse(input).key);
  if (site)
    await db
      .update(schema.siteReviews)
      .set({ isApproved: approved })
      .where(eq(schema.siteReviews.id, id));
  else
    await db.update(schema.reviews).set({ isApproved: approved }).where(eq(schema.reviews.id, id));
  revalidatePath("/", "layout");
}

/** "অনুমোদন": the review shows on the shop (product page or home). */
export async function approveReview(input: unknown): Promise<void> {
  await setApproved(input, true);
}

/** "লুকান" on an approved review: off the shop, back to "অনুমোদন বাকি". */
export async function hideReview(input: unknown): Promise<void> {
  await setApproved(input, false);
}

/**
 * "লুকান" on a pending review: deletes it for good, after a confirm (owner decision, 2026-11-14:
 * for spam and abuse). Approved reviews can't be deleted here; hide them first.
 */
export async function deleteReview(input: unknown): Promise<void> {
  await requireRole("owner");
  const { site, id } = parseKey(reviewKeyInput.parse(input).key);
  if (site)
    await db
      .delete(schema.siteReviews)
      .where(and(eq(schema.siteReviews.id, id), eq(schema.siteReviews.isApproved, false)));
  else
    await db
      .delete(schema.reviews)
      .where(and(eq(schema.reviews.id, id), eq(schema.reviews.isApproved, false)));
  revalidatePath("/", "layout");
}

/** "উত্তর সংরক্ষণ": the shop's public reply; empty text removes it. */
export async function saveReviewReply(input: unknown): Promise<void> {
  await requireRole("owner");
  const { key, reply } = reviewReplyInput.parse(input);
  const { site, id } = parseKey(key);
  const set = { reply: reply || null, replyAt: reply ? new Date() : null };
  if (site) await db.update(schema.siteReviews).set(set).where(eq(schema.siteReviews.id, id));
  else await db.update(schema.reviews).set(set).where(eq(schema.reviews.id, id));
  revalidatePath("/reviews");
}
