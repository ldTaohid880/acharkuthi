import type { Route } from "next";

/**
 * Links to pages the design covers but that are not built yet. Cast once here so
 * `typedRoutes` stays strict everywhere else; they resolve to the 404 page for now.
 */
export const soon = (path: string) => path as Route;

export const shopHref = (categorySlug?: string): Route =>
  (categorySlug ? `/shop/${categorySlug}` : "/shop") as Route;

export const productHref = (slug: string): Route => `/pickles/${slug}` as Route;
export const recipeHref = (slug: string): Route => `/recipes/${slug}` as Route;
