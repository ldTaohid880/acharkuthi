"use server";

import { and, db, eq, schema } from "@repo/db";
import { restockRequestInput, type RestockRequestInput } from "@repo/validators";
import { getSessionUser } from "@/lib/account";

export type RestockResult =
  { status: "ok" } | { status: "invalid"; message: string } | { status: "fail" };

/** "স্টকে এলে জানান": saves a restock alert for one out-of-stock size. */
export async function requestRestockAlert(input: RestockRequestInput): Promise<RestockResult> {
  const parsed = restockRequestInput.safeParse(input);
  if (!parsed.success) {
    return { status: "invalid", message: parsed.error.issues[0]?.message ?? "" };
  }
  const { variantId, contact } = parsed.data;
  try {
    const variant = await db.query.productVariants.findFirst({
      where: and(
        eq(schema.productVariants.id, variantId),
        eq(schema.productVariants.isActive, true),
      ),
      columns: { id: true },
    });
    if (!variant) return { status: "fail" };
    const user = await getSessionUser().catch(() => null);
    // Asking twice for the same size is not an error: the alert is already saved.
    await db
      .insert(schema.restockRequests)
      .values({
        variantId,
        contact: contact.value,
        contactKind: contact.kind,
        userId: user?.id ?? null,
      })
      .onDuplicateKeyUpdate({ set: { notifiedAt: null } });
  } catch (err) {
    console.error("restock request failed", err);
    return { status: "fail" };
  }
  return { status: "ok" };
}
