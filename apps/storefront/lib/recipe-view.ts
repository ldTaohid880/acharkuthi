import { QUICK_MINUTES, RECIPE_PAGE_SIZE, type RecipesQuery } from "@repo/validators";

/** The recipe fields the list page needs. Plain data, safe to pass to a client component. */
export interface RecipeCard {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  summary: string | null;
  category: "rice" | "snack" | "feast" | "new";
  totalMinutes: number;
  difficulty: number;
  imageUrl: string | null;
  imageFile: string | null;
  imageAlt: string;
  featuredOrder: number | null;
  isSample: boolean;
}

/** Filter chips, in the board's order: [filter key, Bengali label]. */
export const RECIPE_CHIPS = [
  ["all", "সব রেসিপি"],
  ["rice", "ভাতের সাথে"],
  ["snack", "নাস্তা"],
  ["easy", "সহজ রেসিপি"],
  ["feast", "বিশেষ আয়োজন"],
  ["new", "আচার দিয়ে নতুন কিছু"],
] as const;

/** Category name shown in each card's tag ("রেসিপি · ভাতের সাথে"). */
export const RECIPE_CATEGORY_LABEL: Record<RecipeCard["category"], string> = {
  rice: "ভাতের সাথে",
  snack: "নাস্তা",
  feast: "বিশেষ আয়োজন",
  new: "আচার দিয়ে নতুন কিছু",
};

const LEVELS = ["", "সহজ", "মাঝারি", "কঠিন"] as const;

export function levelLabel(difficulty: number): string {
  return LEVELS[Math.min(Math.max(difficulty, 1), 3)] ?? "";
}

/** "সহজ রেসিপি" is not a stored category: it means difficulty 1. */
export function applyRecipesQuery<R extends Pick<RecipeCard, "category" | "difficulty" | "totalMinutes">>(
  items: R[],
  query: Pick<RecipesQuery, "cat" | "quick">,
): R[] {
  return items.filter((r) => {
    const inCat =
      query.cat === "all" ||
      (query.cat === "easy" ? r.difficulty === 1 : r.category === query.cat);
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

/** Quantity rounded to the nearest quarter, written with Bengali digits and ¼ ½ ¾ ("সামান্য" below a quarter). */
export function formatQty(q: number): string {
  const r = Math.round(q * 4) / 4;
  if (r <= 0) return "সামান্য";
  const whole = Math.floor(r);
  const frac = ({ 0: "", 0.25: "¼", 0.5: "½", 0.75: "¾" } as Record<number, string>)[r - whole] ?? "";
  return toBn((whole ? String(whole) : "") + frac);
}

export interface IngredientLine {
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
  const unit = i.unit ?? "";
  return formatQty((i.qty * servings) / base) + (unit === "টি" || unit === "" ? "" : " ") + unit;
}

/** Splits ingredients into the board's headed groups, keeping first-seen group order. */
export function groupIngredients<I extends { group: string }>(items: I[]): { group: string; items: I[] }[] {
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
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.length > 1 ? lines : null;
}

/** Serving counts offered by the scaler, in the board's order. */
export const SERVING_OPTIONS = [2, 4, 6, 8] as const;
