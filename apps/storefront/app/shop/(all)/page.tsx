import type { Metadata } from "next";
import { shopQuery } from "@repo/validators";
import { ShopView } from "@/components/shop-view";
import { getCategories, getShopProducts } from "@/lib/queries";

export const metadata: Metadata = { title: "Shop all pickles" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, unknown>>;
}) {
  const [shelves, products, sp] = await Promise.all([
    getCategories(),
    getShopProducts(),
    searchParams,
  ]);
  return (
    <ShopView
      products={products}
      shelves={shelves}
      initialShelf={undefined}
      initialQuery={shopQuery.parse(sp)}
    />
  );
}
