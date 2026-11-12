"use server";

import { and, count, db, desc, eq, inArray, like, or, schema, sql, sum } from "@repo/db";
import { formatTaka } from "@repo/ui/lib/utils";
import { adminSearchInput } from "@repo/validators";
import { countOf, digits } from "@/lib/format";
import { getDict } from "@/lib/i18n/server";
import { initialsOf } from "@/lib/initials";
import { statusLabel, statusTone, type StatusTone } from "@/lib/order-status";
import { requireAdmin } from "@/lib/require-admin";
import { storefrontAsset } from "@/lib/storefront-url";

export interface SearchOrder {
  id: number;
  number: string;
  name: string;
  phone: string;
  tone: StatusTone;
  status: string;
  total: string;
}
export interface SearchCustomer {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  orders: string;
}
export interface SearchProduct {
  id: number;
  bn: string;
  en: string;
  image: string | null;
  sizes: string;
}
export interface SearchResults {
  orders: SearchOrder[];
  customers: SearchCustomer[];
  products: SearchProduct[];
}

/**
 * ⌘K search (Search-*.dc.html): orders by number, name, phone or email for everyone; customers
 * and products for the owner only (staff can't open those pages).
 */
export async function adminSearch(input: unknown): Promise<SearchResults> {
  const { role } = await requireAdmin();
  const { q } = adminSearchInput.parse(input);
  const { lang } = await getDict();
  const pat = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const { orders, user, products, productVariants, productImages } = schema;

  const orderRows = await db
    .select({
      id: orders.id,
      number: orders.orderNumber,
      name: orders.customerName,
      phone: orders.customerPhone,
      status: orders.status,
      total: orders.total,
    })
    .from(orders)
    .where(
      or(
        like(orders.orderNumber, pat),
        like(orders.customerName, pat),
        like(orders.customerPhone, pat),
        like(orders.customerEmail, pat),
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(5);

  const results: SearchResults = {
    orders: orderRows.map((o) => {
      const tone = statusTone(o.status);
      return { ...o, tone, status: statusLabel(tone, lang), total: formatTaka(o.total) };
    }),
    customers: [],
    products: [],
  };
  if (role !== "owner") return results;

  const custRows = await db
    .select({ id: user.id, name: user.name, email: user.email, phone: user.phone })
    .from(user)
    .where(
      and(
        eq(user.role, "user"),
        or(like(user.name, pat), like(user.email, pat), like(user.phone, pat)),
      ),
    )
    .limit(3);
  const orderCounts = custRows.length
    ? await db
        .select({ userId: orders.userId, n: count() })
        .from(orders)
        .where(
          inArray(
            orders.userId,
            custRows.map((c) => c.id),
          ),
        )
        .groupBy(orders.userId)
    : [];
  results.customers = custRows.map((c) => {
    const n = orderCounts.find((o) => o.userId === c.id)?.n ?? 0;
    return {
      id: c.id,
      name: c.name,
      initials: initialsOf(c.name),
      email: c.email,
      phone: c.phone ?? "",
      orders: countOf(n, lang, "টি অর্ডার", ["order", "orders"]),
    };
  });

  const prodRows = await db
    .select({
      id: products.id,
      name: products.name,
      nameBn: products.nameBn,
      sizes: count(productVariants.id),
      stock: sum(productVariants.stock),
      image: sql<
        string | null
      >`(select ${productImages.url} from ${productImages} where ${productImages.productId} = ${products.id} order by ${productImages.sortOrder} limit 1)`,
    })
    .from(products)
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .where(
      or(
        like(products.name, pat),
        like(products.nameBn, pat),
        like(products.slug, pat),
        like(products.searchTerms, pat),
      ),
    )
    .groupBy(products.id)
    .limit(3);
  const { t } = await getDict();
  results.products = prodRows.map((p) => ({
    id: p.id,
    bn: p.nameBn ?? p.name,
    en: p.name,
    image: storefrontAsset(p.image),
    sizes: `${digits(p.sizes, lang)}${t.search.sizes} · ${t.search.stock} ${Number(p.stock ?? 0)}`,
  }));
  return results;
}
