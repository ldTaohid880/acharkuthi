import "server-only";

import { AwsClient } from "aws4fetch";
import { randomUUID } from "node:crypto";
import { env } from "@/env";
import { readImageSize, type ImageSize } from "@/lib/image-size";

/**
 * Product photos live in Cloudflare R2 (owner decision 2026-11-14): Hostinger replaces each
 * app's folder on deploy, and the admin subdomain is a separate app from the storefront.
 */
const cfg =
  env.R2_ACCOUNT_ID &&
  env.R2_ACCESS_KEY_ID &&
  env.R2_SECRET_ACCESS_KEY &&
  env.R2_BUCKET &&
  env.R2_PUBLIC_URL
    ? {
        account: env.R2_ACCOUNT_ID,
        key: env.R2_ACCESS_KEY_ID,
        secret: env.R2_SECRET_ACCESS_KEY,
        bucket: env.R2_BUCKET,
        publicUrl: env.R2_PUBLIC_URL.replace(/\/$/, ""),
      }
    : null;

export function uploadsEnabled(): boolean {
  return cfg !== null;
}

function r2() {
  if (!cfg) throw new Error("R2 is not configured");
  return {
    cfg,
    aws: new AwsClient({
      accessKeyId: cfg.key,
      secretAccessKey: cfg.secret,
      service: "s3",
      region: "auto",
    }),
  };
}

const objectUrl = (c: NonNullable<typeof cfg>, key: string) =>
  `https://${c.account}.r2.cloudflarestorage.com/${c.bucket}/${key}`;

export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Stores one photo and returns its public address (what product_images.url holds). */
export async function putProductImage(
  productSlug: string,
  bytes: ArrayBuffer,
  type: keyof typeof IMAGE_TYPES,
  folder: "products" | "categories" | "avatars" = "products",
): Promise<string> {
  const safe = productSlug.replace(/[^a-z0-9-]/g, "").slice(0, 60) || "product";
  const key = `${folder}/${safe}-${randomUUID().slice(0, 8)}.${IMAGE_TYPES[type]}`;
  const { cfg: c, aws } = r2();
  // Hostinger's network rejects a streamed body (R2 answered 411 Length Required): sign the
  // request, then send the bytes as one buffer with an explicit Content-Length.
  const signed = await aws.sign(objectUrl(c, key), {
    method: "PUT",
    body: bytes,
    headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable" },
  });
  const headers = new Headers(signed.headers);
  headers.set("content-length", String(bytes.byteLength));
  const res = await fetch(signed.url, { method: "PUT", headers, body: new Uint8Array(bytes) });
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status}`);
  return `${c.publicUrl}/${key}`;
}

/**
 * Width and height of a saved product photo, read from the file itself (owner, 2026-11-15).
 * Only our own photos are fetched: the R2 public address, or a storefront path like
 * /images/… (resolved against STOREFRONT_URL). Anything else, a failed fetch, a file over the
 * upload limit or an unreadable header gives null, and the photo is simply saved without a size.
 */
export async function productImageSize(url: string): Promise<ImageSize | null> {
  let target: string | null = null;
  if (cfg && url.startsWith(`${cfg.publicUrl}/`)) target = url;
  else if (url.startsWith("/") && !url.startsWith("//"))
    target = new URL(url, env.STOREFRONT_URL).toString();
  if (!target) return null;
  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (!res.ok) return null;
    if (Number(res.headers.get("content-length") ?? 0) > IMAGE_MAX_BYTES) return null;
    const bytes = await res.arrayBuffer();
    return bytes.byteLength > IMAGE_MAX_BYTES ? null : readImageSize(bytes);
  } catch (e) {
    console.error("product image size failed", url, e);
    return null;
  }
}

/** Removes a photo we stored (ignores photos that aren't ours, e.g. /images/… seed files). */
export async function deleteProductImage(url: string): Promise<void> {
  if (!cfg) return;
  const base = `${cfg.publicUrl}/`;
  if (!url.startsWith(base)) return;
  const { cfg: c, aws } = r2();
  const res = await aws.fetch(objectUrl(c, url.slice(base.length)), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed: ${res.status}`);
}
