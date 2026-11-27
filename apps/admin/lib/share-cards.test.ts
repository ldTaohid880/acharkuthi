import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@repo/db", () => ({ db: {}, schema: {}, and: vi.fn(), eq: vi.fn(), inArray: vi.fn() }));
vi.mock("@/env", () => ({ env: { STOREFRONT_URL: "https://shop.test" } }));

const { absolutePhoto, bnDigits, discountBadge, discountPercent, isStale, specHash } =
  await import("./share-cards");

describe("discountPercent", () => {
  it("takes the largest whole-percent saving among sizes on sale", () => {
    expect(
      discountPercent([
        { price: 23400, compareAtPrice: 26000 }, // 10%
        { price: 40000, compareAtPrice: 50000 }, // 20%
        { price: 30000, compareAtPrice: null },
      ]),
    ).toBe(20);
  });
  it("is 0 with no compare-at price or one that isn't higher", () => {
    expect(discountPercent([{ price: 30000, compareAtPrice: 30000 }])).toBe(0);
    expect(discountPercent([{ price: 30000, compareAtPrice: null }])).toBe(0);
    expect(discountPercent([])).toBe(0);
  });
  it("rounds down, so the card never promises more than the real saving", () => {
    expect(discountPercent([{ price: 33400, compareAtPrice: 50000 }])).toBe(33);
  });
});

describe("discountBadge", () => {
  it("speaks the card's language, with Bangla digits on Bangla cards", () => {
    expect(discountBadge("bn", 15)).toEqual(["১৫%", "ছাড়"]);
    expect(discountBadge("en", 15)).toEqual(["15%", "off"]);
    expect(discountBadge("bn", 0)).toBeNull();
  });
  it("bnDigits converts every digit", () => {
    expect(bnDigits("1234567890")).toBe("১২৩৪৫৬৭৮৯০");
  });
});

describe("specHash", () => {
  const base = {
    kind: "product" as const,
    refId: 3,
    pageKey: "",
    layout: "studio" as const,
    slug: "nobabi-lassi",
    lang: "bn" as const,
    eyebrow: "আমের আচার",
    lead: "নবাবি লস্যি",
    second: "Nobabi Lassi",
    line: "সরিষার ঝাঁঝে টক-ঝাল-মিষ্টি আমের আচার",
    badge: null,
    focal: { x: 0.5, y: 0.65 },
    photoSource: "https://img.test/a.webp",
  };
  it("is stable for the same inputs and changes when anything drawn changes", () => {
    const h = specHash(base);
    expect(h).toMatch(/^[a-f0-9]{32}$/);
    expect(specHash({ ...base })).toBe(h);
    expect(specHash({ ...base, badge: ["১০%", "ছাড়"] })).not.toBe(h);
    expect(specHash({ ...base, line: null })).not.toBe(h);
    expect(specHash({ ...base, photoSource: "https://img.test/b.webp" })).not.toBe(h);
    expect(specHash({ ...base, layout: "photo" })).not.toBe(h);
    expect(specHash({ ...base, focal: { x: 0.2, y: 0.65 } })).not.toBe(h);
  });
  it("marks a card stale when it was never made or its hash differs", () => {
    const spec = { ...base, photo: "/x", hash: specHash(base) };
    expect(isStale(spec, undefined)).toBe(true);
    expect(isStale(spec, { renderedFrom: spec.hash, wideUrl: null })).toBe(true);
    expect(isStale(spec, { renderedFrom: "0".repeat(32), wideUrl: "u" })).toBe(true);
    expect(isStale(spec, { renderedFrom: spec.hash, wideUrl: "u" })).toBe(false);
  });
});

describe("absolutePhoto", () => {
  it("resolves storefront paths and leaves R2 URLs and admin /og files alone", () => {
    expect(absolutePhoto("/images/shop/a.webp")).toBe("https://shop.test/images/shop/a.webp");
    expect(absolutePhoto("https://img.test/a.webp")).toBe("https://img.test/a.webp");
    expect(absolutePhoto("/og/shelf-default.webp")).toBe("/og/shelf-default.webp");
  });
});
