import type { schema } from "@repo/db";
import type { AdminLang } from "@repo/validators";

type DbStatus = (typeof schema.orders.$inferSelect)["status"];

/** Admin status chip keys (admin.css .st-*). Main.dc.html order flow; LanguageGuide labels. */
export type StatusTone =
  | "new"
  | "conf"
  | "pack"
  | "book"
  | "transit"
  | "deliv"
  | "settled"
  | "cancel"
  | "return"
  | "partial";

const LABELS: Record<StatusTone, { bn: string; en: string }> = {
  new: { bn: "নতুন", en: "New" },
  conf: { bn: "কনফার্মড", en: "Confirmed" },
  pack: { bn: "প্যাক করা", en: "Packed" },
  book: { bn: "কুরিয়ারে বুক", en: "Booked" },
  transit: { bn: "পথে", en: "In transit" },
  deliv: { bn: "ডেলিভার্ড", en: "Delivered" },
  settled: { bn: "টাকা পাওয়া গেছে", en: "Cash received" },
  cancel: { bn: "বাতিল", en: "Cancelled" },
  return: { bn: "ফেরত", en: "Returned" },
  partial: { bn: "আংশিক ডেলিভারি", en: "Partly delivered" },
};

/** The 7 database statuses on the admin scale. Booked and cash received come from order fields. */
const FROM_DB: Record<DbStatus, StatusTone> = {
  pending: "new",
  confirmed: "conf",
  processing: "pack",
  shipped: "transit",
  delivered: "deliv",
  cancelled: "cancel",
  returned: "return",
};

/** Admin-only steps stored as order fields (owner decision, 2026-11-15). */
export interface ToneFlags {
  /** Has a Steadfast consignment (handed to the courier). */
  booked?: boolean | null | undefined;
  /** "টাকা পাওয়া গেছে" marked. */
  settled?: boolean | null | undefined;
}

export function statusTone(status: DbStatus, f?: ToneFlags): StatusTone {
  if (status === "shipped" && f?.booked) return "book";
  if (status === "delivered" && f?.settled) return "settled";
  return FROM_DB[status];
}

export function statusLabel(tone: StatusTone, lang: AdminLang): string {
  return LABELS[tone][lang];
}
