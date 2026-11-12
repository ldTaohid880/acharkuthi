"use client";

import { Calendar } from "@repo/ui/components/calendar";
import type { AdminLang } from "@repo/validators";
import type { DateRange } from "react-day-picker";
import { bn } from "react-day-picker/locale";
import { digits } from "@/lib/format";

const BN_MONTHS = [
  "জানুয়ারি",
  "ফেব্রুয়ারি",
  "মার্চ",
  "এপ্রিল",
  "মে",
  "জুন",
  "জুলাই",
  "আগস্ট",
  "সেপ্টেম্বর",
  "অক্টোবর",
  "নভেম্বর",
  "ডিসেম্বর",
];
/** Bangla mode: Bangla digits for days and the year (LanguageGuide: "১০ নভেম্বর"). */
const bnFormatters = {
  formatDay: (d: Date) => digits(d.getDate(), "bn"),
  formatCaption: (d: Date) => `${BN_MONTHS[d.getMonth()] ?? ""} ${digits(d.getFullYear(), "bn")}`,
};

/** "YYYY-MM-DD" ↔ local Date (no time zone shifts: the day is what matters). */
export function isoToDate(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : undefined;
}
export function dateToIso(d?: Date): string | undefined {
  if (!d) return undefined;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Owner request (2026-11-13): a calendar range picker instead of the browser's date inputs.
 * shadcn Calendar (react-day-picker) in range mode, Bangla month/day names in Bangla mode,
 * future days disabled (orders can't be placed tomorrow).
 */
export function DateRangeCalendar({
  from,
  to,
  onChange,
  lang,
  className,
}: {
  from?: string | undefined;
  to?: string | undefined;
  onChange: (from: string | undefined, to: string | undefined) => void;
  lang: AdminLang;
  className?: string;
}) {
  const selected: DateRange | undefined = from
    ? { from: isoToDate(from), to: isoToDate(to) }
    : undefined;
  return (
    <Calendar
      mode="range"
      {...(selected ? { selected } : {})}
      onSelect={(r) => onChange(dateToIso(r?.from), dateToIso(r?.to))}
      defaultMonth={isoToDate(to ?? from) ?? new Date()}
      disabled={{ after: new Date() }}
      {...(lang === "bn" ? { locale: bn, formatters: bnFormatters } : {})}
      {...(className ? { className } : {})}
    />
  );
}
