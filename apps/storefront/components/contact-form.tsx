"use client";

import Link from "next/link";
import { contactInput } from "@repo/validators";
import { useActionState, useState } from "react";
import { sendContactMessage, type ContactField, type ContactState } from "@/app/actions/contact";
import { shopHref } from "@/lib/routes";
import { useLang } from "@/lib/i18n/lang-context";
import type { Dict } from "@/lib/i18n/dict";
import { Icon } from "./icon";
import { Select } from "./select";

const subjects = (t: Dict["contact"]) =>
  [
    ["", t.pick],
    ["order", t.sOrder],
    ["delivery", t.sDelivery],
    ["product", t.sProduct],
    ["refund", t.sRefund],
    ["feedback", t.sFeedback],
    ["other", t.sOther],
  ] as const;

const initialState: ContactState = {
  status: "idle",
  errors: {},
  values: { name: "", email: "", phone: "", subject: "", message: "" },
};

/** Contact form from the design: inline errors, summary, loading, success and failure states. */
export function ContactForm({ whatsapp }: { whatsapp: string }) {
  const { lang, t: all, href } = useLang();
  const t = all.contact;
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
    Object.entries(merged)
      .filter((e): e is [ContactField, string] => !!e[1])
      // Schema messages are Bangla; the English site maps them (dict `contact.err`).
      .map(([k, m]) => [k, t.err[m] ?? m]),
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
          <h2 lang={lang}>{t.okTitle}</h2>
          <p lang={lang}>{t.okText}</p>
          <div className="row">
            <button
              type="button"
              className="ak-btn ak-btn--line"
              style={{ minHeight: 48 }}
              lang={lang}
              onClick={() => {
                setDismissed(state);
                setRound((r) => r + 1);
              }}
            >
              {t.another}
            </button>
            <Link className="ak-btn ak-btn--text" href={href(shopHref())} lang={lang}>
              {t.shelves}
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
      <h2 className="ct-h2" lang={lang}>
        {t.formTitle}
      </h2>
      {state.status === "fail" ? (
        <div className="fail" role="alert">
          <b lang={lang}>{t.failTitle}</b>
          <p lang={lang}>{t.failText}</p>
          <div className="row">
            <button
              type="submit"
              form="contact-form"
              className="ak-btn ak-btn--brand"
              style={{ minHeight: 46 }}
              disabled={pending}
              lang={lang}
            >
              {t.retry}
            </button>
            <a className="ak-btn ak-btn--text" href={whatsapp} lang={lang}>
              {t.whatsapp}
            </a>
          </div>
        </div>
      ) : null}
      {state.status === "invalid" && errorCount > 0 ? (
        <div className="summary" role="alert" lang={lang}>
          {t.fix(errorCount)}
        </div>
      ) : null}
      <form id="contact-form" key={round} action={action} noValidate>
        <div className={`fgrid ${pending ? "busy" : ""}`}>
          <label className="ak-field">
            <span lang={lang}>
              {t.name}
              <em aria-hidden="true">*</em>
            </span>
            <input
              className={cls("name")}
              name="name"
              type="text"
              autoComplete="name"
              placeholder={t.namePh}
              defaultValue={state.values.name}
              aria-required="true"
              aria-invalid={invalid("name")}
              onBlur={(e) => check("name", e.target.value)}
            />
            {err("name")}
          </label>
          <label className="ak-field">
            <span lang={lang}>
              {t.email}
              <em aria-hidden="true">*</em>
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
            <span lang={lang}>
              {t.phone}
              <small>{t.optional}</small>
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
            <span lang={lang}>
              {t.subject}
              <em aria-hidden="true">*</em>
            </span>
            <Select
              name="subject"
              label={t.subject}
              options={subjects(t).map(([value, label]) => ({ value, label }))}
              defaultValue={state.values.subject}
              invalid={Boolean(field("subject"))}
              onChange={(v) => check("subject", v)}
              required
              lang={lang}
            />
            {err("subject")}
          </label>
          <label className="ak-field full">
            <span lang={lang}>
              {t.message}
              <em aria-hidden="true">*</em>
            </span>
            <textarea
              className={cls("message")}
              name="message"
              placeholder={t.messagePh}
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
          <span className="req-note" lang={lang}>
            <span style={{ color: "var(--error)" }}>*</span> {t.req}
          </span>
          {pending ? (
            <button
              type="submit"
              className="ak-btn ak-btn--brand"
              disabled
              aria-busy="true"
              lang={lang}
            >
              <span className="spin" aria-hidden="true" />
              {t.sending}
            </button>
          ) : (
            <button type="submit" className="ak-btn ak-btn--brand" lang={lang}>
              {t.send}{" "}
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
