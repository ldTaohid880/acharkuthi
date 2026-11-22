import { and, asc, db, eq, getShopRules, schema } from "@repo/db";
import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/require-admin";
import { NewOrderForm, type SellableVariant } from "./new-order-form";

export const metadata: Metadata = { title: "New order" };

/**
 * নতুন অর্ডার (owner request 2026-11-13, no board): orders taken in person, by phone or on
 * social media. Prices shown here are only for the running total; the action re-reads them.
 */
export default async function NewOrderPage() {
  await requireAdmin();
  const { productVariants: v, products: p } = schema;
  const [{ lang, t }, variants, rules] = await Promise.all([
    getDict(),
    db
      .select({
        id: v.id,
        label: v.label,
        price: v.price,
        stock: v.stock,
        name: p.name,
        nameBn: p.nameBn,
      })
      .from(v)
      .innerJoin(p, eq(p.id, v.productId))
      .where(and(eq(v.isActive, true), eq(p.isActive, true)))
      .orderBy(asc(p.name), asc(v.price)),
    getShopRules(),
  ]);
  const list: SellableVariant[] = variants.map((r) => ({
    id: r.id,
    name: r.name,
    nameBn: r.nameBn,
    label: r.label,
    price: r.price,
    stock: r.stock,
  }));
  return <NewOrderForm variants={list} fees={rules.fees} t={t.orders} lang={lang} />;
}
