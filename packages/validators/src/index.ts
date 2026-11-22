import { z } from "zod";

/** Bangladeshi mobile number, e.g. 01712345678 or +8801712345678. */
export const bdPhone = z
  .string()
  .trim()
  .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid Bangladeshi mobile number");

/** Money in paisa (integer, non-negative). */
export const paisa = z.number().int().nonnegative();

export const slug = z
  .string()
  .trim()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes");

export const categoryInput = z.object({
  name: z.string().trim().min(1).max(120),
  slug,
  description: z.string().trim().max(2000).optional(),
  isActive: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categoryInput>;

export const variantInput = z.object({
  sku: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(80),
  weightGrams: z.number().int().positive().optional(),
  price: paisa,
  compareAtPrice: paisa.optional(),
  stock: z.number().int().nonnegative().default(0),
});

export const productInput = z.object({
  categoryId: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(200),
  slug,
  description: z.string().trim().max(10000).optional(),
  ingredients: z.string().trim().max(2000).optional(),
  spiceLevel: z.number().int().min(0).max(3).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  variants: z.array(variantInput).min(1, "Add at least one variant"),
});
export type ProductInput = z.infer<typeof productInput>;

export const cartItem = z.object({
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
});

export const checkoutInput = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: bdPhone,
  customerEmail: z.email().optional(),
  address: z.string().trim().min(5).max(500),
  city: z.string().trim().min(2).max(80),
  note: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["cod", "bkash", "nagad", "sslcommerz"]),
  couponCode: z.string().trim().max(40).optional(),
  items: z.array(cartItem).min(1, "Your cart is empty"),
});
export type CheckoutInput = z.infer<typeof checkoutInput>;

export const signInInput = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const signUpInput = signInInput.extend({
  name: z.string().trim().min(2).max(120),
});

/** Storefront sign-in, registration and reset forms (Auth.dc.html / AccountStates.dc.html copy). */
const authEmail = z
  .string()
  .trim()
  .min(1, "ইমেইল লিখুন")
  .pipe(z.email("ইমেইলটি ঠিক মনে হচ্ছে না, যেমন: name@example.com"));

export const authLoginForm = z.object({
  email: authEmail,
  password: z.string().min(1, "পাসওয়ার্ড লিখুন"),
});

export const authPasswordRules = {
  length: (pw: string) => pw.length >= 8,
  mix: (pw: string) => /[A-Za-z]/.test(pw) && /\d/.test(pw),
};

export const authRegisterForm = z
  .object({
    name: z.string().trim().min(1, "আপনার নাম লিখুন").max(120),
    email: authEmail,
    password: z
      .string()
      .min(1, "একটি পাসওয়ার্ড দিন")
      .refine(
        (pw) => authPasswordRules.length(pw) && authPasswordRules.mix(pw),
        "পাসওয়ার্ডের শর্তগুলো পূরণ করুন",
      ),
    confirm: z.string().min(1, "পাসওয়ার্ডটি আবার লিখুন"),
  })
  .refine((v) => v.confirm === "" || v.confirm === v.password, {
    path: ["confirm"],
    message: "দুটি পাসওয়ার্ড মিলছে না",
  });

export const authForgotForm = z.object({ email: authEmail });

/** "নতুন পাসওয়ার্ড দিন" after the reset link (owner-approved, 2026-11-15): same rules as sign-up. */
export const authResetForm = z
  .object({
    password: z
      .string()
      .min(1, "একটি পাসওয়ার্ড দিন")
      .refine(
        (pw) => authPasswordRules.length(pw) && authPasswordRules.mix(pw),
        "পাসওয়ার্ডের শর্তগুলো পূরণ করুন",
      ),
    confirm: z.string().min(1, "পাসওয়ার্ডটি আবার লিখুন"),
  })
  .refine((v) => v.confirm === "" || v.confirm === v.password, {
    path: ["confirm"],
    message: "দুটি পাসওয়ার্ড মিলছে না",
  });

/** A same-site path to return to after sign-in; anything else is dropped. */
export const authNextPath = z
  .string()
  .regex(/^\/(?![/\\])[^\s]*$/)
  .max(512);

/** Storefront shop listing filters, parsed from the URL query string. */
export const SHOP_SORTS = ["popular", "newest", "price-asc", "price-desc"] as const;
/** Shop heat filter keys; spice level 0–3 = none, mild, medium, hot (owner decision 2026-11-14). */
export const HEAT_LEVELS = ["none", "mild", "medium", "hot"] as const;

const queryList = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]), z.array(item));

export const shopQuery = z.object({
  sort: z.enum(SHOP_SORTS).catch("popular"),
  heat: queryList(z.enum(HEAT_LEVELS)).catch([]),
  inStock: z.preprocess((v) => v === "1" || v === "true", z.boolean()).catch(false),
  q: z.string().trim().max(80).optional().catch(undefined),
  /** Price bounds in whole taka (the page converts to paisa). */
  minPrice: z.coerce.number().int().min(0).max(1_000_000).optional().catch(undefined),
  maxPrice: z.coerce.number().int().min(0).max(1_000_000).optional().catch(undefined),
  /** Variant label, e.g. "300 g". */
  size: z.string().trim().max(40).optional().catch(undefined),
});
export type ShopQuery = z.infer<typeof shopQuery>;

/** Recipes list filters (Recipes.dc.html), parsed from the URL query string. */
export const RECIPE_FILTERS = ["all", "rice", "snack", "easy", "feast", "new"] as const;
export const RECIPE_PAGE_SIZE = 6;
/** "১৫ মিনিটের মধ্যে" keeps recipes that take this many minutes or fewer. */
export const QUICK_MINUTES = 15;

export const recipesQuery = z.object({
  cat: z.enum(RECIPE_FILTERS).catch("all"),
  quick: z.preprocess((v) => v === "1" || v === "true", z.boolean()).catch(false),
  /** How many recipes to show; "আরও রেসিপি" raises it by RECIPE_PAGE_SIZE. */
  show: z.coerce.number().int().min(RECIPE_PAGE_SIZE).max(1000).optional().catch(undefined),
});
export type RecipesQuery = z.infer<typeof recipesQuery>;

/** Contact page form. Messages are Bengali, matching the design's copy. */
export const CONTACT_SUBJECTS = [
  "order",
  "delivery",
  "product",
  "refund",
  "feedback",
  "other",
] as const;

export const contactInput = z.object({
  name: z.string().trim().min(1, "নামটি লিখুন").max(120),
  email: z
    .string()
    .trim()
    .min(1, "ইমেইল লিখুন")
    .pipe(z.email("ইমেইলটি ঠিক মনে হচ্ছে না, যেমন: name@example.com")),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,15}$/, "ফোন নম্বরটি ঠিক করুন, যেমন: 01XXXXXXXXX")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  subject: z.enum(CONTACT_SUBJECTS, "একটি বিষয় বেছে নিন"),
  message: z
    .string()
    .trim()
    .min(1, "আপনার বার্তা লিখুন")
    .min(10, "আরেকটু বিস্তারিত লিখুন (কমপক্ষে ১০ অক্ষর)")
    .max(2000, "বার্তাটি একটু ছোট করুন (সর্বোচ্চ ২০০০ অক্ষর)"),
});
export type ContactInput = z.infer<typeof contactInput>;

/** Footer newsletter sign-up. */
export const newsletterInput = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email")
    .pipe(z.email("That email does not look right, e.g. name@example.com"))
    .pipe(z.string().max(255)),
});

/** Home page "overall experience" review. Messages are Bengali, as in the design. */
export const siteReviewInput = z.object({
  name: z.string().trim().min(1, "আপনার নাম লিখুন").max(120),
  rating: z.coerce
    .number("তারকা দিয়ে রেটিং বেছে নিন")
    .int()
    .min(1, "তারকা দিয়ে রেটিং বেছে নিন")
    .max(5),
  body: z
    .string()
    .trim()
    .min(1, "আপনার অভিজ্ঞতা লিখুন")
    .min(10, "আরেকটু বিস্তারিত লিখুন (কমপক্ষে ১০ অক্ষর)")
    .max(1500, "লেখাটি একটু ছোট করুন (সর্বোচ্চ ১৫০০ অক্ষর)"),
});

/** Product page review list: filter by stars, sort, and "Load more" (ProductStates, section E). */
export const REVIEW_SORTS = ["new", "high", "low"] as const;
export const REVIEW_PAGE_SIZE = 3;

export const reviewQuery = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  rsort: z.enum(REVIEW_SORTS).catch("new"),
  /** How many reviews to show; "Load more" raises it by REVIEW_PAGE_SIZE. */
  rshow: z.coerce.number().int().min(REVIEW_PAGE_SIZE).max(500).optional().catch(undefined),
  /** "ছবিসহ": only reviews with a customer photo. */
  photo: z
    .literal("1")
    .optional()
    .catch(undefined)
    .transform((v) => v === "1"),
});
export type ReviewQuery = z.infer<typeof reviewQuery>;

/** "ঝাল কেমন ছিল?" answers. Keep in sync with REVIEW_SPICE in @repo/db. */
export const REVIEW_SPICE_KEYS = ["low", "ok", "high"] as const;
export const REVIEW_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const REVIEW_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** Product review ("রিভিউ লিখুন", Product.dc.html section F). Messages are Bengali, as in the design. */
export const productReviewInput = z.object({
  productId: z.coerce.number().int().positive(),
  /** Required for guests only; the action fills it from the account when signed in. */
  name: z.string().trim().max(120).optional(),
  rating: z.coerce
    .number("তারকা দিয়ে রেটিং বেছে নিন")
    .int()
    .min(1, "তারকা দিয়ে রেটিং বেছে নিন")
    .max(5, "তারকা দিয়ে রেটিং বেছে নিন"),
  title: z
    .string()
    .trim()
    .max(120, "শিরোনাম একটু ছোট করুন (সর্বোচ্চ ১২০ অক্ষর)")
    .optional()
    .transform((v) => v || undefined),
  body: z
    .string()
    .trim()
    .min(1, "আপনার অভিজ্ঞতা লিখুন")
    .min(10, "আরেকটু বিস্তারিত লিখুন (কমপক্ষে ১০ অক্ষর)")
    .max(1500, "লেখাটি একটু ছোট করুন (সর্বোচ্চ ১৫০০ অক্ষর)"),
  spice: z.enum(REVIEW_SPICE_KEYS).optional().catch(undefined),
  photo: z
    .instanceof(File)
    .optional()
    .transform((f) => (f && f.size > 0 ? f : undefined))
    .refine((f) => !f || f.size <= REVIEW_PHOTO_MAX_BYTES, "ছবিটি ৫ MB-এর কম হতে হবে")
    .refine(
      (f) => !f || (REVIEW_PHOTO_TYPES as readonly string[]).includes(f.type),
      "শুধু JPG, PNG বা WebP ছবি দিন",
    ),
});
export type ProductReviewInput = z.infer<typeof productReviewInput>;

/** Basket page: the variants in the cart, checked against the database. Quantities are not sent: prices are the only thing that matters here. */
export const basketQuoteInput = z.object({
  variantIds: z.array(z.number().int().positive()).max(50),
});
export type BasketQuoteInput = z.infer<typeof basketQuoteInput>;

/* ---------- Checkout (Checkout.dc.html, CheckoutMobile.dc.html) ---------- */

/** Bengali digits typed into the phone field are read as ASCII; spaces and dashes are ignored. */
const normalisePhone = (v: string) =>
  v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/[\s-]/g, "");

/* ---------- Restock alert (Product.dc.html out-of-stock box, owner-approved form) ---------- */

const BD_MOBILE = /^(?:\+?88)?(01[3-9]\d{8})$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** "স্টকে এলে জানান": one field that takes a BD mobile number or an email. */
export const restockRequestInput = z.object({
  variantId: z.number().int().positive(),
  contact: z
    .string()
    .trim()
    .min(1, "মোবাইল নম্বর বা ইমেইল লিখুন")
    .max(255)
    .transform((v, ctx) => {
      const phone = BD_MOBILE.exec(normalisePhone(v))?.[1];
      if (phone) return { kind: "phone" as const, value: phone };
      if (EMAIL.test(v)) return { kind: "email" as const, value: v.toLowerCase() };
      ctx.addIssue({
        code: "custom",
        message: "মোবাইল নম্বর (01XXX-XXXXXX) বা ইমেইল ঠিকভাবে লিখুন",
      });
      return z.NEVER;
    }),
});
export type RestockRequestInput = z.input<typeof restockRequestInput>;

/** Admin: mark one restock request as notified. */
export const restockNotifiedInput = z.object({ id: z.number().int().positive() });

/** Only cash on delivery is live; the other methods are shown disabled ("শীঘ্রই আসছে"). */
export const CHECKOUT_PAYMENT_METHODS = ["cod"] as const;
export const DELIVERY_ZONES = ["in", "out"] as const;
export type DeliveryZone = (typeof DELIVERY_ZONES)[number];

/** The fields the checkout form validates. Messages are the design's Bengali copy. */
export const checkoutContact = z.object({
  name: z.string().trim().min(1, "পুরো নাম লিখুন").max(120, "পুরো নাম লিখুন"),
  phone: z
    .string()
    .transform(normalisePhone)
    .pipe(
      z
        .string()
        .min(1, "মোবাইল নম্বর লিখুন")
        .regex(
          /^(?:\+?88)?01[3-9]\d{8}$/,
          "নম্বরটি ঠিক নয়। ১১ সংখ্যার নম্বর লিখুন, যেমন 01XXX-XXXXXX",
        ),
    ),
  email: z
    .string()
    .trim()
    .max(255)
    .refine(
      (v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
      "ইমেইলটি ঠিক মনে হচ্ছে না, যেমন: name@example.com",
    ),
  division: z.string().trim().min(1, "বিভাগ বেছে নিন").max(40),
  district: z.string().trim().min(1, "জেলা বেছে নিন").max(80),
  upazila: z.string().trim().min(1, "উপজেলা / থানা বেছে নিন").max(80),
  area: z.string().trim().max(120),
  address: z
    .string()
    .trim()
    .min(1, "বিস্তারিত ঠিকানা লিখুন")
    .min(10, "বাড়ি, রাস্তা ও কাছের পরিচিত জায়গা লিখলে ডেলিভারি সহজ হবে")
    .max(255),
  postal: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}$/.test(v), "পোস্ট কোড ৪ সংখ্যার হয়"),
  note: z.string().trim().max(500),
});
export type CheckoutContact = z.infer<typeof checkoutContact>;
export type CheckoutField = keyof CheckoutContact | "delivery";

const couponCode = z.string().trim().toUpperCase().max(40);

/** Re-prices the checkout. Quantities only; prices always come from the database. */
/** SHA-256 hex of browser traits (checkout's device fingerprint, for the coupon per-person limit). */
const deviceFingerprint = z.string().regex(/^[0-9a-f]{64}$/);

export const checkoutQuoteInput = z.object({
  items: z.array(cartItem).min(1).max(50),
  district: z.string().trim().max(80).optional(),
  couponCode: couponCode.optional(),
  /** Typed so far; lets the per-person coupon check run before the order is placed. */
  phone: z.string().trim().max(20).optional(),
  /** The check while the code is being typed: a miss isn't a wrong try (it may be half typed). */
  live: z.boolean().optional(),
  fp: deviceFingerprint.optional().catch(undefined),
});
export type CheckoutQuoteInput = z.infer<typeof checkoutQuoteInput>;

export const placeOrderInput = z.object({
  contact: checkoutContact,
  delivery: z.enum(DELIVERY_ZONES, "ডেলিভারি পদ্ধতি বেছে নিন"),
  paymentMethod: z.enum(CHECKOUT_PAYMENT_METHODS),
  couponCode: couponCode.optional(),
  items: z.array(cartItem).min(1).max(50),
  /** The unit prices (paisa) the customer was shown; a mismatch stops the order so they can review. */
  seenPrices: z.record(z.string(), paisa),
  /**
   * Items the customer was shown as unavailable ("মোট থেকে বাদ দেওয়া হয়েছে"). Any other item that
   * is unavailable now went missing after their last quote: the order stops so they can review.
   */
  seenGone: z.array(z.number().int().positive()).max(50).default([]),
  fp: deviceFingerprint.optional().catch(undefined),
  /** One per checkout attempt (crypto.randomUUID in the browser): a repeat submit returns the first order. */
  checkoutKey: z
    .string()
    .regex(/^[A-Za-z0-9-]{16,64}$/)
    .optional()
    .catch(undefined),
});
export type PlaceOrderInput = z.infer<typeof placeOrderInput>;

/** Real order numbers, as checkout writes them: AK-YYMMDD-NNNNNN. */
export const ORDER_NUMBER_RE = /^AK-\d{6}-\d{6}$/;

/** Track.dc.html lookup form. Messages are the design's Bengali copy (example uses the real format, owner decision). */
export const trackLookupInput = z.object({
  order: z
    .string()
    .transform((v) =>
      v
        .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
        .replace(/\s/g, "")
        .toUpperCase(),
    )
    .pipe(
      z
        .string()
        .min(1, "অর্ডার নম্বর লিখুন")
        .refine(
          (v) => v === "" || ORDER_NUMBER_RE.test(v),
          "অর্ডার নম্বরটি ঠিক মনে হচ্ছে না। যেমন: AK-261108-123456",
        ),
    ),
  contact: z
    .string()
    .transform((v) => normalisePhone(v.trim()))
    .pipe(
      z
        .string()
        .min(1, "ইমেইল অথবা মোবাইল নম্বর লিখুন")
        .max(255)
        .refine(
          (v) =>
            v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) || /^(?:\+?88)?01[3-9]\d{8}$/.test(v),
          "ইমেইল বা মোবাইল নম্বরটি ঠিক মনে হচ্ছে না",
        ),
    ),
});
export type TrackLookupInput = z.infer<typeof trackLookupInput>;

/** `/track?order=` for a signed-in owner opening an order from My Orders. */
export const trackOrderParam = z.string().trim().toUpperCase().regex(ORDER_NUMBER_RE);

/* ===== Account (Account.dc.html, AccountStates.dc.html). Messages are the design's Bengali copy. ===== */

const accountPhoneRe = /^(?:\+?88)?01[3-9]\d{8}$/;
const accountPhoneMsg = "নম্বরটি ঠিক নয়। ১১ সংখ্যার নম্বর লিখুন, যেমন 01XXX-XXXXXX";

/** Add / edit a saved address. `id` is absent for a new one. */
export const addressInput = z.object({
  id: z.coerce.number().int().positive().optional(),
  label: z.string().trim().min(1, "ঠিকানার একটি নাম দিন").max(60, "নামটি ৬০ অক্ষরের মধ্যে রাখুন"),
  name: z.string().trim().min(1, "নাম লিখুন").max(120, "নাম ১২০ অক্ষরের মধ্যে রাখুন"),
  phone: z
    .string()
    .transform(normalisePhone)
    .pipe(z.string().min(1, "মোবাইল নম্বর লিখুন").regex(accountPhoneRe, accountPhoneMsg)),
  division: z.string().trim().min(1, "বিভাগ বেছে নিন").max(40),
  district: z.string().trim().min(1, "জেলা বেছে নিন").max(80),
  upazila: z.string().trim().min(1, "উপজেলা / থানা বেছে নিন").max(80),
  line: z
    .string()
    .trim()
    .min(1, "বিস্তারিত ঠিকানা লিখুন")
    .min(10, "বাড়ি, রাস্তা ও কাছের পরিচিত জায়গা লিখলে ডেলিভারি সহজ হবে")
    .max(255, "ঠিকানা ২৫৫ অক্ষরের মধ্যে রাখুন"),
  isDefault: z.boolean(),
});
export type AddressInput = z.infer<typeof addressInput>;
export type AddressField = Exclude<keyof AddressInput, "id" | "isDefault">;

export const addressIdInput = z.object({ id: z.coerce.number().int().positive() });

/** Settings → ব্যক্তিগত তথ্য. Phone is optional. */
export const profileInput = z.object({
  name: z.string().trim().min(1, "আপনার নাম লিখুন").max(120, "আপনার নাম লিখুন"),
  phone: z
    .string()
    .transform(normalisePhone)
    .refine((v) => v === "" || accountPhoneRe.test(v), accountPhoneMsg),
});
export type ProfileInput = z.infer<typeof profileInput>;

/** Settings → পাসওয়ার্ড. Same rule as registration: 8+ characters, a letter and a digit. */
export const changePasswordInput = z
  .object({
    current: z.string().min(1, "বর্তমান পাসওয়ার্ড লিখুন").max(128),
    next: z
      .string()
      .min(1, "নতুন পাসওয়ার্ড দিন")
      .max(128)
      .refine(
        (v) => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v),
        "কমপক্ষে ৮টি অক্ষর, একটি অক্ষর ও একটি সংখ্যা লাগবে",
      ),
    confirm: z.string().min(1, "আবার লিখুন"),
  })
  .refine((v) => v.confirm === v.next, { path: ["confirm"], message: "দুটি পাসওয়ার্ড মিলছে না" });
export type ChangePasswordInput = z.infer<typeof changePasswordInput>;

/** "আবার অর্ডার করুন" on a delivered order. */
export const reorderInput = z.object({
  orderNumber: z.string().trim().toUpperCase().regex(ORDER_NUMBER_RE),
});

/** Admin UI language, chosen per user (top bar "বাং | EN", My account, phone "More"). */
export const ADMIN_LANGS = ["bn", "en"] as const;
export const adminLangInput = z.object({ lang: z.enum(ADMIN_LANGS) });
export type AdminLang = (typeof ADMIN_LANGS)[number];

/*
 * Admin "আমার অ্যাকাউন্ট" (Account-*.dc.html). The admin is bilingual, so these carry no
 * messages: the page maps each failing field to its own Bangla / English text.
 * Name and phone reuse `profileInput` (same rules as the storefront account).
 */

/** "পাসওয়ার্ড বদলান": 8+ characters (Better Auth's minimum and the board's help text). */
export const adminPasswordInput = z
  .object({
    /** Absent when a Google-only admin sets a first password. */
    current: z.string().min(1).max(128).optional(),
    next: z.string().min(8).max(128),
    /** The phone board has no "আবার লিখুন" field. */
    confirm: z.string().max(128).optional(),
  })
  .refine((v) => v.confirm === undefined || v.confirm === v.next, { path: ["confirm"] });
export type AdminPasswordInput = z.infer<typeof adminPasswordInput>;

/** Email "বদলান" (owner only): a verification link goes to the new address. */
export const adminEmailChangeInput = z.object({
  email: z.string().trim().toLowerCase().max(255).pipe(z.email()),
});

/** "বের করুন" on one signed-in device. */
export const adminSessionIdInput = z.object({ id: z.string().min(1).max(36) });

/** Admin top-bar search (⌘K): order number, name, phone or email. */
export const adminSearchInput = z.object({ q: z.string().trim().min(1).max(80) });

/** Admin notifications: mark one read, list a tab. */
export const notificationIdInput = z.object({ id: z.number().int().positive() });
export const notificationListInput = z.object({ filter: z.enum(["all", "unread"]) });

/** Admin Orders list (Orders-*.dc.html): tabs, search, date and area filters, paging. */
export const ORDER_TABS = [
  "all",
  "new",
  "confirmed",
  "packed",
  "booked",
  "transit",
  "delivered",
  "problem",
  "cancelled",
] as const;
export type OrderTab = (typeof ORDER_TABS)[number];
export const ORDER_DATE_PRESETS = ["today", "yesterday", "7d", "month", "range"] as const;
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** Lenient: an unknown or broken query value falls back to its default instead of erroring. */
export const orderListQuery = z.object({
  status: z.enum(ORDER_TABS).catch("all"),
  /** Phone filter sheet: several statuses at once ("new,confirmed"); wins over `status`. */
  multi: z
    .string()
    .transform((v) =>
      v
        .split(",")
        .filter((x): x is OrderTab => (ORDER_TABS as readonly string[]).includes(x) && x !== "all"),
    )
    .optional()
    .catch(undefined),
  q: z.string().trim().max(80).catch(""),
  date: z.enum(ORDER_DATE_PRESETS).optional().catch(undefined),
  from: isoDay.optional().catch(undefined),
  to: isoDay.optional().catch(undefined),
  zone: z.enum(["in", "out"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
  /** Phone "আরও দেখুন": how many cards to show. */
  n: z.coerce.number().int().min(10).max(500).catch(10),
  /** 1194 split view: the selected order. */
  sel: z.coerce.number().int().positive().optional().catch(undefined),
});
export type OrderListQuery = z.infer<typeof orderListQuery>;

/** Status steps the list can do: New → Confirmed (কনফার্ম), Confirmed → Packed (প্যাক). */
export const orderAdvanceInput = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
  /** ship / deliver: the manual steps for orders not booked with Steadfast (owner, 2026-11-15). */
  step: z.enum(["confirm", "pack", "ship", "deliver"]),
});
/** "ফিরিয়ে নিন" on the toast: undo the step just done on these orders. */
export const orderUndoInput = orderAdvanceInput;

export const CANCEL_REASON_KEYS = [
  "no_answer",
  "customer_cancelled",
  "duplicate",
  "other",
] as const;
export const orderCancelInput = z.object({
  id: z.number().int().positive(),
  reason: z.enum(CANCEL_REASON_KEYS),
  note: z.string().trim().max(300).optional(),
});

/** Order detail "আগের ধাপে ফিরিয়ে নিন": Packed → Confirmed, Confirmed → New. */
export const orderStepBackInput = z.object({ id: z.number().int().positive() });

/** Order detail "ডেলিভারি ট্র্যাকিং" (auto-saved). Empty text clears the field. */
export const orderTrackingInput = z.object({
  id: z.number().int().positive(),
  courierName: z.string().trim().max(80).optional(),
  trackingRef: z.string().trim().max(80).optional(),
  /** YYYY-MM-DD, or "" to clear. */
  etaDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional(),
  courierNote: z.string().trim().max(500).optional(),
});

/** Order detail "ভেতরের নোট". */
export const orderNoteInput = z.object({
  id: z.number().int().positive(),
  body: z.string().trim().min(1).max(1000),
});

/**
 * Admin delivery address (order address edit and manual orders). Same parts as storefront
 * checkout; field errors are shown from the admin dictionary, so no messages here.
 */
export const adminAddressFields = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .transform(normalisePhone)
    .pipe(z.string().regex(/^(?:\+?88)?01[3-9]\d{8}$/)),
  division: z.string().trim().min(1).max(40),
  district: z.string().trim().min(1).max(80),
  upazila: z.string().trim().min(1).max(80),
  area: z.string().trim().max(120),
  address: z.string().trim().min(5).max(255),
  postal: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}$/.test(v)),
});
export type AdminAddressFields = z.input<typeof adminAddressFields>;
export type AdminAddressField = keyof AdminAddressFields;

/** Order detail "ঠিকানা বদলান" (owner decision: only until the order is booked). */
export const orderAddressInput = adminAddressFields.extend({ id: z.number().int().positive() });

/** Sources staff can pick for a manual order ("website" is storefront checkout only). */
export const MANUAL_ORDER_SOURCES = [
  "in_person",
  "phone",
  "facebook",
  "instagram",
  "whatsapp",
] as const;
export type ManualOrderSource = (typeof MANUAL_ORDER_SOURCES)[number];

/** Admin "নতুন অর্ডার": prices are read from the database, never from this input. */
export const manualOrderInput = adminAddressFields.extend({
  email: z
    .string()
    .trim()
    .max(255)
    .refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)),
  source: z.enum(MANUAL_ORDER_SOURCES),
  note: z.string().trim().max(500),
  items: z.array(cartItem).min(1).max(30),
  paymentMethod: z.enum(["cod", "bkash", "nagad"]),
  /** Paid already (cash in hand, or a bKash / Nagad transfer received). */
  paid: z.boolean(),
  transactionId: z.string().trim().max(120),
  couponCode: z.string().trim().max(40),
});
export type ManualOrderInput = z.input<typeof manualOrderInput>;

export * from "./bd-locations";
export * from "./pricing";

/** Packing slip / label page: one order id, or "?ids=1,2,3" from the list's selection. */
export const orderPrintIds = z
  .string()
  .trim()
  .regex(/^\d+(,\d+)*$/)
  .transform((s) => [...new Set(s.split(",").map(Number))])
  .pipe(z.array(z.number().int().positive()).min(1).max(100));

/**
 * Stock page "সংরক্ষণ করুন": each changed size with the count the staff member started from.
 * A size saves only if nobody (a checkout, another admin) changed it meanwhile.
 */
export const stockSaveInput = z.object({
  changes: z
    .array(
      z.object({
        variantId: z.number().int().positive(),
        from: z.number().int().nonnegative(),
        to: z.number().int().nonnegative().max(100000),
      }),
    )
    .min(1)
    .max(500),
});

/** Products list "লুকান" / "চালু করুন": whether the product shows in the shop. */
export const productActiveInput = z.object({
  id: z.number().int().positive(),
  active: z.boolean(),
});

/**
 * "৳ 420" / "1,450.50" typed in the admin → integer paisa, without floating point.
 * Returns null for an empty or malformed amount.
 */
export function takaToPaisa(input: string): number | null {
  const s = input.replace(/[\s,৳]/g, "").replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
  const m = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

const productText = z.string().trim().max(5000);

/** Product edit (ProductEdit-* boards). Array order is the saved order; missing ids are removed. */
export const productSaveInput = z.object({
  id: z.number().int().positive().optional(),
  nameBn: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  slug,
  categoryId: z.number().int().positive().nullable(),
  spiceLevel: z.number().int().min(0).max(3),
  searchTerms: z
    .array(z.string().trim().min(1).max(60))
    .max(40)
    .refine((t) => t.join(", ").length <= 500),
  /** English; `descriptionBn` is its Bangla twin. The detail fields are Bangla, `…En` English. */
  description: productText,
  descriptionBn: productText,
  /** One short line for the Home featured card; `taglineEn` is its English twin. */
  tagline: z.string().trim().max(120),
  taglineEn: z.string().trim().max(120),
  ingredients: productText,
  ingredientsEn: productText,
  flavor: productText,
  flavorEn: productText,
  texture: productText,
  textureEn: productText,
  serving: productText,
  servingEn: productText,
  storage: productText,
  storageEn: productText,
  shelfLife: productText,
  shelfLifeEn: productText,
  allergens: productText,
  allergensEn: productText,
  packaging: productText,
  packagingEn: productText,
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  variants: z
    .array(
      z.object({
        id: z.number().int().positive().optional(),
        label: z.string().trim().min(1).max(80),
        weightGrams: z.number().int().positive().max(100000).nullable(),
        sku: z.string().trim().min(1).max(64),
        price: paisa.min(1),
        compareAtPrice: paisa.nullable(),
        /** What one unit costs to make (owner only, for profit). */
        costPrice: paisa.nullable(),
        stock: z.number().int().nonnegative().max(100000),
        isActive: z.boolean(),
      }),
    )
    .min(1)
    .max(20),
  images: z
    .array(
      z.object({
        id: z.number().int().positive().optional(),
        url: z.string().trim().min(1).max(500),
        alt: z.string().trim().max(200),
        altBn: z.string().trim().max(200),
        /** Home "বিশেষ বাছাই" photo; at most one per product. */
        isFeatured: z.boolean().default(false),
      }),
    )
    .max(12)
    .refine((list) => list.filter((im) => im.isFeatured).length <= 1, {
      message: "Only one featured photo",
    }),
});
export type ProductSaveInput = z.input<typeof productSaveInput>;

/** Photo upload: the product's slug names the file. The file itself is checked separately. */
export const productImageUploadInput = z.object({ slug });

/** Admin "ক্যাটাগরি এডিট" (Categories-* boards). */
export const adminCategoryInput = z.object({
  id: z.number().int().positive().optional(),
  nameBn: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  slug,
  /** English; `descriptionBn` is its Bangla twin (bilingual storefront). */
  description: z.string().trim().max(2000),
  descriptionBn: z.string().trim().max(2000),
  imageUrl: z.string().trim().max(500).nullable(),
  /** Shop page header photo for this shelf; null uses the default. */
  headerImageUrl: z.string().trim().max(500).nullable(),
  isActive: z.boolean(),
});
export type AdminCategoryInput = z.input<typeof adminCategoryInput>;

/** "টেনে ক্রম বদলান": every category id in the new order. */
export const categoryOrderInput = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(200),
});

export const categoryDeleteInput = z.object({ id: z.number().int().positive() });

/** Restock alerts "সবাইকে এখন জানান": every open request for one size. */
export const restockNotifyAllInput = z.object({ variantId: z.number().int().positive() });

/** Customers list (Customers-*.dc.html): search, sort, page; `sel` = 1194 split-view preview. */
export const CUSTOMER_SORTS = ["last", "spent", "orders", "new"] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];
export const customerListQuery = z.object({
  q: z.string().trim().max(80).catch(""),
  sort: z.enum(CUSTOMER_SORTS).catch("last"),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
  /** Phone "আরও দেখুন": how many rows to show. */
  n: z.coerce.number().int().min(20).max(500).catch(20),
  sel: z.string().trim().min(1).max(36).optional().catch(undefined),
});
export type CustomerListQuery = z.infer<typeof customerListQuery>;

/** Lifts a customer's ban (the split-view switch; banning needs reason + date on the detail page). */
export const customerUnbanInput = z.object({ userId: z.string().trim().min(1).max(36) });

/** CustomerDetail ban card: "কারণ" and "কবে পর্যন্ত" (empty = permanent, "ফাঁকা রাখলে স্থায়ী।"). */
export const customerBanInput = z.object({
  userId: z.string().trim().min(1).max(36),
  reason: z.string().trim().max(500),
  until: isoDay.optional(),
});
export type CustomerBanInput = z.infer<typeof customerBanInput>;

/** CustomerDetail "নোট যোগ করুন": internal note on a customer, owner only. */
export const customerNoteInput = z.object({
  userId: z.string().trim().min(1).max(36),
  body: z.string().trim().min(1).max(1000),
});

/** Reviews page (Reviews-*.dc.html). `sel` is "p12" (product review 12) or "s3" (shop review 3). */
export const REVIEW_STATUSES = ["pending", "approved"] as const;
export const REVIEW_KINDS = ["all", "product", "site"] as const;
const reviewKey = z.string().regex(/^[ps][1-9]\d{0,9}$/);
export const reviewListQuery = z.object({
  status: z.enum(REVIEW_STATUSES).catch("pending"),
  kind: z.enum(REVIEW_KINDS).catch("all"),
  product: z.coerce.number().int().positive().optional().catch(undefined),
  rating: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  /** Phone / 834 "আরও দেখুন": how many to show. */
  n: z.coerce.number().int().min(20).max(500).catch(20),
  sel: reviewKey.optional().catch(undefined),
});
export type ReviewListQuery = z.infer<typeof reviewListQuery>;

/** অনুমোদন / লুকান / delete on one review. */
export const reviewKeyInput = z.object({ key: reviewKey });
/** "উত্তর সংরক্ষণ": empty text removes the reply. */
export const reviewReplyInput = z.object({
  key: reviewKey,
  reply: z.string().trim().max(1000),
});

/** Messages inbox (Messages-*.dc.html). `sel` = 1194 / desktop split view selection. */
export const MESSAGE_BOXES = ["inbox", "archive"] as const;
export const messageListQuery = z.object({
  box: z.enum(MESSAGE_BOXES).catch("inbox"),
  q: z.string().trim().max(80).catch(""),
  subject: z.enum(CONTACT_SUBJECTS).optional().catch(undefined),
  n: z.coerce.number().int().min(30).max(500).catch(30),
  sel: z.coerce.number().int().positive().optional().catch(undefined),
});
export type MessageListQuery = z.infer<typeof messageListQuery>;

export const messageIdInput = z.object({ id: z.number().int().positive() });
/** "উত্তর পাঠান" (email reply) and "ফোন নোট" (staff note). */
export const messageReplyInput = z.object({
  id: z.number().int().positive(),
  kind: z.enum(["email", "note"]),
  body: z.string().trim().min(1).max(5000),
});

/** Newsletter subscribers (Subscribers-*.dc.html): email search, page; phone "আরও দেখুন". */
export const subscriberListQuery = z.object({
  q: z.string().trim().max(120).catch(""),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
  n: z.coerce.number().int().min(30).max(1000).catch(30),
});
export type SubscriberListQuery = z.infer<typeof subscriberListQuery>;

/**
 * Coupon editor (Coupons-Desktop drawer, CouponEdit-*). Amounts are paisa (the form converts with
 * takaToPaisa); dates are Bangladesh days, start of day to end of day. Empty limit = no limit.
 */
export const couponSaveInput = z
  .object({
    id: z.number().int().positive().optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,40}$/, "৩–৪০ অক্ষর: ইংরেজি অক্ষর, সংখ্যা, - বা _"),
    type: z.enum(["percent", "fixed"]),
    value: z.number().int().min(1).max(10_000_000),
    minOrder: z.number().int().min(0).max(10_000_000),
    startsOn: isoDay.optional(),
    endsOn: isoDay.optional(),
    maxUses: z.number().int().min(1).max(1_000_000).optional(),
    /** Uses per person; missing = no per-person limit (the editor starts at 1). */
    perPersonLimit: z.number().int().min(1).max(1000).optional(),
    /** Percent coupons only: cap in paisa. */
    maxDiscount: z.number().int().min(1).max(10_000_000).optional(),
    firstOrderOnly: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((c) => c.type !== "percent" || c.value <= 100, {
    path: ["value"],
    message: "শতাংশ ১–১০০ হতে হবে",
  })
  .refine((c) => !c.startsOn || !c.endsOn || c.endsOn >= c.startsOn, {
    path: ["endsOn"],
    message: "শেষের তারিখ শুরুর পরে হতে হবে",
  });
export type CouponSaveInput = z.infer<typeof couponSaveInput>;
export const couponIdInput = z.object({ id: z.number().int().positive() });

/** Settings "দোকানের তথ্য" (Settings-* boards). */
export const shopInfoInput = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^(01[3-9]\d{8})?$/, "01 দিয়ে শুরু ১১ সংখ্যার নম্বর দিন"),
  email: z.union([z.literal(""), z.email("সঠিক ইমেইল দিন")]),
  pickupAddress: z.string().trim().max(500),
});
/** Settings "ডেলিভারি চার্জ" (paisa). */
export const deliveryFeesInput = z.object({
  in: z.number().int().min(0).max(1_000_000),
  out: z.number().int().min(0).max(1_000_000),
});
export const codSwitchInput = z.object({ enabled: z.boolean() });
/** Settings "কুরিয়ার: Steadfast" key change. */
export const steadfastKeysInput = z.object({
  apiKey: z.string().trim().min(8).max(200),
  secretKey: z.string().trim().min(8).max(200),
});

/** Steadfast booking from the order list / detail ("বুক করুন"): packed orders only. */
export const courierBookInput = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
});
/** "কুরিয়ার সিঙ্ক": these orders, or every booked order still with the courier when empty. */
export const courierSyncInput = z.object({
  ids: z.array(z.number().int().positive()).max(500).optional(),
});
/** "টাকা পাওয়া গেছে": delivered orders; payout reference and day are optional. */
export const orderSettleInput = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
  payoutRef: z.string().trim().max(80).optional(),
  paidOn: isoDay.optional(),
});
export const orderUnsettleInput = z.object({ id: z.number().int().positive() });
/** Stock "সীমা". */
export const lowStockLimitInput = z.object({ limit: z.number().int().min(1).max(10_000) });
