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
  spiceLevel: z.number().int().min(0).max(5).default(0),
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

/** A same-site path to return to after sign-in; anything else is dropped. */
export const authNextPath = z
  .string()
  .regex(/^\/(?![/\\])[^\s]*$/)
  .max(512);

/** Storefront shop listing filters, parsed from the URL query string. */
export const SHOP_SORTS = ["popular", "newest", "price-asc", "price-desc"] as const;
export const HEAT_LEVELS = ["mild", "medium", "hot"] as const;

const queryList = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]), z.array(item));

export const SHOP_PAGE_SIZE = 6;

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
  /** How many jars to show; "Load more" raises it by SHOP_PAGE_SIZE. */
  show: z.coerce.number().int().min(SHOP_PAGE_SIZE).max(1000).optional().catch(undefined),
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
export const checkoutQuoteInput = z.object({
  items: z.array(cartItem).min(1).max(50),
  district: z.string().trim().max(80).optional(),
  couponCode: couponCode.optional(),
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
  label: z.string().trim().min(1, "ঠিকানার একটি নাম দিন").max(60, "ঠিকানার একটি নাম দিন"),
  name: z.string().trim().min(1, "নাম লিখুন").max(120, "নাম লিখুন"),
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
    .max(255),
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
  step: z.enum(["confirm", "pack"]),
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
