import "server-only";

import { env } from "@/env";

/** Photos are stored as storefront paths ("/images/…"); the admin loads them from the storefront. */
export function storefrontAsset(path: string | null): string | null {
  if (!path) return null;
  return path.startsWith("/") ? new URL(path, env.STOREFRONT_URL).toString() : path;
}
