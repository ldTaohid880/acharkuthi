"use server";

import { db, eq, schema } from "@repo/db";
import { productActiveInput } from "@repo/validators";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-admin";

/** Products list "লুকান" / "চালু করুন" (owner only): shows or hides the product in the shop. */
export async function setProductActive(input: unknown): Promise<void> {
  await requireRole("owner");
  const { id, active } = productActiveInput.parse(input);
  await db.update(schema.products).set({ isActive: active }).where(eq(schema.products.id, id));
  revalidatePath("/", "layout"); // product list, stock badges and the low-stock nav count
}
