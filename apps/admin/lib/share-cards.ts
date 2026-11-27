import "server-only";

import { createHash } from "node:crypto";
import { and, bySortOrder, db, eq, schema } from "@repo/db";
import { env } from "@/env";

/**
 * Link-preview cards (docs/future/og-sharing.md). The server decides what each card shows; the
 * admin browser only draws it (lib/og/render.ts) and uploads the JPEGs. `hash` fingerprints
 * those inputs: a stored card whose hash differs is redrawn.
 *
 * - "studio": the owner-approved template (2026-11-26) for products and shelves: linen ground,
 *   green names, the featured (styled) photo, the ছোট লাইন, a discount pill, no price.
 * - "photo": an owner/staff-chosen photo in Share Studio (নিজের ছবি), cropped around its focal
 *   point, nothing drawn on it. Site pages only ever have this kind of card; in অটো they use the
 *   storefront's default site card.
 */

/** Bump when the card design changes: every card becomes stale and is drawn again. */
export const CARD_DESIGN_VERSION = 1;

export type CardKind = "product" | "category" | "page";
export type CardLang = "bn" | "en";

export interface CardSpec {
  kind: CardKind;
  /** Product or category id; 0 for site pages. */
  refId: number;
  /** Site page key (home, shop, …); "" for products and shelves. */
  pageKey: string;
  slug: string;
  lang: CardLang;
  layout: "studio" | "photo";
  /** Small line above the names: the shelf ("আমের আচার") or "আচারকুঠির তাক". */
  eyebrow: string;
  /** The page language's name, drawn large. */
  lead: string;
  /** The other language's name, if there is one. */
  second: string | null;
  /** Product ছোট লাইন in the page language; null on shelves or when the admin left it empty. */
  line: string | null;
  /** Discount pill, e.g. ["১০%", "ছাড়"]; null when no size is on sale. */
  badge: [string, string] | null;
  /** Photo URL the browser can draw: same-origin (/og/…) or through /api/og-source. */
  photo: string;
  /** Where the photo sits in its frame (CSS background-position, 0–1). */
  focal: { x: number; y: number };
  hash: string;
}

/** Bangla labels the storefront gives these shelves (storefront lib/i18n/dict.ts shelf.label). */
const SHELF_LABEL_BN: Record<string, string> = {
  mango: "আমের আচার",
  lemon: "লেবুর আচার",
  special: "বিশেষ আচার",
  mixed: "মিশ্র আচার",
};
export const shelfLabel = (
  lang: CardLang,
  c: { slug: string; name: string; nameBn: string | null },
) =>
  lang === "bn"
    ? (SHELF_LABEL_BN[c.slug] ?? `${c.nameBn ?? c.name} আচার`)
    : /pickles?$/i.test(c.name)
      ? c.name
      : `${c.name} pickles`;

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const bnDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);

/** Largest whole-percent saving across the active sizes, or 0. */
export function discountPercent(
  variants: readonly { price: number; compareAtPrice: number | null }[],
) {
  let best = 0;
  for (const v of variants)
    if (v.compareAtPrice && v.compareAtPrice > v.price)
      best = Math.max(best, Math.floor(((v.compareAtPrice - v.price) / v.compareAtPrice) * 100));
  return best;
}

export const discountBadge = (lang: CardLang, pct: number): [string, string] | null =>
  pct < 1 ? null : lang === "bn" ? [`${bnDigits(String(pct))}%`, "ছাড়"] : [`${pct}%`, "off"];

type SpecBase = Omit<CardSpec, "hash" | "photo">;

/** Card inputs → hash. Everything drawn on the card is in here, plus the design version. */
export function specHash(s: SpecBase & { photoSource: string }) {
  const { kind, refId, pageKey, lang, layout, eyebrow, lead, second, line, badge, focal } = s;
  return createHash("sha256")
    .update(
      JSON.stringify([
        CARD_DESIGN_VERSION,
        kind,
        refId,
        pageKey,
        lang,
        layout,
        eyebrow,
        lead,
        second,
        line,
        badge,
        s.photoSource,
        focal,
      ]),
    )
    .digest("hex")
    .slice(0, 32);
}

/** The photo's address for the browser: our R2 or storefront photos go through the proxy. */
const drawable = (url: string) =>
  url.startsWith("/og/") ? url : `/api/og-source?u=${encodeURIComponent(absolutePhoto(url))}`;
/** Storefront paths ("/images/…") resolve against the storefront. */
export const absolutePhoto = (url: string) =>
  url.startsWith("/") && !url.startsWith("/og/")
    ? new URL(url, env.STOREFRONT_URL).toString()
    : url;

const LANGS: readonly CardLang[] = ["bn", "en"];

function finish(base: SpecBase, photoSource: string): CardSpec {
  return { ...base, photo: drawable(photoSource), hash: specHash({ ...base, photoSource }) };
}

export const cardKey = (s: { kind: string; refId: number; pageKey: string; lang: string }) =>
  `${s.kind}:${s.refId}:${s.pageKey}:${s.lang}`;

type Row = typeof schema.shareCards.$inferSelect;

/** Every stored card row, keyed "kind:refId:pageKey:lang" (a few dozen rows at most). */
export async function storedCards(): Promise<Map<string, Row>> {
  const rows = await db.select().from(schema.shareCards);
  return new Map(rows.map((r) => [cardKey(r), r]));
}

/** A custom-photo row turns its spec into the "photo" layout. */
function applyCustom(base: SpecBase, photoSource: string, row: Row | undefined): CardSpec {
  if (row?.mode !== "custom" || !row.sourceImageUrl) return finish(base, photoSource);
  return finish(
    {
      ...base,
      layout: "photo",
      focal: { x: Number(row.focalX), y: Number(row.focalY) },
    },
    row.sourceImageUrl,
  );
}

export interface SpecFilter {
  kind: CardKind;
  id?: number | undefined;
  pageKey?: string | undefined;
}

/**
 * Card specs for active products (with a real photo, or a custom one), active shelves and
 * site pages with a custom photo, both languages.
 */
export async function buildCardSpecs(
  filter?: SpecFilter,
  rows?: Map<string, Row>,
): Promise<CardSpec[]> {
  const stored = rows ?? (await storedCards());
  const specs: CardSpec[] = [];
  const want = (k: CardKind) => !filter || filter.kind === k;

  if (want("product")) {
    const products = await db.query.products.findMany({
      where: filter?.id
        ? and(eq(schema.products.isActive, true), eq(schema.products.id, filter.id))
        : eq(schema.products.isActive, true),
      with: { images: true, variants: true, category: true },
    });
    for (const p of products) {
      const images = [...p.images].sort(bySortOrder);
      const photo = images.find((i) => i.isFeatured) ?? images[0];
      const pct = discountPercent(p.variants.filter((v) => v.isActive));
      for (const lang of LANGS) {
        const row = stored.get(cardKey({ kind: "product", refId: p.id, pageKey: "", lang }));
        // No photo and no custom one: no card; the storefront shows the shelf's card.
        if (!photo && !(row?.mode === "custom" && row.sourceImageUrl)) continue;
        const bn = lang === "bn";
        const lead = bn ? (p.nameBn ?? p.name) : p.name;
        const other = bn ? p.name : p.nameBn;
        specs.push(
          applyCustom(
            {
              kind: "product",
              refId: p.id,
              pageKey: "",
              slug: p.slug,
              lang,
              layout: "studio",
              eyebrow: p.category ? shelfLabel(lang, p.category) : bn ? "আচারকুঠি" : "Acharkuthi",
              lead,
              second: other && other !== lead ? other : null,
              // `tagline` is the Bangla line, `taglineEn` its English twin (migration 0030).
              line: (bn ? p.tagline : p.taglineEn)?.trim() || null,
              badge: discountBadge(lang, pct),
              focal: { x: 0.5, y: 0.65 },
            },
            photo?.url ?? "",
            row,
          ),
        );
      }
    }
  }

  if (want("category")) {
    const shelves = await db.query.categories.findMany({
      where: filter?.id
        ? and(eq(schema.categories.isActive, true), eq(schema.categories.id, filter.id))
        : eq(schema.categories.isActive, true),
    });
    for (const c of shelves)
      for (const lang of LANGS) {
        const bn = lang === "bn";
        const lead = shelfLabel(lang, c);
        const other = shelfLabel(bn ? "en" : "bn", c);
        specs.push(
          applyCustom(
            {
              kind: "category",
              refId: c.id,
              pageKey: "",
              slug: c.slug,
              lang,
              layout: "studio",
              eyebrow: bn ? "আচারকুঠির তাক" : "From the Acharkuthi shelves",
              lead,
              second: other !== lead ? other : null,
              line: null,
              badge: null,
              // The Shop header photos keep their subject on the right.
              focal: { x: 0.82, y: 0.5 },
            },
            c.headerImageUrl ?? "/og/shelf-default.webp",
            stored.get(cardKey({ kind: "category", refId: c.id, pageKey: "", lang })),
          ),
        );
      }
  }

  if (want("page"))
    for (const row of stored.values()) {
      if (row.kind !== "page" || row.mode !== "custom" || !row.sourceImageUrl) continue;
      if (filter?.pageKey && row.pageKey !== filter.pageKey) continue;
      specs.push(
        applyCustom(
          {
            kind: "page",
            refId: 0,
            pageKey: row.pageKey,
            slug: row.pageKey,
            lang: row.lang,
            layout: "photo",
            eyebrow: "",
            lead: "",
            second: null,
            line: null,
            badge: null,
            focal: { x: 0.5, y: 0.5 },
          },
          row.sourceImageUrl,
          row,
        ),
      );
    }

  return specs;
}

export const isStale = (s: CardSpec, row: Pick<Row, "renderedFrom" | "wideUrl"> | undefined) =>
  !row?.wideUrl || row.renderedFrom !== s.hash;

export interface ShareCardSummary {
  total: number;
  stale: number;
  /** A few stale item names for the Settings card ("নবাবি লস্যি, আমের আচার …"). */
  staleNames: string[];
  uploads: boolean;
}

export async function shareCardSummary(uploads: boolean): Promise<ShareCardSummary> {
  const rows = await storedCards();
  const specs = await buildCardSpecs(undefined, rows);
  const stale = specs.filter((s) => isStale(s, rows.get(cardKey(s))));
  const names = [...new Set(stale.filter((s) => s.lang === "bn").map((s) => s.lead || s.pageKey))];
  return { total: specs.length, stale: stale.length, staleNames: names.slice(0, 4), uploads };
}
