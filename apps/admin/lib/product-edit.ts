import "server-only";

import { and, asc, avg, bySortOrder, count, db, eq, inArray, schema } from "@repo/db";
import { env } from "@/env";
import { uploadsEnabled } from "@/lib/r2";
import { storefrontAsset } from "@/lib/storefront-url";

export interface EditVariant {
  id: number;
  label: string;
  weightGrams: number | null;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  stock: number;
  isActive: boolean;
  /** Times ordered; a size that was ordered can't be deleted (owner decision), only turned off. */
  orders: number;
}

export interface EditImage {
  id: number;
  url: string;
  /** Address the browser can load (seed photos are storefront paths). */
  src: string;
  alt: string;
  altBn: string;
  /** Home "বিশেষ বাছাই" photo (owner, 2026-11-22). */
  isFeatured: boolean;
}

export interface EditProduct {
  id: number | null;
  nameBn: string;
  name: string;
  slug: string;
  categoryId: number | null;
  spiceLevel: number;
  searchTerms: string[];
  /** English; `descriptionBn` is the Bangla twin. Detail fields are Bangla, `…En` English. */
  description: string;
  descriptionBn: string;
  /** Home featured card line (Bangla); `taglineEn` is the English twin. */
  tagline: string;
  taglineEn: string;
  ingredients: string;
  ingredientsEn: string;
  flavor: string;
  flavorEn: string;
  texture: string;
  textureEn: string;
  serving: string;
  servingEn: string;
  storage: string;
  storageEn: string;
  shelfLife: string;
  shelfLifeEn: string;
  allergens: string;
  allergensEn: string;
  packaging: string;
  packagingEn: string;
  isActive: boolean;
  isFeatured: boolean;
  variants: EditVariant[];
  images: EditImage[];
  rating: { avg: number; count: number } | null;
  shopUrl: string | null;
}

export interface EditContext {
  categories: { id: number; name: string }[];
  uploads: boolean;
  storefront: string;
}

export const EMPTY_PRODUCT: EditProduct = {
  id: null,
  nameBn: "",
  name: "",
  slug: "",
  categoryId: null,
  spiceLevel: 0,
  searchTerms: [],
  description: "",
  descriptionBn: "",
  tagline: "",
  taglineEn: "",
  ingredients: "",
  ingredientsEn: "",
  flavor: "",
  flavorEn: "",
  texture: "",
  textureEn: "",
  serving: "",
  servingEn: "",
  storage: "",
  storageEn: "",
  shelfLife: "",
  shelfLifeEn: "",
  allergens: "",
  allergensEn: "",
  packaging: "",
  packagingEn: "",
  isActive: true,
  isFeatured: false,
  variants: [],
  images: [],
  rating: null,
  shopUrl: null,
};

export async function getEditContext(): Promise<EditContext> {
  const cats = await db.query.categories.findMany({
    columns: { id: true, name: true, nameBn: true },
    orderBy: [asc(schema.categories.sortOrder), asc(schema.categories.name)],
  });
  return {
    categories: cats.map((c) => ({ id: c.id, name: c.nameBn ?? c.name })),
    uploads: uploadsEnabled(),
    storefront: env.STOREFRONT_URL,
  };
}

/** Everything the product edit page shows (ProductEdit-*), or null if there's no such product. */
export async function getProductForEdit(id: number): Promise<EditProduct | null> {
  const { products, orderItems, reviews } = schema;
  const p = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: { variants: true, images: true },
  });
  if (!p) return null;
  p.variants.sort(bySortOrder);
  p.images.sort(bySortOrder);
  const variantIds = p.variants.map((v) => v.id);
  const [used, [rate]] = await Promise.all([
    variantIds.length
      ? db
          .select({ variantId: orderItems.variantId, n: count() })
          .from(orderItems)
          .where(inArray(orderItems.variantId, variantIds))
          .groupBy(orderItems.variantId)
      : [],
    db
      .select({ avg: avg(reviews.rating), n: count() })
      .from(reviews)
      .where(and(eq(reviews.productId, id), eq(reviews.isApproved, true))),
  ]);
  const ordered = new Map(used.map((u) => [u.variantId, u.n]));
  return {
    id: p.id,
    nameBn: p.nameBn ?? "",
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    spiceLevel: p.spiceLevel,
    // Older rows hold space-separated words ("kancha aam amer achar …"); a piece over the
    // 60-character term limit is split into its words so the form can save again.
    searchTerms: [
      ...new Set(
        (p.searchTerms ?? "")
          .split(/[,،\n]/)
          .flatMap((s) => (s.trim().length > 60 ? s.split(/\s+/) : [s]))
          .map((s) => s.trim().slice(0, 60))
          .filter(Boolean),
      ),
    ],
    description: p.description ?? "",
    descriptionBn: p.descriptionBn ?? "",
    tagline: p.tagline ?? "",
    taglineEn: p.taglineEn ?? "",
    ingredients: p.ingredients ?? "",
    ingredientsEn: p.ingredientsEn ?? "",
    flavor: p.flavor ?? "",
    flavorEn: p.flavorEn ?? "",
    texture: p.texture ?? "",
    textureEn: p.textureEn ?? "",
    serving: p.serving ?? "",
    servingEn: p.servingEn ?? "",
    storage: p.storage ?? "",
    storageEn: p.storageEn ?? "",
    shelfLife: p.shelfLife ?? "",
    shelfLifeEn: p.shelfLifeEn ?? "",
    allergens: p.allergens ?? "",
    allergensEn: p.allergensEn ?? "",
    packaging: p.packaging ?? "",
    packagingEn: p.packagingEn ?? "",
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    variants: p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      weightGrams: v.weightGrams,
      sku: v.sku,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      costPrice: v.costPrice,
      stock: v.stock,
      isActive: v.isActive,
      orders: ordered.get(v.id) ?? 0,
    })),
    images: p.images.map((im) => ({
      id: im.id,
      url: im.url,
      src: storefrontAsset(im.url) ?? im.url,
      alt: im.alt ?? "",
      altBn: im.altBn ?? "",
      isFeatured: im.isFeatured,
    })),
    rating: rate && rate.n > 0 ? { avg: Number(rate.avg), count: rate.n } : null,
    shopUrl: new URL(`/pickles/${p.slug}`, env.STOREFRONT_URL).toString(),
  };
}
