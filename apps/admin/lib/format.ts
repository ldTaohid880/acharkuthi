import type { AdminLang } from "@repo/validators";

/**
 * Number and time formats from LanguageGuide.dc.html. Counts, dates and relative times use
 * Bangla digits in Bangla mode; money, phones, order numbers and codes stay Latin in both.
 */
const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const ZONE = "Asia/Dhaka";

export function digits(n: number | string, lang: AdminLang): string {
  const s = String(n);
  return lang === "bn" ? s.replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d) : s;
}

/** "৩টি আইটেম" / "3 items". */
export function countOf(n: number, lang: AdminLang, bnUnit: string, en: [string, string]): string {
  return lang === "bn" ? `${digits(n, lang)}${bnUnit}` : `${n} ${n === 1 ? en[0] : en[1]}`;
}

const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE }).format(d);

function clock(d: Date, lang: AdminLang): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d); // "9:12 AM"
  return lang === "bn" ? parts.replace(/[\d]+:[\d]+/, (t) => digits(t, "bn")) : parts;
}

/** "২ মিনিট আগে" · "৯:১২ AM" · "গতকাল" · "১০ নভেম্বর" (and the English forms). Bangladesh time. */
export function relativeTime(d: Date, lang: AdminLang, now = new Date()): string {
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return lang === "bn" ? "এইমাত্র" : "Just now";
  if (mins < 60) return lang === "bn" ? `${digits(mins, "bn")} মিনিট আগে` : `${mins} min ago`;
  if (dayKey(d) === dayKey(now)) return clock(d, lang);
  const yesterday = new Date(now.getTime() - 86400000);
  if (dayKey(d) === dayKey(yesterday)) return lang === "bn" ? "গতকাল" : "Yesterday";
  const date = new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
    timeZone: ZONE,
    day: "numeric",
    month: lang === "bn" ? "long" : "short",
  }).format(d);
  return date;
}

/** "৩ ঘণ্টা আগে" / "3 hours ago": how long ago, in minutes, hours or days. */
export function agoText(d: Date, lang: AdminLang, now = new Date()): string {
  const mins = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 60000));
  const [n, bn, en] =
    mins < 60
      ? [mins, "মিনিট", mins === 1 ? "minute" : "minutes"]
      : mins < 1440
        ? [Math.floor(mins / 60), "ঘণ্টা", Math.floor(mins / 60) === 1 ? "hour" : "hours"]
        : [Math.floor(mins / 1440), "দিন", Math.floor(mins / 1440) === 1 ? "day" : "days"];
  return lang === "bn" ? `${digits(n, "bn")} ${bn} আগে` : `${n} ${en} ago`;
}

/**
 * Fills "{n}"-style slots in a dictionary string. "{s}" (unless given) is the English plural
 * ending for {n}: "{n} item{s}" gives "1 item" and "3 items".
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => {
    if (k in values) return String(values[k]);
    if (k === "s" && "n" in values) return String(values.n) === "1" ? "" : "s";
    return m;
  });
}

/** "১১ নভেম্বর, ১০:১৫ AM" / "11 Nov, 10:15 AM" (Bangladesh time). `withTime: false` drops the clock. */
export function orderDate(d: Date, lang: AdminLang, withTime = true): string {
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: ZONE, ...o }).format(d);
  const day = `${fmt({ day: "numeric" })} ${fmt({ month: lang === "bn" ? "long" : "short" })}`;
  return withTime ? `${day}, ${clock(d, lang)}` : day;
}

/**
 * A device's last activity (Account boards: "গতকাল ৯:১০ PM"): like relativeTime, but yesterday
 * keeps its time.
 */
export function lastActive(d: Date, lang: AdminLang, now = new Date()): string {
  const yesterday = new Date(now.getTime() - 86400000);
  if (dayKey(d) === dayKey(yesterday) && now.getTime() - d.getTime() >= 3600000)
    return `${lang === "bn" ? "গতকাল" : "Yesterday"} ${clock(d, lang)}`;
  return relativeTime(d, lang, now);
}
