"use server";

import { db, eq, schema } from "@repo/db";
import { messageIdInput, messageReplyInput } from "@repo/validators";
import { revalidatePath } from "next/cache";
import { mailEnabled, sendMail } from "@/lib/mailer";
import { requireAdmin } from "@/lib/require-admin";

const { contactMessages: m } = schema;

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );

async function setMessage(input: unknown, set: Partial<typeof m.$inferInsert>) {
  await requireAdmin();
  const { id } = messageIdInput.parse(input);
  await db.update(m).set(set).where(eq(m.id, id));
  revalidatePath("/", "layout");
}

/** Opening a message marks it read (called once from the open message). */
export async function markMessageRead(input: unknown): Promise<void> {
  await requireAdmin();
  const { id } = messageIdInput.parse(input);
  const [x] = await db.select({ readAt: m.readAt }).from(m).where(eq(m.id, id));
  if (!x || x.readAt) return;
  await db.update(m).set({ readAt: new Date() }).where(eq(m.id, id));
  revalidatePath("/", "layout");
}

/** "না-পড়া করুন". */
export async function markMessageUnread(input: unknown): Promise<void> {
  await setMessage(input, { readAt: null });
}

/** "আর্কাইভ": off the inbox, kept under the Archive tab. */
export async function archiveMessage(input: unknown): Promise<void> {
  await setMessage(input, { archivedAt: new Date() });
}

/** Back from the Archive tab to the inbox. */
export async function unarchiveMessage(input: unknown): Promise<void> {
  await setMessage(input, { archivedAt: null });
}

export type ReplyResult = { ok: true } | { ok: false; reason: "mail" | "missing" };

/**
 * "উত্তর পাঠান" emails the customer from the shop's address (owner decision, 2026-11-11) and keeps
 * the reply in the thread; "ফোন নোট" only stores a staff note. Both mark the message read.
 */
export async function replyToMessage(input: unknown): Promise<ReplyResult> {
  const { session } = await requireAdmin();
  const { id, kind, body } = messageReplyInput.parse(input);
  const [msg] = await db.select().from(m).where(eq(m.id, id));
  if (!msg) return { ok: false, reason: "missing" };
  if (kind === "email") {
    if (!mailEnabled()) return { ok: false, reason: "mail" };
    const quoted = msg.message
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    await sendMail({
      to: msg.email,
      subject: "আচারকুঠি: আপনার বার্তার উত্তর",
      text: `${body}\n\nআচারকুঠি\n\n${quoted}`,
      html: `<p>${escape(body).replace(/\n/g, "<br>")}</p><p>আচারকুঠি</p><blockquote style="margin:16px 0 0;padding-left:12px;border-left:2px solid #ddd;color:#666">${escape(msg.message).replace(/\n/g, "<br>")}</blockquote>`,
    });
  }
  await db
    .insert(schema.messageReplies)
    .values({ messageId: id, kind, body, authorId: session.user.id });
  if (!msg.readAt) await db.update(m).set({ readAt: new Date() }).where(eq(m.id, id));
  revalidatePath("/", "layout");
  return { ok: true };
}
