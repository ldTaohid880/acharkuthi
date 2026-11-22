"use client";

import { formatTaka } from "@repo/ui/lib/utils";
import {
  type CheckoutField,
  checkoutContact,
  type CouponProblem,
  placeName,
} from "@repo/validators";
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
import { zoneForDistrict } from "@/lib/checkout-pricing";
import { deviceFingerprint } from "@/lib/device-fingerprint";
import { localePath } from "@/lib/i18n/lang";
import { pixelValue, trackPixel } from "@/lib/meta-pixel";
import { useLang } from "@/lib/i18n/lang-context";
import { soon } from "@/lib/routes";
import { useHydratedCart } from "@/lib/use-cart-hydrated";
import { Icon } from "./icon";
import { Select } from "./select";

/**
 * Checkout (Checkout.dc.html desktop, CheckoutMobile.dc.html 390, CheckoutStates.dc.html,
 * ErrorCheckout.dc.html #1, #3 and #6). Every price shown comes from the server; the cart only
 * supplies variant ids and quantities.
 */

export type CheckoutValues = Values;
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
type Status = "idle" | "loading" | "fail" | "uncertain" | "success" | "closed";
/** "checking" / "ok": the live check while typing (owner request, 2026-11-15). */
type CouponStat = "idle" | "applying" | "checking" | "ok" | CouponProblem;
const COUPON_ERRORS: readonly CouponStat[] = [
  "invalid",
  "expired",
  "used",
  "first",
  "tries",
  "min",
];
const isCouponError = (c: CouponStat): c is CouponProblem => COUPON_ERRORS.includes(c);

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

// Option texts, coupon messages and every label: lib/i18n/dict.ts `checkout`.
const PAYMENTS = [
  { key: "cod", off: false },
  { key: "bkash", off: true },
  { key: "nagad", off: true },
  { key: "other", off: true },
] as const;

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

/**
 * `who` is the signed-in email ("" for a guest): the confirmation is shown again only to whoever
 * placed it, not to the next person who signs in on this device.
 */
function parseLastOrder(raw: string | null, who: string): PlacedOrder | null {
  try {
    const o = raw ? (JSON.parse(raw) as PlacedOrder & { who?: unknown }) : null;
    return o && o.who === who && typeof o.orderNumber === "string" && Array.isArray(o.lines)
      ? o
      : null;
  } catch {
    return null;
  }
}

function clientErrors(v: Values): Partial<Record<CheckoutField, string>> {
  const e: Partial<Record<CheckoutField, string>> = {};
  const r = checkoutContact.safeParse(v);
  if (!r.success) {
    for (const i of r.error.issues) {
      const k = i.path[0] as CheckoutField;
      if (!e[k]) e[k] = i.message;
    }
  }
  return e;
}

export function CheckoutView({
  prefill,
  fees,
  codEnabled,
}: {
  /** Signed-in customer: name and email, plus their default saved address when they have one. */
  prefill: Partial<Values>;
  /** Delivery charges (paisa) from admin Settings. */
  fees: { in: number; out: number };
  /** Admin Settings "ক্যাশ অন ডেলিভারি চালু"; off = no orders are taken. */
  codEnabled: boolean;
}) {
  const router = useRouter();
  const { lines: cart, hydrated } = useHydratedCart();
  const setQuantity = useCart((s) => s.setQuantity);
  const clearCart = useCart((s) => s.clear);
  // Every label in the page language (memory: storefront-bilingual). Place values stay Bangla.
  const { lang, t: all, href } = useLang();
  const ck = all.checkout;
  /** Coupon labels come with Latin digits; the Bangla site shows a percent in Bangla digits ("১০%"). Taka amounts keep the Latin price face. */
  const digitsFor = (text: string) =>
    lang === "bn" && text.endsWith("%")
      ? text.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d)
      : text;

  const [v, setV] = useState<Values>({ ...EMPTY, ...prefill });
  const [touched, setTouched] = useState<Partial<Record<CheckoutField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrs, setServerErrs] = useState<Partial<Record<CheckoutField, string>>>({});
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [calc, setCalc] = useState(false);
  const [cOpen, setCOpen] = useState(false);
  const [cIn, setCIn] = useState("");
  const [cStat, setCStat] = useState<CouponStat>("idle");
  /** For "min": how much more (paisa) the basket needs before the code works. */
  const [cNeed, setCNeed] = useState(0);
  const couponErr = (c: { error: CouponProblem; need?: number }) => {
    setCNeed(c.need ?? 0);
    setCStat(c.error);
  };
  const [applied, setApplied] = useState<string | null>(null);
  /** Live check result while typing: the discount label when the code works. */
  const [cOk, setCOk] = useState<string | null>(null);
  /** Device fingerprint for the per-person coupon limit (hash only). */
  const fp = useRef<string | undefined>(undefined);
  const phoneRef = useRef("");
  // Double-submit guard: the ref blocks a second click before React re-renders the button, and
  // the key lets the server answer a repeat (or a retry after no answer) with the same order.
  const placing = useRef(false);
  const checkoutKey = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  /** Phone order summary (collapsed by default); it holds the price / sold-out notices. */
  const sumRef = useRef<HTMLDetailsElement>(null);
  const [changedTick, setChangedTick] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    void deviceFingerprint().then((h) => {
      fp.current = h;
    });
  }, []);
  useEffect(() => {
    phoneRef.current = v.phone;
  }, [v.phone]);

  const items = useMemo(
    () => cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    [cart],
  );
  const itemsKey = JSON.stringify(items);
  const cartPrice = useMemo(() => new Map(cart.map((l) => [l.variantId, l])), [cart]);
  const nm = (l: CheckoutLine) =>
    (lang === "en" ? l.productName : l.displayName) || cartPrice.get(l.variantId)?.productName;

  const requote = useCallback(
    async (code: string | null) => {
      if (items.length === 0) return null;
      const id = ++seq.current;
      const res = await quoteCheckout({
        items,
        district: v.district || undefined,
        couponCode: code ?? undefined,
        phone: phoneRef.current || undefined,
        fp: fp.current,
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
        couponErr(c);
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applied is read, not a trigger
  }, [hydrated, requote]);

  // Meta Pixel InitiateCheckout, once per visit, with the first server-priced basket.
  const pixelCheckout = useRef(false);
  useEffect(() => {
    if (pixelCheckout.current || status === "success" || !quote) return;
    const live = quote.lines.filter((l) => l.available);
    if (!live.length) return;
    pixelCheckout.current = true;
    trackPixel("InitiateCheckout", {
      content_ids: live.map((l) => String(l.variantId)),
      content_type: "product",
      contents: live.map((l) => ({
        id: String(l.variantId),
        quantity: l.quantity,
        item_price: pixelValue(l.unitPrice),
      })),
      num_items: live.reduce((n, l) => n + l.quantity, 0),
      value: pixelValue(quote.totals.subtotal - quote.totals.discount),
      currency: "BDT",
    });
  }, [quote, status]);

  // An empty basket right after an order in this tab (reload, Back/Forward): show that order's
  // confirmation again instead of sending the shopper away without their order number.
  const lastRaw = useSyncExternalStore(noSubscribe, readLastOrderRaw, () => null);
  const who = prefill.email ?? "";
  const lastOrder = useMemo(() => parseLastOrder(lastRaw, who), [lastRaw, who]);
  const placed = order ?? (hydrated && cart.length === 0 ? lastOrder : null);

  // Nothing to check out: back to the basket, which has the empty state.
  useEffect(() => {
    if (hydrated && cart.length === 0 && !placed) router.replace(localePath(lang, "/basket"));
  }, [hydrated, cart.length, placed, router, lang]);

  // ErrorPatterns: after a failed submit, focus moves to the first invalid field.
  useEffect(() => {
    if (!focusTick) return;
    document.querySelector<HTMLElement>('.ck [aria-invalid="true"]')?.focus();
  }, [focusTick]);

  const errs = { ...clientErrors(v), ...serverErrs };
  // Schema messages are Bangla; the English site shows its own wording (dict `checkout.err`).
  const show = (k: CheckoutField) => {
    const m = (touched[k] || submitted) && errs[k];
    return m ? (ck.err[m] ?? m) : "";
  };
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
  /** Nothing in the basket can be ordered right now (all sold out or switched off). */
  const nothingLeft = lines.length > 0 && lines.every((l) => !l.available);
  const short = lines.filter((l) => l.available && l.quantity > l.stock);

  // Phones keep the price / sold-out notices in the collapsed order summary (CheckoutMobile):
  // open it when one appears, and after a refused order bring it into view, so the shopper
  // sees why nothing was placed.
  const hasNotice = changedPrice || gone;
  useEffect(() => {
    const el = sumRef.current;
    if (!el || !hasNotice) return;
    el.open = true;
    if (changedTick && el.offsetParent !== null) el.scrollIntoView({ block: "start" });
  }, [hasNotice, changedTick]);

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
      couponErr(c);
    } else {
      setApplied(c.code);
      setCStat("idle");
    }
  };
  // Live check while typing (500 ms after the last key): says at once whether the code works.
  // Only the coupon part of the answer is used; the totals change when "প্রয়োগ" is pressed.
  useEffect(() => {
    const code = cIn.trim().toUpperCase();
    if (applied || code.length < 3 || items.length === 0) return;
    let live = true;
    const id = setTimeout(() => {
      setCStat("checking");
      void quoteCheckout({
        items,
        district: v.district || undefined,
        couponCode: code,
        phone: phoneRef.current || undefined,
        live: true,
        fp: fp.current,
      })
        .then((res) => {
          if (!live) return;
          const c = res.ok ? res.quote.coupon : null;
          if (c && "label" in c) {
            setCOk(c.label);
            setCStat("ok");
          } else {
            setCOk(null);
            if (c && "error" in c) couponErr(c);
            else setCStat("idle");
          }
        })
        .catch(() => live && setCStat("idle"));
    }, 500);
    return () => {
      live = false;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-check only when the typed code changes
  }, [cIn, applied]);

  // An applied coupon is checked again once the phone number is complete: "already used" shows
  // here, before the order is placed, not only when it is refused.
  const phoneKey = /^01[3-9]\d{8}$/.test(v.phone.replace(/\D/g, "").replace(/^88/, ""))
    ? v.phone.replace(/\D/g, "").replace(/^88/, "")
    : "";
  useEffect(() => {
    if (!applied || !phoneKey) return;
    let live = true;
    void requote(applied).then((q) => {
      const c = q?.coupon;
      if (!live || !c || !("error" in c)) return;
      setApplied(null);
      setCOpen(true);
      setCIn(applied);
      couponErr(c);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the phone becomes complete
  }, [phoneKey]);

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
    if (!quote || !zone || placing.current) return;
    placing.current = true;
    setStatus("loading");
    const seenPrices = Object.fromEntries(
      quote.lines.map((l) => [String(l.variantId), l.unitPrice]),
    );
    checkoutKey.current ??=
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
    try {
      const res = await placeOrder({
        checkoutKey: checkoutKey.current,
        contact: v,
        delivery: zone,
        paymentMethod: "cod",
        couponCode: applied ?? undefined,
        items,
        seenPrices,
        seenGone: quote.lines.filter((l) => !l.available).map((l) => l.variantId),
        fp: fp.current,
      });
      if (res.status === "ok") {
        checkoutKey.current = null;
        setOrder(res.order);
        setStatus("success");
        // Meta Pixel Purchase; the order number is the eventID for dedup.
        trackPixel(
          "Purchase",
          {
            content_ids: res.order.lines.map((l) => String(l.variantId)),
            content_type: "product",
            contents: res.order.lines.map((l) => ({
              id: String(l.variantId),
              quantity: l.quantity,
              item_price: pixelValue(l.unitPrice),
            })),
            num_items: res.order.lines.reduce((n, l) => n + l.quantity, 0),
            value: pixelValue(res.order.totals.total),
            currency: "BDT",
          },
          res.order.orderNumber,
        );
        try {
          sessionStorage.setItem(LAST_ORDER, JSON.stringify({ ...res.order, who }));
        } catch {
          // Storage blocked: the confirmation still shows until the page is left.
        }
        clearCart();
        window.scrollTo({ top: 0 });
      } else if (res.status === "changed") {
        setQuote(res.quote);
        setChangedTick((t) => t + 1);
        const c = res.quote.coupon;
        if (applied && c && "error" in c) {
          setApplied(null);
          setCOpen(true);
          setCIn(applied);
          couponErr(c);
        }
        setStatus("idle");
      } else if (res.status === "invalid") {
        setServerErrs(res.errors);
        setStatus("idle");
        setFocusTick((t) => t + 1);
      } else if (res.status === "closed") {
        setStatus("closed");
      } else {
        setStatus("fail");
      }
    } catch {
      // No answer from the server: the order may or may not exist (ErrorCheckout #6).
      setStatus("uncertain");
    } finally {
      placing.current = false;
    }
  };

  const delText =
    calc || !totals
      ? ck.calc
      : totals.shippingFee === null
        ? ck.feeLater
        : formatTaka(totals.shippingFee);
  const totLabel = totals?.shippingFee == null ? ck.totNoFee : ck.totPay;
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
          <dt lang={lang}>{ck.subtotal}</dt>
          <dd>{formatTaka(t.subtotal)}</dd>
        </div>
        {t.discount > 0 && (
          <div className="disc">
            <dt lang={lang}>{ck.discount}</dt>
            <dd>−{formatTaka(t.discount)}</dd>
          </div>
        )}
        <div className={busyFee ? "busy" : undefined}>
          <dt lang={lang}>{ck.fee}</dt>
          <dd>{fee}</dd>
        </div>
        <div className="grand">
          <dt lang={lang}>{label}</dt>
          <dd>{formatTaka(t.total)}</dd>
        </div>
      </dl>
    ) : null;

  const itemList = (ls: CheckoutLine[], marks: boolean) => (
    <ul className="items" aria-label={ck.items}>
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
              <b>{nm(l)}</b>
              <span className="vr">
                {l.variantLabel || cartPrice.get(l.variantId)?.variantLabel} · {ck.qty} {l.quantity}{" "}
                × {moved && <span className="old">{formatTaka(was)}</span>}
                {formatTaka(l.available ? l.unitPrice : (was ?? 0))}
              </span>
              {isGone && (
                <span className="gt" lang={lang}>
                  {ck.lineGone}
                </span>
              )}
              {moved && (
                <span className="gt" lang={lang}>
                  {ck.linePrice}
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
          <b lang={lang}>{ck.priceTitle}</b>
          <span lang={lang}>{ck.priceText}</span>
        </div>
      )}
      {gone && (
        <div className="note" role="status">
          <b lang={lang}>{nothingLeft ? ck.allGoneTitle : ck.goneTitle}</b>
          <span lang={lang}>{nothingLeft ? ck.allGoneText : ck.goneText}</span>
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
          lang={lang}
        >
          {ck.promoAsk}
        </button>
      )}
      {cOpen && !applied && (
        <>
          <div className="cp-row">
            <label className="ak-field">
              <span lang={lang}>
                {ck.promo} <small>{ck.optional}</small>
              </span>
              <input
                className={`ak-input ${isCouponError(cStat) ? "is-error" : ""}`}
                type="text"
                autoComplete="off"
                placeholder={ck.promoPh}
                value={cIn}
                aria-invalid={isCouponError(cStat)}
                onChange={(e) => {
                  setCIn(e.target.value);
                  setCStat("idle");
                  setCOk(null);
                }}
              />
            </label>
            <button
              type="button"
              className="ak-btn ak-btn--line"
              onClick={() => void applyCoupon()}
              lang={lang}
            >
              {cStat === "applying" ? ck.checking : ck.apply}
            </button>
          </div>
          {isCouponError(cStat) && (
            <span className="ak-help is-error cp-err" role="alert" lang={lang}>
              {!cIn.trim()
                ? ck.promoEmpty
                : cStat === "min"
                  ? ck.coupon.min.replace("{amount}", formatTaka(cNeed))
                  : ck.coupon[cStat]}
            </span>
          )}
          {cStat === "checking" && (
            <span className="ak-help cp-err" role="status" lang={lang}>
              {ck.checking}
            </span>
          )}
          {cStat === "ok" && cOk && (
            <span className="ak-help cp-live" role="status" lang={lang}>
              {ck.promoOk(digitsFor(cOk))}
            </span>
          )}
        </>
      )}
      {applied && quote?.coupon && "label" in quote.coupon && (
        <div className="cp-ok" role="status">
          <span lang={lang}>{ck.promoApplied(applied, digitsFor(quote.coupon.label))}</span>
          <button type="button" onClick={removeCoupon} lang={lang}>
            {ck.remove}
          </button>
        </div>
      )}
    </>
  );

  // ErrorCheckout #3: the server answered that the order was not saved.
  // Owner decision (2026-11-14): with COD switched off in admin Settings, checkout takes no orders.
  // No artboard for this notice; it reuses the checkout's own error card.
  const closedCard = (
    <section className="ce" role="alert" aria-label={ck.closedLabel}>
      <h3 lang={lang}>{ck.closedTitle}</h3>
      <p lang={lang}>{ck.closedText}</p>
    </section>
  );

  const failCard = (
    <section className="ce" role="alert" aria-label={ck.failTitle}>
      <h3 lang={lang}>{ck.failTitle}</h3>
      <p lang={lang}>{ck.failText}</p>
      <ul className="known" aria-label={ck.known}>
        <li>
          <span className="m" aria-hidden="true">
            ✕
          </span>
          <span lang={lang}>
            <span className="sr">{ck.no}</span>
            {ck.notPlaced}
          </span>
        </li>
        <li>
          <span className="m" aria-hidden="true">
            ✕
          </span>
          <span lang={lang}>
            <span className="sr">{ck.no}</span>
            {ck.notPaid}
          </span>
        </li>
        <li>
          <span className="m y" aria-hidden="true">
            ✓
          </span>
          <span lang={lang}>
            <span className="sr">{ck.yes}</span>
            {ck.basketSafe}
          </span>
        </li>
      </ul>
      <div className="acts">
        <button
          type="button"
          className="ak-btn ak-btn--brand"
          onClick={() => void submit()}
          lang={lang}
        >
          {ck.retry}
        </button>
        <Link className="ak-btn ak-btn--line" href={href("/basket")} lang={lang}>
          {ck.backBasket}
        </Link>
      </div>
    </section>
  );

  // ErrorCheckout #6: no answer, so the order may exist. No resubmit button, on purpose.
  const unsureCard = (
    <section className="ce" role="alert" aria-label={ck.unsureTitle}>
      <h3 lang={lang}>{ck.unsureTitle}</h3>
      <p lang={lang}>{ck.unsureText}</p>
      <ul className="known" aria-label={ck.known}>
        <li>
          <span className="m q" aria-hidden="true">
            ?
          </span>
          <span lang={lang}>
            <span className="sr">{ck.unknown}</span>
            {ck.unsurePlaced}
          </span>
        </li>
        <li>
          <span className="m q" aria-hidden="true">
            ?
          </span>
          <span lang={lang}>
            <span className="sr">{ck.unknown}</span>
            {ck.unsurePaid}
          </span>
        </li>
      </ul>
      <div className="acts">
        <Link className="ak-btn ak-btn--brand" href={href(soon("/track"))} lang={lang}>
          {ck.checkStatus}
        </Link>
        <Link className="ak-btn ak-btn--line" href={href("/contact")} lang={lang}>
          {ck.support}
        </Link>
      </div>
      <p className="ce-note" lang={lang}>
        {ck.unsureNote}
      </p>
    </section>
  );

  // ErrorCheckout #1: a jar count is now more than the stock.
  const shortCard =
    short.length > 0 ? (
      <section className="ce" role="status" aria-label={ck.shortTitle}>
        <h3 lang={lang}>{ck.shortTitle}</h3>
        <p lang={lang}>{ck.shortText}</p>
        <ul className="chg" lang={lang}>
          {short.map((l) => (
            <li key={l.variantId}>
              <span>
                {nm(l)} · {ck.qty}
              </span>
              <span>
                <s>{ck.num(l.quantity)}</s> → {ck.num(l.stock)} {ck.inStock}
              </span>
            </li>
          ))}
        </ul>
        <div className="acts">
          <Link className="ak-btn ak-btn--brand" href={href("/basket")} lang={lang}>
            {ck.seeBasket}
          </Link>
          <button
            type="button"
            className="ak-btn ak-btn--line"
            onClick={() => short.forEach((l) => setQuantity(l.variantId, l.stock))}
            lang={lang}
          >
            {ck.shortOk}
          </button>
        </div>
      </section>
    ) : null;

  const loading = status === "loading";
  const canSubmit = status === "idle" && codEnabled;
  const placeBtn = loading ? (
    <button
      type="button"
      className="ak-btn ak-btn--sun place"
      disabled
      aria-busy="true"
      lang={lang}
    >
      <span className="spin" aria-hidden="true" />
      {ck.placing}
    </button>
  ) : canSubmit ? (
    // Everything in the basket is unavailable: nothing could be ordered, so the button says so
    // by being disabled (the note above explains) instead of doing nothing when pressed.
    <button
      type="button"
      className="ak-btn ak-btn--sun place"
      onClick={() => void submit()}
      disabled={nothingLeft}
      lang={lang}
    >
      {ck.place}
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
      <span lang={lang}>
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
              <h1 lang={lang}>{ck.okTitle}</h1>
              <p lang={lang}>{ck.okThanks(order.name)}</p>
              <div className="ordno">
                <span lang={lang}>{ck.orderNo}</span>
                <span>{order.orderNumber}</span>
              </div>
            </div>
            <section className="sec ok ok-gap" aria-label={ck.details}>
              <dl className="facts" lang={lang}>
                <div>
                  <dt>{ck.payment}</dt>
                  <dd>{ck.payTitle}</dd>
                </div>
                <div>
                  <dt>{ck.deliveryWord}</dt>
                  <dd>{ck.delivery[order.delivery].title}</dd>
                </div>
                <div className="wide">
                  <dt>{ck.address}</dt>
                  <dd lang="bn">{order.address}</dd>
                </div>
              </dl>
            </section>
            <section className="sec ok ok-gap2" aria-label={ck.summary}>
              {itemList(order.lines, false)}
              {totalsDl(order.totals, formatTaka(order.totals.shippingFee ?? 0), ck.totPay, false)}
            </section>
            <section className="sec ok ok-gap2 ok-next">
              <h2 lang={lang}>{ck.nextTitle}</h2>
              <ol className="steps">
                <li lang={lang}>{ck.payNotePlaced}</li>
                <li lang={lang}>{ck.nextContact}</li>
              </ol>
            </section>
            <div className="ok-acts">
              <Link className="ak-btn ak-btn--brand" href={href("/shop")} lang={lang}>
                {ck.keepShopping}
              </Link>
              <Link
                className="ak-btn ak-btn--line"
                href={href(`/track?order=${encodeURIComponent(order.orderNumber)}`)}
                lang={lang}
              >
                {ck.track}
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
            <h1 lang={lang}>{ck.title}</h1>
            <p lang={lang}>{ck.sub}</p>
          </div>
        </div>
        <div className="grid">
          <div className="body">
            <details className="sum only-mob" ref={sumRef}>
              {/* Mouse/tap toggles without focusing, so the keyboard focus ring only shows for keyboard users. */}
              <summary onMouseDown={(e) => e.preventDefault()}>
                <span>
                  <span lang={lang}>{ck.summary}</span>
                  <small lang={lang}>{ck.nItems(ck.num(count))}</small>
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
                <b lang={lang}>{ck.fixTitle(ck.num(shownCount))}</b>
                <span lang={lang}>{ck.fixText}</span>
              </div>
            )}
            <div className={loading ? "busyf" : undefined}>
              <section className="sec" aria-labelledby="s1">
                <div className="sec-h">
                  <span className="n" aria-hidden="true">
                    {ck.step[0]}
                  </span>
                  <h2 id="s1" lang={lang}>
                    {ck.s1}
                  </h2>
                </div>
                <p className="sec-sub" lang={lang}>
                  {ck.s1Sub}{" "}
                  <span className="req-note">
                    <span className="star">*</span>
                    {ck.reqNote}
                  </span>
                </p>
                <div className="fg">
                  {field("name", ck.name, {
                    req: true,
                    input: (
                      <input
                        {...inputProps("name", true)}
                        type="text"
                        autoComplete="name"
                        placeholder={ck.namePh}
                        onChange={(e) => set("name", e.target.value)}
                      />
                    ),
                  })}
                  {field("phone", ck.phone, {
                    req: true,
                    help: ck.phoneHelp,
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
                  {field("email", ck.email, {
                    small: ck.optional,
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
                    {ck.step[1]}
                  </span>
                  <h2 id="s2" lang={lang}>
                    {ck.s2}
                  </h2>
                </div>
                <p className="sec-sub" lang={lang}>
                  {ck.s2Sub}
                </p>
                <div className="fg">
                  {field("division", ck.division, {
                    req: true,
                    input: (
                      <Select
                        lang={lang}
                        required
                        label={ck.division}
                        invalid={!!show("division")}
                        describedBy={describedBy("division")}
                        value={v.division}
                        onChange={(x) => set("division", x)}
                        onBlur={() => blur("division")}
                        options={[
                          { value: "", label: ck.divisionPick },
                          ...DIVISIONS.map((d) => ({ value: d, label: placeName(d, lang) })),
                        ]}
                      />
                    ),
                  })}
                  {field("district", ck.district, {
                    req: true,
                    // The delivery zone follows the district (owner, 2026-11-22: no separate
                    // delivery-method step), so the field says which one applies and its fee.
                    ...(zone
                      ? { help: ck.zoneNote(ck.delivery[zone].title, formatTaka(fees[zone])) }
                      : {}),
                    input: (
                      <Select
                        lang={lang}
                        required
                        label={ck.district}
                        invalid={!!show("district")}
                        describedBy={describedBy("district", !!zone)}
                        value={v.district}
                        onChange={(x) => set("district", x)}
                        onBlur={() => blur("district")}
                        options={[
                          { value: "", label: v.division ? ck.districtPick : ck.districtFirst },
                          ...dists.map((d) => ({ value: d, label: placeName(d, lang) })),
                        ]}
                      />
                    ),
                  })}
                  {field("upazila", ck.upazila, {
                    req: true,
                    input: (
                      <Select
                        lang="bn"
                        required
                        label={ck.upazila}
                        invalid={!!show("upazila")}
                        describedBy={describedBy("upazila")}
                        value={v.upazila}
                        onChange={(x) => set("upazila", x)}
                        onBlur={() => blur("upazila")}
                        options={[
                          {
                            value: "",
                            label: v.district ? ck.upazilaPick : ck.upazilaFirst,
                          },
                          ...upas.map((d) => ({ value: d, label: placeName(d, lang) })),
                        ]}
                      />
                    ),
                  })}
                  {field("area", ck.area, {
                    small: ck.ifAny,
                    input: (
                      <input
                        {...inputProps("area")}
                        type="text"
                        autoComplete="address-level3"
                        placeholder={ck.areaPh}
                        onChange={(e) => set("area", e.target.value)}
                      />
                    ),
                  })}
                  {field("address", ck.addr, {
                    req: true,
                    full: true,
                    input: (
                      <textarea
                        {...inputProps("address", true)}
                        autoComplete="street-address"
                        placeholder={ck.addrPh}
                        onChange={(e) => set("address", e.target.value)}
                      />
                    ),
                  })}
                  {field("postal", ck.postal, {
                    small: ck.optional,
                    input: (
                      <input
                        {...inputProps("postal")}
                        type="text"
                        autoComplete="postal-code"
                        inputMode="numeric"
                        placeholder={ck.postalPh}
                        onChange={(e) => set("postal", e.target.value)}
                      />
                    ),
                  })}
                  <label className="ak-field full">
                    <span lang={lang}>
                      {ck.note} <small>{ck.optional}</small>
                    </span>
                    <textarea
                      className="ak-input"
                      placeholder={ck.notePh}
                      value={v.note}
                      onChange={(e) => set("note", e.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="sec" aria-labelledby="s4">
                <div className="sec-h">
                  <span className="n" aria-hidden="true">
                    {ck.step[2]}
                  </span>
                  <h2 id="s4" lang={lang}>
                    {ck.s4}
                  </h2>
                </div>
                <div className="opts" role="radiogroup" aria-label={ck.payGroup}>
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
                        <b lang={lang}>{ck.pay[p.key].title}</b>
                        <small lang={lang}>{ck.pay[p.key].sub}</small>
                      </span>
                      {p.off ? (
                        <span className="ph-chip" lang={lang}>
                          {ck.soon}
                        </span>
                      ) : (
                        <span />
                      )}
                    </button>
                  ))}
                </div>
                <p className="pay-note" lang={lang}>
                  {ck.pinNote}
                </p>
              </section>

              <section className="sec price-sec only-mob" aria-labelledby="s5">
                <div className="sec-h">
                  <span className="n" aria-hidden="true">
                    {ck.step[3]}
                  </span>
                  <h2 id="s5" lang={lang}>
                    {ck.s5}
                  </h2>
                </div>
                <div className="cp">{couponBlock}</div>
                {totalsDl()}
                <p className="pay-note" lang={lang}>
                  <b>
                    {ck.payTitle}
                    {ck.stop}
                  </b>{" "}
                  {ck.payNote}
                </p>
              </section>
            </div>
          </div>

          <aside className="aside only-desk" aria-label={ck.summary}>
            <div className="sec">
              <h2 lang={lang}>{ck.summary}</h2>
              {notices}
              {itemList(lines, true)}
              <div className="cp">{couponBlock}</div>
              {totalsDl()}
              <div className="place-w">
                {status === "fail" && failCard}
                {(!codEnabled || status === "closed") && closedCard}
                {status === "uncertain" && unsureCard}
                {placeBtn}
                <p className="pay-note" lang={lang}>
                  {loading ? (
                    ck.stay
                  ) : (
                    <>
                      <b>
                        {ck.payTitle}
                        {ck.stop}
                      </b>{" "}
                      {ck.payNote}
                    </>
                  )}
                </p>
              </div>
            </div>
          </aside>
        </div>
        <div className="bar only-mob" role="region" aria-label={ck.confirm}>
          {status === "fail" && failCard}
          {(!codEnabled || status === "closed") && closedCard}
          {status === "uncertain" && unsureCard}
          {(canSubmit || loading) && (
            <>
              <div className="t">
                <small lang={lang}>{ck.total}</small>
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
