import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/site-url", () => ({
  siteUrl: "https://shop.test",
  absolute: (p: string) => `https://shop.test${p === "/" ? "" : p}`,
}));

const { faqJsonLd, isPlaceholder, ldJson, pageMeta, productJsonLd } = await import("./seo");

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
    expect(bn.additionalProperty).toContainEqual({ "@type": "PropertyValue", name: "উপকরণ", value: "লেবু, লবণ" });
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
