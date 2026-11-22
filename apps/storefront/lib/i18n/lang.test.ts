import { describe, expect, it } from "vitest";
import { isLang, localePath, splitLangPath } from "./lang";

describe("localePath", () => {
  it("keeps Bangla unprefixed and puts English under /en", () => {
    expect(localePath("bn", "/shop/mango")).toBe("/shop/mango");
    expect(localePath("en", "/shop/mango")).toBe("/en/shop/mango");
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("bn", "/")).toBe("/");
    expect(localePath("en", "/track?n=1#x")).toBe("/en/track?n=1#x");
  });
});

describe("splitLangPath", () => {
  it("reads the language from the visible path", () => {
    expect(splitLangPath("/en/shop")).toEqual({ lang: "en", path: "/shop" });
    expect(splitLangPath("/en")).toEqual({ lang: "en", path: "/" });
    expect(splitLangPath("/shop")).toEqual({ lang: "bn", path: "/shop" });
    expect(splitLangPath("/english-pickles")).toEqual({ lang: "bn", path: "/english-pickles" });
  });
});

describe("isLang", () => {
  it("accepts only the two languages", () => {
    expect(isLang("bn")).toBe(true);
    expect(isLang("en")).toBe(true);
    expect(isLang("fr")).toBe(false);
  });
});
