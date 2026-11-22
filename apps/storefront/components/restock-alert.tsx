"use client";

import { useId, useRef, useState, useTransition } from "react";
import { requestRestockAlert } from "@/app/actions/restock";
import { useLang } from "@/lib/i18n/lang-context";

/**
 * "স্টকে এলে জানান" inside the out-of-stock box (Product.dc.html, ProductStates.dc.html C).
 * The board draws only the button; the form behind it is the owner's choice: one field that
 * takes a mobile number or an email.
 */
export function RestockAlert({
  variantId,
  startOpen = false,
}: {
  variantId: number;
  startOpen?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(startOpen);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const [pending, start] = useTransition();
  const { lang, t: all } = useLang();
  const t = all.restock;

  if (state === "ok") {
    return (
      <p className="ak-help" role="status" lang={lang}>
        {t.done}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="ak-btn ak-btn--line"
        lang={lang}
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => input.current?.focus());
        }}
      >
        {t.open}
      </button>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      setState("idle");
      const res = await requestRestockAlert({ variantId, contact: value }).catch(
        () => ({ status: "fail" }) as const,
      );
      if (res.status === "ok") {
        setError("");
        setState("ok");
      } else if (res.status === "invalid") {
        // The server's message is Bangla; show the page language's own.
        setError(lang === "bn" ? res.message : t.invalid);
        input.current?.focus();
      } else {
        setState("fail");
      }
    });
  };

  return (
    <form className="rs-form" onSubmit={submit} noValidate lang={lang}>
      <label className="ak-field">
        <span>
          {t.field}
          <em aria-hidden="true">*</em>
        </span>
        <input
          ref={input}
          className={`ak-input ${error ? "is-error" : ""}`}
          type="text"
          inputMode="email"
          autoComplete="email"
          autoFocus={startOpen}
          placeholder={t.placeholder}
          value={value}
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
        />
        {error ? (
          <span id={`${id}-err`} className="ak-help is-error" role="alert">
            {error}
          </span>
        ) : null}
      </label>
      <button
        type="submit"
        className="ak-btn ak-btn--line"
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {pending ? t.sending : t.submit}
      </button>
      {state === "fail" ? (
        // ErrorPatterns.dc.html §1, error level.
        <div className="alert" role="alert">
          <b>{t.failTitle}</b>
          <span>{t.failText}</span>
        </div>
      ) : null}
    </form>
  );
}
