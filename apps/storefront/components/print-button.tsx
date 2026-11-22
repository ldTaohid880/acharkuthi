"use client";

import { useLang } from "@/lib/i18n/lang-context";

/** RecipeDetail.dc.html "প্রিন্ট করুন": opens the browser's print dialog. */
export function PrintButton() {
  const { lang, t } = useLang();
  return (
    <button
      type="button"
      className="ak-btn ak-btn--line"
      onClick={() => window.print()}
      lang={lang}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v6H7z" />
      </svg>{" "}
      {t.recipes.print}
    </button>
  );
}
