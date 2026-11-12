"use client";

import { useId, useRef, useState, useTransition } from "react";
import { requestRestockAlert } from "@/app/actions/restock";

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

  if (state === "ok") {
    return (
      <p className="ak-help" role="status" lang="bn">
        ধন্যবাদ! স্টকে এলে আপনাকে জানাব।
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="ak-btn ak-btn--line"
        lang="bn"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => input.current?.focus());
        }}
      >
        স্টকে এলে জানান
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
        setError(res.message);
        input.current?.focus();
      } else {
        setState("fail");
      }
    });
  };

  return (
    <form className="rs-form" onSubmit={submit} noValidate>
      <label className="ak-field">
        <span lang="bn">
          মোবাইল নম্বর বা ইমেইল<em aria-hidden="true">*</em>
        </span>
        <input
          ref={input}
          className={`ak-input ${error ? "is-error" : ""}`}
          type="text"
          inputMode="email"
          autoComplete="email"
          autoFocus={startOpen}
          placeholder="01XXXXXXXXX বা name@example.com"
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
          <span id={`${id}-err`} className="ak-help is-error" role="alert" lang="bn">
            {error}
          </span>
        ) : null}
      </label>
      <button
        type="submit"
        className="ak-btn ak-btn--line"
        lang="bn"
        disabled={pending}
        aria-busy={pending || undefined}
      >
        {pending ? "জমা হচ্ছে…" : "জানাতে বলুন"}
      </button>
      {state === "fail" ? (
        // ErrorPatterns.dc.html §1, error level.
        <div className="alert" role="alert">
          <b lang="bn">কাজটি সম্পন্ন করা যায়নি</b>
          <span lang="bn">আপনার দেওয়া তথ্য রয়ে গেছে। আবার চেষ্টা করুন।</span>
        </div>
      ) : null}
    </form>
  );
}
