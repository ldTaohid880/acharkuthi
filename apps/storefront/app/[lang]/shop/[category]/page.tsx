import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { shopQuery } from "@repo/validators";
import { ShopSkeleton } from "@/components/shop-skeleton";
import { ShopView } from "@/components/shop-view";
import { JsonLd } from "@/components/json-ld";
import { getCategories, getCategoryBySlug, getShopProducts } from "@/lib/queries";
import { shopHref } from "@/lib/routes";
import { getDict } from "@/lib/i18n/dict";
import { pickString } from "@/lib/i18n/pick";
import { breadcrumbJsonLd, langOf, pageMeta, realCopy } from "@/lib/seo";

interface Props {
  params: Promise<{ lang: string; category: string }>;
  searchParams: Promise<Record<string, unknown>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shelf = await getCategoryBySlug((await params).category);
  const lang = await langOf(params);
  if (!shelf) return { title: getDict(lang).meta.shop };
  const label = getDict("bn").shelf.label[shelf.slug] ?? `${shelf.nameBn ?? shelf.name} আচার`;
  return pageMeta({
    title: lang === "bn" ? label : `${shelf.name} pickles`,
    // The shelf's own description from admin, else a plain factual line.
    description:
      realCopy(pickString(lang, shelf.descriptionBn, shelf.description)) ??
      (lang === "bn"
        ? `আচারকুঠির ঐতিহ্যবাহী ${label}, ঢাকায় শিলে বাটা মসলায় তৈরি। সাইজ ও দাম টাকায়, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।`
        : `${shelf.name} pickles from Acharkuthi, made in small batches in Dhaka with stone-ground spices. Sizes and prices in taka, cash on delivery across Bangladesh.`),
    path: shopHref(shelf.slug),
    lang,
  });
}

/**
 * Same client-side shop as /shop, opened on one shelf. The shelf lookup runs before any Suspense
 * boundary, so an unknown shelf gets a real 404 status and no shelf heading.
 */
export default async function ShelfPage({ params, searchParams }: Props) {
  const shelf = await getCategoryBySlug((await params).category);
  if (!shelf) notFound();
  const lang = await langOf(params);
  // Heading lead in the page language ("Mango" / "আমের") for the loading skeleton.
  const lead =
    lang === "bn"
      ? (getDict("bn").shelf.label[shelf.slug] ?? shelf.nameBn ?? shelf.name).replace(
          /\s*আচার$/,
          "",
        )
      : shelf.name;
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(
          [
            [getDict(lang).meta.crumbHome, "/"],
            [getDict(lang).meta.shop, shopHref()],
            [lang === "bn" ? (shelf.nameBn ?? shelf.name) : shelf.name, shopHref(shelf.slug)],
          ],
          lang,
        )}
      />
      <Suspense fallback={<ShopSkeleton shelfName={lead} />}>
        <Shelf slug={shelf.slug} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Shelf({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: Props["searchParams"];
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
      initialShelf={slug}
      initialQuery={shopQuery.parse(sp)}
    />
  );
}
