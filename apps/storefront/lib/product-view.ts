import type { ShopQuery } from "@repo/validators";
import { shelfLabelBn } from "@/components/shelf-icon";

/** Minimal shapes the view helpers need (structurally satisfied by the Drizzle rows). */
export interface VariantLike {
  id: number;
  label: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  isActive: boolean;
}
export interface ProductLike {
  name: string;
  spiceLevel: number;
  isFeatured: boolean;
  createdAt: Date;
  variants: VariantLike[];
  /** Text the Shop search box matches (all optional so small fixtures stay small). */
  nameBn?: string | null;
  searchTerms?: string | null;
  category?: { slug: string; name: string; nameBn: string | null } | null;
}

export type HeatWord = "Mild" | "Medium" | "Hot";

/** Spice level 0-5 maps onto the design's three heat pods. */
export function heatOf(spiceLevel: number): { word: HeatWord; pods: 1 | 2 | 3 } {
  if (spiceLevel >= 4) return { word: "Hot", pods: 3 };
  if (spiceLevel >= 2) return { word: "Medium", pods: 2 };
  return { word: "Mild", pods: 1 };
}

/** The variant a card sells by default: cheapest active one in stock, else cheapest active. */
export function defaultVariant<V extends VariantLike>(variants: V[]): V | undefined {
  const active = variants.filter((v) => v.isActive).sort((a, b) => a.price - b.price);
  return active.find((v) => v.stock > 0) ?? active[0];
}

export function isInStock(variants: VariantLike[]): boolean {
  return variants.some((v) => v.isActive && v.stock > 0);
}

export function isOnSale(v: Pick<VariantLike, "price" | "compareAtPrice">): boolean {
  return v.compareAtPrice !== null && v.compareAtPrice > v.price;
}

/** Lower-cased, NFC words of a search; at most 6 so a pasted paragraph stays cheap. */
function searchWords(q: string): string[] {
  return q.toLowerCase().normalize("NFC").split(/\s+/).filter(Boolean).slice(0, 6);
}

/**
 * Shop search: every word must appear in the English or Bangla name, the admin's search terms
 * (romanized names like "aam", words like "jhal"), or the shelf's names.
 */
export function matchesSearch(p: ProductLike, q: string): boolean {
  const words = searchWords(q);
  if (words.length === 0) return true;
  const c = p.category;
  const hay = [
    p.name,
    p.nameBn,
    p.searchTerms,
    c?.name,
    c?.nameBn,
    c ? shelfLabelBn(c.slug, "") : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFC");
  return words.every((w) => hay.includes(w));
}

export function applyShopQuery<P extends ProductLike>(items: P[], query: ShopQuery): P[] {
  let out = items.filter((p) => defaultVariant(p.variants));
  if (query.heat.length > 0) {
    const wanted = new Set<string>(query.heat.map((h) => h.toLowerCase()));
    out = out.filter((p) => wanted.has(heatOf(p.spiceLevel).word.toLowerCase()));
  }
  if (query.inStock) out = out.filter((p) => isInStock(p.variants));
  if (query.minPrice !== undefined) {
    const min = query.minPrice * 100;
    out = out.filter((p) => (defaultVariant(p.variants)?.price ?? 0) >= min);
  }
  if (query.maxPrice !== undefined) {
    const max = query.maxPrice * 100;
    out = out.filter((p) => (defaultVariant(p.variants)?.price ?? 0) <= max);
  }
  if (query.size) {
    const size = query.size;
    out = out.filter((p) => p.variants.some((v) => v.isActive && v.label === size));
  }
  if (query.q) {
    const q = query.q;
    out = out.filter((p) => matchesSearch(p, q));
  }
  const price = (p: P) => defaultVariant(p.variants)?.price ?? 0;
  switch (query.sort) {
    case "price-asc":
      return [...out].sort((a, b) => price(a) - price(b));
    case "price-desc":
      return [...out].sort((a, b) => price(b) - price(a));
    case "newest":
      return [...out].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    default:
      return [...out].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  }
}

/** Cheapest and dearest card price (paisa) across products, for the price filter's range. */
export function priceBounds(items: ProductLike[]): { min: number; max: number } | null {
  const prices = items
    .map((p) => defaultVariant(p.variants)?.price)
    .filter((n): n is number => n !== undefined);
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
}

/** Distinct package sizes across products, in the order first seen. */
export function sizeOptions(items: { variants: VariantLike[] }[]): string[] {
  const seen: string[] = [];
  for (const p of items)
    for (const v of p.variants) if (v.isActive && !seen.includes(v.label)) seen.push(v.label);
  // Smallest package first: "300 g" before "500 g".
  return seen.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
}

/** Percent off when the variant is on sale, else null. */
export function salePercent(v: Pick<VariantLike, "price" | "compareAtPrice">): number | null {
  if (v.compareAtPrice === null || v.compareAtPrice <= v.price) return null;
  return Math.round((1 - v.price / v.compareAtPrice) * 100);
}

/** True when the product was added within the last `days` days. */
export function isRecent(createdAt: Date, days = 14): boolean {
  return Date.now() - createdAt.getTime() < days * 24 * 60 * 60 * 1000;
}

/** "250 g" / "1 kg" for the size cards (Product.dc.html: "৳250 · [weight]"). */
export function formatWeight(grams: number) {
  return grams >= 1000 && grams % 100 === 0 ? `${grams / 1000} kg` : `${grams} g`;
}
