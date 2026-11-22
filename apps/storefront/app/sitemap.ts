import type { MetadataRoute } from "next";
import { and, db, eq, schema } from "@repo/db";
import { productHref, recipeHref, shopHref } from "@/lib/routes";
import { localePath, type Lang } from "@/lib/i18n/lang";
import { absolute } from "@/lib/site-url";
import { RECIPES_LIVE } from "@/lib/features";

// Read from the database on each request (the build has no database), like every other page.
export const dynamic = "force-dynamic";

/** Fixed pages, in the order a shopper meets them. */
const PAGES = [
  "/",
  "/shop",
  ...(RECIPES_LIVE ? ["/recipes"] : []),
  "/our-story",
  "/contact",
  "/faq",
  "/shipping-policy",
  "/return-refund-policy",
  "/privacy-policy",
  "/terms-and-conditions",
] as const;

/**
 * /sitemap.xml: the fixed pages, every active category and product, and every published recipe
 * except the design's placeholder ones (`is_sample`).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, recipes] = await Promise.all([
    db
      .select({ slug: schema.categories.slug })
      .from(schema.categories)
      .where(eq(schema.categories.isActive, true)),
    db
      .select({ slug: schema.products.slug, updatedAt: schema.products.updatedAt })
      .from(schema.products)
      .where(eq(schema.products.isActive, true)),
    db
      .select({ slug: schema.recipes.slug })
      .from(schema.recipes)
      .where(and(eq(schema.recipes.isPublished, true), eq(schema.recipes.isSample, false))),
  ]);

  const pages: { path: string; lastModified?: Date }[] = [
    ...PAGES.map((p) => ({ path: p })),
    ...categories.map((c) => ({ path: shopHref(c.slug) })),
    ...products.map((p) => ({ path: productHref(p.slug), lastModified: p.updatedAt })),
    ...(RECIPES_LIVE ? recipes.map((r) => ({ path: recipeHref(r.slug) })) : []),
  ];
  // Every page in both languages, each listing its twin (hreflang), Bangla first.
  const both = (path: string) => ({
    languages: { bn: absolute(localePath("bn", path)), en: absolute(localePath("en", path)) },
  });
  return (["bn", "en"] as Lang[]).flatMap((lang) =>
    pages.map(({ path, lastModified }) => ({
      url: absolute(localePath(lang, path)),
      ...(lastModified ? { lastModified } : {}),
      alternates: both(path),
    })),
  );
}
