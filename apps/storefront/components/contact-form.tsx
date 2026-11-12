"use client";

import Link from "next/link";
import { contactInput } from "@repo/validators";
import { useActionState, useState } from "react";
import { sendContactMessage, type ContactField, type ContactState } from "@/app/contact/actions";
import { shopHref } from "@/lib/routes";
import { Icon } from "./icon";
import { Select } from "./select";

const SUBJECTS = [
  ["", "বিষয় বেছে নিন"],
  ["order", "অর্ডার নিয়ে"],
  ["delivery", "ডেলিভারি নিয়ে"],
  ["product", "পণ্য নিয়ে প্রশ্ন"],
  ["refund", "রিটার্ন বা রিফান্ড"],
  ["feedback", "মতামত বা পরামর্শ"],
  ["other", "অন্যান্য"],
] as const;

const initialState: ContactState = {
  status: "idle",
  errors: {},
  values: { name: "", email: "", phone: "", subject: "", message: "" },
};

/** Contact form from the design: inline errors, summary, loading, success and failure states. */
export function ContactForm({ whatsapp }: { whatsapp: string }) {
  const [state, action, pending] = useActionState(sendContactMessage, initialState);
  // After a success the visitor can dismiss the panel to write another message.
  const [dismissed, setDismissed] = useState<ContactState | null>(null);
  const [round, setRound] = useState(0);
  // Contact.dc.html checks a field when it is left, as well as on submit. These checks apply to
  // the current server result only; the next submit replaces them.
  const [live, setLive] = useState<{
    for: ContactState;
    errs: Partial<Record<ContactField, string | null>>;
  }>({ for: state, errs: {} });
  const liveErrs = live.for === state ? live.errs : {};
  const check = (key: ContactField, value: string) => {
    const r = contactInput.shape[key].safeParse(value);
    const msg = r.success ? null : (r.error.issues[0]?.message ?? null);
    setLive({ for: state, errs: { ...liveErrs, [key]: msg } });
  };
  const merged: Partial<Record<ContactField, string | null>> = { ...state.errors, ...liveErrs };
  const errors = Object.fromEntries(
    Object.entries(merged).filter((e): e is [ContactField, string] => !!e[1]),
  ) as Partial<Record<ContactField, string>>;
  const errorCount = Object.keys(errors).length;

  if (state.status === "ok" && dismissed !== state) {
    return (
      <div className="fcard ct-card">
        <div className="ok" role="status">
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
          <h2 lang="bn">বার্তাটি পাঠানো হয়েছে</h2>
          <p lang="bn">আপনার বার্তাটি আমাদের কাছে পৌঁছেছে। ধন্যবাদ।</p>
          <div className="row">
            <button
              type="button"
              className="ak-btn ak-btn--line"
              style={{ minHeight: 48 }}
              lang="bn"
              onClick={() => {
                setDismissed(state);
                setRound((r) => r + 1);
              }}
            >
              আরেকটি বার্তা লিখুন
            </button>
            <Link className="ak-btn ak-btn--text" href={shopHref()} lang="bn">
              আচারের তাক দেখুন
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const field = (key: ContactField) => errors[key];
  const invalid = (key: ContactField) => (field(key) ? "true" : "false");
  const cls = (key: ContactField) => `ak-input ${field(key) ? "is-error" : ""}`;
  const err = (key: ContactField) => (
    // A fixed slot under every field, so an error never shifts the field beside it.
    <span className="ct-err">
      {field(key) ? (
        <span className="ak-help is-error" role="alert">
          {field(key)}
        </span>
      ) : null}
    </span>
  );

  return (
    <div className="fcard ct-card">
      <h2 className="ct-h2" lang="bn">
        বার্তা পাঠান
      </h2>
      {state.status === "fail" ? (
        <div className="fail" role="alert">
          <b lang="bn">বার্তাটি পাঠানো যায়নি।</b>
          <p lang="bn">
            ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন। আপনার লেখা বার্তা এখানেই আছে। চাইলে সরাসরি
            WhatsApp-এও লিখতে পারেন।
          </p>
          <div className="row">
            <button
              type="submit"
              form="contact-form"
              className="ak-btn ak-btn--brand"
              style={{ minHeight: 46 }}
              disabled={pending}
              lang="bn"
            >
              আবার চেষ্টা করুন
            </button>
            <a className="ak-btn ak-btn--text" href={whatsapp} lang="bn">
              WhatsApp-এ লিখুন
            </a>
          </div>
        </div>
      ) : null}
      {state.status === "invalid" && errorCount > 0 ? (
        <div className="summary" role="alert" lang="bn">
          {errorCount}টি ঘর ঠিক করতে হবে। নিচে লাল চিহ্নিত ঘরগুলো দেখুন।
        </div>
      ) : null}
      <form id="contact-form" key={round} action={action} noValidate>
        <div className={`fgrid ${pending ? "busy" : ""}`}>
          <label className="ak-field">
            <span lang="bn">
              নাম<em aria-hidden="true">*</em>
            </span>
            <input
              className={cls("name")}
              name="name"
              type="text"
              autoComplete="name"
              placeholder="আপনার নাম"
              defaultValue={state.values.name}
              aria-required="true"
              aria-invalid={invalid("name")}
              onBlur={(e) => check("name", e.target.value)}
            />
            {err("name")}
          </label>
          <label className="ak-field">
            <span lang="bn">
              ইমেইল<em aria-hidden="true">*</em>
            </span>
            <input
              className={cls("email")}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              defaultValue={state.values.email}
              aria-required="true"
              aria-invalid={invalid("email")}
              onBlur={(e) => check("email", e.target.value)}
            />
            {err("email")}
          </label>
          <label className="ak-field">
            <span lang="bn">
              ফোন নম্বর<small>ঐচ্ছিক</small>
            </span>
            <input
              className={cls("phone")}
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              defaultValue={state.values.phone}
              aria-invalid={invalid("phone")}
              onBlur={(e) => check("phone", e.target.value)}
            />
            {err("phone")}
          </label>
          <label className="ak-field">
            <span lang="bn">
              বিষয়<em aria-hidden="true">*</em>
            </span>
            <Select
              name="subject"
              label="বিষয়"
              options={SUBJECTS.map(([value, label]) => ({ value, label }))}
              defaultValue={state.values.subject}
              invalid={Boolean(field("subject"))}
              onChange={(v) => check("subject", v)}
              required
              lang="bn"
            />
            {err("subject")}
          </label>
          <label className="ak-field full">
            <span lang="bn">
              আপনার বার্তা<em aria-hidden="true">*</em>
            </span>
            <textarea
              className={cls("message")}
              name="message"
              placeholder="যা জানতে চান বা বলতে চান, লিখে ফেলুন"
              defaultValue={state.values.message}
              aria-required="true"
              aria-invalid={invalid("message")}
              onBlur={(e) => check("message", e.target.value)}
            />
            {err("message")}
          </label>
          {/* Honeypot: hidden from people, tempting to bots. */}
          <div
            aria-hidden="true"
            style={{ position: "absolute", left: -9999, width: 1, height: 1, overflow: "hidden" }}
          >
            <label>
              Website
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
        </div>
        <div className="send">
          <span className="req-note" lang="bn">
            <span style={{ color: "var(--error)" }}>*</span> চিহ্নিত ঘরগুলো আবশ্যক
          </span>
          {pending ? (
            <button
              type="submit"
              className="ak-btn ak-btn--brand"
              disabled
              aria-busy="true"
              lang="bn"
            >
              <span className="spin" aria-hidden="true" />
              পাঠানো হচ্ছে…
            </button>
          ) : (
            <button type="submit" className="ak-btn ak-btn--brand" lang="bn">
              বার্তা পাঠান{" "}
              <span className="ak-ico">
                <Icon name="arrow" />
              </span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
