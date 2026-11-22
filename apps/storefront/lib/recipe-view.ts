import { QUICK_MINUTES, RECIPE_PAGE_SIZE, type RecipesQuery } from "@repo/validators";
import type { Lang } from "@/lib/i18n/lang";
import { pickString, pickText, type LocalText } from "@/lib/i18n/pick";

/** The recipe fields the list page needs. Plain data, safe to pass to a client component. */
export interface RecipeCard {
  id: number;
  slug: string;
  /** Bangla; `titleEn` is the English twin. */
  title: string;
  titleEn: string | null;
  /** English; `subtitleBn` is the Bangla twin. */
  subtitle: string;
  subtitleBn: string | null;
  /** Bangla; `summaryEn` is the English twin. */
  summary: string | null;
  summaryEn: string | null;
  category: "rice" | "snack" | "feast" | "new";
  totalMinutes: number;
  difficulty: number;
  imageUrl: string | null;
  imageFile: string | null;
  imageAlt: string;
  imageAltBn: string | null;
  featuredOrder: number | null;
  isSample: boolean;
}

/** Filter chips, in the board's order. Labels are in the dictionary (recipes.chips), per language. */
export const RECIPE_CHIPS = ["all", "rice", "snack", "easy", "feast", "new"] as const;

const LEVELS = ["", "সহজ", "মাঝারি", "কঠিন"] as const;

/** 1–3, clamped: the index into a language's difficulty words (dict recipes.levels). */
export const levelIndex = (difficulty: number) => Math.min(Math.max(difficulty, 1), 3);

/** The difficulty word from a language's list (dict recipes.levels). */
export const levelWord = (levels: readonly string[], difficulty: number) =>
  levels[levelIndex(difficulty)] ?? "";

export function levelLabel(difficulty: number): string {
  return LEVELS[levelIndex(difficulty)] ?? "";
}

/** "সহজ রেসিপি" is not a stored category: it means difficulty 1. */
export function applyRecipesQuery<
  R extends Pick<RecipeCard, "category" | "difficulty" | "totalMinutes">,
>(items: R[], query: Pick<RecipesQuery, "cat" | "quick">): R[] {
  return items.filter((r) => {
    const inCat =
      query.cat === "all" || (query.cat === "easy" ? r.difficulty === 1 : r.category === query.cat);
    return inCat && (!query.quick || r.totalMinutes <= QUICK_MINUTES);
  });
}

/** Raises the visible count by one page, never above the total. */
export function nextLimit(limit: number): number {
  return limit + RECIPE_PAGE_SIZE;
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** "12" -> "১২". */
export function toBn(value: number | string): string {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

/**
 * Quantity rounded to the nearest quarter, with ¼ ½ ¾: Bengali digits ("সামান্য" below a quarter)
 * on the Bangla site, Latin digits ("a pinch") on the English one.
 */
export function formatQty(q: number, lang: Lang = "bn"): string {
  const r = Math.round(q * 4) / 4;
  if (r <= 0) return lang === "bn" ? "সামান্য" : "a pinch";
  const whole = Math.floor(r);
  const frac =
    ({ 0: "", 0.25: "¼", 0.5: "½", 0.75: "¾" } as Record<number, string>)[r - whole] ?? "";
  const out = (whole ? String(whole) : "") + frac;
  return lang === "bn" ? toBn(out) : out;
}

/** English units that take an "s" above one ("2 cups"); tbsp and tsp never do. */
const EN_PLURAL = new Set(["cup", "clove", "piece", "glass"]);

export interface IngredientLine {
  /** The language the line is written in (the twin used, or the Bangla original). */
  lang?: Lang;
  name: string;
  note?: string;
  /** Scalable amount; absent for fixed phrases. */
  qty?: number;
  unit?: string;
  fixed?: string;
}

/** The text shown at the right of an ingredient row for `servings` people, given the written `base`. */
export function ingredientAmount(i: IngredientLine, servings: number, base: number): string {
  if (i.fixed) return i.fixed;
  if (i.qty === undefined) return "";
  const lang = i.lang ?? "bn";
  const q = (i.qty * servings) / base;
  let unit = i.unit ?? "";
  if (lang === "en" && EN_PLURAL.has(unit) && Math.round(q * 4) / 4 > 1) unit += "s";
  return formatQty(q, lang) + (unit === "টি" || unit === "" ? "" : " ") + unit;
}

/** Stored recipe items carry Bangla fields and optional `…En` twins (packages/db schema). */
interface StoredIngredient {
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
interface StoredStep {
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
interface StoredTip {
  title: string;
  titleEn?: string;
  text: string;
  textEn?: string;
}

/**
 * One item in the page language: the English site uses an item's English twin when its main
 * field (name / title) is translated, else the whole Bangla item, so a line never mixes languages.
 */
export function localIngredient(
  i: StoredIngredient,
  lang: Lang,
): IngredientLine & { group: string } {
  const en = lang === "en" && !!i.nameEn?.trim();
  const f = (bn: string | undefined, e: string | undefined) => (en ? (e ?? bn) : bn);
  const unit = f(i.unit, i.unitEn);
  const fixed = f(i.fixed, i.fixedEn);
  const note = f(i.note, i.noteEn);
  return {
    lang: en ? "en" : "bn",
    group: f(i.group, i.groupEn) ?? i.group,
    name: f(i.name, i.nameEn) ?? i.name,
    ...(i.qty !== undefined ? { qty: i.qty } : {}),
    ...(unit !== undefined ? { unit } : {}),
    ...(fixed ? { fixed } : {}),
    ...(note ? { note } : {}),
  };
}

export function localStep(s: StoredStep, lang: Lang) {
  const en = lang === "en" && !!s.titleEn?.trim();
  const f = (bn: string | undefined, e: string | undefined) => (en ? (e ?? bn) : bn);
  return {
    lang: (en ? "en" : "bn") as Lang,
    title: f(s.title, s.titleEn) ?? s.title,
    text: f(s.text, s.textEn) ?? s.text,
    time: f(s.time, s.timeEn),
    heat: f(s.heat, s.heatEn),
    tip: f(s.tip, s.tipEn),
    imageUrl: s.imageUrl,
  };
}

export function localTip(t: StoredTip, lang: Lang): { lang: Lang; title: string; text: string } {
  const en = lang === "en" && !!t.titleEn?.trim();
  return en
    ? { lang: "en", title: t.titleEn ?? t.title, text: t.textEn ?? t.text }
    : { lang: "bn", title: t.title, text: t.text };
}

/** A recipe's headline text in the page language: title, the small accent line, summary, alt. */
export function recipeText(
  r: Pick<
    RecipeCard,
    | "title"
    | "titleEn"
    | "subtitle"
    | "subtitleBn"
    | "summary"
    | "summaryEn"
    | "imageAlt"
    | "imageAltBn"
  >,
  lang: Lang,
): {
  title: LocalText;
  accent: LocalText | null;
  summary: LocalText | null;
  alt: string;
} {
  const other: Lang = lang === "en" ? "bn" : "en";
  return {
    title: pickText(lang, r.title, r.titleEn) ?? { text: r.title, lang: "bn" },
    // The small line under the title is in the other language (owner "mirror" rule).
    accent: pickText(other, r.subtitleBn, r.subtitle),
    summary: pickText(lang, r.summary, r.summaryEn),
    alt: pickString(lang, r.imageAltBn, r.imageAlt),
  };
}

/** Splits ingredients into the board's headed groups, keeping first-seen group order. */
export function groupIngredients<I extends { group: string }>(
  items: I[],
): { group: string; items: I[] }[] {
  const out: { group: string; items: I[] }[] = [];
  for (const it of items) {
    const g = out.find((x) => x.group === it.group);
    if (g) g.items.push(it);
    else out.push({ group: it.group, items: [it] });
  }
  return out;
}

/** A tip written one idea per line is a list (the board's serving ideas); otherwise a paragraph. */
export function tipLines(text: string): string[] | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length > 1 ? lines : null;
}

/** Serving counts offered by the scaler, in the board's order. */
export const SERVING_OPTIONS = [2, 4, 6, 8] as const;
