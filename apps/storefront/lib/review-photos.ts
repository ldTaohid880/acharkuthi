import { AwsClient } from "aws4fetch";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/env";

/**
 * Review photos go to the same Cloudflare R2 bucket as the admin's product photos (owner,
 * 2026-11-22): Hostinger replaces the app folder on every deploy, so nothing a customer uploads
 * may live inside it. Without R2 settings, development falls back to public/uploads/reviews.
 */
const cfg =
  env.R2_ACCOUNT_ID &&
  env.R2_ACCESS_KEY_ID &&
  env.R2_SECRET_ACCESS_KEY &&
  env.R2_BUCKET &&
  env.R2_PUBLIC_URL
    ? {
        account: env.R2_ACCOUNT_ID,
        bucket: env.R2_BUCKET,
        publicUrl: env.R2_PUBLIC_URL.replace(/\/$/, ""),
        aws: new AwsClient({
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          service: "s3",
          region: "auto",
        }),
      }
    : null;

const LOCAL_DIR = path.join(process.cwd(), "public", "uploads", "reviews");
const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

const objectUrl = (c: NonNullable<typeof cfg>, key: string) =>
  `https://${c.account}.r2.cloudflarestorage.com/${c.bucket}/${key}`;

/** Stores one review photo and returns its public address (what reviews.photo_url holds). */
export async function putReviewPhoto(
  bytes: Uint8Array<ArrayBuffer>,
  ext: keyof typeof TYPES,
): Promise<string> {
  const file = `${randomUUID()}.${ext}`;
  if (cfg) {
    // Hostinger's network rejects a streamed body (R2 answered 411 Length Required): sign the
    // request, then send the bytes as one buffer with an explicit Content-Length.
    const signed = await cfg.aws.sign(objectUrl(cfg, `reviews/${file}`), {
      method: "PUT",
      body: bytes,
      headers: {
        "content-type": TYPES[ext],
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
    const headers = new Headers(signed.headers);
    headers.set("content-length", String(bytes.byteLength));
    const res = await fetch(signed.url, { method: "PUT", headers, body: bytes });
    if (!res.ok) throw new Error(`R2 upload failed: ${res.status}`);
    return `${cfg.publicUrl}/reviews/${file}`;
  }
  if (process.env.NODE_ENV === "production") throw new Error("R2 is not configured");
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, file), bytes);
  return `/uploads/reviews/${file}`;
}

/** Removes a photo stored by putReviewPhoto (used when the review row could not be saved). */
export async function deleteReviewPhoto(url: string): Promise<void> {
  if (cfg && url.startsWith(`${cfg.publicUrl}/`)) {
    await cfg.aws.fetch(objectUrl(cfg, url.slice(cfg.publicUrl.length + 1)), { method: "DELETE" });
    return;
  }
  if (url.startsWith("/uploads/reviews/"))
    await unlink(path.join(LOCAL_DIR, path.basename(url))).catch(() => undefined);
}
