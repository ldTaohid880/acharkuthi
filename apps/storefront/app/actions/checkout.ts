"use server";

import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { auth } from "@repo/auth";
import {
  and,
  COUPON_LIVE_CHECKS,
  couponUsesBy,
  db,
  eq,
  getShopRules,
  hasEarlierOrder,
  recordRedemption,
  recordWrongCoupon,
  tooManyCouponTries,
  type CouponPerson,
  gte,
  inArray,
  isNull,
  lt,
  notifyAdmins,
  or,
  schema,
  sql,
} from "@repo/db";
import {
  type CheckoutField,
  checkoutQuoteInput,
  type DeliveryZone,
  placeOrderInput,
} from "@repo/validators";
import { quoteVariants } from "@/lib/basket-quote";
import { isKnownLocation } from "@/lib/bd-locations";
import {
  checkCoupon,
  newlyUnavailable,
  totalsFor,
  type Totals,
  zoneForDistrict,
} from "@/lib/checkout-pricing";
import { couponPerson } from "@/lib/coupon-person";
import type { CouponProblem } from "@repo/validators";

export interface CheckoutLine {
  variantId: number;
  productName: string;
  /** Shown on checkout and the confirmation: the Bangla name when there is one (as in the basket). */
  displayName: string;
  variantLabel: string;
  imageUrl: string | null;
  /** Paisa, from the database. */
  unitPrice: number;
  quantity: number;
  stock: number;
  available: boolean;
}

export interface CheckoutQuote {
  lines: CheckoutLine[];
  coupon:
    | { code: string; discount: number; label: string }
    | { code: string; error: CouponProblem; /** Paisa still to add, for "min". */ need?: number }
    | null;
  totals: Totals;
}

type Person = CouponPerson & {
  tries: string;
  liveChecks: string;
  ip: string | null;
  userAgent: string | null;
};

/** Per-person and first-order rules (owner decision, 2026-11-15). Null = the coupon may be used. */
async function personProblem(
  row: { id: number; perPersonLimit: number | null; firstOrderOnly: boolean },
  person: CouponPerson,
  exec: Parameters<typeof couponUsesBy>[0] = db,
): Promise<CouponProblem | null> {
  if (row.firstOrderOnly && (await hasEarlierOrder(exec, person))) return "first";
  if (
    row.perPersonLimit !== null &&
    (await couponUsesBy(exec, row.id, person)) >= row.perPersonLimit
  )
    return "used";
  return null;
}

async function buildQuote(
  items: { variantId: number; quantity: number }[],
  zone: DeliveryZone | null,
  code: string | undefined,
  person: Person,
  /** The live check while typing: a miss isn't counted as a wrong try (it may be half typed). */
  live = false,
): Promise<CheckoutQuote & { couponId: number | null }> {
  const quotes = await quoteVariants(items.map((i) => i.variantId));
  const byId = new Map(quotes.map((q) => [q.variantId, q]));
  const lines: CheckoutLine[] = items.map((i) => {
    const q = byId.get(i.variantId);
    return {
      variantId: i.variantId,
      productName: q?.productName ?? "",
      displayName: q?.productNameBn ?? q?.productName ?? "",
      variantLabel: q?.variantLabel ?? "",
      imageUrl: q?.imageUrl ?? null,
      unitPrice: q?.unitPrice ?? 0,
      quantity: i.quantity,
      stock: q?.stock ?? 0,
      available: q?.kind === "ok",
    };
  });
  const subtotal = totalsFor(lines, 0, null).subtotal;
  const { fees } = await getShopRules();

  let coupon: CheckoutQuote["coupon"] = null;
  let discount = 0;
  let couponId: number | null = null;
  if (code) {
    // Wrong-code guessing: after COUPON_TRIES.max misses (or COUPON_LIVE_CHECKS live checks),
    // codes aren't even looked up for a while.
    const blocked =
      (await tooManyCouponTries(db, person.tries)) ||
      (live && (await tooManyCouponTries(db, person.liveChecks, COUPON_LIVE_CHECKS)));
    const row = blocked
      ? "tries"
      : await db.query.coupons.findFirst({ where: eq(schema.coupons.code, code) });
    if (row === "tries") {
      coupon = { code, error: "tries" };
    } else {
      if (live) await recordWrongCoupon(db, person.liveChecks);
      else if (!row) await recordWrongCoupon(db, person.tries);
      const check = checkCoupon(row, subtotal);
      const problem = check.ok && row ? await personProblem(row, person) : null;
      if (check.ok && row && !problem) {
        discount = check.discount;
        couponId = row.id;
        // Latin digits; the Bangla checkout shows them in Bangla digits.
        const label = row.type === "percent" ? `${row.value}%` : `৳${row.value / 100}`;
        coupon = { code: row.code, discount, label };
      } else {
        coupon = problem
          ? { code, error: problem }
          : check.ok
            ? { code, error: "invalid" }
            : { code, error: check.reason, ...(check.need ? { need: check.need } : {}) };
      }
    }
  }
  return { lines, coupon, couponId, totals: totalsFor(lines, discount, zone, fees) };
}

export type QuoteResult = { ok: true; quote: CheckoutQuote } | { ok: false };

/** Re-prices the checkout from the database: lines, coupon and delivery charge. */
export async function quoteCheckout(input: unknown): Promise<QuoteResult> {
  const parsed = checkoutQuoteInput.safeParse(input);
  if (!parsed.success) return { ok: false };
  try {
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
    const person = await couponPerson({
      userId: session?.user.id ?? null,
      phone: parsed.data.phone,
      fingerprint: parsed.data.fp,
    });
    const quote = await buildQuote(
      parsed.data.items,
      zoneForDistrict(parsed.data.district),
      parsed.data.couponCode || undefined,
      person,
      parsed.data.live === true,
    );
    return { ok: true, quote: { lines: quote.lines, coupon: quote.coupon, totals: quote.totals } };
  } catch (err) {
    console.error("checkout quote failed", err);
    return { ok: false };
  }
}

export interface PlacedOrder {
  orderNumber: string;
  name: string;
  address: string;
  delivery: DeliveryZone;
  lines: CheckoutLine[];
  totals: Totals;
}

export type PlaceOrderResult =
  | { status: "ok"; order: PlacedOrder }
  /** Prices, availability, stock or the coupon changed: nothing was saved; show the new quote. */
  | { status: "changed"; quote: CheckoutQuote }
  | { status: "invalid"; errors: Partial<Record<CheckoutField, string>> }
  /** COD is switched off in admin Settings: no orders are taken. Nothing was saved. */
  | { status: "closed" }
  /** The order was certainly not saved (the transaction rolled back). */
  | { status: "fail" };

class Changed extends Error {}

/** MySQL duplicate-key error on the checkout key: another submit of the same checkout won. */
const isDuplicateKey = (err: unknown): boolean => {
  for (let e: unknown = err; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    const { code, message } = e as { code?: unknown; message?: unknown };
    if (code === "ER_DUP_ENTRY" && typeof message === "string" && message.includes("checkout_key"))
      return true;
  }
  return false;
};

/** The confirmation for an order already placed with this checkout key, rebuilt from the DB. */
async function placedByKey(checkoutKey: string): Promise<PlacedOrder | null> {
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.checkoutKey, checkoutKey),
  });
  if (!order) return null;
  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, order.id));
  const quotes = await quoteVariants(
    items.flatMap((i) => (i.variantId === null ? [] : [i.variantId])),
  );
  const byId = new Map(quotes.map((q) => [q.variantId, q]));
  return {
    orderNumber: order.orderNumber,
    name: order.customerName,
    address: order.shippingAddress,
    delivery: order.deliveryZone ?? "in",
    lines: items.map((i) => {
      const q = i.variantId === null ? undefined : byId.get(i.variantId);
      return {
        variantId: i.variantId ?? 0,
        productName: i.productName,
        displayName: q?.productNameBn ?? i.productName,
        variantLabel: i.variantLabel,
        imageUrl: q?.imageUrl ?? null,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        stock: q?.stock ?? 0,
        available: true,
      };
    }),
    totals: {
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      total: order.total,
    },
  };
}

/** AK-YYMMDD-NNNNNN, dated in Dhaka time like every date the shopper sees. */
const orderNumber = () => {
  // en-CA gives YYYY-MM-DD.
  const ymd = new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" })
    .slice(2)
    .replaceAll("-", "");
  return `AK-${ymd}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
};

/** Places a cash-on-delivery order. Every amount is recalculated here from database prices. */
export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = placeOrderInput.safeParse(input);
  if (!parsed.success) {
    const errors: Partial<Record<CheckoutField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = (issue.path[0] === "contact" ? issue.path[1] : issue.path[0]) as CheckoutField;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { status: "invalid", errors };
  }
  const { contact, delivery, items, seenPrices, seenGone, checkoutKey } = parsed.data;
  const code = parsed.data.couponCode || undefined;

  // A repeat of a checkout that already became an order: show that order, don't make another.
  if (checkoutKey) {
    const earlier = await placedByKey(checkoutKey).catch(() => null);
    if (earlier) return { status: "ok", order: earlier };
  }

  if (!isKnownLocation(contact.division, contact.district, contact.upazila)) {
    return { status: "invalid", errors: { upazila: "উপজেলা / থানা বেছে নিন" } };
  }
  const zone = zoneForDistrict(contact.district);
  if (zone !== delivery)
    return { status: "invalid", errors: { delivery: "ডেলিভারি পদ্ধতি বেছে নিন" } };

  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const userId = session?.user.id ?? null;
  const person = await couponPerson({ userId, phone: contact.phone, fingerprint: parsed.data.fp });
  try {
    if (!(await getShopRules()).codEnabled) return { status: "closed" };
    const quote = await buildQuote(items, zone, code, person);
    const { couponId, ...shown } = quote;
    const priceMoved = quote.lines.some(
      (l) => l.available && seenPrices[String(l.variantId)] !== l.unitPrice,
    );
    const short = quote.lines.some((l) => l.available && l.quantity > l.stock);
    // Sold out or switched off since the customer's last quote: never drop it silently.
    const newlyGone = newlyUnavailable(quote.lines, seenGone);
    const couponBad = !!code && (!quote.coupon || "error" in quote.coupon);
    const sellable = quote.lines.filter((l) => l.available);
    if (priceMoved || short || newlyGone || couponBad || sellable.length === 0)
      return { status: "changed", quote: shown };

    const address = [
      contact.address,
      contact.area,
      contact.upazila,
      contact.district,
      contact.division,
      contact.postal,
    ]
      .filter(Boolean)
      .join(", ");
    const number = orderNumber();
    const totals = quote.totals;

    const orderId = await db.transaction(async (tx) => {
      for (const l of sellable) {
        const [res] = await tx
          .update(schema.productVariants)
          .set({ stock: sql`${schema.productVariants.stock} - ${l.quantity}` })
          .where(
            and(
              eq(schema.productVariants.id, l.variantId),
              gte(schema.productVariants.stock, l.quantity),
            ),
          );
        if (res.affectedRows !== 1) throw new Changed();
      }
      if (couponId !== null) {
        // Lock the coupon row so two orders from the same person can't both take the last use.
        const [locked] = await tx
          .select({
            id: schema.coupons.id,
            perPersonLimit: schema.coupons.perPersonLimit,
            firstOrderOnly: schema.coupons.firstOrderOnly,
          })
          .from(schema.coupons)
          .where(eq(schema.coupons.id, couponId))
          .for("update");
        if (!locked || (await personProblem(locked, person, tx))) throw new Changed();
        const [res] = await tx
          .update(schema.coupons)
          .set({ usedCount: sql`${schema.coupons.usedCount} + 1` })
          .where(
            and(
              eq(schema.coupons.id, couponId),
              or(
                isNull(schema.coupons.maxUses),
                lt(schema.coupons.usedCount, schema.coupons.maxUses),
              ),
            ),
          );
        if (res.affectedRows !== 1) throw new Changed();
      }
      const [order] = await tx
        .insert(schema.orders)
        .values({
          orderNumber: number,
          checkoutKey: checkoutKey ?? null,
          userId,
          customerName: contact.name,
          customerPhone: contact.phone,
          customerEmail: contact.email || null,
          shippingAddress: address,
          shipArea: contact.area || null,
          shipUpazila: contact.upazila,
          shipDistrict: contact.district,
          deliveryZone: delivery,
          subtotal: totals.subtotal,
          discount: totals.discount,
          shippingFee: totals.shippingFee ?? 0,
          total: totals.total,
          couponId,
          note: contact.note || null,
        })
        .$returningId();
      if (!order) throw new Error("order insert returned no id");
      await tx.insert(schema.orderItems).values(
        sellable.map((l) => ({
          orderId: order.id,
          variantId: l.variantId,
          productName: l.productName,
          variantLabel: l.variantLabel,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
        })),
      );
      await tx
        .insert(schema.payments)
        .values({ orderId: order.id, method: "cod", amount: totals.total });
      if (couponId !== null) {
        await recordRedemption(tx, {
          ...person,
          couponId,
          orderId: order.id,
          phone: person.phone ?? contact.phone,
          source: "web",
        });
      }
      if (userId) {
        const saved = await tx.query.addresses.findMany({
          where: eq(schema.addresses.userId, userId),
        });
        const norm = (s: string | null | undefined) =>
          (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
        // Ordering to an address that is already saved (as prefilled from it) doesn't save it again.
        const same = saved.some(
          (a) =>
            norm(a.line1) === norm(contact.address) &&
            norm(a.city) === norm(contact.upazila) &&
            norm(a.district) === norm(contact.district) &&
            norm(a.area) === norm(contact.area) &&
            norm(a.phone).replace(/\D/g, "").slice(-10) ===
              norm(contact.phone).replace(/\D/g, "").slice(-10) &&
            norm(a.fullName) === norm(contact.name),
        );
        const existing = saved[0];
        if (!same)
          await tx.insert(schema.addresses).values({
            userId,
            fullName: contact.name,
            phone: contact.phone,
            line1: contact.address,
            area: contact.area || null,
            city: contact.upazila,
            district: contact.district,
            division: contact.division,
            postalCode: contact.postal || null,
            isDefault: !existing,
          });
      }
      return order.id;
    });
    await notifyNewOrder(orderId, number, contact.name, totals.total, sellable);

    return {
      status: "ok",
      order: {
        orderNumber: number,
        name: contact.name,
        address,
        delivery,
        lines: sellable,
        totals,
      },
    };
  } catch (err) {
    // Two submits of one checkout raced: this one rolled back (stock and coupon untouched) and the
    // other committed, so answer with that order.
    if (checkoutKey && isDuplicateKey(err)) {
      const earlier = await placedByKey(checkoutKey).catch(() => null);
      if (earlier) return { status: "ok", order: earlier };
    }
    if (err instanceof Changed) {
      try {
        const { couponId, ...q } = await buildQuote(items, zone, code, person);
        void couponId;
        return { status: "changed", quote: q };
      } catch {
        return { status: "fail" };
      }
    }
    console.error("place order failed", err);
    return { status: "fail" };
  }
}

/** Bell notifications for a placed order: the order itself, plus each size it sold out. */
async function notifyNewOrder(
  orderId: number,
  orderNumber: string,
  name: string,
  total: number,
  lines: { variantId: number; quantity: number }[],
) {
  await notifyAdmins(
    { kind: "order", orderNumber, name, total, items: lines.reduce((n, l) => n + l.quantity, 0) },
    { orderId },
  );
  try {
    const soldOut = await db
      .select({
        id: schema.productVariants.id,
        size: schema.productVariants.label,
        name: schema.products.name,
        nameBn: schema.products.nameBn,
      })
      .from(schema.productVariants)
      .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
      .where(
        and(
          inArray(
            schema.productVariants.id,
            lines.map((l) => l.variantId),
          ),
          eq(schema.productVariants.stock, 0),
        ),
      );
    for (const v of soldOut) {
      const requests = await db.$count(
        schema.restockRequests,
        and(eq(schema.restockRequests.variantId, v.id), isNull(schema.restockRequests.notifiedAt)),
      );
      await notifyAdmins({
        kind: "stock",
        product: { bn: v.nameBn ?? v.name, en: v.name },
        size: v.size,
        requests,
      });
    }
  } catch (err) {
    console.error("sold-out notification failed", err);
  }
}
