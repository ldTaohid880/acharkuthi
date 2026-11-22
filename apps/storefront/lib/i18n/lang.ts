/**
 * Storefront languages (owner decision 2026-11-15, memory: storefront-bilingual): Bangla lives at
 * "/" with no prefix, English under "/en". Bangla is the default; a first visit follows the
 * browser (proxy.ts), and the EN / বাং toggle remembers the choice in a cookie.
 *
 * Client-safe: no server imports.
 */
export const LANGS = ["bn", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "bn";
/** Remembers the visitor's EN / বাং choice for a year. */
export const LANG_COOKIE = "ak_lang";
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
/** URL prefix of each language ("" = none). */
const PREFIX: Record<Lang, string> = { bn: "", en: "/en" };

export const isLang = (v: unknown): v is Lang => v === "bn" || v === "en";

/** "/shop" in `lang`: "/shop" for Bangla, "/en/shop" for English. Keeps any ?query or #hash. */
export function localePath(lang: Lang, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!PREFIX[lang]) return p;
  return p === "/" ? PREFIX[lang] : `${PREFIX[lang]}${p}`;
}

/** The language and the language-free path of a visible URL path ("/en/shop" → en, "/shop"). */
export function splitLangPath(pathname: string): { lang: Lang; path: string } {
  if (pathname === "/en" || pathname.startsWith("/en/"))
    return { lang: "en", path: pathname.slice(3) || "/" };
  // The internal Bangla path (proxy rewrite target) can show up on the server side.
  if (pathname === "/bn" || pathname.startsWith("/bn/"))
    return { lang: "bn", path: pathname.slice(3) || "/" };
  return { lang: "bn", path: pathname || "/" };
}

/** schema.org / hreflang / OpenGraph codes. */
export const HREFLANG: Record<Lang, string> = { bn: "bn", en: "en" };
export const OG_LOCALE: Record<Lang, string> = { bn: "bn_BD", en: "en_US" };
