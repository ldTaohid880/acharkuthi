"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@repo/auth/client";
import { changePasswordInput, profileInput } from "@repo/validators";
import { changePassword, updateProfile } from "@/app/actions/account";
import { useLang } from "@/lib/i18n/lang-context";
import { FailAlert } from "./addresses-view";

type Errs<K extends string> = Partial<Record<K, string>>;

function issues<K extends string>(r: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}): Errs<K> {
  const e: Errs<K> = {};
  for (const i of r.error?.issues ?? []) {
    const k = i.path[0] as K | undefined;
    if (k && !e[k]) e[k] = i.message;
  }
  return e;
}

/** Field wiring shared by both forms: errors show after blur or submit (ErrorPatterns.dc.html §2). */
function useForm<K extends string>(
  initial: Record<K, string>,
  validate: (v: Record<K, string>) => Errs<K>,
  /** Bangla schema message → the English site's wording. */
  tr: Readonly<Record<string, string>>,
) {
  const [v, setV] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [server, setServer] = useState<Errs<K>>({});
  const errs = { ...validate(v), ...server };
  const field = (k: K, id: string) => {
    const m = (touched[k] || submitted) && errs[k];
    const err = m ? (tr[m] ?? m) : "";
    return {
      err,
      errId: `${id}-e`,
      props: {
        id,
        className: `ak-input ${err ? "is-error" : ""}`,
        value: v[k],
        "aria-invalid": err ? true : undefined,
        "aria-describedby": err ? `${id}-e` : undefined,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          setServer({});
          setV((o) => ({ ...o, [k]: e.target.value }));
        },
        onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
      },
    };
  };
  const reset = (to: Record<K, string>) => {
    setV(to);
    setTouched({});
    setSubmitted(false);
    setServer({});
  };
  return { v, field, errs: validate(v), setSubmitted, setServer, reset };
}

function Err({ id, err }: { id: string; err: string }) {
  const { lang } = useLang();
  return err ? (
    <span className="ak-help is-error" role="alert" id={id} lang={lang}>
      {err}
    </span>
  ) : null;
}

export function SettingsView({
  profile,
  hasPassword,
  askSignOut,
}: {
  profile: { name: string; email: string; phone: string };
  hasPassword: boolean;
  askSignOut: boolean;
}) {
  const router = useRouter();
  const { lang, t: all, href } = useLang();
  const t = all.account;
  const [pending, start] = useTransition();

  // ব্যক্তিগত তথ্য
  const [editing, setEditing] = useState(false);
  const [profSaved, setProfSaved] = useState(false);
  const [profFail, setProfFail] = useState(false);
  const pf = useForm(
    { name: profile.name, phone: profile.phone },
    (v) => issues(profileInput.safeParse(v)),
    t.err,
  );
  const pfName = pf.field("name", "pf-nm");
  const pfPhone = pf.field("phone", "pf-ph");
  const saveProfile = () => {
    pf.setSubmitted(true);
    if (Object.keys(pf.errs).length) return;
    start(async () => {
      setProfFail(false);
      const r = await updateProfile(pf.v).catch(() => ({ status: "fail" as const }));
      if (r.status === "invalid") return pf.setServer(r.errors);
      if (r.status !== "ok") return setProfFail(true);
      setEditing(false);
      setProfSaved(true);
      router.refresh();
    });
  };

  // পাসওয়ার্ড
  const [pwOpen, setPwOpen] = useState(false);
  const [pwStat, setPwStat] = useState<"idle" | "loading" | "done" | "fail">("idle");
  const pw = useForm(
    { current: "", next: "", confirm: "" },
    (v) => issues(changePasswordInput.safeParse(v)),
    t.err,
  );
  const pwCur = pw.field("current", "pw-c");
  const pwNew = pw.field("next", "pw-n");
  const pwCf = pw.field("confirm", "pw-f");
  const savePassword = () => {
    pw.setSubmitted(true);
    if (Object.keys(pw.errs).length) return;
    setPwStat("loading");
    void changePassword(pw.v)
      .catch(() => ({ status: "fail" as const }))
      .then((r) => {
        if (r.status === "invalid") {
          pw.setServer(r.errors);
          return setPwStat("idle");
        }
        if (r.status !== "ok") return setPwStat("fail");
        pw.reset({ current: "", next: "", confirm: "" });
        setPwStat("done");
      });
  };

  // সাইন আউট
  const [so, setSo] = useState<"idle" | "confirm" | "loading" | "fail">(
    askSignOut ? "confirm" : "idle",
  );
  const doSignOut = () => {
    setSo("loading");
    void signOut()
      .then((r) => {
        if (r.error) return setSo("fail");
        router.replace(href("/account/signed-out"));
        router.refresh();
      })
      .catch(() => setSo("fail"));
  };

  return (
    <div>
      <h1 className="h1a" lang={lang}>
        {t.settings}
      </h1>
      <p className="sub" lang={lang}>
        {t.settingsSub}
      </p>

      <section className="panel" aria-labelledby="sp1">
        <div className="sech first">
          <h2 className="ph" id="sp1" lang={lang}>
            {t.personal}
          </h2>
          {!editing && (
            <button
              type="button"
              className="lk"
              onClick={() => {
                pf.reset({ name: profile.name, phone: profile.phone });
                setProfSaved(false);
                setProfFail(false);
                setEditing(true);
              }}
              lang={lang}
            >
              {t.edit}
            </button>
          )}
        </div>
        {profSaved && (
          <div className="alert info" role="status" lang={lang}>
            {t.profSaved}
          </div>
        )}
        {!editing ? (
          <dl className="kv">
            <div>
              <dt lang={lang}>{t.name}</dt>
              <dd>{profile.name}</dd>
            </div>
            {profile.phone && (
              <div>
                <dt lang={lang}>{t.phone}</dt>
                <dd>{profile.phone}</dd>
              </div>
            )}
            <div>
              <dt lang={lang}>{t.email}</dt>
              <dd>
                {profile.email} {!hasPassword && <span className="chip2">Google</span>}
              </dd>
            </div>
          </dl>
        ) : (
          <>
            {profFail && <FailAlert />}
            <div className="afg one">
              <div className="fld">
                <label htmlFor="pf-nm" lang={lang}>
                  {t.name}
                  <em aria-hidden="true">*</em>
                </label>
                <input {...pfName.props} type="text" autoComplete="name" placeholder={t.fullName} />
                <Err id={pfName.errId} err={pfName.err} />
              </div>
              <div className="fld">
                <label htmlFor="pf-ph" lang={lang}>
                  {t.phone}
                  <small>{t.optional}</small>
                </label>
                <input
                  {...pfPhone.props}
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="01XXXXXXXXX"
                />
                <Err id={pfPhone.errId} err={pfPhone.err} />
              </div>
              <div className="fld">
                <span className="lb" lang={lang}>
                  {t.email}
                </span>
                <div className="ro">{profile.email}</div>
              </div>
            </div>
            <div className="row2">
              <button
                type="button"
                className="ak-btn ak-btn--brand sm2"
                onClick={saveProfile}
                disabled={pending}
                lang={lang}
              >
                {t.save}
              </button>
              <button
                type="button"
                className="ak-btn ak-btn--line sm2"
                onClick={() => setEditing(false)}
                lang={lang}
              >
                {t.cancel}
              </button>
            </div>
          </>
        )}
      </section>

      {/* Google-only accounts get no password panel at all (user request; replaces the board's note). */}
      {hasPassword && (
        <section className="panel" aria-labelledby="sp2">
          <h2 className="ph" id="sp2" lang={lang}>
            {t.password}
          </h2>
          {!pwOpen ? (
            <>
              <p className="sub" lang={lang}>
                {t.pwHint}
              </p>
              <div className="row2">
                <button
                  type="button"
                  className="ak-btn ak-btn--line sm2"
                  onClick={() => {
                    pw.reset({ current: "", next: "", confirm: "" });
                    setPwStat("idle");
                    setPwOpen(true);
                  }}
                  lang={lang}
                >
                  {t.changePw}
                </button>
              </div>
            </>
          ) : (
            <>
              {pwStat === "done" && (
                <div className="alert info" role="status" lang={lang}>
                  {t.pwChanged}
                </div>
              )}
              {pwStat === "fail" && <FailAlert />}
              <div className="afg one">
                <div className="fld">
                  <label htmlFor="pw-c" lang={lang}>
                    {t.curPw}
                    <em aria-hidden="true">*</em>
                  </label>
                  <input {...pwCur.props} type="password" autoComplete="current-password" />
                  <Err id={pwCur.errId} err={pwCur.err} />
                </div>
                <div className="fld">
                  <label htmlFor="pw-n" lang={lang}>
                    {t.newPw}
                    <em aria-hidden="true">*</em>
                  </label>
                  <input
                    {...pwNew.props}
                    type="password"
                    autoComplete="new-password"
                    placeholder={t.newPwPh}
                  />
                  <Err id={pwNew.errId} err={pwNew.err} />
                </div>
                <div className="fld">
                  <label htmlFor="pw-f" lang={lang}>
                    {t.newPwAgain}
                    <em aria-hidden="true">*</em>
                  </label>
                  <input {...pwCf.props} type="password" autoComplete="new-password" />
                  <Err id={pwCf.errId} err={pwCf.err} />
                </div>
              </div>
              <div className="row2">
                {pwStat === "loading" ? (
                  <button
                    type="button"
                    className="ak-btn ak-btn--brand sm2"
                    disabled
                    aria-busy="true"
                    lang={lang}
                  >
                    <span className="spin" aria-hidden="true" />
                    {t.changing}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ak-btn ak-btn--brand sm2"
                    onClick={savePassword}
                    lang={lang}
                  >
                    {t.changePw}
                  </button>
                )}
                <button
                  type="button"
                  className="ak-btn ak-btn--line sm2"
                  onClick={() => setPwOpen(false)}
                  lang={lang}
                >
                  {t.cancel}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <section className="panel" aria-labelledby="sp3">
        <h2 className="ph" id="sp3" lang={lang}>
          {t.signOut}
        </h2>
        {(so === "idle" || so === "fail") && (
          <>
            {so === "fail" && <FailAlert />}
            <div className="row2" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="ak-btn ak-btn--line sm2"
                onClick={() => setSo("confirm")}
                lang={lang}
              >
                {t.signOut}
              </button>
            </div>
          </>
        )}
        {so === "confirm" && (
          <div
            className="alert"
            role="alertdialog"
            aria-labelledby="so-q"
            style={{ marginTop: 12 }}
          >
            <b id="so-q" lang={lang}>
              {t.outQ}
            </b>
            <span lang={lang}>{t.outQText}</span>
            <div className="row2">
              <button
                type="button"
                className="ak-btn ak-btn--brand sm2"
                onClick={doSignOut}
                lang={lang}
              >
                {t.outYes}
              </button>
              <button
                type="button"
                className="ak-btn ak-btn--line sm2"
                onClick={() => setSo("idle")}
                lang={lang}
              >
                {t.stay}
              </button>
            </div>
          </div>
        )}
        {so === "loading" && (
          <div className="row2" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="ak-btn ak-btn--brand sm2"
              disabled
              aria-busy="true"
              lang={lang}
            >
              <span className="spin" aria-hidden="true" />
              {t.signingOut}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
