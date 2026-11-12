"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { auth } from "@repo/auth";
import { and, db, eq, notifyAdmins, schema } from "@repo/db";
import { productReviewInput } from "@repo/validators";

export type ProductReviewField = "name" | "rating" | "title" | "body" | "photo";

export interface ProductReviewState {
  status: "idle" | "ok" | "invalid" | "fail";
  errors: Partial<Record<ProductReviewField, string>>;
}

const text = (data: FormData, key: string) => {
  const v = data.get(key);
  return typeof v === "string" ? v : undefined;
};

/** File signatures, so a renamed non-image is refused whatever its declared type. */
function imageExt(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
    return "png";
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return "webp";
  return null;
}

/** Dev storage: apps/storefront/public/uploads/reviews. Swap for object storage before production. */
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "reviews");

/**
 * Stores a product review as unapproved. Anyone may review; signed-in reviewers get their account
 * name, guests must type one. It shows on the product page once an admin approves it.
 */
export async function submitProductReview(
  _prev: ProductReviewState,
  data: FormData,
): Promise<ProductReviewState> {
  if (text(data, "website")) return { status: "ok", errors: {} }; // honeypot

  const photo = data.get("photo");
  const parsed = productReviewInput.safeParse({
    productId: text(data, "productId"),
    name: text(data, "name"),
    rating: text(data, "rating"),
    title: text(data, "title"),
    body: text(data, "body"),
    spice: text(data, "spice") || undefined,
    photo: photo instanceof File ? photo : undefined,
  });

  const session = await auth.api.getSession({ headers: await headers() });
  const errors: ProductReviewState["errors"] = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as ProductReviewField | undefined;
      if (key && !errors[key]) errors[key] = issue.message;
    }
  }
  const name = session?.user.name.trim() || parsed.data?.name || "";
  if (!name) errors.name = "আপনার নাম লিখুন";
  if (!parsed.success || Object.keys(errors).length > 0) return { status: "invalid", errors };
  const input = parsed.data;

  const product = await db.query.products.findFirst({
    where: and(eq(schema.products.id, input.productId), eq(schema.products.isActive, true)),
    columns: { id: true, name: true, nameBn: true },
  });
  if (!product) return { status: "fail", errors: {} };

  let photoUrl: string | null = null;
  let photoPath: string | null = null;
  if (input.photo) {
    const bytes = new Uint8Array(await input.photo.arrayBuffer());
    const ext = imageExt(bytes);
    if (!ext) return { status: "invalid", errors: { photo: "শুধু JPG, PNG বা WebP ছবি দিন" } };
    const file = `${randomUUID()}.${ext}`;
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
      photoPath = path.join(UPLOAD_DIR, file);
      await writeFile(photoPath, bytes);
      photoUrl = `/uploads/reviews/${file}`;
    } catch (err) {
      console.error("review photo save failed", err);
      return { status: "fail", errors: {} };
    }
  }

  try {
    await db.insert(schema.reviews).values({
      productId: product.id,
      userId: session?.user.id ?? null,
      name,
      rating: input.rating,
      title: input.title ?? null,
      comment: input.body,
      spice: input.spice ?? null,
      photoUrl,
    });
  } catch (err) {
    // Includes a signed-in customer reviewing the same product twice (unique user + product).
    console.error("product review insert failed", err);
    if (photoPath) await unlink(photoPath).catch(() => undefined);
    return { status: "fail", errors: {} };
  }
  await notifyAdmins({
    kind: "review",
    rating: input.rating,
    name,
    product: { bn: product.nameBn ?? product.name, en: product.name },
  });
  return { status: "ok", errors: {} };
}
