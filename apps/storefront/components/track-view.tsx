"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { trackLookupInput } from "@repo/validators";
import { lookupOrder } from "@/app/actions/track";
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
  const show = (k: Field) => ((touched[k] || sub) && errs[k] ? errs[k] : "");
  const shown = (["order", "contact"] as const).filter((k) => show(k)).length;

  const set = (k: Field, value: string) => {
    setV((p) => ({ ...p, [k]: value }));
    setServer((p) => ({ ...p, [k]: undefined }));
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
        <TrackResult order={order} fromAccount={false} />
        <button type="button" className="another" onClick={another} lang="bn">
          অন্য অর্ডার খুঁজুন
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
      <form className="tk-form" aria-label="অর্ডার খুঁজুন" noValidate onSubmit={submit}>
        {outcome === "unverified" && (
          <div className="alert" role="alert">
            <b lang="bn">তথ্য মেলানো যায়নি</b>
            <span lang="bn">
              এই তথ্য দিয়ে কোনো অর্ডার যাচাই করা গেল না। অর্ডার নম্বর এবং চেকআউটে দেওয়া ইমেইল বা
              মোবাইল নম্বর আবার দেখে নিন। সমস্যা থাকলে আমাদের জানান।
            </span>
          </div>
        )}
        {outcome === "error" && (
          <div className="alert" role="alert">
            <b lang="bn">ফর্মটি জমা দেওয়া যায়নি</b>
            <span lang="bn">সংযোগে সমস্যা হয়েছে। আপনার লেখা সব ঠিকই আছে, আবার চেষ্টা করুন।</span>
          </div>
        )}
        {sub && shown > 1 && (
          <div className="alert" role="alert">
            <b lang="bn">{shown}টি ঘর ঠিক করতে হবে</b>
            <span lang="bn">লাল চিহ্নিত ঘরগুলো দেখুন।</span>
          </div>
        )}
        <div className="fld">
          <label htmlFor="t-no" lang="bn">
            অর্ডার নম্বর<em aria-hidden="true">*</em>
          </label>
          <input
            id="t-no"
            ref={orderRef}
            type="text"
            autoComplete="off"
            placeholder="AK-261108-123456"
            {...input("order")}
          />
          <span className="ak-help" lang="bn">
            নিশ্চিতকরণের বার্তা বা ইমেইলে অর্ডার নম্বর পাবেন। উদাহরণ: AK-261108-123456
          </span>
          {show("order") && (
            <span className="ak-help is-error" role="alert" lang="bn">
              {show("order")}
            </span>
          )}
        </div>
        <div className="fld">
          <label htmlFor="t-ct" lang="bn">
            ইমেইল অথবা মোবাইল নম্বর<em aria-hidden="true">*</em>
          </label>
          <input
            id="t-ct"
            ref={contactRef}
            type="text"
            autoComplete="email"
            placeholder="you@example.com বা 01XXXXXXXXX"
            {...input("contact")}
          />
          <span className="ak-help" lang="bn">
            অর্ডার দেওয়ার সময় যেটি দিয়েছিলেন সেটিই লিখুন।
          </span>
          {show("contact") && (
            <span className="ak-help is-error" role="alert" lang="bn">
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
            lang="bn"
          >
            <span className="spin" aria-hidden="true" />
            খোঁজা হচ্ছে…
          </button>
        ) : (
          <button type="submit" className="ak-btn ak-btn--brand tk-go" lang="bn">
            অর্ডার খুঁজুন
          </button>
        )}
        <p className="tk-priv" lang="bn">
          নিরাপত্তার জন্য শুধু অর্ডার নম্বর দিয়ে কোনো তথ্য দেখানো হয় না। অ্যাকাউন্ট থাকলে{" "}
          <Link href={"/account/orders" as never}>আমার অর্ডার</Link> থেকেও দেখতে পারেন।
        </p>
      </form>
    </div>
  );
}
