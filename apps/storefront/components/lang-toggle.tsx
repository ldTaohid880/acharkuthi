"use client";

import { useRouter } from "next/navigation";
import {
  LANG_COOKIE,
  LANG_COOKIE_MAX_AGE,
  localePath,
  splitLangPath,
  type Lang,
} from "@/lib/i18n/lang";
import { useLang } from "@/lib/i18n/lang-context";

/**
 * "EN / বাং" (design system ak-toggle; Main.dc.html header tools and footer bottom bar,
 * Mobile.dc.html footer). Remembers the choice and opens the same page in the other language.
 */
export function LangToggle({ className }: { className?: string }) {
  const { lang, t } = useLang();
  const router = useRouter();

  function choose(next: Lang) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LANG_COOKIE}=${next}; Path=/; Max-Age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
    if (next === lang) return;
    const { path } = splitLangPath(window.location.pathname);
    router.push(`${localePath(next, path)}${window.location.search}${window.location.hash}`);
  }

  return (
    <span
      className={["ak-toggle", className].filter(Boolean).join(" ")}
      role="group"
      aria-label={t.lang.label}
    >
      <button
        type="button"
        aria-pressed={lang === "en"}
        title={t.lang.toEn}
        lang="en"
        onClick={() => choose("en")}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={lang === "bn"}
        title={t.lang.toBn}
        lang="bn"
        onClick={() => choose("bn")}
      >
        বাং
      </button>
    </span>
  );
}
