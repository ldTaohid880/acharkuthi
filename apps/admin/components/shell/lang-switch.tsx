"use client";

import { cn } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import { useOptimistic, useTransition } from "react";
import { setAdminLang } from "@/app/actions/lang";

/**
 * "বাং | EN" switch (admin.css .langsw). `topbar`: 32px on desktop, 44px on tablet (Topbar compact).
 * `more`: the phone More page row, "বাংলা | EN" at 40px.
 */
export function LangSwitch({ lang, size }: { lang: AdminLang; size: "topbar" | "more" }) {
  const [pending, start] = useTransition();
  const [current, setCurrent] = useOptimistic(lang);

  function choose(next: AdminLang) {
    if (next === current) return;
    start(async () => {
      setCurrent(next);
      await setAdminLang({ lang: next });
    });
  }

  const more = size === "more";
  const btn = (on: boolean) =>
    cn(
      "focus-visible:ring-ring rounded-sm border-0 px-2 font-semibold outline-none focus-visible:ring-[3px]",
      more
        ? "h-[34px] min-w-14 text-sm"
        : "h-[38px] min-w-11 text-[13px] wide:h-[26px] wide:min-w-9 wide:text-xs",
      on ? "bg-foreground text-white" : "text-muted-foreground bg-transparent",
    );

  return (
    <div
      role="group"
      aria-label="ভাষা · Language"
      aria-busy={pending || undefined}
      className={cn(
        "border-border inline-flex flex-none items-center rounded-md border bg-white p-0.5",
        more ? "h-10" : "wide:h-8 h-11",
      )}
    >
      <button
        type="button"
        lang="bn"
        aria-pressed={current === "bn"}
        onClick={() => choose("bn")}
        className={btn(current === "bn")}
      >
        {more ? "বাংলা" : "বাং"}
      </button>
      <button
        type="button"
        lang="en"
        aria-pressed={current === "en"}
        onClick={() => choose("en")}
        className={btn(current === "en")}
      >
        EN
      </button>
    </div>
  );
}
