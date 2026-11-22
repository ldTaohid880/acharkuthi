import { describe, expect, it } from "vitest";
import { html as nfEn, htmlMobile as nfMobEn } from "@/content/not-found-en";
import { localizeLinks, translateRuns } from "./html";

describe("static page helpers", () => {
  it("prefixes internal links on the English site only", () => {
    const h = '<a href="/shop">x</a><a href="#top">y</a><a href="https://x.test/">z</a>';
    expect(localizeLinks(h, "bn")).toBe(h);
    expect(localizeLinks(h, "en")).toBe(
      '<a href="/en/shop">x</a><a href="#top">y</a><a href="https://x.test/">z</a>',
    );
  });
  it("swaps text runs and aria labels, marking the language", () => {
    const h = '<p>Hello</p><div aria-label="Hello"></div>';
    expect(translateRuns(h, [["Hello", "হ্যালো"]], "bn")).toBe(
      '<p><span lang="bn">হ্যালো</span></p><div aria-label="হ্যালো"></div>',
    );
  });
  it("English policy and FAQ pages keep the board's sections, anchors, links and placeholders", async () => {
    const shape = (h: string) =>
      [...h.matchAll(/(?:id|href)="[^"]*"|<(?:section|details|li|h2|p|ul|ol)\b|\{\{\w+\}\}/g)]
        .map((m) => m[0])
        .join(" ");
    for (const name of ["faq", "privacy", "returns", "shipping", "terms"]) {
      const bn = ((await import(`@/content/${name}`)) as { html: string }).html;
      const en = ((await import(`@/content/${name}-en`)) as { html: string }).html;
      expect(shape(en), name).toBe(shape(bn));
      // No Bangla left in the body text (the brand name আচারকুঠি may appear in passing).
      const left = en.replaceAll("আচারকুঠি", "").match(/[ঀ-৿]{3,}[^<]*<\/(?:p|li|h2|summary)>/);
      expect(left?.[0], name).toBeUndefined();
    }
  });
  it("English 404 keeps only the Bangla eyebrow and accent line", () => {
    for (const h of [nfEn, nfMobEn]) {
      const bangla = [...h.matchAll(/>([^<]*[ঀ-৿][^<]*)</g)].map((m) => m[1]);
      expect(bangla).toEqual([
        "৪",
        "৪",
        "ত্রুটি ৪০৪ · Page not found",
        "আপনি যে পাতাটি খুঁজছেন, সেটি এখানে নেই।",
      ]);
    }
  });
});
