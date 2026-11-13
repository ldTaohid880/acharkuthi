import "server-only";

import { db, eq, inArray, schema } from "@repo/db";

export interface PrintOrder {
  id: number;
  number: string;
  createdAt: Date;
  name: string;
  phone: string;
  address: string;
  zone: "in" | "out" | null;
  courier: string;
  tracking: string;
  note: string;
  items: { id: number; bn: string | null; en: string; size: string; qty: number; total: number }[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  /** What the rider collects: the unpaid amount of a COD order, else 0. */
  cod: number;
}

export interface ShopInfo {
  phone: string | null;
  pickupAddress: string | null;
}

/** Orders for the packing slip / label page (OrderPrint-Desktop), in the order asked for. */
export async function getPrintOrders(ids: number[]): Promise<PrintOrder[]> {
  if (!ids.length) return [];
  const rows = await db.query.orders.findMany({
    where: inArray(schema.orders.id, ids),
    with: { items: true, payments: true },
  });
  const variantIds = rows.flatMap((o) =>
    o.items.flatMap((i) => (i.variantId === null ? [] : [i.variantId])),
  );
  const { productVariants, products } = schema;
  const names = variantIds.length
    ? await db
        .select({ variantId: productVariants.id, nameBn: products.nameBn })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(inArray(productVariants.id, variantIds))
    : [];
  const bnOf = new Map(names.map((n) => [n.variantId, n.nameBn]));
  const byId = new Map(rows.map((o) => [o.id, o]));
  return ids.flatMap((id) => {
    const o = byId.get(id);
    if (!o) return [];
    const pay = o.payments[0];
    return [
      {
        id: o.id,
        number: o.orderNumber,
        createdAt: o.createdAt,
        name: o.customerName,
        phone: o.customerPhone,
        address: o.shippingAddress,
        zone: o.deliveryZone,
        courier: o.courierName ?? "",
        tracking: o.trackingRef ?? "",
        note: o.courierNote ?? "",
        items: o.items.map((i) => ({
          id: i.id,
          bn: i.variantId === null ? null : (bnOf.get(i.variantId) ?? null),
          en: i.productName,
          size: i.variantLabel,
          qty: i.quantity,
          total: i.unitPrice * i.quantity,
        })),
        subtotal: o.subtotal,
        discount: o.discount,
        shippingFee: o.shippingFee,
        cod: pay && pay.method === "cod" && pay.status !== "paid" ? pay.amount : 0,
      },
    ];
  });
}

/** "দোকানের তথ্য" (row 1 of shop_settings); empty until it is filled on the Settings page. */
export async function getShopInfo(): Promise<ShopInfo> {
  const row = await db.query.shopSettings.findFirst({ where: eq(schema.shopSettings.id, 1) });
  return { phone: row?.phone ?? null, pickupAddress: row?.pickupAddress ?? null };
}
