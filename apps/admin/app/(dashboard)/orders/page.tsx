import { orderListQuery } from "@repo/validators";
import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { getOrderPreview, listOrders, PAGE_SIZE, tabCounts } from "@/lib/orders";
import { requireAdmin } from "@/lib/require-admin";
import { OrdersView } from "./orders-view";

export const metadata: Metadata = { title: "Orders" };

/**
 * অর্ডার (Orders-Desktop ≥1440, Orders-Tablet1194 split view 1024–1439, Orders-Tablet 768–1023,
 * Orders-Phone <768, OrdersFilter-Phone, Orders-States). Filters live in the URL.
 */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { role } = await requireAdmin();
  const raw = await searchParams;
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k][0] : raw[k]);
  const query = orderListQuery.parse(
    Object.fromEntries(
      ["status", "multi", "q", "date", "from", "to", "zone", "page", "n", "sel"].map((k) => [
        k,
        one(k),
      ]),
    ),
  );

  const [{ lang, t }, counts, attention] = await Promise.all([
    getDict(),
    tabCounts(query),
    tabCounts(orderListQuery.parse({})),
  ]);
  const active = query.multi?.length
    ? query.multi.reduce((n, tab) => n + counts[tab], 0)
    : counts[query.status];
  const pages = Math.max(1, Math.ceil(active / PAGE_SIZE));
  const page = Math.min(query.page, pages);

  // Desktop/tablet: one page. Phone: the first n ("আরও দেখুন"). 1194 split list: newest 50.
  const [rows, phoneRows, splitRows] = await Promise.all([
    listOrders(query, { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }),
    listOrders(query, { offset: 0, limit: query.n }),
    listOrders(query, { offset: 0, limit: 50 }),
  ]);
  const selId = query.sel ?? splitRows[0]?.id;
  const preview = selId ? await getOrderPreview(selId) : null;

  return (
    <OrdersView
      lang={lang}
      t={t.orders}
      role={role}
      query={{ ...query, page }}
      counts={counts}
      attention={attention}
      total={active}
      pages={pages}
      rows={rows}
      splitRows={splitRows}
      phoneRows={phoneRows}
      preview={preview}
    />
  );
}
