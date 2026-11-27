// Link-preview (Open Graph) cards: one row per item and language (docs/future/og-sharing.md §5).
// Phase 1 only reads them; the admin Share Studio (later phases) writes them.
import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  serial,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const SHARE_CARD_KINDS = ["product", "category", "page", "site"] as const;
export type ShareCardKind = (typeof SHARE_CARD_KINDS)[number];
/** Site pages that can carry their own card ("page" rows). */
export const SHARE_PAGE_KEYS = ["home", "shop", "story", "contact", "faq", "policies"] as const;
export type SharePageKey = (typeof SHARE_PAGE_KEYS)[number];
export const SHARE_CARD_MODES = ["auto", "custom"] as const;

export const shareCards = mysqlTable(
  "share_cards",
  {
    id: serial("id").primaryKey(),
    kind: mysqlEnum("kind", SHARE_CARD_KINDS).notNull(),
    /**
     * Product or category id; 0 for page and site rows. Not null (unlike the plan's draft) so the
     * unique key holds: MySQL lets any number of rows share a NULL in a unique index.
     */
    refId: int("ref_id", { unsigned: true }).default(0).notNull(),
    /** Page key for "page" rows (SHARE_PAGE_KEYS); "" otherwise. Not null for the same reason. */
    pageKey: varchar("page_key", { length: 40 }).default("").notNull(),
    lang: mysqlEnum("lang", ["bn", "en"]).notNull(),
    mode: mysqlEnum("mode", SHARE_CARD_MODES).default("auto").notNull(),
    template: varchar("template", { length: 30 }).default("studio").notNull(),
    /** Share-text overrides; null uses the page's own title and description. */
    title: varchar("title", { length: 120 }),
    description: varchar("description", { length: 300 }),
    /** Owner-uploaded photo for "custom" mode (R2). */
    sourceImageUrl: varchar("source_image_url", { length: 500 }),
    focalX: decimal("focal_x", { precision: 4, scale: 3 }).default("0.500").notNull(),
    focalY: decimal("focal_y", { precision: 4, scale: 3 }).default("0.500").notNull(),
    /** Generated 1200×630 and 1080×1080 JPEGs (R2). */
    wideUrl: varchar("wide_url", { length: 500 }),
    squareUrl: varchar("square_url", { length: 500 }),
    wideBytes: int("wide_bytes", { unsigned: true }),
    squareBytes: int("square_bytes", { unsigned: true }),
    /** Bumped on every render; image URLs carry ?v=<version> so chat apps refetch. */
    version: int("version", { unsigned: true }).default(0).notNull(),
    /** Hash of the inputs the card was rendered from; a different hash marks it stale. */
    renderedFrom: varchar("rendered_from", { length: 64 }),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => [uniqueIndex("share_cards_item_uq").on(t.kind, t.refId, t.pageKey, t.lang)],
);
