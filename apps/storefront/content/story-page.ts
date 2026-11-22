import type { Lang } from "@/lib/i18n/lang";

/**
 * Our story copy (owner restyle, 2026-11-20). The words come from the earlier Our story board and
 * its Bangla mirror (content/story-bn.ts history). The "[…]" owner notes were dropped, and the
 * gift band line is new, drafted by Claude for the owner to review.
 */
export interface StoryCopy {
  eyebrow: string;
  title: string;
  lede: string;
  chapters: readonly (readonly [string, string])[];
  heroAlt: string;
  c1: { eyebrow: string; title: string; body: string; quote: string; alt: string };
  craft: {
    eyebrow: string;
    title: string;
    pills: readonly string[];
    cards: readonly { title: string; body: string; alt: string; img: string }[];
  };
  phil: {
    eyebrow: string;
    title: string;
    lede: string;
    points: readonly (readonly [string, string])[];
    alt: string;
  };
  gift: { title: string; body: string; alt: string };
  close: { eyebrow: string; title: string; body: string; shop: string; start: string; alt: string };
}

const BN: StoryCopy = {
  eyebrow: "আমাদের গল্প",
  title: "ঐতিহ্যের স্বাদ",
  lede: "রোদে শুকানো আম, সরষের তেলের ঝাঁজ, আর বয়ামের ঢাকনা খোলার সেই মুহূর্ত।",
  chapters: [
    ["০১", "স্মৃতি"],
    ["০২", "কারিগরি"],
    ["০৩", "দর্শন"],
  ],
  heroAlt:
    "গাঢ় সবুজ পটভূমিতে পাথরের বেদিতে নবাবি লস্যির বয়াম, পাশে পিতলের বাটিতে আচার আর দুটি কাঁচা আম",
  c1: {
    eyebrow: "অধ্যায় এক",
    title: "যেখান থেকে স্মৃতির শুরু",
    body: "অনেক বাঙালি বাড়িতে আচার শুধু কেনা হতো না, তার জন্য অপেক্ষা করতে হতো। ছাদে রোদ পোহানো আম, জানালার ধারে বয়াম, আর বড়দের সেই কথা: “আর একটু সবুর।” প্রথম চামচটা অবশ্য আমরা সবাই লুকিয়ে খেয়েছি।",
    quote: "খাবার টেবিলে সবার আগে হাত যেত আচারের দিকেই।",
    alt: "দুপুরের খাবার: খিচুড়ি, বেগুন ভাজা, ডাল আর মাটির বাটিতে আম বরফি",
  },
  craft: {
    eyebrow: "অধ্যায় দুই",
    title: "স্বাদের পেছনের কাজ",
    pills: ["ঐতিহ্যবাহী রেসিপি", "শিলে বাটা মসলা", "ঘানি ভাঙা সরিষার তেল", "প্রিজারভেটিভ ছাড়া"],
    cards: [
      {
        title: "কাঁচা আম",
        body: "আগে ফল। বয়ামের বাকি সবকিছু তাকে সঙ্গ দিতেই।",
        alt: "কাঠের বোর্ডে কাঁচা আম, ফালি করা আম, লবণ আর হলুদ",
        img: "mango",
      },
      {
        title: "মসলা ও সরষের তেল",
        body: "শিলে বাটা মসলা আর খাঁটি ঘানি ভাঙা সরিষার তেল: এই দুটোই বাঙালি আচারকে তার আসল স্বাদ দেয়।",
        alt: "পাথরের তাকে আস্ত মসলা, শিলনোড়া আর সরিষার তেল",
        img: "spices",
      },
      {
        title: "হাতের কাজ",
        body: "হাতে মাখানো, হাতে ভরা, ঠিক যেভাবে রেসিপিটা আমাদের শেখানো হয়েছিল।",
        alt: "মাটির গামলায় সদ্য মাখানো বোম্বাই খাজা, কাঠের চামচ আর মসলা",
        img: "mixing",
      },
    ],
  },
  phil: {
    eyebrow: "অধ্যায় তিন · আমরা যা মানি",
    title: "যা চেনা, তা-ই থাকুক।",
    lede: "নতুন স্বাদ খুঁজে পাওয়া সহজ। কিন্তু ছোটবেলার চেনা স্বাদটা সহজে মেলে না, আর সেটাই আমরা সবচেয়ে বেশি মনে করি।",
    points: [
      ["চেনা স্বাদ", "নতুন কিছুর চেয়ে আমরা ঐতিহ্যের স্বাদটাই রাখতে চাই।"],
      ["ধীরে", "ভালো আচার তৈরি হতে যতটা সময় লাগে, ততটাই লাগুক।"],
      ["সরল", "সাধারণ উপকরণ, সোজা কথা।"],
    ],
    alt: "গাঢ় বাদামি পটভূমিতে কালো মার্বেলে রসুন মোরব্বার খোলা বয়াম, পিতলের চামচে রসুনের কোয়া",
  },
  gift: {
    title: "কিছু স্বাদ থেকে যায় মনে।",
    body: "এক বয়াম আচার এক বাড়ি থেকে আরেক বাড়িতে যায়, সঙ্গে যায় সেই চেনা স্বাদের গল্প।",
    alt: "গাঢ় সবুজ পটভূমিতে ট্র্যাভার্টাইন পাথরে আম বরফির বয়াম, সামনে এক গুচ্ছ বেলি ফুল",
  },
  close: {
    eyebrow: "গল্পটা চলুক",
    title: "এবার একটি বয়াম বেছে নিন",
    body: "আম, লেবু, মরিচ আর কয়েকটি বিশেষ আচার, প্রতিটি হাতে ভরা।",
    shop: "দোকান ঘুরে দেখুন",
    start: "কাঁচা আম দিয়ে শুরু করুন",
    alt: "সবুজ পটভূমিতে বোম্বাই খাজার বয়াম, পাশে নাগা মরিচ আর কাঁচা মরিচ",
  },
};

const EN: StoryCopy = {
  eyebrow: "Our story",
  title: "The taste of tradition.",
  lede: "Sun-dried mango, the sharpness of mustard oil, and the moment a jar is opened. This is the story of the taste we are trying to keep.",
  chapters: [
    ["01", "Memories"],
    ["02", "Craft"],
    ["03", "Philosophy"],
  ],
  heroAlt:
    "A jar of Nobabi Lassi on a stone plinth against deep green, with pickle in a brass dish and two raw mangoes",
  c1: {
    eyebrow: "Chapter one",
    title: "Where the memories begin",
    body: "In many Bengali homes, achar was never simply bought. It was waited for. And the first spoonful, of course, was always stolen. Acharkuthi begins with wanting to keep that heritage alive, jar by jar.",
    quote: "Achar was always the first thing reached for.",
    alt: "Lunch of khichuri, fried aubergine and dal, with Aam Borfi in a clay bowl",
  },
  craft: {
    eyebrow: "Chapter two",
    title: "The craft behind the flavours",
    pills: [
      "Heritage recipes",
      "Stone-ground spices",
      "Wood-pressed mustard oil",
      "No preservatives",
    ],
    cards: [
      {
        title: "Raw mango",
        body: "The fruit comes first. Everything else in the jar is there to support it.",
        alt: "Raw green mangoes, mango strips, salt and turmeric on a wooden board",
        img: "mango",
      },
      {
        title: "Spices and mustard oil",
        body: "Stone-ground spices and pure wood-pressed mustard oil: the two things that make a Bengali achar taste like one.",
        alt: "Whole spices, a mortar and pestle and mustard oil on a stone counter",
        img: "spices",
      },
      {
        title: "By hand",
        body: "Mixed and filled by hand, the way the recipe was taught to us.",
        alt: "Freshly mixed Bombai Khaja in a clay bowl with a wooden spoon and spices",
        img: "mixing",
      },
    ],
  },
  phil: {
    eyebrow: "Chapter three · What we stand for",
    title: "Let the familiar stay familiar.",
    lede: "New flavours are easy to find. The taste you grew up with is harder to come by, and it is the one you miss.",
    points: [
      [
        "Familiar flavour",
        "We would rather keep the taste of our heritage than chase something new.",
      ],
      ["Unhurried", "Good achar takes the time it takes."],
      ["Plain", "Simple ingredients, plainly said."],
    ],
    alt: "An open jar of Roshun Morobba on black marble against deep brown, garlic cloves on a brass spoon",
  },
  gift: {
    title: "Some tastes stay in the heart.",
    body: "A jar of achar travels from one home to another, and the familiar taste goes with it.",
    alt: "A jar of Aam Borfi on a travertine slab against deep green, with a sprig of jasmine",
  },
  close: {
    eyebrow: "Continue the story",
    title: "Now, choose a jar.",
    body: "Mango, lemon, chili and a few special ones, each filled by hand.",
    shop: "Explore the shop",
    start: "Start with raw mango",
    alt: "A jar of Bombai Khaja on deep green, with naga morich and green chillies",
  },
};

export const storyCopy = (lang: Lang): StoryCopy => (lang === "en" ? EN : BN);
