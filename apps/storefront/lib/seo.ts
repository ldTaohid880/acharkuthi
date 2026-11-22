import "server-only";

import type { Metadata } from "next";
import { HREFLANG, isLang, localePath, OG_LOCALE, type Lang } from "@/lib/i18n/lang";
import { absolute } from "@/lib/site-url";

/**
 * Search engines and AI assistants (owner request, 2026-11-15): one canonical address per page,
 * link previews (OpenGraph / X) and schema.org facts. Facts here must match the policy pages
 * (memory: policy-decisions); never put sample or placeholder copy into them.
 */

export const SITE_NAME = "Acharkuthi";
export const SITE_NAME_BN = "আচারকুঠি";
export const SITE_EMAIL = "info@acharkuthi.store";
export const SITE_WHATSAPP = "https://wa.me/8801624607294";
export const SITE_SOCIAL = [
  "https://www.facebook.com/acharkuthi",
  "https://www.instagram.com/acharkuthi_store",
] as const;
/** Real brand artwork (1118 × 1024 PNG): the preview image for pages without a product photo. */
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
  image?: { url: string; width?: number | undefined; height?: number | undefined } | undefined;
  type?: "website" | "article";
}

/**
 * Title, description, canonical URL and link-preview tags for a public page. Page metadata is
 * merged shallowly in Next.js, so every page passes its own complete set through here.
 */
export function pageMeta({
  title,
  description,
  path,
  lang,
  image,
  type = "website",
}: PageMetaInput): Metadata {
  // The brand in the page language (the layout's title template does the same).
  const full = path === "/" ? title : `${title} | ${lang === "bn" ? SITE_NAME_BN : SITE_NAME}`;
  const img = image ?? DEFAULT_IMAGE;
  const url = localePath(lang, path);
  const other: Lang = lang === "bn" ? "en" : "bn";
  return {
    title: path === "/" ? { absolute: title } : title,
    ...(description ? { description } : {}),
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
      type,
      url,
      siteName: `${SITE_NAME_BN} · ${SITE_NAME}`,
      locale: OG_LOCALE[lang],
      alternateLocale: [OG_LOCALE[other]],
      title: full,
      ...(description ? { description } : {}),
      images: [{ ...img, alt: full }],
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: full,
      ...(description ? { description } : {}),
      images: [img.url],
    },
  };
}

/** The page language from a [lang] route's params (the layout already 404s anything else). */
export async function langOf(params: Promise<{ lang: string }>): Promise<Lang> {
  const { lang } = await params;
  return isLang(lang) ? lang : "bn";
}

/** Paisa → schema.org price string in taka ("400.00"). */
export const schemaPrice = (paisa: number) => (paisa / 100).toFixed(2);

const STORE_DESCRIPTION: Record<Lang, string> = {
  bn: "ঢাকার ঘরে তৈরি বাংলা আচার: পারিবারিক রেসিপি, ঘরে বাটা মসলা আর ঘানি ভাঙা সরিষার তেল। বাংলাদেশের ৬৪ জেলায় ডেলিভারি, ক্যাশ অন ডেলিভারি।",
  en: "Homemade Bengali pickles (achar) from Dhaka, made from family recipes with spices ground at home and wood-pressed mustard oil. Delivery to all 64 districts of Bangladesh, cash on delivery.",
};

/**
 * Site-wide shop facts (schema.org OnlineStore), from the owner's answers of 2026-11-15. One
 * store (`@id`) in both languages; name, description and URL follow the page language.
 */
export function storeJsonLd(lang: Lang = "bn") {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": absolute("/#store"),
    name: lang === "bn" ? SITE_NAME_BN : SITE_NAME,
    alternateName: lang === "bn" ? SITE_NAME : SITE_NAME_BN,
    url: absolute(localePath(lang, "/")),
    logo: absolute(DEFAULT_IMAGE.url),
    description: STORE_DESCRIPTION[lang],
    email: SITE_EMAIL,
    sameAs: [...SITE_SOCIAL],
    areaServed: { "@type": "Country", name: "Bangladesh" },
    currenciesAccepted: "BDT",
    paymentAccepted: "Cash on delivery",
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: SITE_EMAIL,
        url: SITE_WHATSAPP,
        availableLanguage: ["bn", "en"],
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
