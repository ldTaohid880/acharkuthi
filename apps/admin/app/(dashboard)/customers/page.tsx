import { customerListQuery } from "@repo/validators";
import type { Metadata } from "next";
import {
  CUSTOMER_PAGE_SIZE,
  countCustomers,
  getCustomerPreview,
  listCustomers,
} from "@/lib/customers";
import { getDict } from "@/lib/i18n/server";
import { requireRole } from "@/lib/require-admin";
import { CustomersView } from "./customers-view";

export const metadata: Metadata = { title: "Customers" };

/**
 * গ্রাহক: Customers-Desktop (≥1440), Customers-Tablet1194 split view (1024–1439), Customers-Tablet
 * (768–1023) and Customers-Phone (<768). Shop accounts only (owner decision, 2026-11-14); search,
 * sort and page live in the URL. Owner only.
 */
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("owner");
  const raw = await searchParams;
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k][0] : raw[k]);
  const query = customerListQuery.parse(
    Object.fromEntries(["q", "sort", "page", "n", "sel"].map((k) => [k, one(k)])),
  );

  const [{ lang, t }, total] = await Promise.all([getDict(), countCustomers(query.q)]);
  const pages = Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE));
  const page = Math.min(query.page, pages);

  // Desktop/tablet: one page. Phone: the first n ("আরও দেখুন"). 1194 split list: the first 50.
  const [rows, phoneRows, splitRows] = await Promise.all([
    listCustomers(query, { offset: (page - 1) * CUSTOMER_PAGE_SIZE, limit: CUSTOMER_PAGE_SIZE }),
    listCustomers(query, { offset: 0, limit: query.n }),
    listCustomers(query, { offset: 0, limit: 50 }),
  ]);
  const selId = query.sel ?? splitRows[0]?.id;
  const preview = selId ? await getCustomerPreview(selId) : null;

  return (
    <CustomersView
      lang={lang}
      t={t.customers}
      query={{ ...query, page }}
      total={total}
      pages={pages}
      pageSize={CUSTOMER_PAGE_SIZE}
      rows={rows}
      phoneRows={phoneRows}
      splitRows={splitRows}
      preview={preview}
    />
  );
}
