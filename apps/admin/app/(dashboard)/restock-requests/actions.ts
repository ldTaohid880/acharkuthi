"use server";

import { db, eq, schema } from "@repo/db";
import { restockNotifiedInput } from "@repo/validators";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-admin";

/** Marks one restock request as notified (the admin told the customer the size is back). */
export async function markRestockNotified(data: FormData) {
  await requireRole("owner");
  const parsed = restockNotifiedInput.safeParse({ id: Number(data.get("id")) });
  if (!parsed.success) return;
  await db
    .update(schema.restockRequests)
    .set({ notifiedAt: new Date() })
    .where(eq(schema.restockRequests.id, parsed.data.id));
  revalidatePath("/restock-requests");
}
