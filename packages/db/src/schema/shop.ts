// Core commerce tables. All money is stored as integer paisa (1 BDT = 100 paisa).
import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  json,
  int,
  mysqlEnum,
  mysqlTable,
  serial,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { user } from "./auth";

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
};
/** Foreign key to a `serial` (bigint unsigned) id. */
const fk = (name: string) => bigint(name, { mode: "number", unsigned: true });
/** Amount in paisa. */
const money = (name: string) => int(name, { unsigned: true });

export const categories = mysqlTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  nameBn: varchar("name_bn", { length: 120 }),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  description: text("description"),
  /** Bangla twin of `description` (bilingual storefront, migration 0028). */
  descriptionBn: text("description_bn"),
  /** Short line under the shelf name in the header menu (English; owner, 2026-11-22). */
  tagline: varchar("tagline", { length: 80 }),
  /** Bangla twin of `tagline`. */
  taglineBn: varchar("tagline_bn", { length: 80 }),
  imageUrl: varchar("image_url", { length: 500 }),
  /** Wide photo for this shelf's Shop page header (owner, 2026-11-22). Null: the default photo. */
  headerImageUrl: varchar("header_image_url", { length: 500 }),
  sortOrder: int("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ...timestamps,
});

export const products = mysqlTable(
  "products",
  {
    id: serial("id").primaryKey(),
    categoryId: fk("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: varchar("name", { length: 200 }).notNull(),
    nameBn: varchar("name_bn", { length: 200 }),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    /** English. */
    description: text("description"),
    /** Bangla twin of `description` (migration 0028). */
    descriptionBn: text("description_bn"),
    /** One short Bangla line for the Home featured card (owner, 2026-11-21). */
    tagline: varchar("tagline", { length: 120 }),
    /** English twin of `tagline`. */
    taglineEn: varchar("tagline_en", { length: 120 }),
    // Product page "আচারের কথা" and "তথ্য ও যত্ন" (Product.dc.html). Shown only when filled.
    // These are Bangla; each `…En` column is its English twin (migration 0028). A site shows its
    // own language and falls back to the other one (owner, 2026-11-16).
    ingredients: text("ingredients"),
    ingredientsEn: text("ingredients_en"),
    flavor: text("flavor"),
    flavorEn: text("flavor_en"),
    texture: text("texture"),
    textureEn: text("texture_en"),
    serving: text("serving"),
    servingEn: text("serving_en"),
    storage: text("storage"),
    storageEn: text("storage_en"),
    shelfLife: text("shelf_life"),
    shelfLifeEn: text("shelf_life_en"),
    allergens: text("allergens"),
    allergensEn: text("allergens_en"),
    packaging: text("packaging"),
    packagingEn: text("packaging_en"),
    /** Extra words storefront search matches, e.g. romanized names ("aam kancha") or "jhal spicy". */
    searchTerms: varchar("search_terms", { length: 500 }),
    spiceLevel: tinyint("spice_level").default(0).notNull(), // 0-3 = red chillies of three
    isActive: boolean("is_active").default(true).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    ...timestamps,
  },
  (t) => [index("products_category_idx").on(t.categoryId)],
);

/** A sellable unit, e.g. "250g jar". Price and stock live here. */
export const productVariants = mysqlTable(
  "product_variants",
  {
    id: serial("id").primaryKey(),
    productId: fk("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 64 }).notNull().unique(),
    label: varchar("label", { length: 80 }).notNull(),
    weightGrams: int("weight_grams", { unsigned: true }),
    price: money("price").notNull(),
    compareAtPrice: money("compare_at_price"),
    /** What the size costs the shop (paisa), for margin and Reports. Admin only. */
    costPrice: money("cost_price"),
    stock: int("stock").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    /** Size chip order on the product page (admin "টেনে ক্রম বদলান"). */
    sortOrder: int("sort_order").default(0).notNull(),
    ...timestamps,
  },
  (t) => [index("variants_product_idx").on(t.productId)],
);

export const productImages = mysqlTable("product_images", {
  id: serial("id").primaryKey(),
  productId: fk("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: varchar("url", { length: 500 }).notNull(),
  /** English alt text; `altBn` is its Bangla twin (migration 0028). */
  alt: varchar("alt", { length: 200 }),
  altBn: varchar("alt_bn", { length: 200 }),
  sortOrder: int("sort_order").default(0).notNull(),
  /**
   * The photo for Home's "বিশেষ বাছাই" card (owner, 2026-11-22). At most one per product; it is
   * left out of the product page gallery. None: the picks card uses the main (first) photo.
   */
  isFeatured: boolean("is_featured").default(false).notNull(),
  /**
   * Pixel size, read by the admin server when the photo is saved (owner, 2026-11-15). The
   * storefront picks the gallery fit from it before the photo loads. Null = not known yet.
   */
  width: int("width"),
  height: int("height"),
});

export const addresses = mysqlTable("addresses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  /** "ঠিকানার নাম", e.g. বাসা, অফিস (Account.dc.html). */
  label: varchar("label", { length: 60 }).default("").notNull(),
  fullName: varchar("full_name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  line1: varchar("line1", { length: 255 }).notNull(),
  area: varchar("area", { length: 120 }),
  /** Upazila / thana. */
  city: varchar("city", { length: 80 }).notNull(),
  district: varchar("district", { length: 80 }),
  division: varchar("division", { length: 80 }),
  postalCode: varchar("postal_code", { length: 12 }),
  isDefault: boolean("is_default").default(false).notNull(),
  ...timestamps,
});

export const coupons = mysqlTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  type: mysqlEnum("type", ["percent", "fixed"]).notNull(),
  value: int("value", { unsigned: true }).notNull(), // percent (0-100) or paisa
  minOrderAmount: money("min_order_amount").default(0).notNull(),
  maxUses: int("max_uses", { unsigned: true }),
  usedCount: int("used_count", { unsigned: true }).default(0).notNull(),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  isActive: boolean("is_active").default(true).notNull(),
  /**
   * Uses per person (owner decision, 2026-11-15: one by default). A person is the same phone,
   * account or device cookie, or the same device fingerprint on the same network. Null = no limit.
   */
  perPersonLimit: int("per_person_limit", { unsigned: true }).default(1),
  /** Percent coupons: never take off more than this (paisa). Null = no cap. */
  maxDiscount: money("max_discount"),
  /** Only for someone with no earlier (non-cancelled) order. */
  firstOrderOnly: boolean("first_order_only").default(false).notNull(),
  ...timestamps,
});

/**
 * One row per order placed with a coupon: who used it, for the per-person limit. Uses are never
 * given back, even when the order is cancelled (owner decision, 2026-11-15). The IP is kept both
 * as a keyed hash (matching) and as written (the owner's records).
 */
export const couponRedemptions = mysqlTable(
  "coupon_redemptions",
  {
    id: serial("id").primaryKey(),
    couponId: fk("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderId: fk("order_id").references(() => orders.id, { onDelete: "set null" }),
    /** Normalised 01XXXXXXXXX. */
    phone: varchar("phone", { length: 20 }).notNull(),
    userId: varchar("user_id", { length: 36 }),
    /** Long-lived httpOnly cookie set by the storefront (ak_did). */
    deviceId: varchar("device_id", { length: 64 }),
    /** SHA-256 of browser traits, sent by checkout. */
    fingerprint: varchar("fingerprint", { length: 64 }),
    /** HMAC-SHA256 of the client IP (used for matching). */
    ipHash: varchar("ip_hash", { length: 64 }),
    /** The client IP as seen by the shop (owner decision, 2026-11-15: kept for coupon records). */
    ip: varchar("ip", { length: 45 }),
    /** Browser user agent at checkout. */
    userAgent: varchar("user_agent", { length: 400 }),
    /** "web" checkout or "admin" manual order. */
    source: varchar("source", { length: 10 }).default("web").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("coupon_redemptions_phone_idx").on(t.couponId, t.phone),
    index("coupon_redemptions_user_idx").on(t.couponId, t.userId),
    index("coupon_redemptions_device_idx").on(t.couponId, t.deviceId),
    index("coupon_redemptions_fp_idx").on(t.couponId, t.fingerprint, t.ipHash),
  ],
);

/** Wrong coupon codes tried at checkout, for the guessing limit (keyed hash of IP + device). */
export const couponAttempts = mysqlTable(
  "coupon_attempts",
  {
    id: serial("id").primaryKey(),
    who: varchar("who", { length: 64 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("coupon_attempts_who_idx").on(t.who, t.createdAt)],
);

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;
/** "ঝাল কেমন ছিল?" answers on a product review. */
export const REVIEW_SPICE = ["low", "ok", "high"] as const;
/** Delivery zone chosen at checkout: inside Dhaka district or outside (decides the fee). */
export const DELIVERY_ZONES = ["in", "out"] as const;
/** Preset reasons for cancelling an order (admin cancel dialog, States-Tablet). */
export const CANCEL_REASONS = ["no_answer", "customer_cancelled", "duplicate", "other"] as const;
/** Where an order came from. Storefront checkout is "website"; the rest are admin manual orders. */
export const ORDER_SOURCES = [
  "website",
  "in_person",
  "phone",
  "facebook",
  "instagram",
  "whatsapp",
] as const;
export const PAYMENT_METHODS = ["cod", "bkash", "nagad", "sslcommerz"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

export const orders = mysqlTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: varchar("order_number", { length: 32 }).notNull().unique(),
    /**
     * One key per checkout attempt, sent by the storefront. A second submit with the same key
     * (double-click, retry after a lost answer) hits this unique index instead of making a second
     * order. Null for admin manual orders and orders placed before the column existed.
     */
    checkoutKey: varchar("checkout_key", { length: 64 }).unique(),
    userId: varchar("user_id", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    status: mysqlEnum("status", ORDER_STATUSES).default("pending").notNull(),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
    customerEmail: varchar("customer_email", { length: 255 }),
    shippingAddress: text("shipping_address").notNull(),
    // Address parts saved separately so the admin can show and filter by area (Orders-Desktop).
    // Null for orders placed before these columns existed.
    shipArea: varchar("ship_area", { length: 120 }),
    shipUpazila: varchar("ship_upazila", { length: 80 }),
    shipDistrict: varchar("ship_district", { length: 80 }),
    deliveryZone: mysqlEnum("delivery_zone", DELIVERY_ZONES),
    source: mysqlEnum("source", ORDER_SOURCES).default("website").notNull(),
    subtotal: money("subtotal").notNull(),
    discount: money("discount").default(0).notNull(),
    shippingFee: money("shipping_fee").default(0).notNull(),
    total: money("total").notNull(),
    couponId: fk("coupon_id").references(() => coupons.id, { onDelete: "set null" }),
    note: text("note"),
    cancelReason: mysqlEnum("cancel_reason", CANCEL_REASONS),
    cancelNote: text("cancel_note"),
    // Order tracking (Track.dc.html). Filled by admin once known; the page shows a fallback until then.
    courierName: varchar("courier_name", { length: 80 }),
    /** "কুরিয়ারের জন্য নোট": printed on the packing slip and label; sent to Steadfast later. */
    courierNote: text("courier_note"),
    /**
     * Steadfast booking (owner decision, 2026-11-15): booking hands the parcel to the courier, so
     * the order becomes "shipped" and the customer sees "কুরিয়ারে হস্তান্তর". Admin shows the
     * internal step "কুরিয়ারে বুক" while a consignment exists and it isn't delivered yet.
     */
    consignmentId: varchar("consignment_id", { length: 40 }),
    courierBookedAt: timestamp("courier_booked_at"),
    /** Last Steadfast delivery_status (pending, hold, delivered, cancelled, unknown, …). */
    courierStatus: varchar("courier_status", { length: 40 }),
    courierSyncedAt: timestamp("courier_synced_at"),
    /** "টাকা পাওয়া গেছে": the owner marked the courier's COD payout received (admin-only step). */
    settledAt: timestamp("settled_at"),
    payoutRef: varchar("payout_ref", { length: 80 }),
    trackingRef: varchar("tracking_ref", { length: 80 }),
    etaDate: date("eta_date", { mode: "string" }),
    ...timestamps,
  },
  (t) => [index("orders_user_idx").on(t.userId), index("orders_status_idx").on(t.status)],
);

export const orderItems = mysqlTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: fk("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  variantId: fk("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  // Snapshot so order history survives product edits.
  productName: varchar("product_name", { length: 200 }).notNull(),
  variantLabel: varchar("variant_label", { length: 80 }).notNull(),
  unitPrice: money("unit_price").notNull(),
  quantity: int("quantity", { unsigned: true }).notNull(),
});

export const payments = mysqlTable("payments", {
  id: serial("id").primaryKey(),
  orderId: fk("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: mysqlEnum("method", PAYMENT_METHODS).notNull(),
  status: mysqlEnum("status", PAYMENT_STATUSES).default("pending").notNull(),
  amount: money("amount").notNull(),
  transactionId: varchar("transaction_id", { length: 120 }),
  ...timestamps,
});

export const reviews = mysqlTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: fk("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Null for a guest review. */
    userId: varchar("user_id", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    /** Shown on the review. Copied from the account for signed-in reviewers, typed by guests. */
    name: varchar("name", { length: 120 }).default("").notNull(),
    rating: tinyint("rating").notNull(),
    title: varchar("title", { length: 120 }),
    comment: text("comment"),
    spice: mysqlEnum("spice", REVIEW_SPICE),
    photoUrl: varchar("photo_url", { length: 300 }),
    isApproved: boolean("is_approved").default(false).notNull(),
    /** "আচারকুঠির উত্তর": the shop's public reply (Reviews-* boards), shown under the review. */
    reply: text("reply"),
    replyAt: timestamp("reply_at"),
    ...timestamps,
  },
  (t) => [uniqueIndex("reviews_user_product_uq").on(t.userId, t.productId)],
);

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(productVariants),
  images: many(productImages),
  reviews: many(reviews),
}));
export const variantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}));
export const imagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
  payments: many(payments),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  user: one(user, { fields: [reviews.userId], references: [user.id] }),
}));

// ---------------------------------------------------------------------------
// Recipes (Recipes.dc.html list, RecipeDetail.dc.html detail)
// ---------------------------------------------------------------------------

export const RECIPE_CATEGORIES = ["rice", "snack", "feast", "new"] as const;
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

/** One ingredient line. Either a scalable `qty` + `unit`, or a fixed phrase such as "স্বাদমতো". */
// Recipe text is Bangla; each `…En` key is its English twin (bilingual storefront, 2026-11-16).
// Quantities are shared, so the two languages can never disagree on amounts.
export interface RecipeIngredient {
  group: string;
  groupEn?: string;
  name: string;
  nameEn?: string;
  qty?: number;
  unit?: string;
  unitEn?: string;
  fixed?: string;
  fixedEn?: string;
  note?: string;
  noteEn?: string;
}

export interface RecipeStep {
  title: string;
  titleEn?: string;
  text: string;
  textEn?: string;
  time?: string;
  timeEn?: string;
  heat?: string;
  heatEn?: string;
  tip?: string;
  tipEn?: string;
  imageUrl?: string;
}

export interface RecipeTip {
  title: string;
  titleEn?: string;
  text: string;
  textEn?: string;
}

export const recipes = mysqlTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 140 }).notNull().unique(),
    /** Bengali title. */
    title: varchar("title", { length: 200 }).notNull(),
    /** English title (migration 0028). */
    titleEn: varchar("title_en", { length: 200 }),
    /** English subtitle. */
    subtitle: varchar("subtitle", { length: 240 }).notNull(),
    /** Bangla subtitle, the small line on the English site's twin (migration 0028). */
    subtitleBn: varchar("subtitle_bn", { length: 240 }),
    /** One Bengali sentence, shown on the featured card and the detail lede. */
    summary: text("summary"),
    summaryEn: text("summary_en"),
    category: mysqlEnum("category", RECIPE_CATEGORIES).notNull(),
    /** Total time in minutes. The "১৫ মিনিটের মধ্যে" filter reads this. */
    totalMinutes: int("total_minutes", { unsigned: true }).notNull(),
    prepMinutes: int("prep_minutes", { unsigned: true }),
    cookMinutes: int("cook_minutes", { unsigned: true }),
    /** Base servings the ingredient quantities are written for. */
    servings: tinyint("servings", { unsigned: true }),
    /** 1 easy, 2 medium, 3 hard. */
    difficulty: tinyint("difficulty", { unsigned: true }).notNull(),
    /** Public image URL. Null shows the design's photo placeholder until a photo is added. */
    imageUrl: varchar("image_url", { length: 500 }),
    imageFile: varchar("image_file", { length: 160 }),
    imageAlt: varchar("image_alt", { length: 300 }).default("").notNull(),
    imageAltBn: varchar("image_alt_bn", { length: 300 }),
    ingredients: json("ingredients").$type<RecipeIngredient[]>(),
    steps: json("steps").$type<RecipeStep[]>(),
    tips: json("tips").$type<RecipeTip[]>(),
    /** The pickle served with this recipe. Name and price always come from `products`. */
    productId: fk("product_id").references(() => products.id, { onDelete: "set null" }),
    /** Marks the placeholder recipes from the design boards, until real ones replace them. */
    isSample: boolean("is_sample").default(false).notNull(),
    /** Position in the featured carousel (1-based). Null when not featured. */
    featuredOrder: tinyint("featured_order", { unsigned: true }),
    sortOrder: int("sort_order").default(0).notNull(),
    isPublished: boolean("is_published").default(true).notNull(),
    ...timestamps,
  },
  (t) => [
    index("recipes_category_idx").on(t.category),
    index("recipes_product_idx").on(t.productId),
  ],
);

export const recipesRelations = relations(recipes, ({ one }) => ({
  product: one(products, { fields: [recipes.productId], references: [products.id] }),
}));

export const RESTOCK_CONTACT_KINDS = ["phone", "email"] as const;

/** "স্টকে এলে জানান" requests from the product page. One row per size and contact. */
export const restockRequests = mysqlTable(
  "restock_requests",
  {
    id: serial("id").primaryKey(),
    variantId: fk("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    /** A normalised BD mobile number (01XXXXXXXXX) or a lower-cased email. */
    contact: varchar("contact", { length: 255 }).notNull(),
    contactKind: mysqlEnum("contact_kind", RESTOCK_CONTACT_KINDS).notNull(),
    userId: varchar("user_id", { length: 36 }).references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** Set by an admin once the customer has been told. */
    notifiedAt: timestamp("notified_at"),
  },
  (t) => [
    uniqueIndex("restock_variant_contact_uq").on(t.variantId, t.contact),
    index("restock_notified_idx").on(t.notifiedAt, t.createdAt),
  ],
);

export const restockRequestsRelations = relations(restockRequests, ({ one }) => ({
  variant: one(productVariants, {
    fields: [restockRequests.variantId],
    references: [productVariants.id],
  }),
}));
