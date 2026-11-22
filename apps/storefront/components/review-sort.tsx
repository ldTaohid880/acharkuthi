"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useLang } from "@/lib/i18n/lang-context";

/** Review sort select (ProductStates, section E). Each option value is the URL for that sort. */
export function ReviewSort({
  options,
  current,
}: {
  options: { label: string; href: string; key: string }[];
  current: string;
}) {
  const router = useRouter();
  const t = useLang().t.pdp;
  return (
    <>
      <label className="sr" htmlFor="rs">
        {t.sortLabel}
      </label>
      <select
        id="rs"
        className="ak-input"
        value={options.find((o) => o.key === current)?.href}
        onChange={(e) => router.replace(e.target.value as Route, { scroll: false })}
      >
        {options.map((o) => (
          <option key={o.key} value={o.href}>
            {o.label}
          </option>
        ))}
      </select>
    </>
  );
}
