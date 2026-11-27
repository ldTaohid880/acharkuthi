import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";

const ORIGIN = "http://localhost:3000";
const abs = (path: string) => `${ORIGIN}${path === "/" ? "" : path}`;
const inLang = (lang: "bn" | "en", path: string) =>
  lang === "bn" ? path : path === "/" ? "/en" : `/en${path}`;

type Ld = Record<string, unknown> & { "@type"?: string };
async function jsonLd(page: Page): Promise<Ld[]> {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  // Each block must be valid JSON (throws otherwise); a block may hold an array.
  return raw.flatMap((r) => {
    const v = JSON.parse(r) as Ld | Ld[];
    return Array.isArray(v) ? v : [v];
  });
}

const PAGES = ["/", "/shop", "/shop/mango", "/pickles/raw-mango", "/faq", "/recipes", "/contact"];

test.describe("SEO in the page language", () => {
  for (const path of PAGES) {
    test(`head tags on ${path}`, async ({ page, lang, t }) => {
      const url = inLang(lang, path);
      await page.goto(url);
      // Read the title after hydration: client components may set document.title.
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
      const title = await page.title();
      expect(title.length).toBeGreaterThan(3);
      if (path === "/") expect(title).toBe(t.meta.home[0]);
      else {
        expect(title).toContain(lang === "bn" ? "আচারকুঠি" : "Acharkuthi");
      }

      const desc = await page.locator('meta[name="description"]').getAttribute("content");
      expect(desc?.length ?? 0).toBeGreaterThan(20);
      // English page descriptions are English (no Bangla letters), Bangla ones contain Bangla.
      if (lang === "en") expect(desc).not.toMatch(/[ঀ-৿]{4}/);
      // Product descriptions fall back to the stored language when the page's one is empty.
      else if (!path.startsWith("/pickles/")) expect(desc).toMatch(/[ঀ-৿]/);

      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", abs(url));
      const alt = (h: string) => page.locator(`link[rel="alternate"][hreflang="${h}"]`);
      await expect(alt("bn")).toHaveAttribute("href", abs(inLang("bn", path)));
      await expect(alt("en")).toHaveAttribute("href", abs(inLang("en", path)));
      await expect(alt("x-default")).toHaveAttribute("href", abs(inLang("bn", path)));
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
        "content",
        lang === "bn" ? "bn_BD" : "en_US",
      );
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", abs(url));
    });
  }

  test("JSON-LD: Product and BreadcrumbList follow the page language", async ({
    page,
    lang,
  }) => {
    await page.goto(inLang(lang, "/pickles/raw-mango"));
    const ld = await jsonLd(page);
    // The Organization lives on the home page only; products point at it by @id.
    expect(ld.some((x) => x["@type"] === "OnlineStore")).toBe(false);

    const product = ld.find((x) => x["@type"] === "Product");
    expect(product?.name).toBe(lang === "bn" ? "কাঁচা আমের আচার" : "Raw Mango Pickle");
    expect(product?.url).toBe(abs(inLang(lang, "/pickles/raw-mango")));
    const offers = product?.offers as Ld[] | Ld;
    const first = Array.isArray(offers) ? offers[0] : offers;
    expect(first?.priceCurrency).toBe("BDT");
    expect(String(first?.price)).toMatch(/^\d+\.\d{2}$/);

    const crumbs = ld.find((x) => x["@type"] === "BreadcrumbList");
    const items = crumbs?.itemListElement as { item: string; name: string; position: number }[];
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.map((i) => i.position)).toEqual(items.map((_, i) => i + 1));
    for (const i of items) expect(i.item.startsWith(abs(inLang(lang, "/")))).toBe(true);
    expect(items[0]?.name).toBe(lang === "bn" ? "হোম" : "Home");
    expect(items.at(-1)?.item).toBe(abs(inLang(lang, "/pickles/raw-mango")));
  });

  test("JSON-LD: one Organization with the official profiles, on the home page", async ({
    page,
    lang,
  }) => {
    await page.goto(inLang(lang, "/"));
    const ld = await jsonLd(page);
    const graph = ld.flatMap((x) => (x["@graph"] as Ld[] | undefined) ?? [x]);
    const orgs = graph.filter((x) => x["@type"] === "OnlineStore" || x["@type"] === "Organization");
    expect(orgs).toHaveLength(1);
    expect(orgs[0]?.name).toBe("Acharkuthi");
    expect(orgs[0]?.alternateName).toBe("আচারকুঠি");
    expect(orgs[0]?.sameAs).toEqual([
      "https://www.facebook.com/acharkuthi",
      "https://www.instagram.com/acharkuthi_store",
      "https://www.tiktok.com/@acharkuthi_store",
      "https://www.youtube.com/@acharkuthi",
    ]);
    expect(graph.find((x) => x["@type"] === "WebSite")?.name).toBe("Acharkuthi");
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      "content",
      "Acharkuthi",
    );
  });

  test("JSON-LD: FAQPage on the FAQ, in the page language", async ({ page, lang }) => {
    await page.goto(inLang(lang, "/faq"));
    const faq = (await jsonLd(page)).find((x) => x["@type"] === "FAQPage");
    expect(faq?.inLanguage).toBe(lang);
    const qs = faq?.mainEntity as { "@type": string; name: string; acceptedAnswer: Ld }[];
    expect(qs.length).toBeGreaterThan(3);
    for (const q of qs) {
      expect(q["@type"]).toBe("Question");
      expect(q.name.length).toBeGreaterThan(3);
      expect(String(q.acceptedAnswer.text).length).toBeGreaterThan(3);
    }
    // The first question matches the page's first <summary>.
    const first = (await page.locator("details.fq summary").first().innerText()).trim();
    expect(first).toContain(qs[0]?.name.slice(0, 10) ?? "");
    if (lang === "en") expect(qs[0]?.name).not.toMatch(/[ঀ-৿]{4}/);
  });

  test("JSON-LD: shelf page breadcrumb uses the shelf name in the page language", async ({
    page,
    lang,
  }) => {
    await page.goto(inLang(lang, "/shop/mango"));
    const crumbs = (await jsonLd(page)).find((x) => x["@type"] === "BreadcrumbList");
    const items = crumbs?.itemListElement as { item: string; name: string }[];
    expect(items.at(-1)?.item).toBe(abs(inLang(lang, "/shop/mango")));
    expect(items.at(-1)?.name).toMatch(lang === "bn" ? /আম/ : /Mango/);
  });
});

test.describe("robots, sitemap and llms.txt", () => {
  test("/robots.txt keeps private pages out in both languages", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    for (const p of [
      "/account",
      "/basket",
      "/checkout",
      "/en/account",
      "/en/basket",
      "/en/checkout",
    ])
      expect(body).toContain(`Disallow: ${p}`);
    expect(body).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });

  test("/sitemap.xml lists every page in both languages with hreflang twins", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? "");
    for (const p of ["/", "/shop", "/faq", "/pickles/raw-mango", "/shop/mango", "/recipes"]) {
      expect(locs, p).toContain(abs(p));
      expect(locs, `/en${p}`).toContain(abs(inLang("en", p)));
    }
    // Same number of Bangla and English entries.
    const enCount = locs.filter((l) => l === abs("/en") || l.startsWith(abs("/en/"))).length;
    expect(enCount * 2).toBe(locs.length);
    expect(xml).toMatch(/hreflang="bn"/);
    expect(xml).toMatch(/hreflang="en"/);
    // Inactive products and sample recipes are left out.
    expect(xml).not.toContain("/pickles/spicy-mango-achar");
    expect(xml).not.toContain("/recipes/khichuri");
  });

  test("/llms.txt summarises the shop with live data", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const body = await res.text();
    expect(body).toMatch(/^# আচারকুঠি \(Acharkuthi\)/);
    expect(body).toContain("## Pickles");
    expect(body).toContain(`${ORIGIN}/en/pickles/raw-mango`);
    expect(body).toMatch(/Delivery charge: ৳\s?[\d,]+ inside Dhaka/);
    expect(body).toContain("## In Bangla");
    expect(body).not.toMatch(/ডামি|\[নিশ্চিত/);
  });
});
