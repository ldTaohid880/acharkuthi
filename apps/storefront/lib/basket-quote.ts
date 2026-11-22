import { bySortOrder, db, inArray, schema } from "@repo/db";

/** Server only. Reads the basket's variants from the database, so the basket never shows a cart price as current. */

/**
 * ok: can be bought now. novariant: the size is no longer sold. gone: the product is off sale,
 * the variant was deleted, or it is out of stock.
 */
export type LineKind = "ok" | "novariant" | "gone";

export function lineKind(
  variant: { isActive: boolean; stock: number } | undefined,
  product: { isActive: boolean } | undefined,
): LineKind {
  if (!variant || !product || !product.isActive) return "gone";
  if (!variant.isActive) return "novariant";
  if (variant.stock <= 0) return "gone";
  return "ok";
}

export interface BasketQuote {
  variantId: number;
  kind: LineKind;
  /** Empty when the variant no longer exists; the page then keeps the cart's own name. */
  productName: string;
  productNameBn: string | null;
  slug: string | null;
  variantLabel: string;
  spiceLevel: number;
  imageUrl: string | null;
  /** Paisa. */
  unitPrice: number;
  /** Paisa. Set only when it is higher than unitPrice (the "was" price). */
  compareAtPrice: number | null;
  stock: number;
}

/** One quote per requested variant id, in the order asked. Missing variants come back as "gone". */
export async function quoteVariants(variantIds: number[]): Promise<BasketQuote[]> {
  const ids = [...new Set(variantIds)];
  if (ids.length === 0) return [];

  const rows = await db.query.productVariants.findMany({
    where: inArray(schema.productVariants.id, ids),
    with: {
      product: { with: { images: true } },
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));

  return ids.map((variantId) => {
    const row = byId.get(variantId);
    const product = row?.product;
    const kind = lineKind(row, product);
    const showWas = row && row.compareAtPrice !== null && row.compareAtPrice > row.price;
    return {
      variantId,
      kind,
      productName: product?.name ?? "",
      productNameBn: product?.nameBn ?? null,
      slug: product?.slug ?? null,
      variantLabel: row?.label ?? "",
      spiceLevel: product?.spiceLevel ?? 0,
      imageUrl: product?.images.sort(bySortOrder)[0]?.url ?? null,
      unitPrice: row?.price ?? 0,
      compareAtPrice: showWas ? row.compareAtPrice : null,
      stock: row?.stock ?? 0,
    };
  });
}
