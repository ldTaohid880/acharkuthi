"use server";

import { and, db, eq, inArray, isNull, schema } from "@repo/db";
import { restockNotifiedInput, restockNotifyAllInput } from "@repo/validators";
import { revalidatePath } from "next/cache";
import { env } from "@/env";
import { mailEnabled, sendMail } from "@/lib/mailer";
import { requireRole } from "@/lib/require-admin";

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );

/** "জানানো হয়েছে": the owner told one customer themself (phone numbers, or anyone). */
export async function markRestockNotified(input: unknown): Promise<void> {
  await requireRole("owner");
  const { id } = restockNotifiedInput.parse(input);
  await db
    .update(schema.restockRequests)
    .set({ notifiedAt: new Date() })
    .where(and(eq(schema.restockRequests.id, id), isNull(schema.restockRequests.notifiedAt)));
  revalidatePath("/", "layout");
}

export type NotifyAllResult =
  | { ok: true; emailed: number; failed: number; phones: number }
  | { ok: false; reason: "out" | "mail" };

/**
 * "সবাইকে এখন জানান": a short, friendly "it's back" email to each open email request for a size
 * that is in stock (owner decision: a gentle reminder, no details). One email per person, so no
 * address is shown to anyone else. Phone numbers stay open: the owner calls and marks them.
 */
export async function notifyRestockAll(input: unknown): Promise<NotifyAllResult> {
  await requireRole("owner");
  const { variantId } = restockNotifyAllInput.parse(input);
  if (!mailEnabled()) return { ok: false, reason: "mail" };
  const { restockRequests: r, productVariants: v, products: p } = schema;
  const [size] = await db
    .select({ stock: v.stock, label: v.label, name: p.name, nameBn: p.nameBn, slug: p.slug })
    .from(v)
    .innerJoin(p, eq(p.id, v.productId))
    .where(eq(v.id, variantId));
  if (!size || size.stock <= 0) return { ok: false, reason: "out" };

  const open = await db
    .select({ id: r.id, contact: r.contact, kind: r.contactKind })
    .from(r)
    .where(and(eq(r.variantId, variantId), isNull(r.notifiedAt)));
  const name = size.nameBn ?? size.name;
  const link = new URL(`/pickles/${size.slug}`, env.STOREFRONT_URL).toString();
  const subject = `${name} আবার স্টকে এসেছে`;
  const text = `আপনি জানতে চেয়েছিলেন, তাই জানাচ্ছি: ${name} (${size.label}) আবার পাওয়া যাচ্ছে।\n\n${link}\n\nআচারকুঠি`;
  const html = `<p>আপনি জানতে চেয়েছিলেন, তাই জানাচ্ছি: <b>${escape(name)}</b> (${escape(size.label)}) আবার পাওয়া যাচ্ছে।</p><p><a href="${escape(link)}">এখনই দেখুন</a></p><p>আচারকুঠি</p>`;

  const sent: number[] = [];
  let failed = 0;
  for (const req of open.filter((o) => o.kind === "email")) {
    try {
      await sendMail({ to: req.contact, subject, text, html });
      sent.push(req.id);
    } catch (e) {
      console.error("restock email failed", e);
      failed++;
    }
  }
  if (sent.length) await db.update(r).set({ notifiedAt: new Date() }).where(inArray(r.id, sent));
  revalidatePath("/", "layout");
  return {
    ok: true,
    emailed: sent.length,
    failed,
    phones: open.filter((o) => o.kind === "phone").length,
  };
}
