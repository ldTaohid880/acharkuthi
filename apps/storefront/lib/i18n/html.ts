import { localePath, type Lang } from "./lang";

/**
 * Helpers for the design's static HTML pages (content/*.ts), which are trusted copy from the
 * boards. Client-safe.
 */

/** Internal links in the page language: `href="/shop"` becomes `href="/en/shop"` on the English site. */
export function localizeLinks(html: string, lang: Lang): string {
  if (lang === "bn") return html;
  return html.replace(
    /href="(\/[^"]*)"/g,
    (_m, path: string) => `href="${localePath(lang, path)}"`,
  );
}

/**
 * Swaps whole text runs (`>text<`) and `aria-label`s for their translations. The new text goes in
 * a span marked with its language, so the page CSS picks the right face (`.ak :lang(bn)`).
 */
export function translateRuns(
  html: string,
  pairs: readonly (readonly [string, string])[],
  to: Lang,
): string {
  let out = html;
  for (const [from, into] of pairs) {
    out = out
      .split(`>${from}<`)
      .join(`><span lang="${to}">${into}</span><`)
      .split(`aria-label="${from}"`)
      .join(`aria-label="${into}"`);
  }
  return out;
}

/** Runs from `pairs` that no longer appear in `html` (for tests: the board copy changed). */
export function missingRuns(html: string, pairs: readonly (readonly [string, string])[]): string[] {
  return pairs
    .map(([from]) => from)
    .filter((from) => !html.includes(`>${from}<`) && !html.includes(`aria-label="${from}"`));
}
