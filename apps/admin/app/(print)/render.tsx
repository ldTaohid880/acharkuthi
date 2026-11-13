import "server-only";

import { notFound } from "next/navigation";
import { fill, orderDate } from "@/lib/format";
import { getDict } from "@/lib/i18n/server";
import { getPrintOrders, getShopInfo } from "@/lib/order-print";
import { requireAdmin } from "@/lib/require-admin";
import { PrintView } from "./print-view";

/** Shared by /orders/[id]/print and /orders/print?ids=… */
export async function renderPrint(ids: number[], single: boolean) {
  await requireAdmin();
  const [{ lang, t }, orders, shop] = await Promise.all([
    getDict(),
    getPrintOrders(ids),
    getShopInfo(),
  ]);
  const first = orders[0];
  if (!first) notFound();
  const back = single
    ? { href: `/orders/${first.id}`, label: fill(t.print.backTo, { id: first.number }) }
    : { href: "/orders", label: t.print.backList };
  return (
    <PrintView
      orders={orders.map((o) => ({ ...o, placed: orderDate(o.createdAt, lang) }))}
      shop={shop}
      t={t.print}
      zones={t.orders.zone}
      lang={lang}
      back={back}
    />
  );
}
