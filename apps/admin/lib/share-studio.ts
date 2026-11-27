import "server-only";

import { asc, db, eq, schema } from "@repo/db";
import { env } from "@/env";
import { uploadsEnabled } from "@/lib/r2";
import {
  buildCardSpecs,
  cardKey,
  shelfLabel,
  storedCards,
  type CardLang,
  type CardSpec,
} from "@/lib/share-cards";

/**
 * Share Studio (কনটেন্ট › শেয়ার প্রিভিউ, docs/design/share-studio/*.png): every shareable
 * storefront link, what it shows when shared, and the share-only overrides (owner, 2026-11-26).
 */

export const SHARE_PAGES = [
  { key: "home", path: "/", bn: "হোম", en: "Home" },
  { key: "shop", path: "/shop", bn: "সব আচার", en: "Shop all" },
  { key: "story", path: "/our-story", bn: "আমাদের গল্প", en: "Our story" },
  { key: "contact", path: "/contact", bn: "যোগাযোগ", en: "Contact" },
  { key: "faq", path: "/faq", bn: "সাধারণ প্রশ্ন", en: "FAQ" },
  // One card for the four policy pages (storefront lib/share-card.ts uses "policies" for each).
  { key: "policies", path: "/shipping-policy", bn: "নীতিমালা", en: "Policies" },
] as const;
export type SharePageKey = (typeof SHARE_PAGES)[number]["key"];
export type ShareKind = "product" | "category" | "page";

const LANGS: readonly CardLang[] = ["bn", "en"];
const storefront = () => env.STOREFRONT_URL.replace(/\/+$/, "");
/** "/shop" in a language: "/shop" or "/en/shop" (storefront lib/i18n/lang.ts localePath). */
const localePath = (lang: CardLang, path: string) =>
  lang === "bn" ? path : path === "/" ? "/en" : `/en${path}`;
export const publicUrl = (lang: CardLang, path: string) =>
  `${storefront()}${localePath(lang, path)}`;
/** The storefront's default site card (storefront public/og, lib/share-card.ts siteCard). */
const siteCard = (lang: CardLang) => ({
  wide: `${storefront()}/og/site-${lang}-wide.jpg?v=1`,
  square: `${storefront()}/og/site-${lang}-square.jpg?v=1`,
});

export interface ShareLinkRow {
  kind: ShareKind;
  /** Route key: the product/category id, or the page key. */
  key: string;
  name: string;
  path: string;
  /** The Bangla wide card the link shows now. */
  thumb: string;
  image: "auto" | "custom";
  text: "page" | "own";
  updatedAt: Date | null;
}

/** Every product, shelf and site page, with the card it shows now. */
export async function listShareLinks(): Promise<ShareLinkRow[]> {
  const [rows, products, shelves] = await Promise.all([
    storedCards(),
    db.query.products.findMany({
      where: eq(schema.products.isActive, true),
      columns: { id: true, name: true, nameBn: true, slug: true, categoryId: true },
      orderBy: [asc(schema.products.id)],
    }),
    db.query.categories.findMany({
      where: eq(schema.categories.isActive, true),
      columns: { id: true, name: true, nameBn: true, slug: true },
      orderBy: [asc(schema.categories.sortOrder), asc(schema.categories.id)],
    }),
  ]);
  const both = (kind: ShareKind, refId: number, pageKey: string) =>
    LANGS.map((lang) => rows.get(cardKey({ kind, refId, pageKey, lang })));
  const wideOf = (kind: ShareKind, refId: number, pageKey: string) =>
    rows.get(cardKey({ kind, refId, pageKey, lang: "bn" }))?.wideUrl ?? null;
  const facts = (kind: ShareKind, refId: number, pageKey: string) => {
    const r = both(kind, refId, pageKey).filter((x) => x !== undefined);
    const times = r.map((x) => x.updatedAt.getTime());
    return {
      image: r.some((x) => x.mode === "custom") ? ("custom" as const) : ("auto" as const),
      text: r.some((x) => x.title || x.description) ? ("own" as const) : ("page" as const),
      updatedAt: times.length ? new Date(Math.max(...times)) : null,
    };
  };
  const site = siteCard("bn").wide;

  return [
    ...SHARE_PAGES.map((p) => ({
      kind: "page" as const,
      key: p.key,
      name: p.bn,
      path: p.path,
      thumb: wideOf("page", 0, p.key) ?? site,
      ...facts("page", 0, p.key),
    })),
    ...shelves.map((c) => ({
      kind: "category" as const,
      key: String(c.id),
      name: shelfLabel("bn", c),
      path: `/shop/${c.slug}`,
      thumb: wideOf("category", c.id, "") ?? site,
      ...facts("category", c.id, ""),
    })),
    ...products.map((p) => ({
      kind: "product" as const,
      key: String(p.id),
      name: p.nameBn ?? p.name,
      path: `/pickles/${p.slug}`,
      thumb:
        wideOf("product", p.id, "") ??
        (p.categoryId ? wideOf("category", p.categoryId, "") : null) ??
        site,
      ...facts("product", p.id, ""),
    })),
  ];
}

export interface ShareLangState {
  /** The page's own title and description (what the share shows when left empty). */
  defaults: { title: string; description: string };
  mode: "auto" | "custom";
  title: string;
  description: string;
  sourceImageUrl: string | null;
  focal: { x: number; y: number };
  /**
   * অটো image: products and shelves are drawn live in the browser from this spec (always the
   * current design and data); site pages use the storefront's site card.
   */
  autoSpec: CardSpec | null;
  autoImage: { wide: string; square: string };
  url: string;
}

export interface ShareEditorData {
  kind: ShareKind;
  refId: number;
  pageKey: "" | SharePageKey;
  slug: string;
  name: string;
  path: string;
  langs: Record<CardLang, ShareLangState>;
  uploads: boolean;
}

const decode = (s: string) =>
  s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/**
 * The storefront page's own <title> and meta description, read from the live page so the
 * Studio shows exactly what the site serves (share overrides never change these).
 */
async function pageDefaults(lang: CardLang, path: string, fallback: string) {
  try {
    const res = await fetch(publicUrl(lang, path), {
      headers: { cookie: `ak_lang=${lang}`, "user-agent": "AcharkuthiAdmin/1 (share studio)" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const html = await res.text();
    const title = /<title>([^<]*)<\/title>/.exec(html)?.[1];
    const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1];
    return {
      title: title ? decode(title) : fallback,
      description: description ? decode(description) : "",
    };
  } catch (e) {
    console.error("share studio: page defaults", path, e);
    return { title: fallback, description: "" };
  }
}

/** Everything the editor needs for one link, both languages. Null when it doesn't exist. */
export async function getShareEditor(
  kind: ShareKind,
  key: string,
): Promise<ShareEditorData | null> {
  let refId = 0;
  let pageKey: "" | SharePageKey = "";
  let slug: string;
  let name: string;
  let path: string;
  if (kind === "page") {
    const p = SHARE_PAGES.find((x) => x.key === key);
    if (!p) return null;
    pageKey = p.key;
    slug = p.key;
    name = p.bn;
    path = p.path;
  } else {
    refId = Number(key);
    if (!Number.isInteger(refId) || refId < 1) return null;
    if (kind === "product") {
      const p = await db.query.products.findFirst({
        where: eq(schema.products.id, refId),
        columns: { slug: true, name: true, nameBn: true },
      });
      if (!p) return null;
      slug = p.slug;
      name = p.nameBn ?? p.name;
      path = `/pickles/${p.slug}`;
    } else {
      const c = await db.query.categories.findFirst({
        where: eq(schema.categories.id, refId),
        columns: { slug: true, name: true, nameBn: true },
      });
      if (!c) return null;
      slug = c.slug;
      name = shelfLabel("bn", c);
      path = `/shop/${c.slug}`;
    }
  }

  const rows = await storedCards();
  // অটো specs: built without the custom rows, so they show the template card.
  const autoSpecs = kind === "page" ? [] : await buildCardSpecs({ kind, id: refId }, new Map());
  const [dBn, dEn] = await Promise.all(LANGS.map((lang) => pageDefaults(lang, path, name)));
  const defaults = { bn: dBn, en: dEn } as Record<CardLang, { title: string; description: string }>;

  const langs = {} as Record<CardLang, ShareLangState>;
  for (const lang of LANGS) {
    const row = rows.get(cardKey({ kind, refId, pageKey, lang }));
    const autoSpec = autoSpecs.find((s) => s.lang === lang) ?? null;
    langs[lang] = {
      defaults: defaults[lang],
      mode: row?.mode ?? "auto",
      title: row?.title ?? "",
      description: row?.description ?? "",
      sourceImageUrl: row?.sourceImageUrl ?? null,
      focal: { x: Number(row?.focalX ?? 0.5), y: Number(row?.focalY ?? 0.5) },
      autoSpec,
      autoImage: siteCard(lang),
      url: publicUrl(lang, path),
    };
  }
  return { kind, refId, pageKey, slug, name, path, langs, uploads: uploadsEnabled() };
}
