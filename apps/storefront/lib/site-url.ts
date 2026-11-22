import "server-only";

import { env } from "@/env";

/**
 * The storefront's public address, e.g. https://acharkuthi.com (no trailing slash). Better Auth
 * already needs it as BETTER_AUTH_URL, so robots.txt and the sitemap use the same value rather
 * than a second setting that could drift from it.
 */
export const siteUrl = env.BETTER_AUTH_URL.replace(/\/+$/, "");

/** Absolute address of a storefront path ("/shop" → "https://…/shop"). */
export const absolute = (path: string) => `${siteUrl}${path === "/" ? "" : path}`;
