import type { Metadata } from "next";
import { shopQuery } from "@repo/validators";
import { ShopView } from "@/components/shop-view";
import { getCategories, getShopProducts } from "@/lib/queries";
import { langOf, pageMeta } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang = await langOf(params);
  return pageMeta({
    title: lang === "bn" ? "সব আচার" : "Shop all pickles",
    description:
      lang === "bn"
        ? "আচারকুঠির সব ঐতিহ্যবাহী আচার, সাইজ ও দাম টাকায়। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।"
        : "Every heritage Bengali pickle from Acharkuthi, with sizes and prices in taka. Cash on delivery across Bangladesh.",
    path: "/shop",
    lang,
  });
}

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
