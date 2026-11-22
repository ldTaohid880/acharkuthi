import "server-only";

import { asc, db, schema } from "@repo/db";
import { env } from "@/env";
import { lowStockLimit } from "@/lib/nav-counts";
import { storefrontAsset } from "@/lib/storefront-url";

export interface ProductRow {
  id: number;
  bn: string;
  en: string;
  searchTerms: string;
  categoryId: number | null;
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  stock: number;
  sizes: string[];
  /** "শেষ" (all sizes out), "{n}টি সাইজ শেষ", "স্টক কম" or nothing. */
  alert: { kind: "out" } | { kind: "sizesOut"; n: number } | { kind: "low" } | null;
  active: boolean;
  image: string | null;
  shopUrl: string;
}

export interface CategoryOption {
  id: number;
  name: string;
}

/** Products-* boards: every product with its active sizes, newest list order by name. */
export async function listProducts(): Promise<{
  rows: ProductRow[];
  categories: CategoryOption[];
}> {
  const limit = await lowStockLimit();
  const [products, cats] = await Promise.all([
    db.query.products.findMany({
      with: {
        category: { columns: { name: true, nameBn: true } },
        variants: { columns: { label: true, price: true, stock: true, isActive: true } },
        images: { columns: { url: true, sortOrder: true } },
      },
      orderBy: [asc(schema.products.name)],
    }),
    db.query.categories.findMany({
      columns: { id: true, name: true, nameBn: true },
      orderBy: [asc(schema.categories.sortOrder), asc(schema.categories.name)],
    }),
  ]);
  const rows = products.map((p): ProductRow => {
    const vs = p.variants.filter((v) => v.isActive).sort((a, b) => a.price - b.price);
    const stock = vs.reduce((n, v) => n + v.stock, 0);
    const outN = vs.filter((v) => v.stock === 0).length;
    const alert: ProductRow["alert"] = !vs.length
      ? null
      : stock === 0
        ? { kind: "out" }
        : outN
          ? { kind: "sizesOut", n: outN }
          : vs.some((v) => v.stock < limit)
            ? { kind: "low" }
            : null;
    const img = [...p.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
    return {
      id: p.id,
      bn: p.nameBn ?? p.name,
      en: p.name,
      searchTerms: p.searchTerms ?? "",
      categoryId: p.categoryId,
      category: p.category ? (p.category.nameBn ?? p.category.name) : null,
      minPrice: vs[0]?.price ?? null,
      maxPrice: vs.at(-1)?.price ?? null,
      stock,
      sizes: vs.map((v) => v.label),
      alert,
      active: p.isActive,
      image: storefrontAsset(img?.url ?? null),
      shopUrl: new URL(`/pickles/${p.slug}`, env.STOREFRONT_URL).toString(),
    };
  });
  return {
    rows,
    categories: cats.map((c) => ({ id: c.id, name: c.nameBn ?? c.name })),
  };
}
