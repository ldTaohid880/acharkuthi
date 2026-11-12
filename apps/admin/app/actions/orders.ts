"use server";

import { and, db, eq, inArray, schema, sql } from "@repo/db";
import {
  orderAdvanceInput,
  orderCancelInput,
  orderListQuery,
  orderUndoInput,
} from "@repo/validators";
import { revalidatePath } from "next/cache";
import { countOrders } from "@/lib/orders";
import { requireAdmin } from "@/lib/require-admin";

type DbStatus = (typeof schema.orders.$inferSelect)["status"];

const STEPS: Record<"confirm" | "pack", { from: DbStatus; to: DbStatus }> = {
  confirm: { from: "pending", to: "confirmed" },
  pack: { from: "confirmed", to: "processing" },
};

function refresh() {
  revalidatePath("/orders");
  revalidatePath("/", "layout"); // sidebar and dashboard counts (incl. low stock)
}

/**
 * কনফার্ম (New → Confirmed) or প্যাক (Confirmed → Packed), one order or several. Orders not in
 * the starting status are skipped. Returns the ids that moved (for the toast's undo).
 */
export async function advanceOrders(input: unknown): Promise<{ moved: number[] }> {
  await requireAdmin();
  const { ids, step } = orderAdvanceInput.parse(input);
  const { from, to } = STEPS[step];
  const { orders } = schema;
  const ready = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(inArray(orders.id, ids), eq(orders.status, from)));
  const moved = ready.map((r) => r.id);
  if (moved.length) {
    await db
      .update(orders)
      .set({ status: to })
      .where(and(inArray(orders.id, moved), eq(orders.status, from)));
  }
  refresh();
  return { moved };
}

/** "ফিরিয়ে নিন": put orders back one step, only if nobody moved them further meanwhile. */
export async function undoAdvance(input: unknown): Promise<void> {
  await requireAdmin();
  const { ids, step } = orderUndoInput.parse(input);
  const { from, to } = STEPS[step];
  await db
    .update(schema.orders)
    .set({ status: from })
    .where(and(inArray(schema.orders.id, ids), eq(schema.orders.status, to)));
  refresh();
}

/**
 * "বাতিল…": New, Confirmed or Packed orders only, with a preset reason and optional note.
 * The order's items go back into stock (owner decision), in the same transaction, so a
 * cancel can never restock twice. Sizes deleted since the order (variant_id null) are skipped.
 */
export async function cancelOrder(input: unknown): Promise<{ ok: boolean }> {
  await requireAdmin();
  const { id, reason, note } = orderCancelInput.parse(input);
  const { orders, orderItems, productVariants } = schema;
  const ok = await db.transaction(async (tx) => {
    const [res] = await tx
      .update(orders)
      .set({ status: "cancelled", cancelReason: reason, cancelNote: note ?? null })
      .where(
        and(eq(orders.id, id), inArray(orders.status, ["pending", "confirmed", "processing"])),
      );
    if (res.affectedRows !== 1) return false;
    const items = await tx
      .select({ variantId: orderItems.variantId, quantity: orderItems.quantity })
      .from(orderItems)
      .where(eq(orderItems.orderId, id));
    for (const item of items) {
      if (item.variantId === null) continue;
      await tx
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
        .where(eq(productVariants.id, item.variantId));
    }
    return true;
  });
  refresh();
  return { ok };
}

/** Live count for the filter sheet's "৩২টি অর্ডার দেখুন" button. */
export async function countFilteredOrders(input: unknown): Promise<number> {
  await requireAdmin();
  return countOrders(orderListQuery.parse(input));
}
