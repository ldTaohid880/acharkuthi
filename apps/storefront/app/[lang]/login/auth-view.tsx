"use client";

import { authClient, signIn, signUp } from "@repo/auth/client";
import {
  authForgotForm,
  authLoginForm,
  authPasswordRules,
  authRegisterForm,
  authResetForm,
} from "@repo/validators";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLang } from "@/lib/i18n/lang-context";
import { splitLangPath } from "@/lib/i18n/lang";
import { GoogleButton } from "./google-button";

/** "reset" = the email's link: choose a new password (or, without a valid token, "link expired"). */
export type AuthMode = "login" | "register" | "forgot" | "reset";
type Field = "name" | "email" | "password" | "confirm";
type Status = "idle" | "loading" | "success" | "bad";

const EMPTY: Record<Field, string> = { name: "", email: "", password: "", confirm: "" };
const SCHEMA = {
  login: authLoginForm,
  register: authRegisterForm,
  forgot: authForgotForm,
  reset: authResetForm,
};

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

export function AuthView({
  initialMode,
  next,
  resetToken = null,
}: {
  initialMode: AuthMode;
  next: string | null;
  /** From the reset email's link (/login?token=…); null when the link was invalid or expired. */
  resetToken?: string | null;
}) {
  const router = useRouter();
  // Every label in the page language (memory: storefront-bilingual).
  const { lang, t: all, href } = useLang();
  const t = all.auth;
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [token, setToken] = useState(resetToken);
  const [f, setF] = useState(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [show, setShow] = useState<Partial<Record<Field, boolean>>>({});
  const [sub, setSub] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [doneName, setDoneName] = useState("");

  const errs = fieldErrors(mode, f);
  const shown = (k: Field) => {
    const m = (touched[k] ?? sub) && errs[k];
    return m ? (t.err[m] ?? m) : "";
  };
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
    } else if (mode === "forgot") {
      const v = authForgotForm.parse(f);
      const { error } = await authClient.requestPasswordReset({
        email: v.email,
        redirectTo: href("/login"),
      });
      return setStatus(error ? "bad" : "success");
    } else {
      const v = authResetForm.parse(f);
      if (!token) return setStatus("idle");
      const { error } = await authClient.resetPassword({ newPassword: v.password, token });
      if (error?.code === "INVALID_TOKEN") {
        setToken(null); // shows t.expTitle
        return setStatus("idle");
      }
      if (error) return setStatus("bad");
      // The token is used up: keep it out of the address bar and history.
      window.history.replaceState(null, "", href("/login"));
      return setStatus("success");
    }
    if (next) {
      // `next` is a language-free path or one already under /en: keep the page language.
      router.replace(href(splitLangPath(next).path) as Route);
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
      <label htmlFor={id} lang={lang}>
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
          aria-label={show[k] ? t.hidePw : t.showPw}
          aria-pressed={!!show[k]}
          onClick={() => setShow({ ...show, [k]: !show[k] })}
          lang={lang}
        >
          {show[k] ? t.hide : t.show}
        </button>
      </div>
      {err(k)}
    </div>
  );
  const email = (id: string) => (
    <div className="fld">
      <label htmlFor={id} lang={lang}>
        {t.email}
        <em aria-hidden="true">*</em>
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
        <b lang={lang}>{t.fixTitle(nShown)}</b>
        <span lang={lang}>{t.fixText}</span>
      </div>
    ) : null;
  const sbtn = (idle: string, busy: string) =>
    loading ? (
      <button
        type="submit"
        className="ak-btn ak-btn--brand sbtn"
        disabled
        aria-busy="true"
        lang={lang}
      >
        <span className="spin" aria-hidden="true" />
        {busy}
      </button>
    ) : (
      <button type="submit" className="ak-btn ak-btn--brand sbtn" lang={lang}>
        {idle}
      </button>
    );
  const google = <GoogleButton callbackURL={href(next ? splitLangPath(next).path : "/account")} />;
  const rules = (
    <ul className="rules" aria-label={t.rules} lang={lang}>
      <li className={authPasswordRules.length(f.password) ? "ok" : ""}>{t.rule8}</li>
      <li className={authPasswordRules.mix(f.password) ? "ok" : ""}>{t.ruleMix}</li>
    </ul>
  );

  if (status === "success" && mode === "login")
    return (
      <div className="done" role="status">
        <Tick />
        <h2 lang={lang}>{t.inTitle}</h2>
        <p lang={lang}>{t.inText}</p>
        <div className="acts">
          <Link className="ak-btn ak-btn--brand" href={href("/account")} lang={lang}>
            {t.toAccount}
          </Link>
          <Link className="ak-btn ak-btn--line" href={href("/shop")} lang={lang}>
            {t.keepShopping}
          </Link>
        </div>
      </div>
    );
  if (status === "success" && mode === "register")
    return (
      <div className="done" role="status">
        <Tick />
        <h2 lang={lang}>{t.madeTitle}</h2>
        <p lang={lang}>{t.welcome(doneName)}</p>
        <div className="acts">
          <Link className="ak-btn ak-btn--brand" href={href("/shop")} lang={lang}>
            {t.startShopping}
          </Link>
          <Link className="ak-btn ak-btn--line" href={href("/account")} lang={lang}>
            {t.toAccount}
          </Link>
        </div>
      </div>
    );
  if (status === "success" && mode === "reset")
    return (
      <div className="done" role="status">
        <Tick />
        <h2 lang={lang}>{t.changedTitle}</h2>
        <p lang={lang}>{t.changedText}</p>
        <div className="acts">
          <button
            type="button"
            className="ak-btn ak-btn--brand"
            onClick={() => {
              setF(EMPTY);
              go("login");
            }}
            lang={lang}
          >
            {t.signInNow}
          </button>
        </div>
      </div>
    );
  if (status === "success")
    return (
      <div className="done" role="status">
        <Tick />
        <h2 lang={lang}>{t.mailTitle}</h2>
        <p lang={lang}>{t.mailText}</p>
        <div className="acts">
          <button
            type="button"
            className="ak-btn ak-btn--line"
            onClick={() => go("login")}
            lang={lang}
          >
            {t.backIn}
          </button>
        </div>
      </div>
    );

  if (mode === "reset")
    return (
      <div>
        <h1 className="h1a" lang={lang}>
          {t.resetTitle}
        </h1>
        {token ? (
          <>
            <p className="sub" lang={lang}>
              {t.resetSub}
            </p>
            {status === "bad" ? (
              <div className="alert" role="alert" style={{ margin: "24px 0 0" }}>
                <b lang={lang}>{t.resetFail}</b>
                <span lang={lang}>{t.netRetry}</span>
              </div>
            ) : null}
            {summary}
            <form className="form" style={{ marginTop: 24 }} onSubmit={submit} noValidate>
              <div>
                {pw("password", "a-p-pw", t.newPw, "new-password", t.newPw)}
                {rules}
              </div>
              {pw("confirm", "a-p-cf", t.againPw, "new-password", t.samePw)}
              {sbtn(t.changePw, t.changing)}
            </form>
          </>
        ) : (
          <>
            <div className="alert" role="alert" style={{ margin: "24px 0" }}>
              <b lang={lang}>{t.expTitle}</b>
              <span lang={lang}>{t.expText}</span>
            </div>
            <button
              type="button"
              className="ak-btn ak-btn--brand sbtn"
              onClick={() => go("forgot")}
              lang={lang}
            >
              {t.newLink}
            </button>
          </>
        )}
        <p className="swap">
          <button type="button" className="lk" onClick={() => go("login")} lang={lang}>
            {t.backIn}
          </button>
        </p>
      </div>
    );

  if (mode === "forgot")
    return (
      <div>
        <h1 className="h1a" lang={lang}>
          {t.forgotTitle}
        </h1>
        <p className="sub" lang={lang}>
          {t.forgotSub}
        </p>
        {status === "bad" ? (
          <div className="alert" role="alert">
            <b lang={lang}>{t.sendFail}</b>
            <span lang={lang}>{t.sendFailText}</span>
          </div>
        ) : null}
        <form className="form" style={{ marginTop: 24 }} onSubmit={submit} noValidate>
          {email("a-f-em")}
          {sbtn(t.sendLink, t.sending)}
        </form>
        <p className="swap">
          <button type="button" className="lk" onClick={() => go("login")} lang={lang}>
            {t.backIn}
          </button>
        </p>
      </div>
    );

  if (mode === "register")
    return (
      <div>
        <h1 className="h1a" lang={lang}>
          {t.regTitle}
        </h1>
        <p className="sub" lang={lang}>
          {t.regSub}
        </p>
        <div style={{ marginTop: 24 }}>
          {google}
          <p className="ak-help" style={{ textAlign: "center" }} lang={lang}>
            {t.googleNote}
          </p>
        </div>
        <div className="or" lang={lang}>
          {t.orEmail}
        </div>
        {status === "bad" ? (
          <div className="alert" role="alert" style={{ margin: "0 0 16px" }}>
            <b lang={lang}>{t.existsTitle}</b>
            <span lang={lang}>
              {t.existsText}{" "}
              <button type="button" className="lk" onClick={() => go("login")}>
                {t.signInNow}
              </button>
            </span>
          </div>
        ) : null}
        {summary}
        <form className="form" onSubmit={submit} noValidate>
          <div className="fld">
            <label htmlFor="a-r-nm" lang={lang}>
              {t.yourName}
              <em aria-hidden="true">*</em>
            </label>
            <input
              id="a-r-nm"
              type="text"
              autoComplete="name"
              placeholder={t.fullName}
              {...input("name")}
            />
            {err("name")}
          </div>
          {email("a-r-em")}
          <div>
            {pw("password", "a-r-pw", t.password, "new-password", t.newPw)}
            {rules}
          </div>
          {pw("confirm", "a-r-cf", t.againPw, "new-password", t.samePw)}
          {sbtn(t.open, t.opening)}
        </form>
        <p className="swap" lang={lang}>
          {t.haveAccount}{" "}
          <button type="button" className="lk" onClick={() => go("login")}>
            {t.signIn}
          </button>
        </p>
      </div>
    );

  return (
    <div>
      <h1 className="h1a" lang={lang}>
        {t.loginTitle}
      </h1>
      <p className="sub" lang={lang}>
        {t.loginSub}
      </p>
      <div style={{ marginTop: 24 }}>{google}</div>
      <div className="or" lang={lang}>
        {t.orEmail}
      </div>
      {status === "bad" ? (
        <div className="alert" role="alert" style={{ margin: "0 0 16px" }}>
          <b lang={lang}>{t.badTitle}</b>
          <span lang={lang}>{t.badText}</span>
        </div>
      ) : null}
      {summary}
      <form className="form" onSubmit={submit} noValidate>
        {email("a-l-em")}
        {pw("password", "a-l-pw", t.password, "current-password", t.yourPw)}
        <div style={{ textAlign: "right", marginTop: -8 }}>
          <button type="button" className="lk" onClick={() => go("forgot")} lang={lang}>
            {t.forgotTitle}
          </button>
        </div>
        {sbtn(t.signIn, t.signingIn)}
      </form>
      <p className="swap" lang={lang}>
        {t.newHere}{" "}
        <button type="button" className="lk" onClick={() => go("register")}>
          {t.open}
        </button>
      </p>
    </div>
  );
}
