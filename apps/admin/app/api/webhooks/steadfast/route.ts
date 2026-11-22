import { timingSafeEqual } from "node:crypto";
import { and, db, eq, inArray, schema } from "@repo/db";
import { open } from "@/lib/secret-box";
import { orderStatusFor } from "@/lib/steadfast";

/**
 * Steadfast webhook (Settings › "Webhook: স্ট্যাটাস নিজে থেকে আপডেট"). Steadfast calls this with
 * `Authorization: Bearer <token>` when a parcel's status or tracking changes. Every call that
 * passes the token check is logged ("সাম্প্রতিক ইভেন্ট"). Orders are matched by invoice = our
 * order number. Only two changes are applied automatically, and only to a shipped order:
 * delivered → "delivered", cancelled → "returned". Everything else is just logged.
 */
const sameToken = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

const str = (v: unknown, max: number) =>
  typeof v === "string" || typeof v === "number" ? String(v).slice(0, max) : null;

export async function POST(req: Request) {
  const [row] = await db
    .select({ token: schema.shopSettings.steadfastWebhookToken })
    .from(schema.shopSettings);
  const token = open(row?.token);
  const auth = req.headers.get("authorization") ?? "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !given || !sameToken(given, token)) {
    return Response.json({ status: "error", message: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ status: "error", message: "Invalid JSON" }, { status: 400 });
  }

  const type = str(body.notification_type, 40);
  const consignment = str(body.consignment_id, 40);
  const invoice = str(body.invoice, 64);
  const status = str(body.status ?? body.delivery_status, 60)?.toLowerCase() ?? null;

  const { orders: o } = schema;
  // Match by our order number (invoice), else by the consignment saved at booking.
  const match = invoice
    ? eq(o.orderNumber, invoice)
    : consignment
      ? eq(o.consignmentId, consignment)
      : undefined;
  const [order] = match ? await db.select({ id: o.id, status: o.status }).from(o).where(match) : [];

  let result: "accepted" | "no_order" | "ignored" = order ? "accepted" : "no_order";
  if (order && type === "delivery_status" && status) {
    await db
      .update(o)
      .set({ courierStatus: status, courierSyncedAt: new Date() })
      .where(eq(o.id, order.id));
    const next = orderStatusFor(status);
    if (next) {
      const [res] = await db
        .update(o)
        .set({ status: next })
        .where(and(eq(o.id, order.id), inArray(o.status, ["shipped"])));
      if (res.affectedRows === 1) {
        await db.insert(schema.orderStatusEvents).values({ orderId: order.id, status: next });
      } else result = "ignored";
    }
  }

  await db.insert(schema.steadfastEvents).values({
    notificationType: type,
    consignmentId: consignment,
    invoice,
    status,
    result,
    orderId: order?.id ?? null,
    payload: body,
  });
  await db
    .update(schema.shopSettings)
    .set({ steadfastSyncedAt: new Date() })
    .where(eq(schema.shopSettings.id, 1));

  return Response.json({ status: "success", message: "Webhook received" });
}
