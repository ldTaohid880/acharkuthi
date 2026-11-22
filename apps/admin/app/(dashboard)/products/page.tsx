import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { listProducts } from "@/lib/products";
import { requireRole } from "@/lib/require-admin";
import { ProductsView } from "./products-view";

export const metadata: Metadata = { title: "Products" };

/** পণ্য: Products-Desktop (≥1024), Products-Tablet (768–1023), Products-Phone (<768). Owner only. */
export default async function ProductsPage() {
  await requireRole("owner");
  const [{ lang, t }, { rows, categories }] = await Promise.all([getDict(), listProducts()]);
  return <ProductsView rows={rows} categories={categories} t={t.products} lang={lang} />;
}
