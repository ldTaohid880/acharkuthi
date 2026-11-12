"use client";

import type { Route } from "next";
import { formatTaka } from "@repo/ui/lib/utils";
import { type CheckoutField, checkoutContact, type DeliveryZone } from "@repo/validators";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  type CheckoutLine,
  type CheckoutQuote,
  type PlacedOrder,
  placeOrder,
  quoteCheckout,
} from "@/app/actions/checkout";
import { DIVISIONS, districtsOf, upazilasOf } from "@/lib/bd-locations";
import { useCart } from "@/lib/cart-store";
import { DELIVERY_FEES, zoneForDistrict } from "@/lib/checkout-pricing";
import { soon } from "@/lib/routes";
import { useHydratedCart } from "@/lib/use-cart-hydrated";
import { Icon } from "./icon";
import { Select } from "./select";

/**
 * Checkout (Checkout.dc.html desktop, CheckoutMobile.dc.html 390, CheckoutStates.dc.html,
 * ErrorCheckout.dc.html #1, #3 and #6). Every price shown comes from the server; the cart only
 * supplies variant ids and quantities.
 */

type Values = Record<
  | "name"
  | "phone"
  | "email"
  | "division"
  | "district"
  | "upazila"
  | "area"
  | "address"
  | "postal"
  | "note",
  string
>;
type Status = "idle" | "loading" | "fail" | "uncertain" | "success";
type CouponStat = "idle" | "applying" | "invalid" | "expired";

const EMPTY: Values = {
  name: "",
  phone: "",
  email: "",
  division: "",
  district: "",
  upazila: "",
  area: "",
  address: "",
  postal: "",
  note: "",
};

const DELIVERY: Record<DeliveryZone, { title: string; sub: string }> = {
  in: { title: "ঢাকার ভেতরে", sub: "ঢাকা জেলার ঠিকানার জন্য" },
  out: { title: "ঢাকার বাইরে", sub: "ঢাকা জেলার বাইরের ঠিকানার জন্য" },
};

const PAYMENTS = [
  {
    key: "cod",
    title: "ক্যাশ অন ডেলিভারি",
    sub: "জার হাতে পেয়ে টাকা দেবেন। এখন কোনো টাকা লাগবে না।",
    off: false,
  },
  { key: "bkash", title: "বিকাশ", sub: "এখনও চালু হয়নি।", off: true },
  { key: "nagad", title: "নগদ", sub: "এখনও চালু হয়নি।", off: true },
  { key: "other", title: "অন্যান্য অনলাইন পেমেন্ট", sub: "এখনও চালু হয়নি।", off: true },
] as const;

const PAY_TITLE = "ক্যাশ অন ডেলিভারি";
const PAY_NOTE =
  "জার হাতে পেয়ে টাকা দেবেন। এখন কোনো টাকা দিতে হবে না। অর্ডার জমা হলে এই পাতায় নিশ্চিতকরণ দেখতে পাবেন।";
/** On the confirmation, without "অর্ডার জমা হলে…", which is already true there (owner decision). */
const PAY_NOTE_PLACED = "জার হাতে পেয়ে টাকা দেবেন। এখন কোনো টাকা দিতে হবে না।";
const COUPON_MSG = {
  invalid: "কোডটি ঠিক নয়। আবার দেখে লিখুন",
  expired: "এই কোডের মেয়াদ শেষ হয়ে গেছে",
};

/** The placed order, kept for this tab so a reload or Back/Forward still shows the confirmation. */
const LAST_ORDER = "ak-last-order";

const readLastOrderRaw = () => {
  try {
    return sessionStorage.getItem(LAST_ORDER);
  } catch {
    return null;
  }
};
/** sessionStorage has no change event within one tab; the snapshot is re-read on each render. */
const noSubscribe = () => () => undefined;

function parseLastOrder(raw: string | null): PlacedOrder | null {
  try {
    const o = raw ? (JSON.parse(raw) as PlacedOrder) : null;
    return o && typeof o.orderNumber === "string" && Array.isArray(o.lines) ? o : null;
  } catch {
    return null;
  }
}

const bn = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);

function clientErrors(v: Values): Partial<Record<CheckoutField, string>> {
  const e: Partial<Record<CheckoutField, string>> = {};
  const r = checkoutContact.safeParse(v);
  if (!r.success) {
    for (const i of r.error.issues) {
      const k = i.path[0] as CheckoutField;
      if (!e[k]) e[k] = i.message;
    }
  }
  if (!v.district) e.delivery = "ডেলিভারি পদ্ধতি বেছে নিন";
  return e;
}

export function CheckoutView({ prefill }: { prefill: { name: string; email: string } }) {
  const router = useRouter();
  const { lines: cart, hydrated } = useHydratedCart();
  const setQuantity = useCart((s) => s.setQuantity);
  const clearCart = useCart((s) => s.clear);

  const [v, setV] = useState<Values>({ ...EMPTY, name: prefill.name, email: prefill.email });
  const [touched, setTouched] = useState<Partial<Record<CheckoutField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrs, setServerErrs] = useState<Partial<Record<CheckoutField, string>>>({});
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [calc, setCalc] = useState(false);
  const [cOpen, setCOpen] = useState(false);
  const [cIn, setCIn] = useState("");
  const [cStat, setCStat] = useState<CouponStat>("idle");
  const [applied, setApplied] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const seq = useRef(0);

  const items = useMemo(
    () => cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    [cart],
  );
  const itemsKey = JSON.stringify(items);
  const cartPrice = useMemo(() => new Map(cart.map((l) => [l.variantId, l])), [cart]);

  const requote = useCallback(
    async (code: string | null) => {
      if (items.length === 0) return null;
      const id = ++seq.current;
      const res = await quoteCheckout({
        items,
        district: v.district || undefined,
        couponCode: code ?? undefined,
      });
      if (id !== seq.current || !res.ok) return null;
      setQuote(res.quote);
      return res.quote;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itemsKey stands in for items
    [itemsKey, v.district],
  );

  // Re-price whenever the basket or the district changes ("হিসাব হচ্ছে…" while it runs).
  useEffect(() => {
    if (!hydrated || status === "success") return;
    let live = true;
    void requote(applied).then((q) => {
      if (!live) return;
      setCalc(false);
      const c = q?.coupon;
      if (applied && c && "error" in c) {
        setApplied(null);
        setCOpen(true);
        setCIn(applied);
        setCStat(c.error);
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applied is read, not a trigger
  }, [hydrated, requote]);

  // An empty basket right after an order in this tab (reload, Back/Forward): show that order's
  // confirmation again instead of sending the shopper away without their order number.
  const lastRaw = useSyncExternalStore(noSubscribe, readLastOrderRaw, () => null);
  const lastOrder = useMemo(() => parseLastOrder(lastRaw), [lastRaw]);
  const placed = order ?? (hydrated && cart.length === 0 ? lastOrder : null);

  // Nothing to check out: back to the basket, which has the empty state.
  useEffect(() => {
    if (hydrated && cart.length === 0 && !placed) router.replace("/basket");
  }, [hydrated, cart.length, placed, router]);

  // ErrorPatterns: after a failed submit, focus moves to the first invalid field.
  useEffect(() => {
    if (!focusTick) return;
    document.querySelector<HTMLElement>('.ck [aria-invalid="true"]')?.focus();
  }, [focusTick]);

  const errs = { ...clientErrors(v), ...serverErrs };
  const show = (k: CheckoutField) => ((touched[k] || submitted) && errs[k] ? errs[k] : "");
  const shownCount = (Object.keys(errs) as CheckoutField[]).filter((k) => show(k)).length;

  const set = (k: keyof Values, val: string) => {
    // Delete the key: an `undefined` value would mask the client error when merged into `errs`.
    setServerErrs((s) =>
      k in s ? Object.fromEntries(Object.entries(s).filter(([key]) => key !== k)) : s,
    );
    setV((s) => {
      const n = { ...s, [k]: val };
      if (k === "division") {
        n.district = "";
        n.upazila = "";
      }
      if (k === "district") n.upazila = "";
      return n;
    });
    if (k === "district" || k === "division") setCalc(true);
  };
  const blur = (k: CheckoutField) => setTouched((t) => ({ ...t, [k]: true }));

  const zone = zoneForDistrict(v.district || undefined);
  const lines = quote?.lines ?? [];
  const totals = quote?.totals;
  const busy = calc || !quote;
  const count = lines.filter((l) => l.available).reduce((n, l) => n + l.quantity, 0);
  const changedPrice = lines.some(
    (l) => l.available && (cartPrice.get(l.variantId)?.unitPrice ?? l.unitPrice) !== l.unitPrice,
  );
  const gone = lines.some((l) => !l.available);
  const short = lines.filter((l) => l.available && l.quantity > l.stock);

  const applyCoupon = async () => {
    const code = cIn.trim().toUpperCase();
    if (!code) {
      setCStat("invalid");
      return;
    }
    setCStat("applying");
    const q = await requote(code);
    const c = q?.coupon;
    if (!c) {
      setCStat("invalid");
    } else if ("error" in c) {
      setCStat(c.error);
    } else {
      setApplied(c.code);
      setCStat("idle");
    }
  };
  const removeCoupon = () => {
    setApplied(null);
    setCOpen(false);
    setCIn("");
    setCStat("idle");
    void requote(null);
  };

  const submit = async () => {
    setSubmitted(true);
    if (Object.keys(clientErrors(v)).length) {
      setFocusTick((t) => t + 1);
      return;
    }
    if (!quote || !zone) return;
    setStatus("loading");
    const seenPrices = Object.fromEntries(
      quote.lines.map((l) => [String(l.variantId), l.unitPrice]),
    );
    try {
      const res = await placeOrder({
        contact: v,
        delivery: zone,
        paymentMethod: "cod",
        couponCode: applied ?? undefined,
        items,
        seenPrices,
      });
      if (res.status === "ok") {
        setOrder(res.order);
        setStatus("success");
        try {
          sessionStorage.setItem(LAST_ORDER, JSON.stringify(res.order));
        } catch {
          // Storage blocked: the confirmation still shows until the page is left.
        }
        clearCart();
        window.scrollTo({ top: 0 });
      } else if (res.status === "changed") {
        setQuote(res.quote);
        const c = res.quote.coupon;
        if (applied && c && "error" in c) {
          setApplied(null);
          setCOpen(true);
          setCIn(applied);
          setCStat(c.error);
        }
        setStatus("idle");
      } else if (res.status === "invalid") {
        setServerErrs(res.errors);
        setStatus("idle");
        setFocusTick((t) => t + 1);
      } else {
        setStatus("fail");
      }
    } catch {
      // No answer from the server: the order may or may not exist (ErrorCheckout #6).
      setStatus("uncertain");
    }
  };

  const delText =
    calc || !totals
      ? "হিসাব হচ্ছে…"
      : totals.shippingFee === null
        ? "ঠিকানা দিলে দেখা যাবে"
        : formatTaka(totals.shippingFee);
  const totLabel = totals?.shippingFee == null ? "মোট (ডেলিভারি চার্জ ছাড়া)" : "পরিশোধযোগ্য মোট";
  const total = totals ? formatTaka(totals.total) : "";

  const totalsDl = (
    t = totals,
    fee = delText,
    label = totLabel,
    busyFee = busy || t?.shippingFee == null,
  ) =>
    t ? (
      <dl className="tot">
        <div>
          <dt lang="bn">সাবটোটাল</dt>
          <dd>{formatTaka(t.subtotal)}</dd>
        </div>
        {t.discount > 0 && (
          <div className="disc">
            <dt lang="bn">ডিসকাউন্ট</dt>
            <dd>−{formatTaka(t.discount)}</dd>
          </div>
        )}
        <div className={busyFee ? "busy" : undefined}>
          <dt lang="bn">ডেলিভারি চার্জ</dt>
          <dd>{fee}</dd>
        </div>
        <div className="grand">
          <dt lang="bn">{label}</dt>
          <dd>{formatTaka(t.total)}</dd>
        </div>
      </dl>
    ) : null;

  const itemList = (ls: CheckoutLine[], marks: boolean) => (
    <ul className="items" aria-label="অর্ডারের পণ্য">
      {ls.map((l) => {
        const was = cartPrice.get(l.variantId)?.unitPrice;
        const moved = marks && l.available && was !== undefined && was !== l.unitPrice;
        const isGone = marks && !l.available;
        return (
          <li key={l.variantId} className={`it ${isGone ? "gone" : ""}`}>
            <span className="th">
              {l.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- product photo from the DB
                <img src={l.imageUrl} alt="" />
              ) : (
                <Icon name="jar" />
              )}
            </span>
            <span>
              <b>{l.displayName || cartPrice.get(l.variantId)?.productName}</b>
              <span className="vr">
                {l.variantLabel || cartPrice.get(l.variantId)?.variantLabel} · পরিমাণ {l.quantity} ×{" "}
                {moved && <span className="old">{formatTaka(was)}</span>}
                {formatTaka(l.available ? l.unitPrice : (was ?? 0))}
              </span>
              {isGone && (
                <span className="gt" lang="bn">
                  এখন পাওয়া যাচ্ছে না। মোট থেকে বাদ দেওয়া হয়েছে।
                </span>
              )}
              {moved && (
                <span className="gt" lang="bn">
                  দাম বদলেছে।
                </span>
              )}
            </span>
            <span className="lt">
              {formatTaka((l.available ? l.unitPrice : (was ?? 0)) * l.quantity)}
            </span>
          </li>
        );
      })}
    </ul>
  );

  const notices = (
    <>
      {changedPrice && (
        <div className="note" role="status">
          <b lang="bn">একটি পণ্যের দাম বদলেছে</b>
          <span lang="bn">
            নিচের মোট নতুন দামে হিসাব করা হয়েছে। অর্ডার নিশ্চিত করার আগে একবার দেখে নিন।
          </span>
        </div>
      )}
      {gone && (
        <div className="note" role="status">
          <b lang="bn">একটি পণ্য এখন পাওয়া যাচ্ছে না</b>
          <span lang="bn">
            সেটি মোট থেকে বাদ দেওয়া হয়েছে। বাকি পণ্য নিয়ে অর্ডার করতে পারবেন।
          </span>
        </div>
      )}
    </>
  );

  const couponBlock = (
    <>
      {!cOpen && !applied && (
        <button
          type="button"
          className="cp-t"
          aria-expanded="false"
          onClick={() => setCOpen(true)}
          lang="bn"
        >
          প্রোমো কোড আছে?
        </button>
      )}
      {cOpen && !applied && (
        <>
          <div className="cp-row">
            <label className="ak-field">
              <span lang="bn">
                প্রোমো কোড <small>ঐচ্ছিক</small>
              </span>
              <input
                className={`ak-input ${cStat === "invalid" || cStat === "expired" ? "is-error" : ""}`}
                type="text"
                autoComplete="off"
                placeholder="কোড লিখুন"
                value={cIn}
                aria-invalid={cStat === "invalid" || cStat === "expired"}
                onChange={(e) => {
                  setCIn(e.target.value);
                  setCStat("idle");
                }}
              />
            </label>
            <button
              type="button"
              className="ak-btn ak-btn--line"
              onClick={() => void applyCoupon()}
              lang="bn"
            >
              {cStat === "applying" ? "যাচাই হচ্ছে…" : "প্রয়োগ"}
            </button>
          </div>
          {(cStat === "invalid" || cStat === "expired") && (
            <span className="ak-help is-error cp-err" role="alert" lang="bn">
              {cIn.trim() ? COUPON_MSG[cStat] : "প্রোমো কোড লিখুন"}
            </span>
          )}
        </>
      )}
      {applied && quote?.coupon && "label" in quote.coupon && (
        <div className="cp-ok" role="status">
          <span lang="bn">
            {applied} প্রয়োগ হয়েছে ({quote.coupon.label})
          </span>
          <button type="button" onClick={removeCoupon} lang="bn">
            সরান
          </button>
        </div>
      )}
    </>
  );

  // ErrorCheckout #3: the server answered that the order was not saved.
  const failCard = (
    <section className="ce" role="alert" aria-label="অর্ডার জমা দেওয়া যায়নি">
      <h3 lang="bn">অর্ডার জমা দেওয়া যায়নি</h3>
      <p lang="bn">
        আপনার অর্ডার আমাদের কাছে পৌঁছায়নি। ঝুড়ি আর আপনার দেওয়া তথ্য যেমন ছিল তেমনই আছে।
      </p>
      <ul className="known" aria-label="এখন যা জানা আছে">
        <li>
          <span className="m" aria-hidden="true">
            ✕
          </span>
          <span lang="bn">
            <span className="sr">না: </span>অর্ডার জমা হয়েছে
          </span>
        </li>
        <li>
          <span className="m" aria-hidden="true">
            ✕
          </span>
          <span lang="bn">
            <span className="sr">না: </span>পেমেন্ট নেওয়া হয়েছে
          </span>
        </li>
        <li>
          <span className="m y" aria-hidden="true">
            ✓
          </span>
          <span lang="bn">
            <span className="sr">হ্যাঁ: </span>ঝুড়ির পণ্য অক্ষত আছে
          </span>
        </li>
      </ul>
      <div className="acts">
        <button type="button" className="ak-btn ak-btn--brand" onClick={() => void submit()}>
          আবার চেষ্টা করুন
        </button>
        <Link className="ak-btn ak-btn--line" href="/basket">
          ঝুড়িতে ফিরুন
        </Link>
      </div>
    </section>
  );

  // ErrorCheckout #6: no answer, so the order may exist. No resubmit button, on purpose.
  const unsureCard = (
    <section
      className="ce"
      role="alert"
      aria-label="আপনার অর্ডার জমা হয়েছে কি না নিশ্চিত হওয়া যাচ্ছে না"
    >
      <h3 lang="bn">আপনার অর্ডার জমা হয়েছে কি না নিশ্চিত হওয়া যাচ্ছে না</h3>
      <p lang="bn">
        অর্ডার জমা দেওয়ার সময় উত্তর পাওয়া যায়নি। আবার অর্ডার করার আগে অবস্থা যাচাই করুন, নইলে
        একই অর্ডার দুবার হয়ে যেতে পারে।
      </p>
      <ul className="known" aria-label="এখন যা জানা আছে">
        <li>
          <span className="m q" aria-hidden="true">
            ?
          </span>
          <span lang="bn">
            <span className="sr">অজানা: </span>অর্ডার জমা হয়েছে কি না
          </span>
        </li>
        <li>
          <span className="m q" aria-hidden="true">
            ?
          </span>
          <span lang="bn">
            <span className="sr">অজানা: </span>পেমেন্ট নেওয়া হয়েছে কি না
          </span>
        </li>
      </ul>
      <div className="acts">
        <Link className="ak-btn ak-btn--brand" href={soon("/track")}>
          অর্ডারের অবস্থা দেখুন
        </Link>
        <Link className="ak-btn ak-btn--line" href="/contact" lang="bn">
          সাপোর্টে যোগাযোগ করুন
        </Link>
      </div>
      <p className="ce-note" lang="bn">
        নিশ্চিতকরণের মেসেজ বা ইমেইল এসেছে কি না দেখুন। এই বার্তায় ইচ্ছে করেই “আবার জমা দিন” বোতাম
        রাখা হয়নি।
      </p>
    </section>
  );

  // ErrorCheckout #1: a jar count is now more than the stock.
  const shortCard =
    short.length > 0 ? (
      <section className="ce" role="status" aria-label="ঝুড়ির কিছু তথ্য বদলে গেছে">
        <h3 lang="bn">ঝুড়ির কিছু তথ্য বদলে গেছে</h3>
        <p lang="bn">অর্ডার করার আগে নতুন তথ্যগুলো একবার দেখে নিন। আপনার অন্য সব পণ্য ঠিকই আছে।</p>
        <ul className="chg" lang="bn">
          {short.map((l) => (
            <li key={l.variantId}>
              <span>{l.displayName || l.productName} · পরিমাণ</span>
              <span>
                <s>{bn(l.quantity)}</s> → {bn(l.stock)} (স্টকে এতটুকুই আছে)
              </span>
            </li>
          ))}
        </ul>
        <div className="acts">
          <Link className="ak-btn ak-btn--brand" href="/basket">
            ঝুড়ি দেখুন
          </Link>
          <button
            type="button"
            className="ak-btn ak-btn--line"
            onClick={() => short.forEach((l) => setQuantity(l.variantId, l.stock))}
          >
            বুঝেছি, এগিয়ে যাই
          </button>
        </div>
      </section>
    ) : null;

  const loading = status === "loading";
  const canSubmit = status === "idle";
  const placeBtn = loading ? (
    <button type="button" className="ak-btn ak-btn--sun place" disabled aria-busy="true" lang="bn">
      <span className="spin" aria-hidden="true" />
      অর্ডার জমা হচ্ছে…
    </button>
  ) : canSubmit ? (
    <button
      type="button"
      className="ak-btn ak-btn--sun place"
      onClick={() => void submit()}
      lang="bn"
    >
      অর্ডার নিশ্চিত করুন
    </button>
  ) : null;

  /** Ids of the help and error text under a field. Help text exists only where `field()` gets `help`. */
  const describedBy = (k: keyof Values, help = k === "phone") =>
    [help ? `ck-${k}-help` : "", show(k) ? `ck-${k}-err` : ""].filter(Boolean).join(" ") ||
    undefined;
  const field = (
    k: keyof Values,
    label: string,
    opts: { req?: boolean; small?: string; full?: boolean; help?: string; input: React.ReactNode },
  ) => (
    <label className={`ak-field ${opts.full ? "full" : ""}`}>
      <span lang="bn">
        {label}
        {opts.req && <em aria-hidden="true">*</em>}
        {opts.small && (
          <>
            {" "}
            <small>{opts.small}</small>
          </>
        )}
      </span>
      {opts.input}
      {opts.help && (
        <span className="ak-help" id={`ck-${k}-help`}>
          {opts.help}
        </span>
      )}
      {/* ErrorPatterns §2: only the summary is an alert; field messages hang off aria-describedby. */}
      {show(k) && (
        <span className="ak-help is-error" id={`ck-${k}-err`}>
          {show(k)}
        </span>
      )}
    </label>
  );
  const inputProps = (k: keyof Values, req = false) => ({
    className: `ak-input ${show(k) ? "is-error" : ""}`,
    "aria-describedby": describedBy(k),
    value: v[k],
    "aria-required": req || undefined,
    "aria-invalid": !!show(k),
    onBlur: () => blur(k),
  });

  const dists = v.division ? districtsOf(v.division) : [];
  const upas = v.district ? upazilasOf(v.division, v.district) : [];

  if (placed) {
    const order = placed;
    return (
      <div className="ck">
        <main className="wrap main">
          <div className="okw">
            <div className="ok-h">
              <div className="eb ak-blot v2" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </div>
              <h1 lang="bn">অর্ডার জমা হয়েছে</h1>
              <p lang="bn">ধন্যবাদ, {order.name}। আপনার অর্ডারটি আমাদের কাছে পৌঁছেছে।</p>
              <div className="ordno">
                <span lang="bn">অর্ডার নম্বর:</span>
                <span>{order.orderNumber}</span>
              </div>
            </div>
            <section className="sec ok ok-gap" aria-label="অর্ডারের বিবরণ">
              <dl className="facts">
                <div>
                  <dt>পেমেন্ট</dt>
                  <dd>{PAY_TITLE}</dd>
                </div>
                <div>
                  <dt>ডেলিভারি</dt>
                  <dd>{DELIVERY[order.delivery].title}</dd>
                </div>
                <div className="wide">
                  <dt>ঠিকানা</dt>
                  <dd>{order.address}</dd>
                </div>
              </dl>
            </section>
            <section className="sec ok ok-gap2" aria-label="অর্ডারের সারাংশ">
              {itemList(order.lines, false)}
              {totalsDl(
                order.totals,
                formatTaka(order.totals.shippingFee ?? 0),
                "পরিশোধযোগ্য মোট",
                false,
              )}
            </section>
            <section className="sec ok ok-gap2 ok-next">
              <h2 lang="bn">এরপর কী হবে</h2>
              <ol className="steps">
                <li lang="bn">{PAY_NOTE_PLACED}</li>
                <li lang="bn">অর্ডার নিয়ে প্রশ্ন থাকলে যোগাযোগ পাতা থেকে আমাদের জানান।</li>
              </ol>
            </section>
            <div className="ok-acts">
              <Link className="ak-btn ak-btn--brand" href="/shop" lang="bn">
                কেনাকাটা চালিয়ে যান
              </Link>
              <Link
                className="ak-btn ak-btn--line"
                href={`/track?order=${encodeURIComponent(order.orderNumber)}` as Route}
                lang="bn"
              >
                অর্ডার ট্র্যাক করুন
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="ck">
      <main className="wrap main">
        <div className="top">
          <div>
            <h1 lang="bn">চেকআউট</h1>
            <p lang="bn">অর্ডার দেখুন, ঠিকানা দিন, পেমেন্ট বেছে নিন।</p>
          </div>
        </div>
        <div className="grid">
          <div className="body">
            <details className="sum only-mob">
              {/* Mouse/tap toggles without focusing, so the keyboard focus ring only shows for keyboard users. */}
              <summary onMouseDown={(e) => e.preventDefault()}>
                <span>
                  <span lang="bn">অর্ডারের সারাংশ</span>
                  <small lang="bn">{bn(count)}টি পণ্য</small>
                </span>
                <span className="r">
                  {total}
                  <Icon name="plus" />
                </span>
              </summary>
              <div className="in">
                {notices}
                {itemList(lines, true)}
              </div>
            </details>
            {shortCard}
            {submitted && shownCount > 0 && status === "idle" && (
              <div className="note err" role="alert">
                <b lang="bn">{bn(shownCount)}টি ঘর ঠিক করতে হবে</b>
                <span lang="bn">লাল চিহ্নিত ঘরগুলো দেখুন। আপনার লেখা সব তথ্য এখানেই আছে।</span>
              </div>
            )}
            <div className={loading ? "busyf" : undefined}>
              <section className="sec" aria-labelledby="s1">
                <div className="sec-h">
                  <span className="n" aria-hidden="true">
                    ১
                  </span>
                  <h2 id="s1" lang="bn">
                    আপনার তথ্য
                  </h2>
                </div>
                <p className="sec-sub" lang="bn">
                  অ্যাকাউন্ট ছাড়াই অর্ডার করা যাবে।{" "}
                  <span className="req-note">
                    <span className="star">*</span> চিহ্নিত ঘর আবশ্যক।
                  </span>
                </p>
                <div className="fg">
                  {field("name", "পুরো নাম", {
                    req: true,
                    input: (
                      <input
                        {...inputProps("name", true)}
                        type="text"
                        autoComplete="name"
                        placeholder="আপনার পুরো নাম"
                        onChange={(e) => set("name", e.target.value)}
                      />
                    ),
                  })}
                  {field("phone", "মোবাইল নম্বর", {
                    req: true,
                    help: "যেমন 01XXX-XXXXXX বা +8801XXXXXXXXX",
                    input: (
                      <input
                        {...inputProps("phone", true)}
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="01XXXXXXXXX"
                        onChange={(e) => set("phone", e.target.value)}
                      />
                    ),
                  })}
                  {field("email", "ইমেইল", {
                    small: "ঐচ্ছিক",
                    full: true,
                    input: (
                      <input
                        {...inputProps("email")}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        onChange={(e) => set("email", e.target.value)}
                      />
                    ),
                  })}
                </div>
              </section>

              <section className="sec" aria-labelledby="s2">
                <div className="sec-h">
                  <span className="n" aria-hidden="true">
                    ২
                  </span>
                  <h2 id="s2" lang="bn">
                    ডেলিভারির ঠিকানা
                  </h2>
                </div>
                <p className="sec-sub" lang="bn">
                  বিভাগ থেকে শুরু করুন, পরের তালিকা নিজে থেকে বদলে যাবে।
                </p>
                <div className="fg">
                  {field("division", "বিভাগ", {
                    req: true,
                    input: (
                      <Select
                        lang="bn"
                        required
                        label="বিভাগ"
                        invalid={!!show("division")}
                        describedBy={describedBy("division")}
                        value={v.division}
                        onChange={(x) => set("division", x)}
                        onBlur={() => blur("division")}
                        options={[
                          { value: "", label: "বিভাগ বেছে নিন" },
                          ...DIVISIONS.map((d) => ({ value: d, label: d })),
                        ]}
                      />
                    ),
                  })}
                  {field("district", "জেলা", {
                    req: true,
                    input: (
                      <Select
                        lang="bn"
                        required
                        label="জেলা"
                        invalid={!!show("district")}
                        describedBy={describedBy("district")}
                        value={v.district}
                        onChange={(x) => set("district", x)}
                        onBlur={() => blur("district")}
                        options={[
                          { value: "", label: v.division ? "জেলা বেছে নিন" : "আগে বিভাগ বেছে নিন" },
                          ...dists.map((d) => ({ value: d, label: d })),
                        ]}
                      />
                    ),
                  })}
                  {field("upazila", "উপজেলা / থানা", {
                    req: true,
                    input: (
                      <Select
                        lang="bn"
                        required
                        label="উপজেলা / থানা"
                        invalid={!!show("upazila")}
                        describedBy={describedBy("upazila")}
                        value={v.upazila}
                        onChange={(x) => set("upazila", x)}
                        onBlur={() => blur("upazila")}
                        options={[
                          {
                            value: "",
                            label: v.district ? "উপজেলা / থানা বেছে নিন" : "আগে জেলা বেছে নিন",
                          },
                          ...upas.map((d) => ({ value: d, label: d })),
                        ]}
                      />
                    ),
                  })}
                  {field("area", "এলাকা", {
                    small: "প্রযোজ্য হলে",
                    input: (
                      <input
                        {...inputProps("area")}
                        type="text"
                        autoComplete="address-level3"
                        placeholder="যেমন: ব্লক বা পাড়া"
                        onChange={(e) => set("area", e.target.value)}
                      />
                    ),
                  })}
                  {field("address", "বিস্তারিত ঠিকানা", {
                    req: true,
                    full: true,
                    input: (
                      <textarea
                        {...inputProps("address", true)}
                        autoComplete="street-address"
                        placeholder="বাড়ি, রাস্তা, ল্যান্ডমার্ক"
                        onChange={(e) => set("address", e.target.value)}
                      />
                    ),
                  })}
                  {field("postal", "পোস্ট কোড", {
                    small: "ঐচ্ছিক",
                    input: (
                      <input
                        {...inputProps("postal")}
                        type="text"
                        autoComplete="postal-code"
                        inputMode="numeric"
                        placeholder="যেমন: 1205"
                        onChange={(e) => set("postal", e.target.value)}
                      />
                    ),
                  })}
                  <label className="ak-field full">
                    <span lang="bn">
                      ডেলিভারি নির্দেশনা <small>ঐচ্ছিক</small>
                    </span>
                    <textarea
                      className="ak-input"
                      placeholder="যেমন: গেটে কল করবেন"
                      value={v.note}
                      onChange={(e) => set("note", e.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="sec" aria-labelledby="s3">
                <div className="sec-h">
                  <span className="n" aria-hidden="true">
                    ৩
                  </span>
                  <h2 id="s3" lang="bn">
                    ডেলিভারি পদ্ধতি
                  </h2>
                </div>
                <p className="sec-sub" lang="bn">
                  ঠিকানা অনুযায়ী নিজে থেকে বাছাই হয়।
                </p>
                <div
                  className="opts"
                  role="radiogroup"
                  aria-label="ডেলিভারি পদ্ধতি"
                  aria-describedby={show("delivery") ? "ck-delivery-err" : undefined}
                >
                  {(["in", "out"] as const).map((k) => {
                    const na = !!zone && zone !== k;
                    const on = zone === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        className={`opt ${on ? "on" : ""} ${na ? "off" : ""}`}
                        aria-checked={on}
                        aria-disabled={na}
                      >
                        <span className="rd" aria-hidden="true" />
                        <span>
                          <b lang="bn">{DELIVERY[k].title}</b>
                          <small lang="bn">
                            {na ? "এই ঠিকানার জন্য প্রযোজ্য নয়" : DELIVERY[k].sub}
                          </small>
                        </span>
                        <span className="pr">{formatTaka(DELIVERY_FEES[k])}</span>
                      </button>
                    );
                  })}
                </div>
                {show("delivery") && (
                  <span className="ak-help is-error del-err" id="ck-delivery-err">
                    {show("delivery")}
                  </span>
                )}
              </section>

              <section className="sec" aria-labelledby="s4">
                <div className="sec-h">
                  <span className="n" aria-hidden="true">
                    ৪
                  </span>
                  <h2 id="s4" lang="bn">
                    পেমেন্ট
                  </h2>
                </div>
                <div className="opts" role="radiogroup" aria-label="পেমেন্ট পদ্ধতি">
                  {PAYMENTS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      role="radio"
                      className={`opt ${p.off ? "off" : "on"}`}
                      aria-checked={!p.off}
                      aria-disabled={p.off}
                    >
                      <span className="rd" aria-hidden="true" />
                      <span>
                        <b lang="bn">{p.title}</b>
                        <small lang="bn">{p.sub}</small>
                      </span>
                      {p.off ? (
                        <span className="ph-chip" lang="bn">
                          শীঘ্রই আসছে
                        </span>
                      ) : (
                        <span />
                      )}
                    </button>
                  ))}
                </div>
                <p className="pay-note" lang="bn">
                  এই পাতায় কখনো বিকাশ বা নগদের পিন বা OTP দিতে হবে না। অনলাইন পেমেন্ট চালু হলে
                  নিরাপদ পেমেন্ট পাতায় নেওয়া হবে।
                </p>
              </section>

              <section className="sec price-sec only-mob" aria-labelledby="s5">
                <div className="sec-h">
                  <span className="n" aria-hidden="true">
                    ৫
                  </span>
                  <h2 id="s5" lang="bn">
                    মূল্যের হিসাব
                  </h2>
                </div>
                <div className="cp">{couponBlock}</div>
                {totalsDl()}
                <p className="pay-note" lang="bn">
                  <b>{PAY_TITLE}।</b> {PAY_NOTE}
                </p>
              </section>
            </div>
          </div>

          <aside className="aside only-desk" aria-label="অর্ডারের সারাংশ">
            <div className="sec">
              <h2 lang="bn">অর্ডারের সারাংশ</h2>
              {notices}
              {itemList(lines, true)}
              <div className="cp">{couponBlock}</div>
              {totalsDl()}
              <div className="place-w">
                {status === "fail" && failCard}
                {status === "uncertain" && unsureCard}
                {placeBtn}
                <p className="pay-note" lang="bn">
                  {loading ? (
                    "পাতাটি বন্ধ করবেন না।"
                  ) : (
                    <>
                      <b>{PAY_TITLE}।</b> {PAY_NOTE}
                    </>
                  )}
                </p>
              </div>
            </div>
          </aside>
        </div>
        <div className="bar only-mob" role="region" aria-label="অর্ডার নিশ্চিত করুন">
          {status === "fail" && failCard}
          {status === "uncertain" && unsureCard}
          {(canSubmit || loading) && (
            <>
              <div className="t">
                <small lang="bn">মোট</small>
                <b>{total}</b>
              </div>
              {placeBtn}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
