import { and, db, eq } from "./index";
import {
  categories,
  productImages,
  products,
  productVariants,
  recipes,
  type RECIPE_CATEGORIES,
  type RecipeIngredient,
  type RecipeStep,
  type RecipeTip,
} from "./schema";
import { withEnglish } from "./sample-recipes-en";

const SHELVES = [
  {
    name: "Mango",
    nameBn: "আম",
    slug: "mango",
    sortOrder: 1,
    tagline: "Raw mango",
    taglineBn: "কাঁচা আম",
  },
  {
    name: "Lemon",
    nameBn: "লেবু",
    slug: "lemon",
    sortOrder: 2,
    tagline: "Gently sour",
    taglineBn: "হালকা টক",
  },
  {
    name: "Special",
    nameBn: "বিশেষ",
    slug: "special",
    sortOrder: 3,
    tagline: "Olive, tamarind, garlic",
    taglineBn: "জলপাই, তেঁতুল, রসুন",
  },
  {
    name: "Mixed",
    nameBn: "মিশ্র",
    slug: "mixed",
    sortOrder: 4,
    tagline: "A little of everything",
    taglineBn: "সব কিছুর একটু করে",
  },
] as const;

type Shelf = (typeof SHELVES)[number]["slug"];

interface SeedProduct {
  shelf: Shelf;
  name: string;
  nameBn: string;
  slug: string;
  description: string;
  spiceLevel: number;
  searchTerms: string;
  isFeatured?: boolean;
  /** Photo under apps/storefront/public; products without one fall back to /jar.svg. */
  image?: { url: string; alt: string };
  /** Real products (owner, 2026-11-22): Bangla copy, the Home card line and confirmed details. */
  descriptionBn?: string;
  tagline?: string;
  taglineEn?: string;
  details?: Details;
  /** Photos in order (the first is the card photo), each with English and Bangla alt text. */
  images?: { url: string; alt: string; altBn: string; width: number; height: number }[];
  /** [sku, label, grams, price (paisa), compareAt (paisa)?, stock] */
  variants: [string, string, number, number, number | null, number][];
}

type DetailKey =
  "ingredients" | "flavor" | "texture" | "serving" | "storage" | "shelfLife" | "allergens";
/** [Bangla, English] for each confirmed detail; missing ones stay empty (hidden on the page). */
type Details = Partial<Record<DetailKey, [string, string]>>;

const STORAGE: [string, string] = [
  "ঘরের স্বাভাবিক তাপমাত্রায় রাখুন, সবসময় শুকনো চামচ ব্যবহার করুন",
  "Keep at room temperature; always use a dry spoon",
];
/** Where the seed product photos live (R2 bucket "acharkuthi", public custom domain). */
const PRODUCT_PHOTOS = "https://img.acharkuthi.store/products";

const SHELF_LIFE: [string, string] = ["প্রায় ৬ মাস ভালো থাকে", "Keeps well for about 6 months"];

/**
 * The generated photos, stored in R2 under products/ (owner, 2026-11-22: product photos never
 * live in the app's public folder; image studio "final/"): the
 * flavour-colour featured photo first when there is one (Home card), else the sage still life.
 */
function photos(slug: string, name: string, nameBn: string, featured: boolean) {
  const shot = (s: string, alt: string, altBn: string, width = 1400, height = 1400) => ({
    url: `${PRODUCT_PHOTOS}/${slug}-${s}.webp`,
    alt,
    altBn,
    width,
    height,
  });
  return [
    ...(featured
      ? [
          shot(
            "featured",
            `A jar of ${name} with a clay plate of it in front`,
            `${nameBn}র বয়াম, সামনে মাটির থালায় আচার`,
            1195,
            1600,
          ),
        ]
      : []),
    shot(
      "still-life",
      `A jar of ${name} beside a clay plate of it`,
      `${nameBn}র বয়াম আর মাটির থালায় আচার`,
    ),
    shot("hero", `A jar of ${name}`, `${nameBn}র বয়াম`),
    shot("served", `${name} served on a clay plate`, `মাটির থালায় পরিবেশন করা ${nameBn}`),
  ];
}

const PRODUCTS: SeedProduct[] = [
  {
    shelf: "mango",
    name: "Raw Mango Pickle",
    nameBn: "কাঁচা আমের আচার",
    slug: "raw-mango",
    searchTerms: "kancha aam amer achar am mango jhal spicy",
    description: "Sour green mango in spices ground at home and pure wood-pressed mustard oil.",
    spiceLevel: 3,
    isFeatured: false,
    image: {
      url: `${PRODUCT_PHOTOS}/raw-mango-pickle.webp`,
      alt: "A jar of raw mango pickle beside a green mango and a clay bowl",
    },
    variants: [
      ["MANGO-300", "300 g", 300, 25000, null, 50],
      ["MANGO-500", "500 g", 500, 40000, null, 30],
    ],
  },
  {
    shelf: "lemon",
    name: "Lemon Pickle",
    nameBn: "লেবুর আচার",
    slug: "lemon",
    searchTerms: "lebu lebur achar lemon mild",
    description: "Whole lemons, salted in the sun and cured gently until soft and sharp.",
    spiceLevel: 1,
    isFeatured: false,
    variants: [["LEMON-300", "300 g", 300, 22000, null, 40]],
  },
  {
    shelf: "special",
    name: "Olive Pickle",
    nameBn: "জলপাইয়ের আচার",
    slug: "olive",
    searchTerms: "jolpai jalpai jolpaier achar olive mild",
    description: "Tangy jolpai cured in mustard oil with panch phoron.",
    spiceLevel: 1,
    isFeatured: false,
    variants: [["OLIVE-300", "300 g", 300, 22000, null, 25]],
  },
  {
    shelf: "special",
    name: "Spicy Garlic Pickle",
    nameBn: "রসুনের আচার",
    slug: "spicy-garlic",
    searchTerms: "roshun rosun roshuner achar garlic jhal spicy hot",
    description: "Whole garlic cloves, slow-cooked in chili and mustard oil. Hot.",
    spiceLevel: 3,
    isFeatured: false,
    variants: [["GARLIC-300", "300 g", 300, 23400, 26000, 18]],
  },
  {
    shelf: "special",
    name: "Tamarind Pickle",
    nameBn: "তেঁতুলের আচার",
    slug: "tamarind",
    searchTerms: "tetul tentul tetuler achar tamarind mild",
    description: "Sweet-sour tetul with roasted cumin and a little jaggery.",
    spiceLevel: 1,
    isFeatured: false,
    variants: [["TAMARIND-300", "300 g", 300, 21000, null, 0]],
  },
  {
    shelf: "mixed",
    name: "Mixed Vegetable Pickle",
    nameBn: "মিশ্র সবজির আচার",
    slug: "mixed-vegetable",
    searchTerms: "mishro mixed sobji vegetable achar jhal",
    description: "A little of everything from the kitchen shelf, in one jar.",
    spiceLevel: 3,
    variants: [["MIXED-300", "300 g", 300, 24000, null, 35]],
  },
  // ── Acharkuthi's real pickles (owner, 2026-11-22). Prices, stock, spice and all copy confirmed
  // by the owner question by question. The Home cards follow insertion order (getFeaturedProducts
  // sorts by id): Nobabi Lassi, Roshun Morobba, Bombai Khaja.
  {
    shelf: "mango",
    name: "Nobabi Lassi",
    nameBn: "নবাবি লস্যি",
    slug: "nobabi-lassi",
    searchTerms: "nobabi nawabi lassi lossi aam mango shorisha mustard tok jhal misti",
    description:
      "Shredded raw mango in pure mustard oil with dried red chilli and mustard seed. Sour, hot and sweet together, with the sharp aroma of mustard.",
    descriptionBn:
      "কুচি করা কাঁচা আম, খাঁটি সরিষার তেল, শুকনো মরিচ আর সরিষা দানায় তৈরি। সরিষার ঝাঁঝ ও সুগন্ধের সঙ্গে টক, ঝাল ও মিষ্টির সমন্বয়।",
    tagline: "সরিষার ঝাঁঝে টক-ঝাল-মিষ্টি আমের আচার",
    taglineEn: "Sweet, sour and hot mango with a mustard-oil kick",
    spiceLevel: 1,
    isFeatured: true,
    details: {
      ingredients: [
        "কাঁচা আম, সরিষার তেল, শুকনো মরিচ, সরিষা ও অন্যান্য মশলা",
        "Raw mango, mustard oil, dried red chilli, mustard seed and other spices",
      ],
      flavor: [
        "টক, ঝাল আর মিষ্টির মিশেল, সঙ্গে সরিষার ঝাঁঝ",
        "Sour, hot and sweet, with a mustard kick",
      ],
      texture: [
        "চিকন কুচি আম, তেলে ভেজা, নরম কিন্তু গলে যায় না",
        "Fine mango shreds, soft but not mushy, steeped in oil",
      ],
      serving: [
        "গরম ভাত, খিচুড়ি, পরোটা বা মুড়ির সাথে",
        "With hot rice, khichuri, paratha or muri",
      ],
      storage: STORAGE,
      shelfLife: SHELF_LIFE,
      allergens: ["এতে সরিষা আছে", "Contains mustard"],
    },
    images: photos("nobabi-lassi", "Nobabi Lassi", "নবাবি লস্যি", true),
    variants: [["NOBABI-400", "400 g", 400, 49900, null, 30]],
  },
  {
    shelf: "special",
    name: "Roshun Morobba",
    nameBn: "রসুন মোরব্বা",
    slug: "roshun-morobba",
    searchTerms: "roshun rosun rasun morobba murabba garlic naga misti sweet",
    description:
      "Whole garlic cloves coated in a thick, sticky mix of a little mango and spices. Sweet, with a gentle heat and the aroma of naga chilli.",
    descriptionBn:
      "আস্ত রসুনের কোয়া, সামান্য আম আর নানা মশলায় তৈরি ঘন, আঠালো মাখায় জড়ানো। মিষ্টি স্বাদের সঙ্গে হালকা ঝাল আর নাগা মরিচের সুবাস।",
    tagline: "নাগা মরিচের সুবাসে রসুনের মিষ্টি মোরব্বা",
    taglineEn: "Sweet garlic morobba with the aroma of naga chilli",
    spiceLevel: 1,
    isFeatured: true,
    details: {
      ingredients: [
        "রসুন, সামান্য আম, চিনি, সরিষার তেল, নাগা মরিচ ও অন্যান্য মশলা",
        "Garlic, a little mango, sugar, mustard oil, naga chilli and other spices",
      ],
      flavor: [
        "মিষ্টি, হালকা ঝাল, নাগা মরিচের সুবাস",
        "Sweet, gently hot, with the aroma of naga chilli",
      ],
      texture: [
        "আস্ত নরম রসুনের কোয়া, ঘন আঠালো মাখায় জড়ানো",
        "Whole soft garlic cloves in a thick, sticky coating",
      ],
      serving: [
        "গরম ভাত, খিচুড়ি, পরোটা বা রুটির সাথে",
        "With hot rice, khichuri, paratha or roti",
      ],
      storage: STORAGE,
      shelfLife: SHELF_LIFE,
    },
    images: photos("roshun-morobba", "Roshun Morobba", "রসুন মোরব্বা", true),
    variants: [["ROSHUN-400", "400 g", 400, 49900, null, 30]],
  },
  {
    shelf: "mango",
    name: "Aam Borfi",
    nameBn: "আম বরফি",
    slug: "aam-borfi",
    searchTerms: "aam am borfi barfi mango ada roshun ginger garlic misti sweet",
    description:
      "Large, soft mango chunks with thin slivers of ginger and garlic and a little chilli. Sweet, with a gentle touch of heat.",
    descriptionBn:
      "বড় নরম আমের টুকরো, পাতলা কুচি আদা-রসুন আর অল্প মরিচ দিয়ে তৈরি। মিষ্টি স্বাদের সঙ্গে হালকা ঝালের ছোঁয়া।",
    tagline: "আদা-রসুনের ছোঁয়ায় মিষ্টি আমের বরফি",
    taglineEn: "Sweet mango borfi with a touch of ginger and garlic",
    spiceLevel: 1,
    details: {
      ingredients: [
        "আম, আদা, রসুন, চিনি, সরিষার তেল, মরিচ ও অন্যান্য মশলা",
        "Mango, ginger, garlic, sugar, mustard oil, chilli and other spices",
      ],
      flavor: [
        "মিষ্টি, সঙ্গে হালকা ঝাল আর আদা-রসুনের সুবাস",
        "Sweet, gently hot, with ginger and garlic",
      ],
      texture: [
        "বড় নরম আমের টুকরো, চকচকে ঘন রসে",
        "Large soft mango chunks in a glossy, thick syrup",
      ],
      serving: [
        "গরম ভাত, খিচুড়ি, পরোটা বা রুটির সাথে",
        "With hot rice, khichuri, paratha or roti",
      ],
      storage: STORAGE,
      shelfLife: SHELF_LIFE,
    },
    images: photos("aam-borfi", "Aam Borfi", "আম বরফি", false),
    variants: [["BORFI-400", "400 g", 400, 49900, null, 30]],
  },
  {
    shelf: "special",
    name: "Bombai Khaja",
    nameBn: "বোম্বাই খাজা",
    slug: "bombai-khaja",
    searchTerms: "bombai bombay khaja til badam sesame peanut morich chili jhal hot",
    description:
      "Sesame, peanuts and Bombai chilli ground and slow-cooked in oil into a thick paste. Sitting in red chilli oil, fiercely hot.",
    descriptionBn:
      "তিল, বাদাম আর বোম্বাই মরিচ বেটে তেলে ধীরে রান্না করা ঘন মাখা। লাল তেলে ডোবানো, তীব্র ঝালের আচার।",
    tagline: "তিল-বাদামে বোম্বাই মরিচের তীব্র ঝাল",
    taglineEn: "Fierce Bombai chilli heat with sesame and peanut",
    spiceLevel: 3,
    isFeatured: true,
    details: {
      ingredients: [
        "তিল, বাদাম, বোম্বাই মরিচ, সরিষার তেল ও অন্যান্য মশলা",
        "Sesame, peanuts, Bombai chilli, mustard oil and other spices",
      ],
      flavor: ["তীব্র ঝাল, তিল-বাদামের বাদামি স্বাদ", "Fiercely hot, with nutty sesame and peanut"],
      texture: [
        "ঘন দানাদার মাখা, লাল তেলে ডোবানো",
        "Thick, coarse paste sitting in red chilli oil",
      ],
      serving: [
        "গরম ভাত, খিচুড়ি বা মুড়ির সাথে অল্প করে",
        "A little with hot rice, khichuri or muri",
      ],
      storage: STORAGE,
      shelfLife: SHELF_LIFE,
      allergens: ["এতে বাদাম ও তিল আছে", "Contains peanuts and sesame"],
    },
    images: photos("bombai-khaja", "Bombai Khaja", "বোম্বাই খাজা", true),
    variants: [["KHAJA-300", "300 g", 300, 39900, null, 30]],
  },
];

/**
 * DUMMY product-page copy (Product.dc.html "আচারের কথা" and "তথ্য ও যত্ন") so the sections render
 * in development. Replace with Acharkuthi's confirmed text before launch: no ingredient, shelf-life
 * or allergen claim here is verified.
 */
const DUMMY_DETAILS = {
  ingredients: "[ডামি] কাঁচা আম, সরিষার তেল, লবণ, হলুদ, মরিচ গুঁড়া, পাঁচফোড়ন।",
  flavor: "[ডামি] টক-ঝাল, সরিষার তেলের ঝাঁঝ আর মশলার গন্ধ।",
  texture: "[ডামি] টুকরোগুলো নরম কিন্তু ভাঙে না, তেলে ভেজা।",
  serving: "[ডামি] গরম ভাত, খিচুড়ি বা পরোটার সাথে এক চামচ।",
  storage: "[ডামি] শুকনো চামচ ব্যবহার করুন, ঠান্ডা ও শুকনো জায়গায় রাখুন।",
  shelfLife: "[ডামি] খোলার পর ৬ মাস পর্যন্ত ভালো থাকে।",
  allergens: "[ডামি] সরিষা আছে।",
  packaging: "[ডামি] কাচের বয়াম, ঢাকনা সিল করা।",
};

interface SeedRecipe {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  category: (typeof RECIPE_CATEGORIES)[number];
  totalMinutes: number;
  difficulty: 1 | 2 | 3;
  imageFile: string;
  imageAlt: string;
  featuredOrder?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  servings?: number;
  ingredients?: RecipeIngredient[];
  steps?: RecipeStep[];
  tips?: RecipeTip[];
  /** Slug of the pickle served with it. Resolved against `products`; never copy its name or price. */
  pickle?: string;
}

/**
 * SAMPLE recipes from the design boards (Recipes.dc.html): titles, times and difficulty only, as
 * the boards label them "placeholders until approved". Photos are placeholders (no imageUrl).
 * Only the khichuri carries ingredients, steps and tips: its text comes from the detail boards
 * (RecipeDetail.dc.html), which label it a sample not yet cooked and verified. The rest have none.
 */
const KHICHURI_INGREDIENTS: RecipeIngredient[] = [
  {
    group: "মূল উপকরণ",
    name: "মুগডাল",
    qty: 1,
    unit: "কাপ",
    note: "শুকনো কড়াইয়ে ভেজে নেওয়া হবে",
  },
  { group: "মূল উপকরণ", name: "সুগন্ধি চাল", qty: 1, unit: "কাপ", note: "যেমন গোবিন্দভোগ" },
  { group: "মূল উপকরণ", name: "পেঁয়াজ", qty: 1, unit: "টি", note: "মাঝারি, কুচানো" },
  {
    group: "মূল উপকরণ",
    name: "ঘি",
    qty: 3,
    unit: "টেবিল চামচ",
    note: "অর্ধেক শুরুতে, বাকিটা শেষে",
  },
  { group: "মূল উপকরণ", name: "গরম পানি", qty: 5, unit: "কাপ", note: "দরকারমতো কমবেশি" },
  { group: "মশলা", name: "আদা বাটা", qty: 1, unit: "চা-চামচ" },
  { group: "মশলা", name: "হলুদ গুঁড়া", qty: 0.5, unit: "চা-চামচ" },
  { group: "মশলা", name: "মরিচ গুঁড়া", qty: 0.5, unit: "চা-চামচ" },
  { group: "মশলা", name: "জিরা গুঁড়া", qty: 0.5, unit: "চা-চামচ" },
  { group: "মশলা", name: "তেজপাতা", qty: 2, unit: "টি" },
  { group: "মশলা", name: "কাঁচা মরিচ", qty: 4, unit: "টি", note: "চিরে নেওয়া" },
  { group: "মশলা", name: "লবণ", fixed: "স্বাদমতো" },
  { group: "পাশে", name: "ডিম ভাজা", qty: 4, unit: "টি", note: "পরিবেশনের জন্য, ঐচ্ছিক" },
  { group: "পাশে", name: "লেবুর টুকরো", fixed: "পরিবেশনের জন্য" },
];
const KHICHURI_STEPS: RecipeStep[] = [
  {
    title: "ডাল ভেজে নিন",
    time: "প্রায় ৫–৭ মিনিট",
    heat: "মাঝারি আঁচ",
    text: "শুকনো কড়াইয়ে মুগডাল দিন। নেড়ে নেড়ে ভাজুন, যতক্ষণ না হালকা সোনালি রং ধরে আর মিষ্টি ঘ্রাণ ওঠে।",
    tip: "না নাড়লে নিচে ধরে যেতে পারে, তাই হাত থামাবেন না।",
  },
  {
    title: "ধুয়ে ভিজিয়ে রাখুন",
    time: "প্রায় ১৫ মিনিট",
    text: "ভাজা ডাল আর চাল একসাথে দুই-তিনবার ধুয়ে নিন। পানিতে ভিজিয়ে রাখুন।",
  },
  {
    title: "পেঁয়াজ আর তেজপাতা",
    time: "প্রায় ৫ মিনিট",
    heat: "মাঝারি আঁচ",
    text: "হাঁড়িতে অর্ধেক ঘি গরম করুন। তেজপাতা ছেড়ে কুচানো পেঁয়াজ দিন। সোনালি হওয়া পর্যন্ত ভাজুন।",
  },
  {
    title: "মশলা কষান",
    time: "প্রায় ২–৩ মিনিট",
    heat: "কম আঁচ",
    text: "আদা বাটা, হলুদ, মরিচ গুঁড়া আর জিরা গুঁড়া দিন। অল্প পানি ছিটিয়ে মশলার কাঁচা গন্ধ যাওয়া পর্যন্ত কষুন।",
  },
  {
    title: "ডাল-চাল মেশান",
    time: "প্রায় ২ মিনিট",
    text: "ভেজানো ডাল-চালের পানি ঝরিয়ে হাঁড়িতে দিন। লবণ দিয়ে নেড়ে মশলার সাথে মিশিয়ে নিন।",
  },
  {
    title: "পানি দিয়ে সেদ্ধ করুন",
    time: "প্রায় ১৫–২০ মিনিট",
    heat: "কম আঁচ",
    text: "গরম পানি ঢালুন। ফুটে উঠলে আঁচ কমিয়ে ঢাকনা দিন। মাঝে মাঝে নেড়ে দিন।",
    tip: "বেশি ঘন লাগলে অল্প গরম পানি যোগ করুন।",
  },
  {
    title: "শেষ ছোঁয়া",
    time: "প্রায় ৫ মিনিট",
    text: "ডাল-চাল নরম হলে কাঁচা মরিচ আর বাকি ঘি দিন। ঢাকনা দিয়ে দমে রাখুন।",
  },
  {
    title: "গরম গরম পরিবেশন",
    text: "পাশে ডিম ভাজা আর এক টুকরো লেবু রাখুন। চাইলে এক চামচ আমের আচার দিন।",
  },
];
/** A tip whose text has one idea per line is shown as a bullet list (the board's serving ideas). */
const KHICHURI_TIPS: RecipeTip[] = [
  {
    title: "টিপস: ঘন, নাকি একটু পাতলা?",
    text: "পানির পরিমাণ কম-বেশি করে খিচুড়ির ঘনত্ব নিজের মতো করে নিন। বেশি ঘন লাগলে শেষে অল্প গরম পানি মিশিয়ে নেড়ে দিন।",
  },
  {
    title: "চালের বিকল্প",
    text: "গোবিন্দভোগ না থাকলে অন্য কোনো সুগন্ধি চাল ব্যবহার করা যায়। চাল বদলালে পানির পরিমাণ একটু বেশি-কম লাগতে পারে।",
  },
  { title: "পরিবেশনের ধারণা", text: "পাশে গরম ডিম ভাজা\nএক টুকরো লেবু\nএক চামচ আচার" },
];

const RECIPES: SeedRecipe[] = [
  {
    slug: "khichuri",
    title: "ভুনা খিচুড়ি",
    subtitle: "Roasted-lentil khichuri, thick and fragrant",
    summary: "ভাজা মুগডালের খিচুড়ি, সাথে ডিম ভাজা আর এক চামচ আচার।",
    category: "rice",
    totalMinutes: 45,
    difficulty: 2,
    imageFile: "recipe-khichuri.jpg",
    imageAlt: "Khichuri in a brass bowl, steam rising, a fried egg and a lemon wedge beside it.",
    featuredOrder: 1,
    pickle: "raw-mango",
    prepMinutes: 15,
    cookMinutes: 30,
    servings: 4,
    ingredients: KHICHURI_INGREDIENTS,
    steps: KHICHURI_STEPS,
    tips: KHICHURI_TIPS,
  },
  {
    slug: "porota",
    title: "পরোটা ও আলুর দম",
    subtitle: "Flaky porota with a spiced potato curry",
    summary: "গরম পরোটা, ঝাল আলুর দম আর পাশে ঝাল আচার।",
    category: "snack",
    totalMinutes: 60,
    difficulty: 2,
    imageFile: "recipe-porota-alur-dom.jpg",
    imageAlt: "Torn porota beside a bowl of dark alur dom, close crop on texture.",
    featuredOrder: 2,
  },
  {
    slug: "jhalmuri",
    title: "আচারের তেলে ঝালমুড়ি",
    subtitle: "Puffed-rice jhalmuri, finished with pickle oil",
    summary: "মুড়ি, পেঁয়াজ, কাঁচা লঙ্কা আর আচারের তেলের ঝাঁজ।",
    category: "new",
    totalMinutes: 10,
    difficulty: 1,
    imageFile: "recipe-jhalmuri.jpg",
    imageAlt: "Jhalmuri in a paper cone, chopped onion and green chili visible, natural daylight.",
    featuredOrder: 3,
  },
  {
    slug: "dal-bhat",
    title: "ডাল-ভাত, আলুভর্তা",
    subtitle: "The everyday plate: dal, rice, mashed potato",
    summary: "সাধারণ দিনের সবচেয়ে ভালো খাবার।",
    category: "rice",
    totalMinutes: 30,
    difficulty: 1,
    imageFile: "recipe-dal-bhat.jpg",
    imageAlt: "A white enamel plate: rice, dal, alu bharta with mustard oil, a green chili.",
  },
  {
    slug: "luchi",
    title: "লুচি ও সাদা আলুর তরকারি",
    subtitle: "Puffed luchi with a light potato curry",
    summary: "ছুটির সকালের আয়োজন।",
    category: "feast",
    totalMinutes: 50,
    difficulty: 2,
    imageFile: "recipe-luchi.jpg",
    imageAlt: "Puffed luchi in a cane basket, a bowl of pale potato curry beside it.",
  },
  {
    slug: "achari-sabji",
    title: "আচারি সবজি",
    subtitle: "Quick vegetables with a pickled kick",
    summary: "রোজকার সবজিতে একটু অন্যরকম স্বাদ।",
    category: "new",
    totalMinutes: 25,
    difficulty: 1,
    imageFile: "recipe-achari-sabji.jpg",
    imageAlt: "Stir-fried vegetables in a kadai, glossy with oil, a spoon resting on the rim.",
  },
  {
    slug: "panta",
    title: "পান্তা ভাত",
    subtitle: "Fermented rice, onion, chili and mustard oil",
    summary: "গরমের দিনের চেনা আরাম।",
    category: "rice",
    totalMinutes: 15,
    difficulty: 1,
    imageFile: "recipe-panta.jpg",
    imageAlt: "Panta bhat in a clay bowl with raw onion, green chili and a small dish of pickle.",
  },
  {
    slug: "sandwich",
    title: "আচারের স্যান্ডউইচ",
    subtitle: "A pickle and cheese toastie",
    summary: "বিকেলের তাড়াহুড়োর জন্য।",
    category: "new",
    totalMinutes: 10,
    difficulty: 1,
    imageFile: "recipe-sandwich.jpg",
    imageAlt: "A toasted sandwich cut in half, melted cheese and pickle visible on the cut face.",
  },
  {
    slug: "pulao",
    title: "বিশেষ দিনের পোলাও",
    subtitle: "A festive pulao with a side of achar",
    summary: "বিশেষ আয়োজনের টেবিলে।",
    category: "feast",
    totalMinutes: 70,
    difficulty: 3,
    imageFile: "recipe-pulao.jpg",
    imageAlt:
      "Fragrant pulao heaped on a large platter, whole spices on top, a bowl of achar beside it.",
  },
];

const DETAIL_KEYS: DetailKey[] = [
  "ingredients",
  "flavor",
  "texture",
  "serving",
  "storage",
  "shelfLife",
  "allergens",
];

/** Bangla columns and their `…En` twins; details not given are cleared (null). */
function detailColumns(d: Details) {
  const out: Record<string, string | null> = { packaging: null, packagingEn: null };
  for (const k of DETAIL_KEYS) {
    out[k] = d[k]?.[0] ?? null;
    out[`${k}En`] = d[k]?.[1] ?? null;
  }
  return out;
}

/**
 * SEED_LAUNCH=1 (production, 2026-11-22): only the owner-confirmed pickles (the ones with
 * `details`) and the shelves they sit on. No placeholder products, no sample recipes.
 */
const LAUNCH = process.env.SEED_LAUNCH === "1";
const SEED_PRODUCTS = LAUNCH ? PRODUCTS.filter((p) => p.details) : PRODUCTS;
const SEED_SHELVES = LAUNCH
  ? SHELVES.filter((s) => SEED_PRODUCTS.some((p) => p.shelf === s.slug))
  : SHELVES;
const SEED_RECIPES = LAUNCH ? [] : RECIPES;

/** Idempotent: re-running updates the seeded rows (matched by slug / sku) instead of failing. */
async function main() {
  const shelfIds = new Map<Shelf, number>();
  for (const shelf of SEED_SHELVES) {
    await db
      .insert(categories)
      .values(shelf)
      .onDuplicateKeyUpdate({
        set: { name: shelf.name, nameBn: shelf.nameBn, sortOrder: shelf.sortOrder },
      });
    const row = await db.query.categories.findFirst({ where: eq(categories.slug, shelf.slug) });
    if (!row) throw new Error(`category upsert failed: ${shelf.slug}`);
    shelfIds.set(shelf.slug, row.id);
  }

  for (const p of SEED_PRODUCTS) {
    const values = {
      categoryId: shelfIds.get(p.shelf) ?? null,
      name: p.name,
      nameBn: p.nameBn,
      slug: p.slug,
      description: p.description,
      spiceLevel: p.spiceLevel,
      searchTerms: p.searchTerms,
      isFeatured: p.isFeatured ?? false,
      ...(p.details
        ? {
            descriptionBn: p.descriptionBn ?? null,
            tagline: p.tagline ?? null,
            taglineEn: p.taglineEn ?? null,
            ...detailColumns(p.details),
          }
        : DUMMY_DETAILS),
    };
    await db.insert(products).values(values).onDuplicateKeyUpdate({ set: values });
    const row = await db.query.products.findFirst({ where: eq(products.slug, p.slug) });
    if (!row) throw new Error(`product upsert failed: ${p.slug}`);
    for (const [sku, label, weightGrams, price, compareAtPrice, stock] of p.variants) {
      const v = { productId: row.id, sku, label, weightGrams, price, compareAtPrice, stock };
      await db.insert(productVariants).values(v).onDuplicateKeyUpdate({ set: v });
    }
    if (p.image) {
      // product_images has no unique key: replace this seeded photo so reseeding stays idempotent.
      await db
        .delete(productImages)
        .where(and(eq(productImages.productId, row.id), eq(productImages.url, p.image.url)));
      await db.insert(productImages).values({ productId: row.id, ...p.image, sortOrder: 0 });
    }
    if (p.images) {
      // Replace this product's photos so reseeding stays idempotent.
      await db.delete(productImages).where(eq(productImages.productId, row.id));
      await db
        .insert(productImages)
        .values(p.images.map((im, i) => ({ productId: row.id, ...im, sortOrder: i })));
    }
  }
  for (const [i, r] of SEED_RECIPES.entries()) {
    const pickle = r.pickle
      ? await db.query.products.findFirst({ where: eq(products.slug, r.pickle) })
      : undefined;
    const { featuredOrder, ...rest } = r;
    delete (rest as { pickle?: string }).pickle;
    const values = withEnglish({
      ...rest,
      featuredOrder: featuredOrder ?? null,
      productId: pickle?.id ?? null,
      isSample: true,
      sortOrder: i,
    });
    await db.insert(recipes).values(values).onDuplicateKeyUpdate({ set: values });
  }
  // Hide the placeholder rows from the original scaffold seed (kept, just inactive).
  await db.update(categories).set({ isActive: false }).where(eq(categories.slug, "mango-achar"));
  await db.update(products).set({ isActive: false }).where(eq(products.slug, "spicy-mango-achar"));
  console.log("Seeded.");
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
