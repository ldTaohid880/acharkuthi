"use server";

import { and, count, db, eq, inArray, ne, notInArray, schema } from "@repo/db";
import { productImageUploadInput, productSaveInput } from "@repo/validators";
import { revalidatePath } from "next/cache";
import {
  deleteProductImage,
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  productImageSize,
  putProductImage,
  uploadsEnabled,
} from "@/lib/r2";
import { requireRole } from "@/lib/require-admin";

export interface SaveErrors {
  slug?: "taken";
  /** Index in the submitted variants → problem. */
  sku?: Record<number, "taken" | "dup">;
  /** Labels of removed sizes that were already ordered (turn them off instead). */
  inUse?: string[];
}
export type SaveResult = { ok: true; id: number } | { ok: false; errors: SaveErrors };

class Abort extends Error {
  constructor(readonly errors: SaveErrors) {
    super("abort");
  }
}

/**
 * "সংরক্ষণ করুন" on the product edit page (owner only). Creates or updates the product, its sizes
 * (in the given order) and its photos. Removed sizes that were ever ordered stop the save; removed
 * photos are deleted from R2 after the save commits.
 */
export async function saveProduct(input: unknown): Promise<SaveResult> {
  await requireRole("owner");
  const d = productSaveInput.parse(input);
  const { products, productVariants: pv, productImages: pi, orderItems } = schema;

  // SKUs repeated inside the form.
  const dup: Record<number, "dup"> = {};
  d.variants.forEach((v, i) => {
    if (d.variants.findIndex((w) => w.sku.toLowerCase() === v.sku.toLowerCase()) !== i)
      dup[i] = "dup";
  });
  if (Object.keys(dup).length) return { ok: false, errors: { sku: dup } };

  // Pixel sizes of newly added photos, read before the transaction (network). The storefront uses
  // them to pick the gallery fit before the photo loads.
  const sizes = new Map(
    await Promise.all(
      d.images
        .filter((im) => !im.id)
        .map(async (im) => [im.url, await productImageSize(im.url)] as const),
    ),
  );

  let removedUrls: string[] = [];
  try {
    const id = await db.transaction(async (tx) => {
      const errors: SaveErrors = {};
      const slugOwner = await tx.query.products.findFirst({
        where: d.id
          ? and(eq(products.slug, d.slug), ne(products.id, d.id))
          : eq(products.slug, d.slug),
        columns: { id: true },
      });
      if (slugOwner) errors.slug = "taken";

      const own = d.id
        ? await tx.select({ id: pv.id, label: pv.label }).from(pv).where(eq(pv.productId, d.id))
        : [];
      const ownIds = new Set(own.map((v) => v.id));
      // Ids not belonging to this product are treated as new sizes.
      const keepIds = d.variants.flatMap((v) => (v.id && ownIds.has(v.id) ? [v.id] : []));
      const skuRows = await tx
        .select({ id: pv.id, sku: pv.sku })
        .from(pv)
        .where(
          inArray(
            pv.sku,
            d.variants.map((v) => v.sku),
          ),
        );
      const taken: Record<number, "taken"> = {};
      d.variants.forEach((v, i) => {
        const hit = skuRows.find((r) => r.sku.toLowerCase() === v.sku.toLowerCase());
        if (hit && !(v.id && hit.id === v.id && ownIds.has(v.id))) taken[i] = "taken";
      });
      if (Object.keys(taken).length) errors.sku = taken;

      const removed = own.filter((v) => !keepIds.includes(v.id));
      if (removed.length) {
        const used = await tx
          .select({ variantId: orderItems.variantId, n: count() })
          .from(orderItems)
          .where(
            inArray(
              orderItems.variantId,
              removed.map((v) => v.id),
            ),
          )
          .groupBy(orderItems.variantId);
        const inUse = removed.filter((v) => used.some((u) => u.variantId === v.id && u.n > 0));
        if (inUse.length) errors.inUse = inUse.map((v) => v.label);
      }
      if (errors.slug || errors.sku || errors.inUse) throw new Abort(errors);

      const fields = {
        nameBn: d.nameBn,
        name: d.name,
        slug: d.slug,
        categoryId: d.categoryId,
        spiceLevel: d.spiceLevel,
        searchTerms: d.searchTerms.join(", ") || null,
        description: d.description || null,
        descriptionBn: d.descriptionBn || null,
        tagline: d.tagline || null,
        taglineEn: d.taglineEn || null,
        ingredients: d.ingredients || null,
        ingredientsEn: d.ingredientsEn || null,
        flavor: d.flavor || null,
        flavorEn: d.flavorEn || null,
        texture: d.texture || null,
        textureEn: d.textureEn || null,
        serving: d.serving || null,
        servingEn: d.servingEn || null,
        storage: d.storage || null,
        storageEn: d.storageEn || null,
        shelfLife: d.shelfLife || null,
        shelfLifeEn: d.shelfLifeEn || null,
        allergens: d.allergens || null,
        allergensEn: d.allergensEn || null,
        packaging: d.packaging || null,
        packagingEn: d.packagingEn || null,
        isActive: d.isActive,
        isFeatured: d.isFeatured,
      };
      let productId = d.id ?? 0;
      if (d.id) {
        await tx.update(products).set(fields).where(eq(products.id, d.id));
      } else {
        const [row] = await tx.insert(products).values(fields).$returningId();
        if (!row) throw new Error("product insert returned no id");
        productId = row.id;
      }

      if (removed.length)
        await tx.delete(pv).where(
          inArray(
            pv.id,
            removed.map((v) => v.id),
          ),
        );
      for (const [i, v] of d.variants.entries()) {
        const values = {
          label: v.label,
          weightGrams: v.weightGrams,
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          costPrice: v.costPrice,
          stock: v.stock,
          isActive: v.isActive,
          sortOrder: i,
        };
        if (v.id && ownIds.has(v.id)) await tx.update(pv).set(values).where(eq(pv.id, v.id));
        else await tx.insert(pv).values({ ...values, productId });
      }

      const oldImages = await tx
        .select({ id: pi.id, url: pi.url })
        .from(pi)
        .where(eq(pi.productId, productId));
      const keepImg = d.images.flatMap((im) =>
        im.id && oldImages.some((o) => o.id === im.id) ? [im.id] : [],
      );
      const gone = oldImages.filter((o) => !keepImg.includes(o.id));
      removedUrls = gone.map((g) => g.url);
      if (gone.length)
        await tx
          .delete(pi)
          .where(
            and(
              eq(pi.productId, productId),
              keepImg.length ? notInArray(pi.id, keepImg) : undefined,
            ),
          );
      for (const [i, im] of d.images.entries()) {
        if (im.id && keepImg.includes(im.id))
          await tx
            .update(pi)
            .set({
              alt: im.alt || null,
              altBn: im.altBn || null,
              sortOrder: i,
              isFeatured: im.isFeatured,
            })
            .where(eq(pi.id, im.id));
        else {
          const size = sizes.get(im.url) ?? null;
          await tx.insert(pi).values({
            productId,
            url: im.url,
            alt: im.alt || null,
            altBn: im.altBn || null,
            sortOrder: i,
            isFeatured: im.isFeatured,
            width: size?.width ?? null,
            height: size?.height ?? null,
          });
        }
      }
      return productId;
    });

    for (const url of removedUrls) await deleteProductImage(url).catch((e) => console.error(e));
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (e) {
    if (e instanceof Abort) return { ok: false, errors: e.errors };
    throw e;
  }
}

export type UploadResult =
  { ok: true; url: string } | { ok: false; reason: "disabled" | "type" | "size" | "failed" };

/** "ছবি আপলোড": stores one JPG / PNG / WebP up to 5 MB in R2. Saved to the product on "সংরক্ষণ". */
export async function uploadProductImage(form: FormData): Promise<UploadResult> {
  await requireRole("owner");
  if (!uploadsEnabled()) return { ok: false, reason: "disabled" };
  const { slug } = productImageUploadInput.parse({ slug: form.get("slug") || "product" });
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, reason: "type" };
  if (!(file.type in IMAGE_TYPES)) return { ok: false, reason: "type" };
  if (file.size > IMAGE_MAX_BYTES) return { ok: false, reason: "size" };
  try {
    const url = await putProductImage(
      slug,
      await file.arrayBuffer(),
      file.type as keyof typeof IMAGE_TYPES,
    );
    return { ok: true, url };
  } catch (e) {
    console.error(e);
    return { ok: false, reason: "failed" };
  }
}
