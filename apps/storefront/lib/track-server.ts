// Server only: imports @repo/db. Never import from a "use client" file.
import { asc, db, eq, inArray, schema } from "@repo/db";
import { heatOf } from "@/lib/product-view";
import { districtFromAddress, type TrackedOrder } from "@/lib/track";
export type { LookupResult, TrackedOrder } from "@/lib/track";

const HEAT_BN = {
  "Not spicy": "ঝাল নেই",
  Mild: "কম ঝাল",
  Medium: "মাঝারি ঝাল",
  Hot: "বেশি ঝাল",
} as const;

export const lastDigits = (phone: string) => phone.replace(/\D/g, "").slice(-11);

export async function loadOrder(where: { orderNumber: string }) {
  return db.query.orders.findFirst({ where: eq(schema.orders.orderNumber, where.orderNumber) });
}

type OrderRow = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

export async function present(order: OrderRow): Promise<TrackedOrder> {
  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, order.id));
  const payment = await db.query.payments.findFirst({
    where: eq(schema.payments.orderId, order.id),
  });
  const variantIds = items.map((i) => i.variantId).filter((v): v is number => v !== null);
  const variants = variantIds.length
    ? await db
        .select({
          id: schema.productVariants.id,
          productId: schema.productVariants.productId,
          spice: schema.products.spiceLevel,
          nameBn: schema.products.nameBn,
        })
        .from(schema.productVariants)
        .innerJoin(schema.products, eq(schema.products.id, schema.productVariants.productId))
        .where(inArray(schema.productVariants.id, variantIds))
    : [];
  const productIds = [...new Set(variants.map((v) => v.productId))];
  const images = productIds.length
    ? await db
        .select()
        .from(schema.productImages)
        .where(inArray(schema.productImages.productId, productIds))
        .orderBy(asc(schema.productImages.sortOrder))
    : [];
  const byVariant = new Map(variants.map((v) => [v.id, v]));
  return {
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    status: order.status,
    cod: (payment?.method ?? "cod") === "cod",
    etaDate: order.etaDate,
    district: districtFromAddress(order.shippingAddress),
    // The zone chosen at checkout (stored since A3), not the fee, which Settings can change.
    inDhaka: order.deliveryZone === "in",
    courierName: order.courierName,
    trackingRef: order.trackingRef,
    handedOver: order.consignmentId !== null,
    items: items.map((i) => {
      const v = i.variantId === null ? undefined : byVariant.get(i.variantId);
      const word = v ? heatOf(v.spice).word : null;
      const heat = word ? HEAT_BN[word] : null;
      return {
        id: i.id,
        // Same name as the basket: Bangla when the product has one, else the name saved on the order.
        name: v?.nameBn ?? i.productName,
        detail: [i.variantLabel, heat].filter(Boolean).join(" · "),
        // The order keeps the English name it was sold under.
        nameEn: i.productName,
        detailEn: [i.variantLabel, word].filter(Boolean).join(" · "),
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        image: (v && images.find((im) => im.productId === v.productId)?.url) ?? null,
      };
    }),
    subtotal: order.subtotal,
    discount: order.discount,
    shippingFee: order.shippingFee,
    total: order.total,
  };
}

/** Signed-in owner opening an order from My Orders. Null unless the order belongs to `userId`. */
export async function ownedOrder(
  orderNumber: string,
  userId: string,
): Promise<TrackedOrder | null> {
  const order = await loadOrder({ orderNumber });
  if (!order || order.userId !== userId) return null;
  return present(order);
}
