import { describe, expect, it } from "vitest";
import { localIngredient, ingredientAmount, localStep, recipeText } from "@/lib/recipe-view";
import { pickString, pickText } from "./pick";

describe("pickText (catalog text in the page language, else the other one)", () => {
  it("uses the page language when filled", () => {
    expect(pickText("bn", "আম", "Mango")).toEqual({ text: "আম", lang: "bn" });
    expect(pickText("en", "আম", "Mango")).toEqual({ text: "Mango", lang: "en" });
  });
  it("falls back to the other language, marked with its own lang", () => {
    expect(pickText("en", "আম", "  ")).toEqual({ text: "আম", lang: "bn" });
    expect(pickText("bn", null, "Mango")).toEqual({ text: "Mango", lang: "en" });
  });
  it("is null when both are empty", () => {
    expect(pickText("bn", "", null)).toBeNull();
    expect(pickString("en", undefined, undefined)).toBe("");
  });
});

describe("recipe text per language", () => {
  const r = {
    title: "ভুনা খিচুড়ি",
    titleEn: "Bhuna khichuri",
    subtitle: "Roasted-lentil khichuri",
    subtitleBn: "ভাজা ডালের খিচুড়ি",
    summary: "সারাংশ",
    summaryEn: null,
    imageAlt: "A bowl",
    imageAltBn: null,
  };
  it("mirrors title and accent line", () => {
    expect(recipeText(r, "bn").title).toEqual({ text: "ভুনা খিচুড়ি", lang: "bn" });
    expect(recipeText(r, "bn").accent).toEqual({ text: "Roasted-lentil khichuri", lang: "en" });
    expect(recipeText(r, "en").title).toEqual({ text: "Bhuna khichuri", lang: "en" });
    expect(recipeText(r, "en").accent).toEqual({ text: "ভাজা ডালের খিচুড়ি", lang: "bn" });
    expect(recipeText(r, "en").summary).toEqual({ text: "সারাংশ", lang: "bn" });
    expect(recipeText(r, "bn").alt).toBe("A bowl");
  });
  it("formats English ingredient amounts with Latin digits and plural cups", () => {
    const cup = localIngredient(
      {
        group: "মূল",
        groupEn: "Main",
        name: "মুগডাল",
        nameEn: "Mung dal",
        qty: 1,
        unit: "কাপ",
        unitEn: "cup",
      },
      "en",
    );
    expect(cup).toMatchObject({ lang: "en", group: "Main", name: "Mung dal", unit: "cup" });
    expect(ingredientAmount(cup, 8, 4)).toBe("2 cups");
    expect(ingredientAmount(cup, 2, 4)).toBe("½ cup");
    const piece = localIngredient(
      { group: "g", name: "ডিম", nameEn: "Eggs", qty: 4, unit: "টি", unitEn: "" },
      "en",
    );
    expect(ingredientAmount(piece, 4, 4)).toBe("4");
    expect(
      ingredientAmount(
        localIngredient({ group: "g", name: "মুগডাল", qty: 1, unit: "কাপ" }, "bn"),
        8,
        4,
      ),
    ).toBe("২ কাপ");
  });
  it("keeps an untranslated item wholly in Bangla", () => {
    expect(localIngredient({ group: "মশলা", name: "লবণ", fixed: "স্বাদমতো" }, "en")).toEqual({
      lang: "bn",
      group: "মশলা",
      name: "লবণ",
      fixed: "স্বাদমতো",
    });
    expect(localStep({ title: "ধাপ", text: "লেখা", textEn: "Text" }, "en").lang).toBe("bn");
  });
});
