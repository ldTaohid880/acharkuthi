"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/app/actions/newsletter";

const initial: NewsletterState = { status: "idle", message: "", email: "" };

/** Footer newsletter form, as drawn in the design. */
export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribeToNewsletter, initial);
  const failed = state.status === "invalid" || state.status === "fail";
  return (
    <form className="nf" aria-label="Newsletter" action={action} noValidate>
      <label className="ak-field">
        <span>Email</span>
        <input
          className={`ak-input ${failed ? "is-error" : ""}`}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.email}
          aria-invalid={failed}
          aria-describedby={state.message ? "nl-msg" : undefined}
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
        <span className={pending ? "off" : undefined}>Subscribe</span>
        <span className={pending ? undefined : "off"} aria-hidden={!pending}>
          <span className="spin" aria-hidden="true" />
          Subscribing…
        </span>
      </button>
      {state.message ? (
        <p
          id="nl-msg"
          className={`nl-msg ${failed ? "is-error" : ""}`}
          role={failed ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
