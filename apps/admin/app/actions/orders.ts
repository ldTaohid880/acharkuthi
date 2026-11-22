"use server";

import { randomInt } from "node:crypto";
import {
  and,
  couponUsesBy,
  db,
  desc,
  eq,
  getShopRules,
  hasEarlierOrder,
  recordRedemption,
  gte,
  inArray,
  isNull,
  lt,
  or,
  schema,
  sql,
} from "@repo/db";
import {
  checkCoupon,
  isKnownLocation,
  manualOrderInput,
  orderAddressInput,
  orderAdvanceInput,
  orderCancelInput,
  orderListQuery,
  orderNoteInput,
  orderStepBackInput,
  orderTrackingInput,
  orderUndoInput,
  totalsFor,
  zoneForDistrict,
} from "@repo/validators";
import { revalidatePath } from "next/cache";
import { countOrders } from "@/lib/orders";
import { requireAdmin } from "@/lib/require-admin";

type DbStatus = (typeof schema.orders.$inferSelect)["status"];
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type Step = "confirm" | "pack" | "ship" | "deliver";

const STEPS: Record<Step, { from: DbStatus; to: DbStatus }> = {
  confirm: { from: "pending", to: "confirmed" },
  pack: { from: "confirmed", to: "processing" },
  // "পথে চিহ্ন দিন" / "ডেলিভার্ড চিহ্ন দিন" (owner, 2026-11-15): hand delivery or another
  // courier, without Steadfast. Booked orders are moved by Steadfast sync and the webhook only.
  ship: { from: "processing", to: "shipped" },
  deliver: { from: "shipped", to: "delivered" },
};

/** Extra condition for a step: the manual courier steps only touch orders with no consignment. */
const stepWhere = (step: Step) =>
  step === "ship" || step === "deliver" ? isNull(schema.orders.consignmentId) : undefined;

/** "আগের ধাপে ফিরিয়ে নিন": which status each one goes back to. */
const BACK: Partial<Record<DbStatus, DbStatus>> = {
  confirmed: "pending",
  processing: "confirmed",
};

function refresh() {
  revalidatePath("/orders", "layout"); // list and every /orders/[id]
  revalidatePath("/", "layout"); // sidebar and dashboard counts (incl. low stock)
}

/** Status history row (order_status_events) for the detail timeline. */
async function logStatus(tx: Tx | typeof db, ids: number[], status: DbStatus, userId: string) {
  if (!ids.length) return;
  await tx
    .insert(schema.orderStatusEvents)
    .values(ids.map((orderId) => ({ orderId, status, userId })));
}

/** Removes the newest history row of `status` for each order (undo / step back). */
async function unlogStatus(tx: Tx, ids: number[], status: DbStatus) {
  const ev = schema.orderStatusEvents;
  for (const orderId of ids) {
    const [last] = await tx
      .select({ id: ev.id })
      .from(ev)
      .where(and(eq(ev.orderId, orderId), eq(ev.status, status)))
      .orderBy(desc(ev.id))
      .limit(1);
    if (last) await tx.delete(ev).where(eq(ev.id, last.id));
  }
}

/**
 * কনফার্ম (New → Confirmed), প্যাক (Confirmed → Packed), or the manual পথে / ডেলিভার্ড steps
 * (not-booked orders only), one order or several. Orders not in
 * the starting status are skipped. Returns the ids that moved (for the toast's undo).
 */
export async function advanceOrders(input: unknown): Promise<{ moved: number[] }> {
  const { session } = await requireAdmin();
  const { ids, step } = orderAdvanceInput.parse(input);
  const { from, to } = STEPS[step];
  const { orders } = schema;
  const moved = await db.transaction(async (tx) => {
    const ready = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(inArray(orders.id, ids), eq(orders.status, from), stepWhere(step)));
    const ok = ready.map((r) => r.id);
    if (ok.length) {
      await tx
        .update(orders)
        .set({ status: to })
        .where(and(inArray(orders.id, ok), eq(orders.status, from), stepWhere(step)));
      await logStatus(tx, ok, to, session.user.id);
    }
    return ok;
  });
  refresh();
  return { moved };
}

/** "ফিরিয়ে নিন": put orders back one step, only if nobody moved them further meanwhile. */
export async function undoAdvance(input: unknown): Promise<void> {
  await requireAdmin();
  const { ids, step } = orderUndoInput.parse(input);
  const { from, to } = STEPS[step];
  await db.transaction(async (tx) => {
    const still = await tx
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(and(inArray(schema.orders.id, ids), eq(schema.orders.status, to), stepWhere(step)));
    const back = still.map((r) => r.id);
    if (!back.length) return;
    await tx
      .update(schema.orders)
      .set({ status: from })
      .where(and(inArray(schema.orders.id, back), eq(schema.orders.status, to), stepWhere(step)));
    await unlogStatus(tx, back, to);
  });
  refresh();
}

/** Order detail menu "আগের ধাপে ফিরিয়ে নিন": Packed → Confirmed, Confirmed → New. */
export async function stepBackOrder(input: unknown): Promise<{ ok: boolean }> {
  await requireAdmin();
  const { id } = orderStepBackInput.parse(input);
  const ok = await db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: eq(schema.orders.id, id),
      columns: { status: true },
    });
    const to = order ? BACK[order.status] : undefined;
    if (!order || !to) return false;
    const [res] = await tx
      .update(schema.orders)
      .set({ status: to })
      .where(and(eq(schema.orders.id, id), eq(schema.orders.status, order.status)));
    if (res.affectedRows !== 1) return false;
    await unlogStatus(tx, [id], order.status);
    return true;
  });
  refresh();
  return { ok };
}

/**
 * "বাতিল…": New, Confirmed or Packed orders only, with a preset reason and optional note.
 * The order's items go back into stock (owner decision), in the same transaction, so a
 * cancel can never restock twice. Sizes deleted since the order (variant_id null) are skipped.
 */
export async function cancelOrder(input: unknown): Promise<{ ok: boolean }> {
  const { session } = await requireAdmin();
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
    await logStatus(tx, [id], "cancelled", session.user.id);
    return true;
  });
  refresh();
  return { ok };
}

/** Auto-save for "ডেলিভারি ট্র্যাকিং" (courier, tracking number, date) and the courier note. */
export async function updateTracking(input: unknown): Promise<void> {
  await requireAdmin();
  const { id, courierName, trackingRef, etaDate, courierNote } = orderTrackingInput.parse(input);
  const set: Partial<typeof schema.orders.$inferInsert> = {};
  if (courierName !== undefined) set.courierName = courierName || null;
  if (trackingRef !== undefined) set.trackingRef = trackingRef || null;
  if (etaDate !== undefined) set.etaDate = etaDate || null;
  if (courierNote !== undefined) set.courierNote = courierNote || null;
  if (Object.keys(set).length === 0) return;
  await db.update(schema.orders).set(set).where(eq(schema.orders.id, id));
  revalidatePath(`/orders/${id}`);
}

/** "নোট যোগ করুন": internal note, shown with the author's name and time. */
export async function addOrderNote(input: unknown): Promise<void> {
  const { session } = await requireAdmin();
  const { id, body } = orderNoteInput.parse(input);
  await db.insert(schema.orderNotes).values({ orderId: id, userId: session.user.id, body });
  revalidatePath(`/orders/${id}`);
}

/** "line, area, upazila, district, division, postal": the order storefront checkout uses. */
function joinAddress(a: {
  address: string;
  area: string;
  upazila: string;
  district: string;
  division: string;
  postal: string;
}): string {
  return [a.address, a.area, a.upazila, a.district, a.division, a.postal]
    .filter(Boolean)
    .join(", ");
}

export type AddressResult = { ok: true } | { ok: false; reason: "location" | "locked" };

/**
 * Order detail "ঠিকানা বদলান": owner decision, only until the order is booked (New, Confirmed,
 * Packed). Moving between inside and outside Dhaka re-prices the delivery charge and total, and
 * an unpaid payment's amount (the COD amount) follows the new total.
 */
export async function updateOrderAddress(input: unknown): Promise<AddressResult> {
  await requireAdmin();
  const a = orderAddressInput.parse(input);
  if (!isKnownLocation(a.division, a.district, a.upazila)) return { ok: false, reason: "location" };
  const zone = zoneForDistrict(a.district) ?? "out";
  const { orders, payments } = schema;
  const { fees } = await getShopRules();
  const ok = await db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({
      where: and(
        eq(orders.id, a.id),
        inArray(orders.status, ["pending", "confirmed", "processing"]),
      ),
      columns: { subtotal: true, discount: true },
    });
    if (!order) return false;
    const shippingFee = fees[zone];
    const total = order.subtotal - order.discount + shippingFee;
    await tx
      .update(orders)
      .set({
        customerName: a.name,
        customerPhone: a.phone,
        shippingAddress: joinAddress(a),
        shipArea: a.area || null,
        shipUpazila: a.upazila,
        shipDistrict: a.district,
        deliveryZone: zone,
        shippingFee,
        total,
      })
      .where(eq(orders.id, a.id));
    await tx
      .update(payments)
      .set({ amount: total })
      .where(and(eq(payments.orderId, a.id), eq(payments.status, "pending")));
    return true;
  });
  refresh();
  return ok ? { ok: true } : { ok: false, reason: "locked" };
}

export type ManualOrderResult =
  | { ok: true; id: number }
  | {
      ok: false;
      /** couponUsed: this phone reached the coupon's per-person limit (or isn't a first order). */
      reason: "location" | "product" | "stock" | "coupon" | "couponUsed";
    };

class Rollback extends Error {
  constructor(readonly reason: "stock" | "coupon" | "couponUsed") {
    super(reason);
  }
}

/** AK-YYMMDD-NNNNNN in Dhaka time, the storefront's order number format. */
function orderNumber(): string {
  const ymd = new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" })
    .slice(2)
    .replaceAll("-", "");
  return `AK-${ymd}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
}

/**
 * "নতুন অর্ডার" (owner decision): an order taken in person, by phone or on social media.
 * Prices come from the database, stock goes down, and it starts Confirmed by the staff member.
 */
export async function createManualOrder(input: unknown): Promise<ManualOrderResult> {
  const { session } = await requireAdmin();
  const o = manualOrderInput.parse(input);
  if (!isKnownLocation(o.division, o.district, o.upazila)) return { ok: false, reason: "location" };
  const zone = zoneForDistrict(o.district) ?? "out";
  const { orders, orderItems, payments, productVariants, products, coupons } = schema;

  // The same size twice becomes one line.
  const qty = new Map<number, number>();
  for (const i of o.items) qty.set(i.variantId, (qty.get(i.variantId) ?? 0) + i.quantity);
  const rows = await db
    .select({
      variantId: productVariants.id,
      label: productVariants.label,
      price: productVariants.price,
      stock: productVariants.stock,
      name: products.name,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      and(
        inArray(productVariants.id, [...qty.keys()]),
        eq(productVariants.isActive, true),
        eq(products.isActive, true),
      ),
    );
  if (rows.length !== qty.size) return { ok: false, reason: "product" };
  const lines = rows.map((r) => ({ ...r, quantity: qty.get(r.variantId) ?? 0 }));
  if (lines.some((l) => l.quantity > l.stock)) return { ok: false, reason: "stock" };

  const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  let discount = 0;
  let couponId: number | null = null;
  if (o.couponCode) {
    const row = await db.query.coupons.findFirst({ where: eq(coupons.code, o.couponCode) });
    const check = checkCoupon(row, subtotal);
    if (!check.ok || !row) return { ok: false, reason: "coupon" };
    // Per person by phone (owner decision, 2026-11-15): staff orders count like web orders.
    if (await couponBlocked(db, row, o.phone)) return { ok: false, reason: "couponUsed" };
    discount = check.discount;
    couponId = row.id;
  }
  const totals = totalsFor(
    lines.map((l) => ({ unitPrice: l.price, quantity: l.quantity, available: true })),
    discount,
    zone,
    (await getShopRules()).fees,
  );

  try {
    const id = await db.transaction(async (tx) => {
      for (const l of lines) {
        const [res] = await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} - ${l.quantity}` })
          .where(and(eq(productVariants.id, l.variantId), gte(productVariants.stock, l.quantity)));
        if (res.affectedRows !== 1) throw new Rollback("stock");
      }
      if (couponId !== null) {
        const [locked] = await tx
          .select({
            id: coupons.id,
            perPersonLimit: coupons.perPersonLimit,
            firstOrderOnly: coupons.firstOrderOnly,
          })
          .from(coupons)
          .where(eq(coupons.id, couponId))
          .for("update");
        if (!locked || (await couponBlocked(tx, locked, o.phone))) throw new Rollback("couponUsed");
        const [res] = await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(
            and(
              eq(coupons.id, couponId),
              or(isNull(coupons.maxUses), lt(coupons.usedCount, coupons.maxUses)),
            ),
          );
        if (res.affectedRows !== 1) throw new Rollback("coupon");
      }
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber: orderNumber(),
          status: "confirmed",
          source: o.source,
          customerName: o.name,
          customerPhone: o.phone,
          customerEmail: o.email || null,
          shippingAddress: joinAddress(o),
          shipArea: o.area || null,
          shipUpazila: o.upazila,
          shipDistrict: o.district,
          deliveryZone: zone,
          subtotal: totals.subtotal,
          discount: totals.discount,
          shippingFee: totals.shippingFee ?? 0,
          total: totals.total,
          couponId,
          note: o.note || null,
        })
        .$returningId();
      if (!order) throw new Error("order insert returned no id");
      await tx.insert(orderItems).values(
        lines.map((l) => ({
          orderId: order.id,
          variantId: l.variantId,
          productName: l.name,
          variantLabel: l.label,
          unitPrice: l.price,
          quantity: l.quantity,
        })),
      );
      await tx.insert(payments).values({
        orderId: order.id,
        method: o.paymentMethod,
        status: o.paid ? "paid" : "pending",
        amount: totals.total,
        transactionId: o.transactionId || null,
      });
      if (couponId !== null) {
        await recordRedemption(tx, {
          couponId,
          orderId: order.id,
          phone: phone11(o.phone),
          source: "admin",
        });
      }
      await logStatus(tx, [order.id], "pending", session.user.id);
      await logStatus(tx, [order.id], "confirmed", session.user.id);
      return order.id;
    });
    refresh();
    return { ok: true, id };
  } catch (e) {
    if (e instanceof Rollback) return { ok: false, reason: e.reason };
    throw e;
  }
}

/** "01XXXXXXXXX" from +8801… / 8801… / 01…. */
const phone11 = (v: string) => v.replace(/\D/g, "").replace(/^88/, "");

/** Per-person limit and "first order only", matched by phone for staff-made orders. */
async function couponBlocked(
  exec: Parameters<typeof couponUsesBy>[0],
  row: { id: number; perPersonLimit: number | null; firstOrderOnly: boolean },
  phone: string,
): Promise<boolean> {
  const person = { phone: phone11(phone) };
  if (row.firstOrderOnly && (await hasEarlierOrder(exec, person))) return true;
  return (
    row.perPersonLimit !== null && (await couponUsesBy(exec, row.id, person)) >= row.perPersonLimit
  );
}

/** Live count for the filter sheet's "৩২টি অর্ডার দেখুন" button. */
export async function countFilteredOrders(input: unknown): Promise<number> {
  await requireAdmin();
  return countOrders(orderListQuery.parse(input));
}
