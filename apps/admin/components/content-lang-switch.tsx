"use client";

import { cn } from "@repo/ui/lib/utils";

export type ContentLang = "bn" | "en";

/**
 * "বাংলা | English" switch for a card's text fields (bilingual storefront, owner 2026-11-16,
 * memory: storefront-bilingual). The canvas draws no such control; it reuses the board's `.seg`
 * look (ProductEdit spice level: border, 8px radius, xs shadow, primary fill when on). A dot marks a
 * language with empty fields. Each language's text shows on its own storefront site; an empty
 * field falls back to the other language there.
 */
export function ContentLangSwitch({
  value,
  onChange,
  missing,
  label,
  missingLabel,
}: {
  value: ContentLang;
  onChange: (l: ContentLang) => void;
  missing: Record<ContentLang, boolean>;
  /** Group name for screen readers, e.g. "লেখার ভাষা". */
  label: string;
  /** Read after a language that has empty fields, e.g. "খালি ঘর আছে". */
  missingLabel: string;
}) {
  const opts = [
    ["bn", "বাংলা"],
    ["en", "English"],
  ] as const;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="border-border inline-flex flex-none overflow-hidden rounded-md border shadow-xs"
    >
      {opts.map(([k, name]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          className={cn(
            "border-border max-tab:h-9 inline-flex h-8 items-center gap-1.5 border-r px-3 text-[13px] font-medium last:border-r-0",
            value === k ? "bg-primary text-white" : "bg-white",
          )}
        >
          <span lang={k}>{name}</span>
          {missing[k] ? (
            <>
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", value === k ? "bg-white" : "bg-[#d97706]")}
              />
              <span className="sr-only">, {missingLabel}</span>
            </>
          ) : null}
        </button>
      ))}
    </div>
  );
}
