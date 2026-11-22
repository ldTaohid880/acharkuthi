import type { Lang } from "./lang";

/** A stored text and the language it is actually written in (for the element's `lang`). */
export interface LocalText {
  text: string;
  lang: Lang;
}

/**
 * Catalog text in the page language. When that language's field is empty, the other language's
 * text is shown instead, marked with its own language: a section never disappears while the
 * owner is still translating (owner, 2026-11-16, memory: storefront-bilingual). Null when both
 * are empty.
 */
export function pickText(
  lang: Lang,
  bn: string | null | undefined,
  en: string | null | undefined,
): LocalText | null {
  const mine = lang === "bn" ? bn : en;
  const other = lang === "bn" ? en : bn;
  if (mine?.trim()) return { text: mine, lang };
  if (other?.trim()) return { text: other, lang: lang === "bn" ? "en" : "bn" };
  return null;
}

/** `pickText`, then just the string ("" when both are empty), for attributes such as alt. */
export const pickString = (
  lang: Lang,
  bn: string | null | undefined,
  en: string | null | undefined,
) => pickText(lang, bn, en)?.text ?? "";
