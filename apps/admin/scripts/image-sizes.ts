/**
 * Fills product_images.width / height for photos saved before sizes were stored (owner,
 * 2026-11-15). Safe to run more than once: only rows without a size are read.
 * Run: pnpm --filter @acharkuthi/admin exec tsx --env-file=.env scripts/image-sizes.ts
 *
 * Storefront paths (/images/…) are read from apps/storefront/public when the file is there,
 * otherwise fetched from STOREFRONT_URL. Other addresses (the R2 bucket) are fetched as they are.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, db, eq, isNull, or, schema } from "@repo/db";
import { readImageSize } from "../lib/image-size";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, "../../storefront/public");
const MAX_BYTES = 5 * 1024 * 1024;

async function bytesOf(url: string): Promise<ArrayBuffer | Buffer | null> {
  if (url.startsWith("/") && !url.startsWith("//")) {
    const file = path.join(publicDir, decodeURIComponent(url.split("?")[0] ?? ""));
    if (file.startsWith(publicDir)) {
      const local = await readFile(file).catch(() => null);
      if (local) return local;
    }
    const base = process.env.STOREFRONT_URL;
    if (!base) return null;
    url = new URL(url, base).toString();
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res?.ok) return null;
  const buf = await res.arrayBuffer();
  return buf.byteLength > MAX_BYTES ? null : buf;
}

const pi = schema.productImages;
const rows = await db
  .select({ id: pi.id, url: pi.url })
  .from(pi)
  .where(or(isNull(pi.width), isNull(pi.height)));

let filled = 0;
for (const r of rows) {
  const bytes = await bytesOf(r.url);
  const size = bytes ? readImageSize(bytes) : null;
  if (!size) {
    console.log(`skipped (couldn't read): ${r.url}`);
    continue;
  }
  await db
    .update(pi)
    .set({ width: size.width, height: size.height })
    .where(and(eq(pi.id, r.id), or(isNull(pi.width), isNull(pi.height))));
  filled++;
  console.log(`${size.width}×${size.height}  ${r.url}`);
}
console.log(`${filled} of ${rows.length} photos now have a size.`);
process.exit(0);
