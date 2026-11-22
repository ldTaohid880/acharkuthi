"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/app/actions/newsletter";
import { useLang } from "@/lib/i18n/lang-context";

const initial: NewsletterState = { status: "idle", message: "", email: "" };

/** Footer newsletter form, as drawn in the design. */
export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initial);
  const t = useLang().t.newsletter;
  const failed = state.status === "invalid" || state.status === "fail";
  // The message follows the result's status in the page language, not the server's text.
  const message = state.status === "idle" ? "" : t[state.status];
  return (
    <form className="nf" aria-label={t.label} action={action} noValidate>
      <label className="ak-field">
        <span>{t.email}</span>
        <input
          className={`ak-input ${failed ? "is-error" : ""}`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.email}
          aria-invalid={failed}
          aria-describedby={message ? "nl-msg" : undefined}
        />
      </label>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="nl-hp"
      />
      <button
        type="submit"
        style={{ minHeight: 48 }}
        className="ak-btn ak-btn--brand nf-btn"
        disabled={pending}
        aria-busy={pending}
      >
        {/* ErrorPatterns "Action processing": the label changes, the width does not. */}
        <span className={pending ? "off" : undefined}>{t.subscribe}</span>
        <span className={pending ? undefined : "off"} aria-hidden={!pending}>
          <span className="spin" aria-hidden="true" />
          {t.subscribing}
        </span>
      </button>
      {message ? (
        <p
          id="nl-msg"
          className={`nl-msg ${failed ? "is-error" : ""}`}
          role={failed ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
