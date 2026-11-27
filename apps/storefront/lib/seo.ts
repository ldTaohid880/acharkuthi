import "server-only";

import type { Metadata } from "next";
import { HREFLANG, isLang, localePath, OG_LOCALE, type Lang } from "@/lib/i18n/lang";
import { siteCard, type ShareCard, type ShareImage } from "@/lib/share-card";
import { absolute } from "@/lib/site-url";
import { SAME_AS, SITE_PHONE, SITE_WHATSAPP } from "@/lib/social";

/**
 * Search engines and AI assistants (owner request, 2026-11-15): one canonical address per page,
 * link previews (OpenGraph / X) and schema.org facts. Facts here must match the policy pages
 * (memory: policy-decisions); never put sample or placeholder copy into them.
 */

export const SITE_NAME = "Acharkuthi";
export const SITE_NAME_BN = "আচারকুঠি";
export const SITE_EMAIL = "info@acharkuthi.store";
export { SITE_PHONE, SITE_WHATSAPP } from "@/lib/social";
/** Real brand artwork (1118 × 1024 PNG): the schema.org logo. Link previews use lib/share-card. */
export const DEFAULT_IMAGE = { url: "/brand/logo.png", width: 1118, height: 1024 } as const;

/** True for copy that is still a design placeholder ("[ডামি]", "[নিশ্চিত করতে হবে]" …). */
export const isPlaceholder = (text: string | null | undefined) =>
  !text || /ডামি|নিশ্চিত করতে হবে|\[[^\]]*\]/.test(text);

/** The copy if it is real, else undefined (keeps placeholders out of previews and structured data). */
export const realCopy = (text: string | null | undefined) =>
  isPlaceholder(text) ? undefined : (text ?? undefined);

interface PageMetaInput {
  /** Page title without the "| Acharkuthi" suffix (the root layout's template adds it). */
  title: string;
  description?: string | undefined;
  /** Language-free path of this page, e.g. "/shop/mango". */
  path: string;
  /** Page language: the canonical URL is this language's version; hreflang links both. */
  lang: Lang;
  /** Link-preview card (lib/share-card.ts getShareCard); the site card when left out. */
  card?: ShareCard | undefined;
  /**
   * "product" pages print og:type=product themselves (components/product-og.tsx), because
   * Next.js only knows website/article/… and would otherwise print og:type=website.
   */
  type?: "website" | "article" | "product";
  /** Utility pages (basket, checkout, track, account, login): kept out of search results. */
  noindex?: boolean;
}

/**
 * Title, description, canonical URL and link-preview tags for a page. Page metadata is merged
 * shallowly in Next.js, so every page passes its own complete set through here.
 */
export function pageMeta({
  title,
  description,
  path,
  lang,
  card = siteCard(lang),
  type = "website",
  noindex = false,
}: PageMetaInput): Metadata {
  // The brand in the page language (the layout's title template does the same).
  const full = path === "/" ? title : `${title} | ${lang === "bn" ? SITE_NAME_BN : SITE_NAME}`;
  const url = localePath(lang, path);
  const other: Lang = lang === "bn" ? "en" : "bn";
  // Share-text overrides from the Share Studio change the preview only, never <title>.
  const shareTitle = card.title ?? full;
  const shareDescription = card.description ?? description;
  const alt = shareTitle;
  const ogImage = (img: ShareImage) => {
    const abs = img.url.startsWith("http") ? img.url : absolute(img.url);
    return { ...img, alt, ...(abs.startsWith("https://") ? { secureUrl: abs } : {}) };
  };
  return {
    title: path === "/" ? { absolute: title } : title,
    ...(description ? { description } : {}),
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      canonical: url,
      // Both versions point at each other; Bangla (the default) also answers for everyone else.
      languages: {
        [HREFLANG.bn]: localePath("bn", path),
        [HREFLANG.en]: localePath("en", path),
        "x-default": localePath("bn", path),
      },
    },
    openGraph: {
      ...(type === "product" ? {} : { type }),
      url,
      siteName: SITE_NAME,
      locale: OG_LOCALE[lang],
      alternateLocale: [OG_LOCALE[other]],
      title: shareTitle,
      ...(shareDescription ? { description: shareDescription } : {}),
      // Wide first (the large card), then the square for apps that pick one.
      images: [ogImage(card.wide), ogImage(card.square)],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      ...(shareDescription ? { description: shareDescription } : {}),
      images: [{ url: card.wide.url, alt }],
    },
  };
}

export interface ProductOgInput {
  lang: Lang;
  /** Active sizes only. */
  variants: readonly { sku: string; price: number; stock: number }[];
  category?: string | null | undefined;
}

/**
 * Open Graph product tags, matching productJsonLd: the lowest active price (taka, BDT), in stock
 * when any size is, and that size's SKU. [property, content] pairs, og:type first.
 */
export function productOgTags({ lang, variants, category }: ProductOgInput): [string, string][] {
  const cheapest = [...variants].sort((a, b) => a.price - b.price)[0];
  if (!cheapest) return [];
  return [
    ["og:type", "product"],
    ["product:price:amount", schemaPrice(cheapest.price)],
    ["product:price:currency", "BDT"],
    ["product:availability", variants.some((v) => v.stock > 0) ? "in stock" : "out of stock"],
    ["product:condition", "new"],
    ["product:brand", lang === "bn" ? SITE_NAME_BN : SITE_NAME],
    ["product:retailer_item_id", cheapest.sku],
    ...(category ? ([["product:category", category]] as [string, string][]) : []),
  ];
}

/** The page language from a [lang] route's params (the layout already 404s anything else). */
export async function langOf(params: Promise<{ lang: string }>): Promise<Lang> {
  const { lang } = await params;
  return isLang(lang) ? lang : "bn";
}

/** Paisa → schema.org price string in taka ("400.00"). */
export const schemaPrice = (paisa: number) => (paisa / 100).toFixed(2);

/** One sentence about the brand, in the page language (owner request, 2026-11-27). */
const STORE_DESCRIPTION: Record<Lang, string> = {
  bn: "আচারকুঠি ঢাকার একটি ঐতিহ্যবাহী বাংলা আচারের ব্র্যান্ড, যেখানে প্রজন্মের রেসিপি, শিলে বাটা মসলা আর খাঁটি ঘানি ভাঙা সরিষার তেলে ছোট ব্যাচে আচার তৈরি হয় এবং সারা বাংলাদেশে পৌঁছে দেওয়া হয়।",
  en: "Acharkuthi is a heritage Bengali pickle (achar) brand from Dhaka, making small-batch pickles from generations-old recipes with stone-ground spices and pure wood-pressed mustard oil, delivered across Bangladesh.",
};

/**
 * The brand's identity for search engines and AI assistants (owner, 2026-11-15 and 2026-11-27):
 * one OnlineStore (a schema.org Organization) and the WebSite, in one @graph printed on the home
 * page only, so the site has a single Organization block. Products point at the store by `@id`.
 * sameAs lists only the official profiles (lib/social.ts), because fake pages use our name.
 */
export function organizationJsonLd(lang: Lang = "bn") {
  const store = absolute("/#store");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OnlineStore",
        "@id": store,
        name: SITE_NAME,
        alternateName: SITE_NAME_BN,
        url: absolute("/"),
        logo: {
          "@type": "ImageObject",
          url: absolute(DEFAULT_IMAGE.url),
          width: DEFAULT_IMAGE.width,
          height: DEFAULT_IMAGE.height,
        },
        image: absolute(DEFAULT_IMAGE.url),
        description: STORE_DESCRIPTION[lang],
        email: SITE_EMAIL,
        telephone: SITE_PHONE,
        sameAs: SAME_AS,
        areaServed: { "@type": "Country", name: "Bangladesh" },
        currenciesAccepted: "BDT",
        paymentAccepted: "Cash on delivery",
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer service",
            telephone: SITE_PHONE,
            email: SITE_EMAIL,
            url: SITE_WHATSAPP,
            areaServed: "BD",
            availableLanguage: ["Bengali", "English"],
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": absolute("/#website"),
        name: SITE_NAME,
        alternateName: SITE_NAME_BN,
        url: absolute("/"),
        inLanguage: [HREFLANG.bn, HREFLANG.en],
        publisher: { "@id": store },
      },
    ],
  };
}

/** BreadcrumbList from [name, language-free path] pairs; links point at the page language's URLs. */
export function breadcrumbJsonLd(items: readonly (readonly [string, string])[], lang: Lang = "bn") {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: absolute(localePath(lang, path)),
    })),
  };
}

/**
 * JSON for a <script type="application/ld+json">. "<" is escaped so no value can close the
 * script tag (Next.js JSON-LD guide).
 */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

interface ProductLdInput {
  /** Page language: the URL, the main name and the fact labels follow it. */
  lang: Lang;
  slug: string;
  name: string;
  nameBn: string | null;
  /** Already in the page language (lib/i18n/pick), falling back to the other one. */
  description: string | null;
  ingredients: string | null;
  shelfLife: string | null;
  storage: string | null;
  allergens: string | null;
  heat: string;
  category: string | null;
  /** Real photos only (absolute or site paths); the jar stand-in is left out. */
  images: string[];
  variants: { sku: string; label: string; price: number; stock: number }[];
  /** Approved reviews only. */
  reviews: {
    name: string;
    rating: number;
    title: string | null;
    comment: string | null;
    createdAt: Date;
  }[];
}

/** schema.org Product with one Offer per size, from live data. Placeholder copy is left out. */
const FACT_LABEL: Record<Lang, readonly [string, string, string, string, string]> = {
  bn: ["ঝাল", "উপকরণ", "মেয়াদ", "সংরক্ষণ", "অ্যালার্জেন"],
  en: ["Spice level", "Ingredients", "Shelf life", "Storage", "Allergens"],
};

export function productJsonLd(p: ProductLdInput) {
  const url = absolute(localePath(p.lang, `/pickles/${p.slug}`));
  const [lHeat, lIng, lLife, lStore, lAll] = FACT_LABEL[p.lang];
  const bnFirst = p.lang === "bn" && !!p.nameBn;
  const facts: [string, string][] = [];
  for (const [name, value] of [
    [lHeat, p.heat],
    [lIng, realCopy(p.ingredients)],
    [lLife, realCopy(p.shelfLife)],
    [lStore, realCopy(p.storage)],
    [lAll, realCopy(p.allergens)],
  ] as const)
    if (value) facts.push([name, value]);
  const rated = p.reviews.filter((r) => r.rating >= 1 && r.rating <= 5);
  const average = rated.reduce((n, r) => n + r.rating, 0) / (rated.length || 1);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    // Both names, the page language's first, so either script finds the product.
    name: bnFirst ? p.nameBn : p.name,
    ...(p.nameBn ? { alternateName: bnFirst ? p.name : p.nameBn } : {}),
    url,
    ...(realCopy(p.description) ? { description: realCopy(p.description) } : {}),
    ...(p.images.length
      ? { image: p.images.map((i) => (i.startsWith("http") ? i : absolute(i))) }
      : {}),
    brand: {
      "@type": "Brand",
      name: p.lang === "bn" ? SITE_NAME_BN : SITE_NAME,
      alternateName: p.lang === "bn" ? SITE_NAME : SITE_NAME_BN,
    },
    ...(p.category ? { category: p.category } : {}),
    ...(facts.length
      ? {
          additionalProperty: facts.map(([name, value]) => ({
            "@type": "PropertyValue",
            name,
            value,
          })),
        }
      : {}),
    offers: p.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      name: v.label,
      price: schemaPrice(v.price),
      priceCurrency: "BDT",
      availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      url,
      seller: { "@id": absolute("/#store") },
    })),
    ...(rated.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: average.toFixed(1),
            reviewCount: rated.length,
            bestRating: 5,
            worstRating: 1,
          },
          review: rated.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.name || "Customer" },
            datePublished: r.createdAt.toISOString().slice(0, 10),
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
            ...(r.title ? { name: r.title } : {}),
            ...(r.comment ? { reviewBody: r.comment } : {}),
          })),
        }
      : {}),
  };
}

/** Plain text of a small trusted HTML fragment (policy copy). */
const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** schema.org FAQPage from the FAQ page's own markup (questions in <summary>, answers in .ans). */
export function faqJsonLd(html: string, lang: Lang = "bn") {
  const items = [
    ...html.matchAll(
      /<summary[^>]*>([\s\S]*?)<\/summary>\s*<div class="ans"[^>]*>([\s\S]*?)<\/div>/g,
    ),
  ]
    .map(([, q = "", a = ""]) => [textOf(q), textOf(a)] as const)
    .filter(
      ([q, a]) =>
        q && a && !isPlaceholder(a) && q !== "এই পাতার সূচি" && q !== "Contents of this page",
    );
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: HREFLANG[lang],
    mainEntity: items.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
