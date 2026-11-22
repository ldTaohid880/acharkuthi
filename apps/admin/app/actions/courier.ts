"use server";

import { and, db, eq, inArray, isNotNull, isNull, schema } from "@repo/db";
import {
  courierBookInput,
  courierSyncInput,
  orderSettleInput,
  orderUnsettleInput,
} from "@repo/validators";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireRole } from "@/lib/require-admin";
import { bookSteadfast, orderStatusFor, steadfastStatus } from "@/lib/steadfast";
import { steadfastKeys } from "@/lib/steadfast-keys";

const { orders: o, payments: pay, orderStatusEvents: ev } = schema;

function refresh() {
  revalidatePath("/", "layout");
}

export type BookResult =
  | { ok: true; booked: string[]; failed: { number: string; message: string | null }[] }
  | { ok: false; reason: "keys" };

/**
 * "বুক করুন": sends packed orders to Steadfast. Booking is the hand-over to the courier (owner
 * decision, 2026-11-15): the order becomes "shipped" (customer sees "কুরিয়ারে হস্তান্তর"), with
 * the consignment and tracking code saved. Staff can book too (orders are theirs to run).
 */
export async function bookCourier(input: unknown): Promise<BookResult> {
  const { session } = await requireAdmin();
  const { ids } = courierBookInput.parse(input);
  const keys = await steadfastKeys();
  if (!keys) return { ok: false, reason: "keys" };
  const rows = await db.query.orders.findMany({
    where: and(inArray(o.id, ids), eq(o.status, "processing"), isNull(o.consignmentId)),
    with: { payments: true },
  });
  const booked: string[] = [];
  const failed: { number: string; message: string | null }[] = [];
  for (const r of rows) {
    const p = r.payments[0];
    const cod = !p || (p.method === "cod" && p.status !== "paid") ? r.total : 0;
    const res = await bookSteadfast(keys.apiKey, keys.secretKey, {
      invoice: r.orderNumber,
      name: r.customerName,
      phone: r.customerPhone,
      address: r.shippingAddress,
      cod,
      note: r.courierNote,
    });
    if (!res.ok) {
      if (res.reason === "auth") return { ok: false, reason: "keys" };
      failed.push({ number: r.orderNumber, message: res.message ?? null });
      continue;
    }
    await db.transaction(async (tx) => {
      const [u] = await tx
        .update(o)
        .set({
          status: "shipped",
          courierName: "Steadfast",
          consignmentId: res.consignmentId,
          trackingRef: res.trackingCode,
          courierStatus: res.status,
          courierBookedAt: new Date(),
          courierSyncedAt: new Date(),
        })
        .where(and(eq(o.id, r.id), eq(o.status, "processing")));
      if (u.affectedRows === 1)
        await tx.insert(ev).values({ orderId: r.id, status: "shipped", userId: session.user.id });
    });
    booked.push(r.orderNumber);
  }
  refresh();
  return { ok: true, booked, failed };
}

export type SyncResult =
  | { ok: true; checked: number; changed: number }
  | { ok: false; reason: "keys" };

/** "কুরিয়ার সিঙ্ক": asks Steadfast for each booked, shipped order's status. */
export async function syncCourier(input: unknown): Promise<SyncResult> {
  const { session } = await requireAdmin();
  const { ids } = courierSyncInput.parse(input ?? {});
  const keys = await steadfastKeys();
  if (!keys) return { ok: false, reason: "keys" };
  const rows = await db
    .select({ id: o.id, consignmentId: o.consignmentId })
    .from(o)
    .where(
      and(
        isNotNull(o.consignmentId),
        eq(o.status, "shipped"),
        ids?.length ? inArray(o.id, ids) : undefined,
      ),
    )
    .limit(200);
  let changed = 0;
  for (const r of rows) {
    if (!r.consignmentId) continue;
    const status = await steadfastStatus(keys.apiKey, keys.secretKey, r.consignmentId);
    if (!status) continue;
    const next = orderStatusFor(status);
    await db.transaction(async (tx) => {
      const [u] = await tx
        .update(o)
        .set({ courierStatus: status, courierSyncedAt: new Date(), ...(next ? { status: next } : {}) })
        .where(and(eq(o.id, r.id), eq(o.status, "shipped")));
      if (next && u.affectedRows === 1) {
        await tx.insert(ev).values({ orderId: r.id, status: next, userId: session.user.id });
        changed++;
      }
    });
  }
  await db
    .update(schema.shopSettings)
    .set({ steadfastSyncedAt: new Date() })
    .where(eq(schema.shopSettings.id, 1));
  refresh();
  return { ok: true, checked: rows.length, changed };
}

/**
 * "টাকা পাওয়া গেছে": the owner records that the courier paid out the cash for delivered orders
 * (manual, in bulk; owner decision, 2026-11-11). The COD payment is marked paid.
 */
export async function settleOrders(input: unknown): Promise<{ settled: number }> {
  await requireRole("owner");
  const { ids, payoutRef, paidOn } = orderSettleInput.parse(input);
  const at = paidOn ? new Date(`${paidOn}T12:00:00+06:00`) : new Date();
  const rows = await db
    .select({ id: o.id })
    .from(o)
    .where(and(inArray(o.id, ids), eq(o.status, "delivered"), isNull(o.settledAt)));
  const list = rows.map((r) => r.id);
  if (list.length) {
    await db.transaction(async (tx) => {
      await tx
        .update(o)
        .set({ settledAt: at, payoutRef: payoutRef || null })
        .where(inArray(o.id, list));
      await tx
        .update(pay)
        .set({ status: "paid" })
        .where(and(inArray(pay.orderId, list), eq(pay.method, "cod")));
    });
  }
  refresh();
  return { settled: list.length };
}

/** Undo a wrong "টাকা পাওয়া গেছে". */
export async function unsettleOrder(input: unknown): Promise<void> {
  await requireRole("owner");
  const { id } = orderUnsettleInput.parse(input);
  await db.transaction(async (tx) => {
    await tx.update(o).set({ settledAt: null, payoutRef: null }).where(eq(o.id, id));
    await tx
      .update(pay)
      .set({ status: "pending" })
      .where(and(eq(pay.orderId, id), eq(pay.method, "cod")));
  });
  refresh();
}
