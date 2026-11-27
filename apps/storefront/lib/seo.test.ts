import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@repo/db", () => ({ db: {}, schema: {} }));
vi.mock("@/lib/site-url", () => ({
  siteUrl: "https://shop.test",
  absolute: (p: string) => `https://shop.test${p === "/" ? "" : p}`,
}));

const { faqJsonLd, isPlaceholder, ldJson, pageMeta, productJsonLd, productOgTags } =
  await import("./seo");

describe("isPlaceholder", () => {
  it("flags design placeholders and empty copy", () => {
    expect(isPlaceholder("[ডামি] টক-ঝাল আচার")).toBe(true);
    expect(isPlaceholder("মেয়াদ: [নিশ্চিত করতে হবে]")).toBe(true);
    expect(isPlaceholder("")).toBe(true);
    expect(isPlaceholder(null)).toBe(true);
  });
  it("lets real copy through", () => {
    expect(isPlaceholder("Sour green mango in mustard oil.")).toBe(false);
  });
});

describe("pageMeta", () => {
  it("sets the canonical URL and a matching preview", () => {
    const m = pageMeta({ title: "FAQ", description: "Answers", path: "/faq", lang: "bn" });
    expect(m.alternates?.canonical).toBe("/faq");
    expect(m.openGraph).toMatchObject({ url: "/faq", title: "FAQ | আচারকুঠি", locale: "bn_BD" });
  });
  it("points the English page at /en and links both versions", () => {
    const m = pageMeta({ title: "FAQ", path: "/faq", lang: "en" });
    expect(m.alternates).toMatchObject({
      canonical: "/en/faq",
      languages: { bn: "/faq", en: "/en/faq", "x-default": "/faq" },
    });
    expect(m.openGraph).toMatchObject({ url: "/en/faq", locale: "en_US" });
  });
  it("lists the wide and the square JPEG and asks for the large card", () => {
    const m = pageMeta({ title: "FAQ", path: "/faq", lang: "en" });
    expect(m.openGraph?.images).toEqual([
      expect.objectContaining({
        url: "/og/site-en-wide.jpg?v=1",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        secureUrl: "https://shop.test/og/site-en-wide.jpg?v=1",
        alt: "FAQ | Acharkuthi",
      }),
      expect.objectContaining({ url: "/og/site-en-square.jpg?v=1", width: 1080, height: 1080 }),
    ]);
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
  });
  it("uses share-text overrides in the preview only, never in <title>", () => {
    const card = {
      wide: {
        url: "https://img.test/w.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg" as const,
      },
      square: {
        url: "https://img.test/s.jpg",
        width: 1080,
        height: 1080,
        type: "image/jpeg" as const,
      },
      title: "Share title",
      description: "Share text",
    };
    const m = pageMeta({ title: "Mango", description: "Page text", path: "/x", lang: "en", card });
    expect(m.title).toBe("Mango");
    expect(m.description).toBe("Page text");
    expect(m.openGraph).toMatchObject({ title: "Share title", description: "Share text" });
  });
  it("leaves og:type to the product page and keeps utility pages out of search", () => {
    const product = pageMeta({
      title: "Mango",
      path: "/pickles/mango",
      lang: "bn",
      type: "product",
    });
    expect(product.openGraph).not.toHaveProperty("type");
    const basket = pageMeta({ title: "Basket", path: "/basket", lang: "bn", noindex: true });
    expect(basket.robots).toEqual({ index: false, follow: true });
    expect(basket.alternates?.canonical).toBe("/basket");
    expect(pageMeta({ title: "FAQ", path: "/faq", lang: "bn" })).not.toHaveProperty("robots");
  });
});

describe("productOgTags", () => {
  it("prices the cheapest size in taka and reports stock across sizes", () => {
    const tags = productOgTags({
      lang: "en",
      variants: [
        { sku: "M-500", price: 34000, stock: 0 },
        { sku: "M-300", price: 22000, stock: 0 },
      ],
      category: "Mango",
    });
    expect(Object.fromEntries(tags)).toEqual({
      "og:type": "product",
      "product:price:amount": "220.00",
      "product:price:currency": "BDT",
      "product:availability": "out of stock",
      "product:condition": "new",
      "product:brand": "Acharkuthi",
      "product:retailer_item_id": "M-300",
      "product:category": "Mango",
    });
    expect(tags[0]).toEqual(["og:type", "product"]);
  });
  it("is in stock when any size is, and prints nothing without sizes", () => {
    const tags = productOgTags({
      lang: "bn",
      variants: [
        { sku: "A", price: 100, stock: 0 },
        { sku: "B", price: 200, stock: 3 },
      ],
    });
    expect(tags).toContainEqual(["product:availability", "in stock"]);
    expect(tags).toContainEqual(["product:brand", "আচারকুঠি"]);
    expect(tags.some(([k]) => k === "product:category")).toBe(false);
    expect(productOgTags({ lang: "bn", variants: [] })).toEqual([]);
  });
});

describe("productJsonLd", () => {
  const base = {
    lang: "en" as const,
    slug: "lemon",
    name: "Lemon Pickle",
    nameBn: "লেবুর আচার",
    description: "[ডামি] placeholder",
    ingredients: "লেবু, লবণ",
    shelfLife: null,
    storage: null,
    allergens: null,
    heat: "Mild",
    category: "Lemon",
    images: [],
    variants: [
      { sku: "L-300", label: "300 g", price: 22000, stock: 0 },
      { sku: "L-500", label: "500 g", price: 34000, stock: 5 },
    ],
    reviews: [],
  };
  it("prices in taka, marks stock, and leaves placeholders and empty ratings out", () => {
    const p = productJsonLd(base);
    expect(p.offers).toMatchObject([
      { price: "220.00", priceCurrency: "BDT", availability: "https://schema.org/OutOfStock" },
      { price: "340.00", availability: "https://schema.org/InStock" },
    ]);
    expect(p).not.toHaveProperty("description");
    expect(p).not.toHaveProperty("aggregateRating");
    expect(p.additionalProperty).toContainEqual({
      "@type": "PropertyValue",
      name: "Ingredients",
      value: "লেবু, লবণ",
    });
  });
  it("follows the page language: URL, name order and fact labels", () => {
    const en = productJsonLd(base);
    expect(en).toMatchObject({ name: "Lemon Pickle", alternateName: "লেবুর আচার" });
    expect(en.url).toMatch(/\/en\/pickles\/lemon$/);
    const bn = productJsonLd({ ...base, lang: "bn" });
    expect(bn).toMatchObject({ name: "লেবুর আচার", alternateName: "Lemon Pickle" });
    expect(bn.url).toMatch(/[^n]\/pickles\/lemon$/);
    expect(bn.additionalProperty).toContainEqual({
      "@type": "PropertyValue",
      name: "উপকরণ",
      value: "লেবু, লবণ",
    });
  });
  it("averages approved reviews", () => {
    const at = new Date("2026-11-01T00:00:00Z");
    const p = productJsonLd({
      ...base,
      reviews: [
        { name: "A", rating: 5, title: null, comment: "ভালো", createdAt: at },
        { name: "B", rating: 4, title: null, comment: null, createdAt: at },
      ],
    });
    expect(p).toMatchObject({ aggregateRating: { ratingValue: "4.5", reviewCount: 2 } });
  });
});

describe("faqJsonLd", () => {
  it("reads questions and answers from the FAQ markup and skips placeholders", () => {
    const html =
      '<details class="fq"><summary lang="bn">কীভাবে টাকা দেব?</summary><div class="ans" lang="bn"><p>ক্যাশ <b>অন</b> ডেলিভারি।</p></div></details>' +
      '<details class="fq"><summary lang="bn">মেয়াদ?</summary><div class="ans" lang="bn"><p>[নিশ্চিত করতে হবে]</p></div></details>';
    expect(faqJsonLd(html).mainEntity).toEqual([
      {
        "@type": "Question",
        name: "কীভাবে টাকা দেব?",
        acceptedAnswer: { "@type": "Answer", text: "ক্যাশ অন ডেলিভারি।" },
      },
    ]);
  });
});

describe("ldJson", () => {
  it("can't close the script tag", () => {
    expect(ldJson({ x: "</script><script>alert(1)</script>" })).not.toContain("<");
  });
});
