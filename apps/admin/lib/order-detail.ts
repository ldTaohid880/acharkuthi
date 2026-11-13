import "server-only";

import { and, asc, count, db, eq, inArray, ne, or, schema } from "@repo/db";
import { divisionOf } from "@repo/validators";

type DbStatus = (typeof schema.orders.$inferSelect)["status"];

export interface OrderDetail {
  id: number;
  number: string;
  createdAt: Date;
  status: DbStatus;
  source: (typeof schema.orders.$inferSelect)["source"];
  name: string;
  phone: string;
  email: string | null;
  userId: string | null;
  address: string;
  zone: "in" | "out" | null;
  /** The address split back into the checkout fields, for "ঠিকানা বদলান". */
  addressParts: {
    name: string;
    phone: string;
    division: string;
    district: string;
    upazila: string;
    area: string;
    address: string;
    postal: string;
  };
  note: string | null;
  cancelReason: (typeof schema.orders.$inferSelect)["cancelReason"];
  cancelNote: string | null;
  /** Other orders by the same phone or account, and how many of those came back. */
  previous: number;
  returned: number;
  items: {
    id: number;
    name: string;
    size: string;
    unit: number;
    qty: number;
    /** The product as it is now (Bangla name if set), when the size still exists. */
    current: { productId: number; name: string } | null;
  }[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shippingFee: number;
  total: number;
  payment: {
    method: (typeof schema.payments.$inferSelect)["method"];
    status: (typeof schema.payments.$inferSelect)["status"];
    amount: number;
    transactionId: string | null;
  } | null;
  tracking: { courier: string; ref: string; eta: string };
  courierNote: string;
  /** Latest time each status was reached, with who did it. */
  events: { status: DbStatus; at: Date; by: string | null }[];
  notes: { id: number; body: string; at: Date; by: string | null }[];
}

/** Everything the order detail page shows (OrderDetail-*). */
export async function getOrderDetail(id: number): Promise<OrderDetail | null> {
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, id),
    with: { items: true, payments: true },
  });
  if (!order) return null;
  const { orders, productVariants, products, orderStatusEvents, orderNotes, user } = schema;

  const variantIds = order.items.flatMap((i) => (i.variantId === null ? [] : [i.variantId]));
  const sameCustomer = order.userId
    ? or(eq(orders.customerPhone, order.customerPhone), eq(orders.userId, order.userId))
    : eq(orders.customerPhone, order.customerPhone);

  const [coupon, current, history, events, notes] = await Promise.all([
    order.couponId
      ? db.query.coupons.findFirst({
          where: eq(schema.coupons.id, order.couponId),
          columns: { code: true },
        })
      : undefined,
    variantIds.length
      ? db
          .select({
            variantId: productVariants.id,
            productId: products.id,
            name: products.name,
            nameBn: products.nameBn,
          })
          .from(productVariants)
          .innerJoin(products, eq(products.id, productVariants.productId))
          .where(inArray(productVariants.id, variantIds))
      : [],
    db
      .select({ status: orders.status, n: count() })
      .from(orders)
      .where(and(sameCustomer, ne(orders.id, id)))
      .groupBy(orders.status),
    db
      .select({ status: orderStatusEvents.status, at: orderStatusEvents.createdAt, by: user.name })
      .from(orderStatusEvents)
      .leftJoin(user, eq(user.id, orderStatusEvents.userId))
      .where(eq(orderStatusEvents.orderId, id))
      .orderBy(asc(orderStatusEvents.createdAt), asc(orderStatusEvents.id)),
    db
      .select({ id: orderNotes.id, body: orderNotes.body, at: orderNotes.createdAt, by: user.name })
      .from(orderNotes)
      .leftJoin(user, eq(user.id, orderNotes.userId))
      .where(eq(orderNotes.orderId, id))
      .orderBy(asc(orderNotes.createdAt), asc(orderNotes.id)),
  ]);

  const byVariant = new Map(current.map((c) => [c.variantId, c]));
  const pay = order.payments[0];
  return {
    id: order.id,
    number: order.orderNumber,
    createdAt: order.createdAt,
    status: order.status,
    source: order.source,
    name: order.customerName,
    phone: order.customerPhone,
    email: order.customerEmail,
    userId: order.userId,
    address: order.shippingAddress,
    zone: order.deliveryZone,
    addressParts: splitAddress(order),
    note: order.note,
    cancelReason: order.cancelReason,
    cancelNote: order.cancelNote,
    previous: history.reduce((n, r) => n + r.n, 0),
    returned: history.find((r) => r.status === "returned")?.n ?? 0,
    items: order.items.map((i) => {
      const c = i.variantId === null ? undefined : byVariant.get(i.variantId);
      return {
        id: i.id,
        name: i.productName,
        size: i.variantLabel,
        unit: i.unitPrice,
        qty: i.quantity,
        current: c ? { productId: c.productId, name: c.nameBn ?? c.name } : null,
      };
    }),
    subtotal: order.subtotal,
    discount: order.discount,
    couponCode: coupon?.code ?? null,
    shippingFee: order.shippingFee,
    total: order.total,
    payment: pay
      ? {
          method: pay.method,
          status: pay.status,
          amount: pay.amount,
          transactionId: pay.transactionId,
        }
      : null,
    tracking: {
      courier: order.courierName ?? "",
      ref: order.trackingRef ?? "",
      eta: order.etaDate ?? "",
    },
    courierNote: order.courierNote ?? "",
    events,
    notes,
  };
}

/**
 * Orders store the joined address ("line, area, upazila, district, division, postal") plus the
 * area, upazila and district. Strip those known parts from the end to get the typed line back.
 * Orders from before the parts were saved keep their whole address in the line.
 */
function splitAddress(o: {
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shipArea: string | null;
  shipUpazila: string | null;
  shipDistrict: string | null;
}): OrderDetail["addressParts"] {
  const district = o.shipDistrict ?? "";
  const division = (district && divisionOf(district)) || "";
  const parts = o.shippingAddress.split(",").map((p) => p.trim());
  let postal = "";
  if (o.shipUpazila && /^\d{4}$/.test(parts.at(-1) ?? "")) postal = parts.pop() ?? "";
  if (o.shipUpazila) {
    for (const known of [division, district, o.shipUpazila, o.shipArea ?? ""]) {
      if (known && parts.at(-1) === known) parts.pop();
    }
  }
  return {
    name: o.customerName,
    phone: o.customerPhone,
    division,
    district,
    upazila: o.shipUpazila ?? "",
    area: o.shipArea ?? "",
    address: parts.join(", "),
    postal,
  };
}
