"use client";

import { authClient, signIn, signUp } from "@repo/auth/client";
import {
  authForgotForm,
  authLoginForm,
  authPasswordRules,
  authRegisterForm,
} from "@repo/validators";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GoogleButton } from "./google-button";

export type AuthMode = "login" | "register" | "forgot";
type Field = "name" | "email" | "password" | "confirm";
type Status = "idle" | "loading" | "success" | "bad";

const EMPTY: Record<Field, string> = { name: "", email: "", password: "", confirm: "" };
const SCHEMA = { login: authLoginForm, register: authRegisterForm, forgot: authForgotForm };

function fieldErrors(mode: AuthMode, f: Record<Field, string>): Partial<Record<Field, string>> {
  const r = SCHEMA[mode].safeParse(f);
  const out: Partial<Record<Field, string>> = {};
  if (r.success) return out;
  for (const issue of r.error.issues) {
    const k = issue.path[0] as Field;
    out[k] ??= issue.message;
  }
  return out;
}

function Tick() {
  return (
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
  );
}

export function AuthView({ initialMode, next }: { initialMode: AuthMode; next: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [f, setF] = useState(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [show, setShow] = useState<Partial<Record<Field, boolean>>>({});
  const [sub, setSub] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [doneName, setDoneName] = useState("");

  const errs = fieldErrors(mode, f);
  const shown = (k: Field) => ((touched[k] ?? sub) && errs[k] ? errs[k] : "");
  const nShown = (Object.keys(errs) as Field[]).filter((k) => shown(k)).length;
  const loading = status === "loading";

  function go(m: AuthMode) {
    setMode(m);
    setTouched({});
    setSub(false);
    setStatus("idle");
    setShow({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSub(true);
    if (Object.keys(errs).length) {
      // ErrorPatterns: focus moves to the first invalid field once the errors render.
      const form = e.currentTarget;
      requestAnimationFrame(() =>
        form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setStatus("loading");
    if (mode === "login") {
      const v = authLoginForm.parse(f);
      const { error } = await signIn.email({ email: v.email, password: v.password });
      if (error) return setStatus("bad");
    } else if (mode === "register") {
      const v = authRegisterForm.parse(f);
      const { error } = await signUp.email({ name: v.name, email: v.email, password: v.password });
      if (error) return setStatus(error.code?.startsWith("USER_ALREADY_EXISTS") ? "bad" : "idle");
      setDoneName(v.name);
    } else {
      const v = authForgotForm.parse(f);
      const { error } = await authClient.requestPasswordReset({
        email: v.email,
        redirectTo: "/login",
      });
      return setStatus(error ? "bad" : "success");
    }
    if (next) {
      router.replace(next as Route);
      router.refresh();
      return;
    }
    router.refresh();
    setStatus("success");
  }

  const input = (k: Field) => ({
    value: f[k],
    "aria-required": true as const,
    "aria-invalid": shown(k) ? true : undefined,
    className: `ak-input${shown(k) ? " is-error" : ""}`,
    onChange: (ev: React.ChangeEvent<HTMLInputElement>) => {
      setF({ ...f, [k]: ev.target.value });
      if (status === "bad") setStatus("idle");
    },
    onBlur: () => setTouched({ ...touched, [k]: true }),
  });
  const err = (k: Field) =>
    shown(k) ? (
      <span className="ak-help is-error" role="alert">
        {shown(k)}
      </span>
    ) : null;
  const pw = (k: Field, id: string, label: string, ac: string, ph: string) => (
    <div className="fld">
      <label htmlFor={id} lang="bn">
        {label}
        <em aria-hidden="true">*</em>
      </label>
      <div className="pw">
        <input
          id={id}
          type={show[k] ? "text" : "password"}
          autoComplete={ac}
          placeholder={ph}
          {...input(k)}
        />
        <button
          type="button"
          className="eye"
          aria-label={show[k] ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}
          aria-pressed={!!show[k]}
          onClick={() => setShow({ ...show, [k]: !show[k] })}
          lang="bn"
        >
          {show[k] ? "লুকান" : "দেখান"}
        </button>
      </div>
      {err(k)}
    </div>
  );
  const email = (id: string) => (
    <div className="fld">
      <label htmlFor={id} lang="bn">
        ইমেইল<em aria-hidden="true">*</em>
      </label>
      <input
        id={id}
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        {...input("email")}
      />
      {err("email")}
    </div>
  );
  const summary =
    sub && nShown > 1 ? (
      <div className="alert" role="alert">
        <b lang="bn">{nShown}টি ঘর ঠিক করতে হবে</b>
        <span lang="bn">লাল চিহ্নিত ঘরগুলো দেখুন।</span>
      </div>
    ) : null;
  const sbtn = (idle: string, busy: string) =>
    loading ? (
      <button
        type="submit"
        className="ak-btn ak-btn--brand sbtn"
        disabled
        aria-busy="true"
        lang="bn"
      >
        <span className="spin" aria-hidden="true" />
        {busy}
      </button>
    ) : (
      <button type="submit" className="ak-btn ak-btn--brand sbtn" lang="bn">
        {idle}
      </button>
    );
  const google = <GoogleButton callbackURL={next ?? "/account"} />;

  if (status === "success" && mode === "login")
    return (
      <div className="done" role="status">
        <Tick />
        <h2 lang="bn">সাইন ইন হয়েছে</h2>
        <p lang="bn">স্বাগতম! এবার আপনি আপনার অ্যাকাউন্ট দেখতে বা কেনাকাটা চালিয়ে যেতে পারেন।</p>
        <div className="acts">
          <Link className="ak-btn ak-btn--brand" href="/account" lang="bn">
            আমার অ্যাকাউন্টে যান
          </Link>
          <Link className="ak-btn ak-btn--line" href="/shop" lang="bn">
            কেনাকাটা চালিয়ে যান
          </Link>
        </div>
      </div>
    );
  if (status === "success" && mode === "register")
    return (
      <div className="done" role="status">
        <Tick />
        <h2 lang="bn">আপনার অ্যাকাউন্ট তৈরি হয়েছে</h2>
        <p lang="bn">স্বাগতম, {doneName}। এখন থেকে অর্ডার ও ঠিকানা এক জায়গায় দেখতে পারবেন।</p>
        <div className="acts">
          <Link className="ak-btn ak-btn--brand" href="/shop" lang="bn">
            কেনাকাটা শুরু করুন
          </Link>
          <Link className="ak-btn ak-btn--line" href="/account" lang="bn">
            আমার অ্যাকাউন্টে যান
          </Link>
        </div>
      </div>
    );
  if (status === "success")
    return (
      <div className="done" role="status">
        <Tick />
        <h2 lang="bn">ইমেইল দেখুন</h2>
        <p lang="bn">
          এই ইমেইলে অ্যাকাউন্ট থাকলে রিসেট করার লিংক পাঠানো হয়েছে। না পেলে স্প্যাম ফোল্ডার দেখুন।
        </p>
        <div className="acts">
          <button
            type="button"
            className="ak-btn ak-btn--line"
            onClick={() => go("login")}
            lang="bn"
          >
            সাইন ইনে ফিরে যান
          </button>
        </div>
      </div>
    );

  if (mode === "forgot")
    return (
      <div>
        <h1 className="h1a" lang="bn">
          পাসওয়ার্ড ভুলে গেছেন?
        </h1>
        <p className="sub" lang="bn">
          আপনার ইমেইলটি লিখুন। রিসেট করার একটি লিংক পাঠানো হবে।
        </p>
        {status === "bad" ? (
          <div className="alert" role="alert">
            <b lang="bn">লিংকটি পাঠানো যায়নি</b>
            <span lang="bn">
              ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন। আপনার লেখা ইমেইল এখানেই আছে।
            </span>
          </div>
        ) : null}
        <form className="form" style={{ marginTop: 24 }} onSubmit={submit} noValidate>
          {email("a-f-em")}
          {sbtn("রিসেট লিংক পাঠান", "পাঠানো হচ্ছে…")}
        </form>
        <p className="swap">
          <button type="button" className="lk" onClick={() => go("login")} lang="bn">
            সাইন ইনে ফিরে যান
          </button>
        </p>
      </div>
    );

  if (mode === "register")
    return (
      <div>
        <h1 className="h1a" lang="bn">
          নতুন অ্যাকাউন্ট খুলুন
        </h1>
        <p className="sub" lang="bn">
          নাম, ইমেইল আর একটি পাসওয়ার্ড, এটুকুই। ঠিকানা পরে অর্ডারের সময় দিলেই হবে।
        </p>
        <div style={{ marginTop: 24 }}>
          {google}
          <p className="ak-help" style={{ textAlign: "center" }} lang="bn">
            Google দিয়ে প্রথমবার সাইন ইন করলে আলাদা ফর্ম পূরণ করতে হয় না।
          </p>
        </div>
        <div className="or" lang="bn">
          অথবা ইমেইল দিয়ে
        </div>
        {status === "bad" ? (
          <div className="alert" role="alert" style={{ margin: "0 0 16px" }}>
            <b lang="bn">এই ইমেইলে আগেই অ্যাকাউন্ট আছে</b>
            <span lang="bn">
              নতুন করে না খুলে সাইন ইন করুন।{" "}
              <button type="button" className="lk" onClick={() => go("login")}>
                সাইন ইন করুন
              </button>
            </span>
          </div>
        ) : null}
        {summary}
        <form className="form" onSubmit={submit} noValidate>
          <div className="fld">
            <label htmlFor="a-r-nm" lang="bn">
              আপনার নাম<em aria-hidden="true">*</em>
            </label>
            <input
              id="a-r-nm"
              type="text"
              autoComplete="name"
              placeholder="পুরো নাম"
              {...input("name")}
            />
            {err("name")}
          </div>
          {email("a-r-em")}
          <div>
            {pw("password", "a-r-pw", "পাসওয়ার্ড", "new-password", "নতুন পাসওয়ার্ড")}
            <ul className="rules" aria-label="পাসওয়ার্ডের শর্ত" lang="bn">
              <li className={authPasswordRules.length(f.password) ? "ok" : ""}>
                কমপক্ষে ৮টি অক্ষর
              </li>
              <li className={authPasswordRules.mix(f.password) ? "ok" : ""}>
                অন্তত একটি অক্ষর ও একটি সংখ্যা
              </li>
            </ul>
          </div>
          {pw("confirm", "a-r-cf", "পাসওয়ার্ড আবার লিখুন", "new-password", "আবার একই পাসওয়ার্ড")}
          {sbtn("অ্যাকাউন্ট খুলুন", "অ্যাকাউন্ট তৈরি হচ্ছে…")}
        </form>
        <p className="swap" lang="bn">
          আগে থেকেই অ্যাকাউন্ট আছে?{" "}
          <button type="button" className="lk" onClick={() => go("login")}>
            সাইন ইন
          </button>
        </p>
      </div>
    );

  return (
    <div>
      <h1 className="h1a" lang="bn">
        স্বাগতম, আবার দেখা হলো
      </h1>
      <p className="sub" lang="bn">
        সাইন ইন করে আপনার অর্ডার ও ঠিকানা এক জায়গায় দেখুন।
      </p>
      <div style={{ marginTop: 24 }}>{google}</div>
      <div className="or" lang="bn">
        অথবা ইমেইল দিয়ে
      </div>
      {status === "bad" ? (
        <div className="alert" role="alert" style={{ margin: "0 0 16px" }}>
          <b lang="bn">ইমেইল বা পাসওয়ার্ড মিলছে না</b>
          <span lang="bn">
            আবার দেখে লিখুন, অথবা পাসওয়ার্ড ভুলে গেলে নিচের লিংকটি ব্যবহার করুন।
          </span>
        </div>
      ) : null}
      {summary}
      <form className="form" onSubmit={submit} noValidate>
        {email("a-l-em")}
        {pw("password", "a-l-pw", "পাসওয়ার্ড", "current-password", "আপনার পাসওয়ার্ড")}
        <div style={{ textAlign: "right", marginTop: -8 }}>
          <button type="button" className="lk" onClick={() => go("forgot")} lang="bn">
            পাসওয়ার্ড ভুলে গেছেন?
          </button>
        </div>
        {sbtn("সাইন ইন", "সাইন ইন হচ্ছে…")}
      </form>
      <p className="swap" lang="bn">
        নতুন এসেছেন?{" "}
        <button type="button" className="lk" onClick={() => go("register")}>
          অ্যাকাউন্ট খুলুন
        </button>
      </p>
    </div>
  );
}
