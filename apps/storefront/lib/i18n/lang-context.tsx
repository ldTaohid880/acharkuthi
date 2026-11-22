"use client";

import { createContext, useContext } from "react";
import { getDict, type Dict } from "./dict";
import { DEFAULT_LANG, localePath, type Lang } from "./lang";

const LangContext = createContext<Lang>(DEFAULT_LANG);

/** Set once in the [lang] layout; client components read the page language from here. */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** The page language, its strings, and a helper for links in that language. */
export function useLang(): { lang: Lang; t: Dict; href: (path: string) => string } {
  const lang = useContext(LangContext);
  return { lang, t: getDict(lang), href: (path) => localePath(lang, path) };
}
