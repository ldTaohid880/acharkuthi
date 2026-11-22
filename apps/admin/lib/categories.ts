import "server-only";

import { asc, count, db, schema } from "@repo/db";
import { uploadsEnabled } from "@/lib/r2";
import { storefrontAsset } from "@/lib/storefront-url";

export interface CategoryRow {
  id: number;
  nameBn: string;
  name: string;
  slug: string;
  description: string;
  descriptionBn: string;
  imageUrl: string | null;
  /** Address the browser can load (seed images are storefront paths). */
  imageSrc: string | null;
  /** Shop page header photo (owner, 2026-11-22); null shows the default. */
  headerImageUrl: string | null;
  headerImageSrc: string | null;
  isActive: boolean;
  products: number;
}

/** Categories-* boards: every category in shop order, with its product count. */
export async function listCategories(): Promise<{ rows: CategoryRow[]; uploads: boolean }> {
  const { categories, products } = schema;
  const [cats, counts] = await Promise.all([
    db.query.categories.findMany({ orderBy: [asc(categories.sortOrder), asc(categories.id)] }),
    db.select({ id: products.categoryId, n: count() }).from(products).groupBy(products.categoryId),
  ]);
  const byCat = new Map(counts.map((c) => [c.id, c.n]));
  return {
    uploads: uploadsEnabled(),
    rows: cats.map((c) => ({
      id: c.id,
      nameBn: c.nameBn ?? "",
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      descriptionBn: c.descriptionBn ?? "",
      imageUrl: c.imageUrl,
      imageSrc: storefrontAsset(c.imageUrl),
      headerImageUrl: c.headerImageUrl,
      headerImageSrc: storefrontAsset(c.headerImageUrl),
      isActive: c.isActive,
      products: byCat.get(c.id) ?? 0,
    })),
  };
}
