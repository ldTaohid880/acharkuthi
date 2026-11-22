// English twins for the SAMPLE recipes from the design boards (bilingual storefront, owner
// decision 2026-11-16, memory: storefront-bilingual). Drafted by Claude for the owner to review;
// they move to the admin recipe editor once it exists. List entries follow the Bangla arrays in
// seed.ts by position, so quantities, groups and order are shared by both languages.
import type { RecipeIngredient, RecipeStep, RecipeTip } from "./schema/shop";

interface RecipeEn {
  titleEn: string;
  subtitleBn: string;
  summaryEn: string;
  imageAltBn: string;
  ingredients?: Pick<RecipeIngredient, "groupEn" | "nameEn" | "unitEn" | "fixedEn" | "noteEn">[];
  steps?: Pick<RecipeStep, "titleEn" | "textEn" | "timeEn" | "heatEn" | "tipEn">[];
  tips?: Pick<RecipeTip, "titleEn" | "textEn">[];
}

const MAIN = "Main ingredients";
const SPICES = "Spices";
const SIDE = "On the side";
const MED = "Medium heat";
const LOW = "Low heat";

export const RECIPE_EN: Record<string, RecipeEn> = {
  khichuri: {
    titleEn: "Bhuna khichuri",
    subtitleBn: "ভাজা ডালের ঘন, সুগন্ধি খিচুড়ি",
    summaryEn: "Khichuri with roasted mung dal, served with a fried egg and a spoonful of achar.",
    imageAltBn: "পিতলের বাটিতে ধোঁয়া ওঠা খিচুড়ি, পাশে ডিম ভাজা আর এক টুকরো লেবু।",
    ingredients: [
      { groupEn: MAIN, nameEn: "Mung dal", unitEn: "cup", noteEn: "to be roasted in a dry pan" },
      { groupEn: MAIN, nameEn: "Fragrant rice", unitEn: "cup", noteEn: "such as gobindobhog" },
      { groupEn: MAIN, nameEn: "Onion", unitEn: "", noteEn: "medium, chopped" },
      {
        groupEn: MAIN,
        nameEn: "Ghee",
        unitEn: "tbsp",
        noteEn: "half at the start, the rest at the end",
      },
      { groupEn: MAIN, nameEn: "Hot water", unitEn: "cup", noteEn: "more or less as needed" },
      { groupEn: SPICES, nameEn: "Ginger paste", unitEn: "tsp" },
      { groupEn: SPICES, nameEn: "Turmeric powder", unitEn: "tsp" },
      { groupEn: SPICES, nameEn: "Chili powder", unitEn: "tsp" },
      { groupEn: SPICES, nameEn: "Cumin powder", unitEn: "tsp" },
      { groupEn: SPICES, nameEn: "Bay leaves", unitEn: "" },
      { groupEn: SPICES, nameEn: "Green chilies", unitEn: "", noteEn: "slit" },
      { groupEn: SPICES, nameEn: "Salt", fixedEn: "to taste" },
      { groupEn: SIDE, nameEn: "Fried eggs", unitEn: "", noteEn: "to serve, optional" },
      { groupEn: SIDE, nameEn: "Lemon wedges", fixedEn: "to serve" },
    ],
    steps: [
      {
        titleEn: "Roast the dal",
        timeEn: "About 5–7 min",
        heatEn: MED,
        textEn:
          "Put the mung dal in a dry pan. Keep stirring and roast until it turns light gold and smells sweet.",
        tipEn: "It can catch on the bottom if you stop stirring, so keep your hand moving.",
      },
      {
        titleEn: "Wash and soak",
        timeEn: "About 15 min",
        textEn:
          "Wash the roasted dal and the rice together two or three times. Leave them to soak in water.",
      },
      {
        titleEn: "Onion and bay leaves",
        timeEn: "About 5 min",
        heatEn: MED,
        textEn:
          "Heat half the ghee in a pot. Add the bay leaves, then the chopped onion. Fry until golden.",
      },
      {
        titleEn: "Cook the spices",
        timeEn: "About 2–3 min",
        heatEn: LOW,
        textEn:
          "Add the ginger paste, turmeric, chili powder and cumin. Sprinkle in a little water and stir until the raw smell of the spices is gone.",
      },
      {
        titleEn: "Add the dal and rice",
        timeEn: "About 2 min",
        textEn:
          "Drain the soaked dal and rice and add them to the pot. Add salt and stir to coat them in the spices.",
      },
      {
        titleEn: "Simmer in water",
        timeEn: "About 15–20 min",
        heatEn: LOW,
        textEn:
          "Pour in the hot water. When it boils, turn the heat down and cover. Stir now and then.",
        tipEn: "If it gets too thick, add a little hot water.",
      },
      {
        titleEn: "Finishing touch",
        timeEn: "About 5 min",
        textEn:
          "When the dal and rice are soft, add the green chilies and the rest of the ghee. Cover and let it rest on the heat.",
      },
      {
        titleEn: "Serve hot",
        textEn:
          "Serve with a fried egg and a wedge of lemon. Add a spoonful of mango achar if you like.",
      },
    ],
    tips: [
      {
        titleEn: "Tip: thick, or a little runny?",
        textEn:
          "Use more or less water to get the khichuri the way you like it. If it is too thick, stir in a little hot water at the end.",
      },
      {
        titleEn: "Instead of gobindobhog",
        textEn:
          "Any other fragrant rice works. With a different rice you may need a little more or less water.",
      },
      {
        titleEn: "Serving ideas",
        textEn: "A hot fried egg on the side\nA wedge of lemon\nA spoonful of achar",
      },
    ],
  },
  porota: {
    titleEn: "Porota and alur dom",
    subtitleBn: "মুচমুচে পরোটা আর মশলাদার আলুর দম",
    summaryEn: "Hot porota, spicy alur dom and a hot pickle on the side.",
    imageAltBn: "ছেঁড়া পরোটার পাশে এক বাটি গাঢ় আলুর দম, কাছ থেকে তোলা।",
  },
  jhalmuri: {
    titleEn: "Jhalmuri with pickle oil",
    subtitleBn: "আচারের তেল মাখানো মুড়ি",
    summaryEn: "Puffed rice, onion, green chili and the kick of pickle oil.",
    imageAltBn: "কাগজের ঠোঙায় ঝালমুড়ি, কুচানো পেঁয়াজ আর কাঁচা মরিচ দেখা যাচ্ছে, দিনের আলো।",
  },
  "dal-bhat": {
    titleEn: "Dal, rice and alu bharta",
    subtitleBn: "রোজকার পাত: ডাল, ভাত আর আলুভর্তা",
    summaryEn: "The best meal of an ordinary day.",
    imageAltBn: "সাদা এনামেলের থালায় ভাত, ডাল, সরিষার তেলে মাখা আলুভর্তা আর একটা কাঁচা মরিচ।",
  },
  luchi: {
    titleEn: "Luchi and white potato curry",
    subtitleBn: "ফোলা লুচি আর হালকা আলুর তরকারি",
    summaryEn: "A holiday morning spread.",
    imageAltBn: "বেতের ঝুড়িতে ফোলা লুচি, পাশে এক বাটি হালকা রঙের আলুর তরকারি।",
  },
  "achari-sabji": {
    titleEn: "Achari sabji",
    subtitleBn: "আচারের ঝাঁজে ঝটপট সবজি",
    summaryEn: "A different taste for everyday vegetables.",
    imageAltBn: "কড়াইয়ে তেলে চকচকে ভাজা সবজি, কিনারায় একটা চামচ রাখা।",
  },
  panta: {
    titleEn: "Panta bhat",
    subtitleBn: "পান্তা ভাত, পেঁয়াজ, কাঁচা মরিচ আর সরিষার তেল",
    summaryEn: "A familiar comfort on hot days.",
    imageAltBn: "মাটির বাটিতে পান্তা ভাত, সাথে কাঁচা পেঁয়াজ, কাঁচা মরিচ আর ছোট একটা পিরিচে আচার।",
  },
  sandwich: {
    titleEn: "Pickle sandwich",
    subtitleBn: "আচার আর চিজের টোস্ট",
    summaryEn: "For a rushed afternoon.",
    imageAltBn: "মাঝখান থেকে কাটা টোস্ট করা স্যান্ডউইচ, কাটা দিকে গলা চিজ আর আচার দেখা যাচ্ছে।",
  },
  pulao: {
    titleEn: "Festive pulao",
    subtitleBn: "বিশেষ দিনের পোলাও, পাশে আচার",
    summaryEn: "For the table on a special day.",
    imageAltBn: "বড় থালায় স্তূপ করা সুগন্ধি পোলাও, ওপরে গোটা মশলা, পাশে এক বাটি আচার।",
  },
};

/** Adds the English (and Bangla) twins to a recipe's Bangla content, item by item. */
export function withEnglish<
  R extends {
    slug: string;
    ingredients?: RecipeIngredient[] | null;
    steps?: RecipeStep[] | null;
    tips?: RecipeTip[] | null;
  },
>(r: R) {
  const en = RECIPE_EN[r.slug];
  if (!en) return r;
  const merge = <T extends object>(bn: T[] | null | undefined, add: Partial<T>[] | undefined) => {
    if (!bn || !add) return bn;
    if (add.length !== bn.length)
      throw new Error(`${r.slug}: ${add.length} English items for ${bn.length} Bangla`);
    return bn.map((item, i) => ({ ...item, ...add[i] }));
  };
  return {
    ...r,
    titleEn: en.titleEn,
    subtitleBn: en.subtitleBn,
    summaryEn: en.summaryEn,
    imageAltBn: en.imageAltBn,
    ingredients: merge(r.ingredients, en.ingredients),
    steps: merge(r.steps, en.steps),
    tips: merge(r.tips, en.tips),
  };
}
