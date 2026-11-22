"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { trackLookupInput } from "@repo/validators";
import { lookupOrder } from "@/app/actions/track";
import { useLang } from "@/lib/i18n/lang-context";
import type { TrackedOrder } from "@/lib/track";
import { TrackResult } from "./track-result";

type Field = "order" | "contact";
type Errors = Partial<Record<Field, string>>;

const clientErrors = (v: Record<Field, string>): Errors => {
  const r = trackLookupInput.safeParse(v);
  const e: Errors = {};
  if (!r.success)
    for (const i of r.error.issues) {
      const k = i.path[0];
      if ((k === "order" || k === "contact") && !e[k]) e[k] = i.message;
    }
  return e;
};

/** Track.dc.html guest lookup card and its states (TrackStates.dc.html section 5). */
/** `initialOrder`: a valid order number from `?order=` (e.g. the checkout confirmation link). */
export function TrackView({ initialOrder = "" }: { initialOrder?: string }) {
  const { lang, t: all, href } = useLang();
  const t = all.track;
  const [v, setV] = useState<Record<Field, string>>({ order: initialOrder, contact: "" });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [sub, setSub] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<"idle" | "unverified" | "error">("idle");
  const [server, setServer] = useState<Errors>({});
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const orderRef = useRef<HTMLInputElement>(null);
  const contactRef = useRef<HTMLInputElement>(null);

  const errs = { ...clientErrors(v), ...server };
  // Schema messages are Bangla; the English site maps them (dict `track.err`).
  const show = (k: Field) => {
    const m = (touched[k] || sub) && errs[k];
    return m ? (t.err[m] ?? m) : "";
  };
  const shown = (["order", "contact"] as const).filter((k) => show(k)).length;

  const set = (k: Field, value: string) => {
    setV((p) => ({ ...p, [k]: value }));
    // Delete the key: an `undefined` value would mask the client error when merged into `errs`.
    setServer((p) =>
      k in p ? Object.fromEntries(Object.entries(p).filter(([key]) => key !== k)) : p,
    );
    if (outcome !== "idle") setOutcome("idle");
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSub(true);
    const e = clientErrors(v);
    if (e.order || e.contact) {
      (e.order ? orderRef : contactRef).current?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await lookupOrder(v);
      if (res.status === "ok") {
        setOrder(res.order);
        window.scrollTo({ top: 0 });
      } else if (res.status === "invalid") setServer(res.errors);
      else setOutcome(res.status);
    } catch {
      setOutcome("error");
    } finally {
      setBusy(false);
    }
  };

  const another = () => {
    setOrder(null);
    setV({ order: "", contact: "" });
    setTouched({});
    setSub(false);
    setOutcome("idle");
  };

  if (order) {
    return (
      <>
        <TrackResult order={order} fromAccount={false} lang={lang} />
        <button type="button" className="another" onClick={another} lang={lang}>
          {t.another}
        </button>
      </>
    );
  }

  const input = (k: Field) => ({
    className: show(k) ? "ak-input is-error" : "ak-input",
    value: v[k],
    "aria-required": true,
    "aria-invalid": !!show(k),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value),
    onBlur: () => setTouched((p) => ({ ...p, [k]: true })),
  });

  return (
    <div className="tk-card">
      <form className="tk-form" aria-label={t.form} noValidate onSubmit={submit}>
        {outcome === "unverified" && (
          <div className="alert" role="alert">
            <b lang={lang}>{t.noMatchTitle}</b>
            <span lang={lang}>{t.noMatchText}</span>
          </div>
        )}
        {outcome === "error" && (
          <div className="alert" role="alert">
            <b lang={lang}>{t.failTitle}</b>
            <span lang={lang}>{t.failText}</span>
          </div>
        )}
        {sub && shown > 1 && (
          <div className="alert" role="alert">
            <b lang={lang}>{t.fixTitle(shown)}</b>
            <span lang={lang}>{t.fixText}</span>
          </div>
        )}
        <div className="fld">
          <label htmlFor="t-no" lang={lang}>
            {t.orderNo}
            <em aria-hidden="true">*</em>
          </label>
          <input
            id="t-no"
            ref={orderRef}
            type="text"
            autoComplete="off"
            placeholder="AK-261108-123456"
            {...input("order")}
          />
          <span className="ak-help" lang={lang}>
            {t.orderHelp}
          </span>
          {show("order") && (
            <span className="ak-help is-error" role="alert" lang={lang}>
              {show("order")}
            </span>
          )}
        </div>
        <div className="fld">
          <label htmlFor="t-ct" lang={lang}>
            {t.contact}
            <em aria-hidden="true">*</em>
          </label>
          <input
            id="t-ct"
            ref={contactRef}
            type="text"
            autoComplete="email"
            placeholder={t.contactPh}
            {...input("contact")}
          />
          <span className="ak-help" lang={lang}>
            {t.contactHelp}
          </span>
          {show("contact") && (
            <span className="ak-help is-error" role="alert" lang={lang}>
              {show("contact")}
            </span>
          )}
        </div>
        {busy ? (
          <button
            type="button"
            className="ak-btn ak-btn--brand tk-go"
            disabled
            aria-busy="true"
            lang={lang}
          >
            <span className="spin" aria-hidden="true" />
            {t.searching}
          </button>
        ) : (
          <button type="submit" className="ak-btn ak-btn--brand tk-go" lang={lang}>
            {t.find}
          </button>
        )}
        <p className="tk-priv" lang={lang}>
          {t.privA}
          <Link href={href("/account/orders")}>{t.privLink}</Link>
          {t.privB}
        </p>
      </form>
    </div>
  );
}
