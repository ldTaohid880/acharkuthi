"use server";

import { and, db, eq, max, ne, schema } from "@repo/db";
import {
  adminCategoryInput,
  categoryDeleteInput,
  categoryOrderInput,
  productImageUploadInput,
} from "@repo/validators";
import { revalidatePath } from "next/cache";
import {
  deleteProductImage,
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  putProductImage,
  uploadsEnabled,
} from "@/lib/r2";
import { requireRole } from "@/lib/require-admin";

export type CategorySaveResult = { ok: true; id: number } | { ok: false; slugTaken: true };

/** "সংরক্ষণ করুন" in the category editor (owner only). New categories go to the end of the list. */
export async function saveCategory(input: unknown): Promise<CategorySaveResult> {
  await requireRole("owner");
  const d = adminCategoryInput.parse(input);
  const { categories } = schema;
  const clash = await db.query.categories.findFirst({
    where: d.id
      ? and(eq(categories.slug, d.slug), ne(categories.id, d.id))
      : eq(categories.slug, d.slug),
    columns: { id: true },
  });
  if (clash) return { ok: false, slugTaken: true };

  const fields = {
    nameBn: d.nameBn,
    name: d.name,
    slug: d.slug,
    description: d.description || null,
    descriptionBn: d.descriptionBn || null,
    tagline: d.tagline || null,
    taglineBn: d.taglineBn || null,
    imageUrl: d.imageUrl,
    headerImageUrl: d.headerImageUrl,
    isActive: d.isActive,
  };
  let id = d.id ?? 0;
  if (d.id) {
    const old = await db.query.categories.findFirst({
      where: eq(categories.id, d.id),
      columns: { imageUrl: true, headerImageUrl: true },
    });
    await db.update(categories).set(fields).where(eq(categories.id, d.id));
    if (old?.imageUrl && old.imageUrl !== d.imageUrl)
      await deleteProductImage(old.imageUrl).catch((e: unknown) => console.error(e));
    if (old?.headerImageUrl && old.headerImageUrl !== d.headerImageUrl)
      await deleteProductImage(old.headerImageUrl).catch((e: unknown) => console.error(e));
  } else {
    const [last] = await db.select({ n: max(categories.sortOrder) }).from(categories);
    const [row] = await db
      .insert(categories)
      .values({ ...fields, sortOrder: (last?.n ?? 0) + 1 })
      .$returningId();
    if (!row) throw new Error("category insert returned no id");
    id = row.id;
  }
  revalidatePath("/", "layout");
  return { ok: true, id };
}

/** Drag / arrows: saves the whole order at once. The shop lists categories in this order. */
export async function reorderCategories(input: unknown): Promise<void> {
  await requireRole("owner");
  const { ids } = categoryOrderInput.parse(input);
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries())
      await tx
        .update(schema.categories)
        .set({ sortOrder: i + 1 })
        .where(eq(schema.categories.id, id));
  });
  revalidatePath("/", "layout");
}

/**
 * Owner decision: a category with products can be deleted; its products keep selling with no
 * category (the foreign key sets them to null).
 */
export async function deleteCategory(input: unknown): Promise<void> {
  await requireRole("owner");
  const { id } = categoryDeleteInput.parse(input);
  const old = await db.query.categories.findFirst({
    where: eq(schema.categories.id, id),
    columns: { imageUrl: true, headerImageUrl: true },
  });
  await db.delete(schema.categories).where(eq(schema.categories.id, id));
  for (const url of [old?.imageUrl, old?.headerImageUrl])
    if (url) await deleteProductImage(url).catch((e: unknown) => console.error(e));
  revalidatePath("/", "layout");
}

export type CategoryUploadResult =
  { ok: true; url: string } | { ok: false; reason: "disabled" | "type" | "size" | "failed" };

/** "ছবি বদলান": one JPG / PNG / WebP up to 5 MB, stored in R2 (saved with the category). */
export async function uploadCategoryImage(form: FormData): Promise<CategoryUploadResult> {
  await requireRole("owner");
  if (!uploadsEnabled()) return { ok: false, reason: "disabled" };
  const { slug } = productImageUploadInput.parse({ slug: form.get("slug") || "category" });
  const file = form.get("file");
  if (!(file instanceof File) || !(file.type in IMAGE_TYPES)) return { ok: false, reason: "type" };
  if (file.size > IMAGE_MAX_BYTES) return { ok: false, reason: "size" };
  try {
    const url = await putProductImage(
      slug,
      await file.arrayBuffer(),
      file.type as keyof typeof IMAGE_TYPES,
      "categories",
    );
    return { ok: true, url };
  } catch (e) {
    console.error(e);
    return { ok: false, reason: "failed" };
  }
}
