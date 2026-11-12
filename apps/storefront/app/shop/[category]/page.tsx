import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { shopQuery } from "@repo/validators";
import { ShopSkeleton } from "@/components/shop-skeleton";
import { ShopView } from "@/components/shop-view";
import { getCategories, getCategoryBySlug, getShopProducts } from "@/lib/queries";

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, unknown>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shelf = await getCategoryBySlug((await params).category);
  return { title: shelf ? `${shelf.name} pickles` : "Shop" };
}

/**
 * Same client-side shop as /shop, opened on one shelf. The shelf lookup runs before any Suspense
 * boundary, so an unknown shelf gets a real 404 status and no shelf heading.
 */
export default async function ShelfPage({ params, searchParams }: Props) {
  const shelf = await getCategoryBySlug((await params).category);
  if (!shelf) notFound();
  return (
    <Suspense fallback={<ShopSkeleton shelfName={shelf.name} />}>
      <Shelf slug={shelf.slug} searchParams={searchParams} />
    </Suspense>
  );
}

async function Shelf({ slug, searchParams }: { slug: string; searchParams: Props["searchParams"] }) {
  const [shelves, products, sp] = await Promise.all([
    getCategories(),
    getShopProducts(),
    searchParams,
  ]);
  return (
    <ShopView
      products={products}
      shelves={shelves}
      initialShelf={slug}
      initialQuery={shopQuery.parse(sp)}
    />
  );
}
