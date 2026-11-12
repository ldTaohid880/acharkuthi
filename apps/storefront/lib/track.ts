/**
 * Order tracking view logic (Track.dc.html, TrackMobile.dc.html, TrackStates.dc.html).
 * Pure: safe on the client and the server. Copy is the design's Bengali text.
 */
import { districtsOf } from "./bd-locations";

export type OrderStatus =
  "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";

/** The design's eight states minus "delivery failed" (owner: failed attempts are re-sent, never shown). */
type StateKey =
  "pending" | "confirmed" | "packed" | "onway" | "delivered" | "cancelled" | "returned";

const KEY: Record<OrderStatus, StateKey> = {
  pending: "pending",
  confirmed: "confirmed",
  processing: "packed",
  shipped: "onway",
  delivered: "delivered",
  cancelled: "cancelled",
  returned: "returned",
};

const ST: Record<
  StateKey,
  { t: string; c: "" | "warn" | "sun" | "err"; lead: string; next: string; idx: number }
> = {
  pending: {
    t: "নিশ্চিতকরণের অপেক্ষায়",
    c: "warn",
    lead: "আমরা আপনার অর্ডারটি দেখছি।",
    next: "নিশ্চিত হলেই এখানে জানা যাবে। দেরি হলে যোগাযোগ করুন।",
    idx: -1,
  },
  confirmed: {
    t: "অর্ডার নিশ্চিত",
    c: "",
    lead: "আপনার অর্ডার নিশ্চিত হয়েছে।",
    next: "এরপর পণ্য প্যাক করা হবে।",
    idx: 0,
  },
  packed: {
    t: "প্যাকেট প্রস্তুত",
    c: "",
    lead: "আপনার আচার প্যাক হয়ে গেছে।",
    next: "এরপর ডেলিভারির জন্য পাঠানো হবে।",
    idx: 1,
  },
  onway: {
    t: "পথে আছে",
    c: "sun",
    lead: "আপনার অর্ডার পথে আছে।",
    next: "পণ্য হাতে পেয়ে টাকা দিন (ক্যাশ অন ডেলিভারি)। ফোন চালু রাখুন।",
    idx: 2,
  },
  delivered: {
    t: "পৌঁছে গেছে",
    c: "",
    lead: "আপনার অর্ডার পৌঁছে গেছে।",
    next: "কিছু ঠিক না থাকলে আমাদের জানান।",
    idx: 3,
  },
  cancelled: {
    t: "বাতিল হয়েছে",
    c: "err",
    lead: "এই অর্ডারটি বাতিল হয়েছে।",
    next: "নতুন অর্ডার দিতে চাইলে দোকানে ফিরে যান।",
    idx: -2,
  },
  returned: {
    t: "ফেরত / রিফান্ড",
    c: "warn",
    lead: "এই অর্ডারের ফেরত বা রিফান্ড প্রক্রিয়াধীন।",
    next: "অবস্থা জানতে যোগাযোগ করুন।",
    idx: -2,
  },
};

const LB = [
  ["অর্ডার নিশ্চিত", "Confirmed"],
  ["প্যাকেট প্রস্তুত", "Packed"],
  ["পথে আছে", "On the way"],
  ["পৌঁছে গেছে", "Delivered"],
] as const;
const CUR = ["অর্ডার নিশ্চিত হয়েছে", "প্যাকেট প্রস্তুত করা হয়েছে", "পথে আছে", "পৌঁছে গেছে"];

export interface Stage {
  cls: "up" | "wait" | "done" | "cur";
  mark: string;
  bn: string;
  en: string;
  note: string;
  current: boolean;
}

export interface Exception {
  title: string;
  body: string;
  link: string;
  href: "/contact" | "/return-refund-policy";
  soft: boolean;
}

export interface StatusView {
  title: string;
  badge: "" | "warn" | "sun" | "err";
  lead: string;
  next: string;
  /** Null for cancelled and returned: no progress line, an exception box instead. */
  stages: Stage[] | null;
  exception: Exception | null;
  /** The ETA cell shows a date only while the order is still moving. */
  showsEta: boolean;
}

const EXC: Partial<Record<StateKey, Exception>> = {
  cancelled: {
    title: "অর্ডার বাতিল হয়েছে",
    body: "আপনার অর্ডারটি বাতিল করা হয়েছে। এটি ডেলিভারির ধাপের অংশ নয়, তাই এখানে কোনো অগ্রগতি দেখানো হচ্ছে না। কারণ জানতে বা নতুন অর্ডার দিতে যোগাযোগ করুন।",
    link: "যোগাযোগ করুন",
    href: "/contact",
    soft: false,
  },
  returned: {
    title: "ফেরত / রিফান্ড চলছে",
    // "[ব্যবসা নিশ্চিত করবে]" filled with the owner's answer: refunds take one business week.
    body: "রিফান্ডের পদ্ধতি ও সময়: ১ কর্মসপ্তাহের মধ্যে রিফান্ড দেওয়া হয়। নিয়ম দেখতে ফেরত ও রিফান্ড নীতি পড়ুন।",
    link: "ফেরত ও রিফান্ড নীতি",
    href: "/return-refund-policy",
    soft: true,
  },
};

export function statusView(status: OrderStatus): StatusView {
  const k = KEY[status];
  const d = ST[k];
  const stages =
    d.idx === -2
      ? null
      : LB.map(([bn, en], i): Stage => {
          if (k === "pending") {
            return i === 0
              ? { cls: "wait", mark: "1", bn, en, note: "নিশ্চিতকরণের অপেক্ষায়", current: true }
              : { cls: "up", mark: String(i + 1), bn, en, note: "পরে", current: false };
          }
          if (i < d.idx || (k === "delivered" && i === 3)) {
            const last = i === 3;
            return {
              cls: "done",
              mark: "✓",
              bn,
              en,
              note: last ? (CUR[3] ?? "") : "সম্পন্ন",
              current: last,
            };
          }
          if (i === d.idx)
            return { cls: "cur", mark: String(i + 1), bn, en, note: CUR[i] ?? "", current: true };
          return { cls: "up", mark: String(i + 1), bn, en, note: "পরে", current: false };
        });
  return {
    title: d.t,
    badge: d.c,
    lead: d.lead,
    next: d.next,
    stages,
    exception: EXC[k] ?? null,
    showsEta: k === "confirmed" || k === "packed" || k === "onway",
  };
}

const MONTHS = [
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

/** "1 নভেম্বর 2026", as the summary bar shows it. Accepts a Date or a "YYYY-MM-DD" string. */
export function formatBnDate(value: Date | string): string {
  const [y, m, d] =
    typeof value === "string"
      ? value.slice(0, 10).split("-").map(Number)
      : (() => {
          const s = value.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
          return s.split("-").map(Number);
        })();
  return `${d ?? ""} ${MONTHS[(m ?? 1) - 1] ?? ""} ${y ?? ""}`;
}

/** The district from checkout's "address, area, upazila, district, division, postal" string. */
export function districtFromAddress(address: string): string | null {
  const parts = address.split(",").map((p) => p.trim());
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = parts[i + 1];
    if (part && next && districtsOf(next).includes(part)) return part;
  }
  return null;
}

/** What the tracking page may show. No name, phone, email or street address (Track.dc.html privacy note). */
export interface TrackedOrder {
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  cod: boolean;
  etaDate: string | null;
  district: string | null;
  inDhaka: boolean;
  courierName: string | null;
  trackingRef: string | null;
  items: {
    id: number;
    name: string;
    detail: string;
    unitPrice: number;
    quantity: number;
    image: string | null;
  }[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
}

export type LookupResult =
  | { status: "ok"; order: TrackedOrder }
  | { status: "invalid"; errors: Partial<Record<"order" | "contact", string>> }
  /** Wrong number, wrong contact or no such order: one message, so nobody can probe other orders. */
  | { status: "unverified" }
  | { status: "error" };
