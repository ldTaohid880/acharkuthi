import { cache } from "react";
import { and, asc, db, eq, inArray, schema } from "@repo/db";
import { slug as slugSchema } from "@repo/validators";
import type { RecipeCard } from "./recipe-view";

/** Read-only recipe queries for the storefront. Server Components only. */

/** Every published recipe, in the order set by `sortOrder`. The list page filters them in the browser. */
export const getRecipeCards = cache(async (): Promise<RecipeCard[]> => {
  const rows = await db
    .select({
      id: schema.recipes.id,
      slug: schema.recipes.slug,
      title: schema.recipes.title,
      subtitle: schema.recipes.subtitle,
      summary: schema.recipes.summary,
      category: schema.recipes.category,
      totalMinutes: schema.recipes.totalMinutes,
      difficulty: schema.recipes.difficulty,
      imageUrl: schema.recipes.imageUrl,
      imageFile: schema.recipes.imageFile,
      imageAlt: schema.recipes.imageAlt,
      featuredOrder: schema.recipes.featuredOrder,
      isSample: schema.recipes.isSample,
    })
    .from(schema.recipes)
    .where(eq(schema.recipes.isPublished, true))
    .orderBy(asc(schema.recipes.sortOrder), asc(schema.recipes.id));
  return rows;
});

/** Active pickles by slug, for links that must point at a real product. Name comes from the database. */
export const getPickleLinks = cache(async (slugs: string[]) => {
  if (slugs.length === 0) return new Map<string, { slug: string; name: string }>();
  const rows = await db
    .select({ slug: schema.products.slug, name: schema.products.name })
    .from(schema.products)
    .where(inArray(schema.products.slug, slugs));
  return new Map(rows.map((r) => [r.slug, r]));
});

/** One published recipe with everything the detail page shows, or undefined for an unknown slug. */
export const getRecipeBySlug = cache(async (raw: string) => {
  const parsed = slugSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  const row = await db.query.recipes.findFirst({
    where: and(eq(schema.recipes.slug, parsed.data), eq(schema.recipes.isPublished, true)),
    with: { product: { with: { variants: true } } },
  });
  if (!row) return undefined;
  const { product, ...recipe } = row;
  return { recipe, product: product && product.isActive ? product : null };
});

/** Up to `limit` other recipes: same category first, then the rest, each in list order. */
export async function getRelatedRecipes(current: { id: number; category: RecipeCard["category"] }, limit = 3) {
  const all = (await getRecipeCards()).filter((r) => r.id !== current.id);
  return [...all.filter((r) => r.category === current.category), ...all.filter((r) => r.category !== current.category)].slice(0, limit);
}
