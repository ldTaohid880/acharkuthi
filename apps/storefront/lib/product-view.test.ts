import { describe, expect, it } from "vitest";
import {
  applyShopQuery,
  defaultVariant,
  heatOf,
  isOnSale,
  matchesSearch,
  type ProductLike,
} from "./product-view";

const variant = (id: number, price: number, stock: number, isActive = true) => ({
  id,
  label: `${id}`,
  price,
  compareAtPrice: null,
  stock,
  isActive,
});
const product = (
  name: string,
  spiceLevel: number,
  isFeatured: boolean,
  variants: ProductLike["variants"],
) => ({
  name,
  spiceLevel,
  isFeatured,
  createdAt: new Date(2026, 0, 1),
  variants,
});
const base = { sort: "popular", heat: [], inStock: false } as const;

describe("heatOf", () => {
  it("maps spice level 0-5 onto three pods", () => {
    expect(heatOf(0)).toEqual({ word: "Mild", pods: 1 });
    expect(heatOf(3)).toEqual({ word: "Medium", pods: 2 });
    expect(heatOf(5)).toEqual({ word: "Hot", pods: 3 });
  });
});

describe("defaultVariant", () => {
  it("prefers the cheapest variant that is in stock and skips inactive ones", () => {
    const v = defaultVariant([variant(1, 100, 0), variant(2, 300, 5), variant(3, 200, 5, false)]);
    expect(v?.id).toBe(2);
  });
  it("falls back to the cheapest active variant when everything is sold out", () => {
    expect(defaultVariant([variant(1, 300, 0), variant(2, 100, 0)])?.id).toBe(2);
  });
});

describe("isOnSale", () => {
  it("is true only when compare-at is above price", () => {
    expect(isOnSale({ price: 100, compareAtPrice: 150 })).toBe(true);
    expect(isOnSale({ price: 100, compareAtPrice: 100 })).toBe(false);
    expect(isOnSale({ price: 100, compareAtPrice: null })).toBe(false);
  });
});

describe("applyShopQuery", () => {
  const items = [
    product("Lemon", 1, false, [variant(1, 22000, 5)]),
    product("Garlic", 5, true, [variant(2, 23400, 0)]),
    product("Mango", 3, true, [variant(3, 25000, 9)]),
  ];

  it("lists featured products first by default", () => {
    expect(applyShopQuery(items, { ...base, heat: [] }).map((p) => p.name)).toEqual([
      "Garlic",
      "Mango",
      "Lemon",
    ]);
  });
  it("filters by heat and stock", () => {
    expect(applyShopQuery(items, { ...base, heat: ["hot"] }).map((p) => p.name)).toEqual([
      "Garlic",
    ]);
    expect(
      applyShopQuery(items, { ...base, heat: [], inStock: true }).map((p) => p.name),
    ).not.toContain("Garlic");
  });
  it("sorts by price", () => {
    expect(applyShopQuery(items, { ...base, heat: [], sort: "price-desc" })[0]?.name).toBe("Mango");
  });
});

describe("matchesSearch", () => {
  const mango: ProductLike = {
    ...product("Raw Mango Pickle", 3, true, [variant(1, 25000, 5)]),
    nameBn: "কাঁচা আমের আচার",
    searchTerms: "kancha aam jhal spicy",
    category: { slug: "mango", name: "Mango", nameBn: "আম" },
  };

  it("matches the Bangla name", () => {
    expect(matchesSearch(mango, "আমের আচার")).toBe(true);
  });
  it("matches romanized search terms, ignoring case", () => {
    expect(matchesSearch(mango, "AAM jhal")).toBe(true);
  });
  it("matches the shelf name", () => {
    expect(matchesSearch({ ...mango, searchTerms: null }, "mango")).toBe(true);
  });
  it("needs every word to match", () => {
    expect(matchesSearch(mango, "aam lemon")).toBe(false);
  });
  it("finds nothing for an unknown pickle", () => {
    expect(matchesSearch(mango, "chalta")).toBe(false);
  });
  it("filters the shop list through q", () => {
    const list = [mango, product("Lemon Pickle", 1, false, [variant(2, 22000, 5)])];
    expect(applyShopQuery(list, { ...base, heat: [], q: "aam" }).map((p) => p.name)).toEqual([
      "Raw Mango Pickle",
    ]);
  });
});
