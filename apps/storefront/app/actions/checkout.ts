"use server";

import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { auth } from "@repo/auth";
import { and, db, eq, inArray, isNull, lt, notifyAdmins, or, schema, sql, gte } from "@repo/db";
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
  DELIVERY_FEES,
  totalsFor,
  type Totals,
  zoneForDistrict,
} from "@/lib/checkout-pricing";

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
    | { code: string; error: "invalid" | "expired" }
    | null;
  totals: Totals;
}

const bnDigits = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);

async function buildQuote(
  items: { variantId: number; quantity: number }[],
  zone: DeliveryZone | null,
  code: string | undefined,
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

  let coupon: CheckoutQuote["coupon"] = null;
  let discount = 0;
  let couponId: number | null = null;
  if (code) {
    const row = await db.query.coupons.findFirst({ where: eq(schema.coupons.code, code) });
    const check = checkCoupon(row, subtotal);
    if (check.ok && row) {
      discount = check.discount;
      couponId = row.id;
      const label = row.type === "percent" ? `${bnDigits(row.value)}%` : `৳${row.value / 100}`;
      coupon = { code: row.code, discount, label };
    } else if (!check.ok) {
      coupon = { code, error: check.reason };
    }
  }
  return { lines, coupon, couponId, totals: totalsFor(lines, discount, zone) };
}

export type QuoteResult = { ok: true; quote: CheckoutQuote } | { ok: false };

/** Re-prices the checkout from the database: lines, coupon and delivery charge. */
export async function quoteCheckout(input: unknown): Promise<QuoteResult> {
  const parsed = checkoutQuoteInput.safeParse(input);
  if (!parsed.success) return { ok: false };
  try {
    const quote = await buildQuote(
      parsed.data.items,
      zoneForDistrict(parsed.data.district),
      parsed.data.couponCode || undefined,
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
  /** The order was certainly not saved (the transaction rolled back). */
  | { status: "fail" };

class Changed extends Error {}

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
  const { contact, delivery, items, seenPrices } = parsed.data;
  const code = parsed.data.couponCode || undefined;

  if (!isKnownLocation(contact.division, contact.district, contact.upazila)) {
    return { status: "invalid", errors: { upazila: "উপজেলা / থানা বেছে নিন" } };
  }
  const zone = zoneForDistrict(contact.district);
  if (zone !== delivery)
    return { status: "invalid", errors: { delivery: "ডেলিভারি পদ্ধতি বেছে নিন" } };

  try {
    const quote = await buildQuote(items, zone, code);
    const { couponId, ...shown } = quote;
    const priceMoved = quote.lines.some(
      (l) => l.available && seenPrices[String(l.variantId)] !== l.unitPrice,
    );
    const short = quote.lines.some((l) => l.available && l.quantity > l.stock);
    const couponBad = !!code && (!quote.coupon || "error" in quote.coupon);
    const sellable = quote.lines.filter((l) => l.available);
    if (priceMoved || short || couponBad || sellable.length === 0)
      return { status: "changed", quote: shown };

    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
    const userId = session?.user.id ?? null;
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
          shippingFee: DELIVERY_FEES[delivery],
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
      if (userId) {
        const existing = await tx.query.addresses.findFirst({
          where: eq(schema.addresses.userId, userId),
        });
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
    if (err instanceof Changed) {
      try {
        const { couponId, ...q } = await buildQuote(items, zone, code);
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
