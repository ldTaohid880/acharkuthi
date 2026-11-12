"use client";

import type { Route } from "next";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@repo/auth/client";
import { changePasswordInput, profileInput } from "@repo/validators";
import { changePassword, updateProfile } from "@/app/actions/account";
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
) {
  const [v, setV] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [server, setServer] = useState<Errs<K>>({});
  const errs = { ...validate(v), ...server };
  const field = (k: K, id: string) => {
    const err = (touched[k] || submitted) && errs[k] ? errs[k] : "";
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
  return err ? (
    <span className="ak-help is-error" role="alert" id={id} lang="bn">
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
  const [pending, start] = useTransition();

  // ব্যক্তিগত তথ্য
  const [editing, setEditing] = useState(false);
  const [profSaved, setProfSaved] = useState(false);
  const [profFail, setProfFail] = useState(false);
  const pf = useForm({ name: profile.name, phone: profile.phone }, (v) =>
    issues(profileInput.safeParse(v)),
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
  const pw = useForm({ current: "", next: "", confirm: "" }, (v) =>
    issues(changePasswordInput.safeParse(v)),
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
        router.replace("/account/signed-out" as Route);
        router.refresh();
      })
      .catch(() => setSo("fail"));
  };

  return (
    <div>
      <h1 className="h1a" lang="bn">
        সেটিংস
      </h1>
      <p className="sub" lang="bn">
        আপনার তথ্য ও নিরাপত্তা।
      </p>

      <section className="panel" aria-labelledby="sp1">
        <div className="sech first">
          <h2 className="ph" id="sp1" lang="bn">
            ব্যক্তিগত তথ্য
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
              lang="bn"
            >
              সম্পাদনা
            </button>
          )}
        </div>
        {profSaved && (
          <div className="alert info" role="status" lang="bn">
            তথ্য সংরক্ষণ করা হয়েছে।
          </div>
        )}
        {!editing ? (
          <dl className="kv">
            <div>
              <dt lang="bn">নাম</dt>
              <dd>{profile.name}</dd>
            </div>
            {profile.phone && (
              <div>
                <dt lang="bn">মোবাইল নম্বর</dt>
                <dd>{profile.phone}</dd>
              </div>
            )}
            <div>
              <dt lang="bn">ইমেইল</dt>
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
                <label htmlFor="pf-nm" lang="bn">
                  নাম<em aria-hidden="true">*</em>
                </label>
                <input {...pfName.props} type="text" autoComplete="name" placeholder="পুরো নাম" />
                <Err id={pfName.errId} err={pfName.err} />
              </div>
              <div className="fld">
                <label htmlFor="pf-ph" lang="bn">
                  মোবাইল নম্বর<small>ঐচ্ছিক</small>
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
                <span className="lb" lang="bn">
                  ইমেইল
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
                lang="bn"
              >
                সংরক্ষণ করুন
              </button>
              <button
                type="button"
                className="ak-btn ak-btn--line sm2"
                onClick={() => setEditing(false)}
                lang="bn"
              >
                বাতিল
              </button>
            </div>
          </>
        )}
      </section>

      {/* Google-only accounts get no password panel at all (user request; replaces the board's note). */}
      {hasPassword && (
        <section className="panel" aria-labelledby="sp2">
          <h2 className="ph" id="sp2" lang="bn">
            পাসওয়ার্ড
          </h2>
          {!pwOpen ? (
            <>
              <p className="sub" lang="bn">
                নিরাপত্তার জন্য মাঝে মাঝে পাসওয়ার্ড বদলাতে পারেন।
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
                  lang="bn"
                >
                  পাসওয়ার্ড বদলান
                </button>
              </div>
            </>
          ) : (
            <>
              {pwStat === "done" && (
                <div className="alert info" role="status" lang="bn">
                  পাসওয়ার্ড বদলানো হয়েছে।
                </div>
              )}
              {pwStat === "fail" && <FailAlert />}
              <div className="afg one">
                <div className="fld">
                  <label htmlFor="pw-c" lang="bn">
                    বর্তমান পাসওয়ার্ড<em aria-hidden="true">*</em>
                  </label>
                  <input {...pwCur.props} type="password" autoComplete="current-password" />
                  <Err id={pwCur.errId} err={pwCur.err} />
                </div>
                <div className="fld">
                  <label htmlFor="pw-n" lang="bn">
                    নতুন পাসওয়ার্ড<em aria-hidden="true">*</em>
                  </label>
                  <input
                    {...pwNew.props}
                    type="password"
                    autoComplete="new-password"
                    placeholder="কমপক্ষে ৮টি অক্ষর, একটি অক্ষর ও একটি সংখ্যা"
                  />
                  <Err id={pwNew.errId} err={pwNew.err} />
                </div>
                <div className="fld">
                  <label htmlFor="pw-f" lang="bn">
                    নতুন পাসওয়ার্ড আবার<em aria-hidden="true">*</em>
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
                    lang="bn"
                  >
                    <span className="spin" aria-hidden="true" />
                    বদলানো হচ্ছে…
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ak-btn ak-btn--brand sm2"
                    onClick={savePassword}
                    lang="bn"
                  >
                    পাসওয়ার্ড বদলান
                  </button>
                )}
                <button
                  type="button"
                  className="ak-btn ak-btn--line sm2"
                  onClick={() => setPwOpen(false)}
                  lang="bn"
                >
                  বাতিল
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <section className="panel" aria-labelledby="sp3">
        <h2 className="ph" id="sp3" lang="bn">
          সাইন আউট
        </h2>
        {(so === "idle" || so === "fail") && (
          <>
            {so === "fail" && <FailAlert />}
            <div className="row2" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="ak-btn ak-btn--line sm2"
                onClick={() => setSo("confirm")}
                lang="bn"
              >
                সাইন আউট
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
            <b id="so-q" lang="bn">
              সাইন আউট করবেন?
            </b>
            <span lang="bn">আপনার অর্ডার ও ঠিকানা আবার সাইন ইন করলে পাবেন।</span>
            <div className="row2">
              <button
                type="button"
                className="ak-btn ak-btn--brand sm2"
                onClick={doSignOut}
                lang="bn"
              >
                হ্যাঁ, সাইন আউট
              </button>
              <button
                type="button"
                className="ak-btn ak-btn--line sm2"
                onClick={() => setSo("idle")}
                lang="bn"
              >
                থাকছি
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
              lang="bn"
            >
              <span className="spin" aria-hidden="true" />
              সাইন আউট হচ্ছে…
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
