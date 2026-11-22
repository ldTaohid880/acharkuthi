import { describe, expect, it } from "vitest";
import {
  applyRecipesQuery,
  formatQty,
  groupIngredients,
  ingredientAmount,
  levelLabel,
  tipLines,
  toBn,
} from "./recipe-view";

const R = [
  { category: "rice", difficulty: 2, totalMinutes: 45 },
  { category: "new", difficulty: 1, totalMinutes: 10 },
  { category: "rice", difficulty: 1, totalMinutes: 15 },
  { category: "feast", difficulty: 3, totalMinutes: 70 },
] as const;

describe("applyRecipesQuery", () => {
  const run = (cat: "all" | "rice" | "easy" | "feast" | "snack", quick = false) =>
    applyRecipesQuery([...R], { cat, quick });

  it("returns everything for all", () => expect(run("all")).toHaveLength(4));
  it("filters by stored category", () => expect(run("rice")).toHaveLength(2));
  it("treats easy as difficulty 1, whatever the category", () =>
    expect(run("easy")).toHaveLength(2));
  it("quick keeps 15 minutes or less", () => expect(run("all", true)).toHaveLength(2));
  it("combines category and quick", () => expect(run("rice", true)).toHaveLength(1));
  it("returns nothing when no recipe matches", () => expect(run("snack")).toHaveLength(0));
});

describe("levelLabel", () => {
  it("names the three levels", () => {
    expect([1, 2, 3].map(levelLabel)).toEqual(["সহজ", "মাঝারি", "কঠিন"]);
  });
});

describe("recipe detail helpers", () => {
  it("writes Bengali digits", () => expect(toBn(45)).toBe("৪৫"));
  it("rounds quantities to quarters", () => {
    expect(formatQty(0.5)).toBe("½");
    expect(formatQty(1.25)).toBe("১¼");
    expect(formatQty(0.1)).toBe("সামান্য");
  });
  it("scales by servings", () => {
    expect(ingredientAmount({ name: "x", qty: 1, unit: "কাপ" }, 8, 4)).toBe("২ কাপ");
    expect(ingredientAmount({ name: "x", qty: 1, unit: "টি" }, 2, 4)).toBe("½টি");
    expect(ingredientAmount({ name: "x", fixed: "স্বাদমতো" }, 8, 4)).toBe("স্বাদমতো");
  });
  it("groups in first-seen order", () => {
    const g = groupIngredients([{ group: "a" }, { group: "b" }, { group: "a" }]);
    expect(g.map((x) => [x.group, x.items.length])).toEqual([
      ["a", 2],
      ["b", 1],
    ]);
  });
  it("splits multi-line tips only", () => {
    expect(tipLines("a\nb")).toEqual(["a", "b"]);
    expect(tipLines("one line")).toBeNull();
  });
});
