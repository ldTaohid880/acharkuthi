import "server-only";

import { cache } from "react";
import { and, db, eq, or, schema } from "@repo/db";
import type { Lang } from "@/lib/i18n/lang";

type SharePageKey = (typeof schema.SHARE_PAGE_KEYS)[number];

/**
 * Link-preview cards (docs/future/og-sharing.md). Every shared link gets a 1200×630 JPEG for the
 * large card plus a 1080×1080 JPEG square for apps that pick one (WhatsApp's small bubble).
 * Never a WebP or a portrait photo: WhatsApp drops WebP, and portraits crop badly.
 *
 * Fallback chain: the item's own card → its category's card → the page's card → the site card
 * row → the static default in public/og (scripts/og-default-cards.mjs, "Studio" template).
 */

export interface ShareImage {
  url: string;
  width: number;
  height: number;
  type: "image/jpeg";
}

export interface ShareCard {
  wide: ShareImage;
  square: ShareImage;
  /** Owner's share-text overrides (Share Studio); else the page's own title and description. */
  title?: string | undefined;
  description?: string | undefined;
}

const WIDE = { width: 1200, height: 630 } as const;
const SQUARE = { width: 1080, height: 1080 } as const;

/** Bump when public/og/site-*.jpg is re-rendered, so chat apps fetch the new file. */
const SITE_CARD_VERSION = 1;

const jpeg = (url: string, size: { width: number; height: number }): ShareImage => ({
  url,
  ...size,
  type: "image/jpeg",
});

/** The static site card for a language (Bangla name first on "/", English on "/en/"). */
export const siteCard = (lang: Lang): ShareCard => ({
  wide: jpeg(`/og/site-${lang}-wide.jpg?v=${SITE_CARD_VERSION}`, WIDE),
  square: jpeg(`/og/site-${lang}-square.jpg?v=${SITE_CARD_VERSION}`, SQUARE),
});

/** Adds ?v=<version> (or &v=) so a re-rendered card gets a new URL. */
export const versioned = (url: string, version: number) =>
  `${url}${url.includes("?") ? "&" : "?"}v=${version}`;

type Row = Pick<
  typeof schema.shareCards.$inferSelect,
  "kind" | "refId" | "pageKey" | "wideUrl" | "squareUrl" | "version" | "title" | "description"
>;

export interface ShareTarget {
  lang: Lang;
  productId?: number | undefined;
  categoryId?: number | null | undefined;
  pageKey?: SharePageKey | undefined;
}

/** Rows of the chain, most specific first; a target part that is missing is skipped. */
function chain(t: ShareTarget) {
  const links: { kind: Row["kind"]; refId: number; pageKey: string }[] = [];
  if (t.productId) links.push({ kind: "product", refId: t.productId, pageKey: "" });
  if (t.categoryId) links.push({ kind: "category", refId: t.categoryId, pageKey: "" });
  if (t.pageKey) links.push({ kind: "page", refId: 0, pageKey: t.pageKey });
  links.push({ kind: "site", refId: 0, pageKey: "" });
  return links;
}

/**
 * The first rendered card along the chain (both images present), else the static default.
 * Text overrides only come from the item's own row (a shelf's title must not name a product),
 * whether or not that row has a card.
 */
export function pickCard(rows: readonly Row[], target: ShareTarget): ShareCard {
  const links = chain(target);
  const find = (link: (typeof links)[number]) =>
    rows.find((r) => r.kind === link.kind && r.refId === link.refId && r.pageKey === link.pageKey);
  // Share Studio text belongs to the link itself and applies even without a card of its own
  // (e.g. a site page in অটো with its own title).
  const own = links[0] ? find(links[0]) : undefined;
  const text = {
    ...(own?.title ? { title: own.title } : {}),
    ...(own?.description ? { description: own.description } : {}),
  };
  for (const link of links) {
    const row = find(link);
    if (!row?.wideUrl || !row.squareUrl) continue;
    return {
      wide: jpeg(versioned(row.wideUrl, row.version), WIDE),
      square: jpeg(versioned(row.squareUrl, row.version), SQUARE),
      ...text,
    };
  }
  return { ...siteCard(target.lang), ...text };
}

/**
 * The card for a page, read once per request. A database error falls back to the site card:
 * a preview must never break the page.
 */
export const getShareCard = cache(
  async (
    lang: Lang,
    productId?: number,
    categoryId?: number | null,
    pageKey?: SharePageKey,
  ): Promise<ShareCard> => {
    const target: ShareTarget = { lang, productId, categoryId, pageKey };
    const c = schema.shareCards;
    try {
      const rows = await db
        .select({
          kind: c.kind,
          refId: c.refId,
          pageKey: c.pageKey,
          wideUrl: c.wideUrl,
          squareUrl: c.squareUrl,
          version: c.version,
          title: c.title,
          description: c.description,
        })
        .from(c)
        .where(
          and(
            eq(c.lang, lang),
            or(
              ...chain(target).map((l) =>
                and(eq(c.kind, l.kind), eq(c.refId, l.refId), eq(c.pageKey, l.pageKey)),
              ),
            ),
          ),
        );
      return pickCard(rows, target);
    } catch (err) {
      console.error("share card lookup failed", err);
      return siteCard(lang);
    }
  },
);
