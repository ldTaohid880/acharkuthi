import { db, eq, or, schema } from "@repo/db";
import { ogSourceQuery } from "@repo/validators";
import { env } from "@/env";
import { IMAGE_MAX_BYTES, r2PublicUrl } from "@/lib/r2";
import { requireAdmin } from "@/lib/require-admin";

/**
 * Same-origin copy of one of our photos for the share-card renderer (lib/og/render.ts). A canvas
 * that draws a cross-origin image without CORS headers can't be exported, so the browser reads
 * the photo through here instead of from R2. Admins only, and only our own photos: the R2 public
 * address, storefront /images/… files, or a photo our database already points at (product
 * photos, shelf images, Share Studio uploads; covers R2's custom domain). Never an arbitrary URL.
 */
async function isStoredPhoto(u: string) {
  const [img] = await db
    .select({ id: schema.productImages.id })
    .from(schema.productImages)
    .where(eq(schema.productImages.url, u))
    .limit(1);
  if (img) return true;
  const [shelf] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(or(eq(schema.categories.headerImageUrl, u), eq(schema.categories.imageUrl, u)))
    .limit(1);
  if (shelf) return true;
  const [card] = await db
    .select({ id: schema.shareCards.id })
    .from(schema.shareCards)
    .where(eq(schema.shareCards.sourceImageUrl, u))
    .limit(1);
  return !!card;
}
export async function GET(req: Request) {
  await requireAdmin();
  const q = ogSourceQuery.safeParse({ u: new URL(req.url).searchParams.get("u") });
  if (!q.success) return new Response("Bad request", { status: 400 });
  const u = q.data.u;
  const r2 = r2PublicUrl();
  const storefront = `${env.STOREFRONT_URL.replace(/\/+$/, "")}/images/`;
  const ours =
    (r2 && u.startsWith(`${r2}/`)) || u.startsWith(storefront) || (await isStoredPhoto(u));
  if (!ours) return new Response("Not our photo", { status: 403 });

  const res = await fetch(u, { signal: AbortSignal.timeout(15_000), cache: "no-store" }).catch(
    () => null,
  );
  const type = res?.headers.get("content-type") ?? "";
  if (!res?.ok || !/^image\/(jpeg|png|webp)$/.test(type))
    return new Response("Photo unavailable", { status: 502 });
  const bytes = await res.arrayBuffer();
  if (bytes.byteLength > IMAGE_MAX_BYTES) return new Response("Too large", { status: 413 });
  return new Response(bytes, {
    headers: { "content-type": type, "cache-control": "private, max-age=300" },
  });
}
