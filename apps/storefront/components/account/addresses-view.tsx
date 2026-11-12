"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addressInput, type AddressField } from "@repo/validators";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/app/actions/account";
import { Icon } from "@/components/icon";
import { DIVISIONS, districtsOf, upazilasOf } from "@/lib/bd-locations";
import type { AccountAddress } from "@/lib/account";

interface Form {
  id: number | null;
  label: string;
  name: string;
  phone: string;
  division: string;
  district: string;
  upazila: string;
  line: string;
  isDefault: boolean;
}

const blank: Form = {
  id: null,
  label: "",
  name: "",
  phone: "",
  division: "",
  district: "",
  upazila: "",
  line: "",
  isDefault: false,
};

function clientErrors(f: Form): Partial<Record<AddressField, string>> {
  const r = addressInput.safeParse({ ...f, id: f.id ?? undefined });
  const e: Partial<Record<AddressField, string>> = {};
  if (!r.success) {
    for (const i of r.error.issues) {
      const k = i.path[0] as AddressField | undefined;
      if (k && !e[k]) e[k] = i.message;
    }
  }
  return e;
}

/** Saved addresses (Account.dc.html, view "addresses"; AccountStates.dc.html D, E). */
export function AddressesView({ addresses }: { addresses: AccountAddress[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [touched, setTouched] = useState<Partial<Record<AddressField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErr, setServerErr] = useState<Partial<Record<AddressField, string>>>({});
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);
  const [pending, start] = useTransition();

  const errs = form ? { ...clientErrors(form), ...serverErr } : {};
  const field = (k: AddressField) => {
    const err = (touched[k] || submitted) && errs[k] ? errs[k] : "";
    return {
      err,
      props: {
        id: `ad-${k}`,
        className: `ak-input ${err ? "is-error" : ""}`,
        "aria-invalid": err ? true : undefined,
        "aria-describedby": err ? `ad-${k}-e` : undefined,
        onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
      },
    };
  };
  const set = (o: Partial<Form>) => {
    setServerErr({});
    setForm((f) => {
      if (!f) return f;
      const n = { ...f, ...o };
      if ("division" in o) {
        n.district = "";
        n.upazila = "";
      }
      if ("district" in o) n.upazila = "";
      return n;
    });
  };
  const open = (f: Form) => {
    setForm(f);
    setTouched({});
    setSubmitted(false);
    setServerErr({});
    setSaved(false);
    setFailed(false);
  };
  const run = (fn: () => Promise<{ status: string }>, after?: () => void) =>
    start(async () => {
      setFailed(false);
      const r = await fn().catch(() => ({ status: "fail" }));
      if (r.status !== "ok") return setFailed(true);
      after?.();
      router.refresh();
    });

  const save = () => {
    if (!form) return;
    setSubmitted(true);
    if (Object.keys(clientErrors(form)).length) return;
    start(async () => {
      setFailed(false);
      const r = await saveAddress({ ...form, id: form.id ?? undefined }).catch(() => ({
        status: "fail" as const,
      }));
      if (r.status === "invalid") return setServerErr(r.errors);
      if (r.status !== "ok") return setFailed(true);
      setForm(null);
      setSaved(true);
      router.refresh();
    });
  };

  const f = form;
  const lb = field("label");
  const nm = field("name");
  const ph = field("phone");
  const dv = field("division");
  const ds = field("district");
  const up = field("upazila");
  const ln = field("line");
  const dists = f?.division ? districtsOf(f.division) : [];
  const upas = f?.district ? upazilasOf(f.division, f.district) : [];

  return (
    <div>
      <div className="sech first">
        <div>
          <h1 className="h1a" lang="bn">
            ঠিকানা
          </h1>
          <p className="sub" lang="bn">
            অর্ডারের সময় এখান থেকে দ্রুত বেছে নিতে পারবেন।
          </p>
        </div>
        {addresses.length > 0 && !form && (
          <button
            type="button"
            className="ak-btn ak-btn--line sm2"
            onClick={() => open(blank)}
            lang="bn"
          >
            নতুন ঠিকানা
          </button>
        )}
      </div>

      {f && (
        <section className="panel" aria-labelledby="afh">
          <h2 className="ph" id="afh" lang="bn">
            {f.id ? "ঠিকানা সম্পাদনা" : "নতুন ঠিকানা"}
          </h2>
          <div className="afg">
            <div className="fld">
              <label htmlFor="ad-label" lang="bn">
                ঠিকানার নাম<em aria-hidden="true">*</em>
              </label>
              <input
                {...lb.props}
                type="text"
                placeholder="যেমন: বাসা, অফিস"
                value={f.label}
                onChange={(e) => set({ label: e.target.value })}
              />
              <Err k="label" err={lb.err} />
            </div>
            <div className="fld">
              <label htmlFor="ad-name" lang="bn">
                যাঁর নামে ডেলিভারি<em aria-hidden="true">*</em>
              </label>
              <input
                {...nm.props}
                type="text"
                autoComplete="name"
                placeholder="পুরো নাম"
                value={f.name}
                onChange={(e) => set({ name: e.target.value })}
              />
              <Err k="name" err={nm.err} />
            </div>
            <div className="fld">
              <label htmlFor="ad-phone" lang="bn">
                মোবাইল নম্বর<em aria-hidden="true">*</em>
              </label>
              <input
                {...ph.props}
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={f.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
              <Err k="phone" err={ph.err} />
            </div>
            <div className="fld">
              <label htmlFor="ad-division" lang="bn">
                বিভাগ<em aria-hidden="true">*</em>
              </label>
              <select
                {...dv.props}
                aria-required="true"
                value={f.division}
                onChange={(e) => set({ division: e.target.value })}
              >
                <option value="">বিভাগ বেছে নিন</option>
                {DIVISIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <Err k="division" err={dv.err} />
            </div>
            <div className="fld">
              <label htmlFor="ad-district" lang="bn">
                জেলা<em aria-hidden="true">*</em>
              </label>
              <select
                {...ds.props}
                aria-required="true"
                value={f.district}
                onChange={(e) => set({ district: e.target.value })}
              >
                <option value="">{f.division ? "জেলা বেছে নিন" : "আগে বিভাগ বেছে নিন"}</option>
                {dists.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <Err k="district" err={ds.err} />
            </div>
            <div className="fld">
              <label htmlFor="ad-upazila" lang="bn">
                উপজেলা / থানা<em aria-hidden="true">*</em>
              </label>
              <select
                {...up.props}
                aria-required="true"
                value={f.upazila}
                onChange={(e) => set({ upazila: e.target.value })}
              >
                <option value="">
                  {f.district ? "উপজেলা / থানা বেছে নিন" : "আগে জেলা বেছে নিন"}
                </option>
                {upas.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <Err k="upazila" err={up.err} />
            </div>
            <div className="fld full">
              <label htmlFor="ad-line" lang="bn">
                বিস্তারিত ঠিকানা<em aria-hidden="true">*</em>
              </label>
              <textarea
                {...ln.props}
                placeholder="বাড়ি, রাস্তা, ল্যান্ডমার্ক"
                aria-required="true"
                value={f.line}
                onChange={(e) => set({ line: e.target.value })}
              />
              <Err k="line" err={ln.err} />
            </div>
            <label className="chk full">
              <input
                type="checkbox"
                checked={f.isDefault}
                onChange={() => set({ isDefault: !f.isDefault })}
              />
              <span lang="bn">এটি আমার ডিফল্ট ঠিকানা হবে</span>
            </label>
          </div>
          <div className="row2">
            <button
              type="button"
              className="ak-btn ak-btn--brand sm2"
              onClick={save}
              disabled={pending}
              aria-busy={pending || undefined}
              lang="bn"
            >
              ঠিকানা সংরক্ষণ করুন
            </button>
            <button
              type="button"
              className="ak-btn ak-btn--line sm2"
              onClick={() => setForm(null)}
              lang="bn"
            >
              বাতিল
            </button>
          </div>
        </section>
      )}

      {failed && <FailAlert />}
      {saved && (
        <div className="alert info" role="status" lang="bn">
          ঠিকানা সংরক্ষণ করা হয়েছে।
        </div>
      )}

      {addresses.length > 0 ? (
        <ul className="alist">
          {addresses.map((a) => (
            <li key={a.id} className="ac">
              <div className="ac-h">
                <b lang="bn">{a.label || a.name}</b>
                {a.isDefault && (
                  <span className="chip2 ok" lang="bn">
                    ডিফল্ট
                  </span>
                )}
              </div>
              <p className="ac-b" lang="bn">
                {a.name} · {a.phone}
                <br />
                {a.line}
                <br />
                {[a.upazila, a.district, a.division].filter(Boolean).join(", ")}
              </p>
              {delId === a.id ? (
                <div className="alert" role="alert">
                  <b lang="bn">এই ঠিকানাটি মুছে ফেলবেন?</b>
                  <span lang="bn">এটি আর ফেরানো যাবে না।</span>
                  <div className="row2">
                    <button
                      type="button"
                      className="ak-btn ak-btn--brand sm2"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => deleteAddress({ id: a.id }),
                          () => setDelId(null),
                        )
                      }
                      lang="bn"
                    >
                      হ্যাঁ, মুছে ফেলুন
                    </button>
                    <button
                      type="button"
                      className="ak-btn ak-btn--line sm2"
                      onClick={() => setDelId(null)}
                      lang="bn"
                    >
                      না, রেখে দিন
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ac-a">
                  <button
                    type="button"
                    className="lk"
                    onClick={() =>
                      open({
                        id: a.id,
                        label: a.label,
                        name: a.name,
                        phone: a.phone,
                        division: a.division,
                        district: a.district,
                        upazila: a.upazila,
                        line: a.line,
                        isDefault: a.isDefault,
                      })
                    }
                    lang="bn"
                  >
                    সম্পাদনা
                  </button>
                  <button
                    type="button"
                    className="lk plain"
                    onClick={() => setDelId(a.id)}
                    lang="bn"
                  >
                    মুছুন
                  </button>
                  {!a.isDefault && (
                    <button
                      type="button"
                      className="lk plain"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => setDefaultAddress({ id: a.id }),
                          () => setSaved(false),
                        )
                      }
                      lang="bn"
                    >
                      ডিফল্ট করুন
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <span className="eic ak-blot v2" aria-hidden="true">
            <Icon name="truck" />
          </span>
          <b lang="bn">কোনো ঠিকানা সংরক্ষণ করা নেই</b>
          <p lang="bn">একটি ঠিকানা যোগ করলে পরের অর্ডারে লিখতে হবে না।</p>
          <button
            type="button"
            className="ak-btn ak-btn--brand sm2"
            onClick={() => open(blank)}
            lang="bn"
          >
            ঠিকানা যোগ করুন
          </button>
        </div>
      )}
    </div>
  );
}

function Err({ k, err }: { k: AddressField; err: string }) {
  return err ? (
    <span className="ak-help is-error" role="alert" id={`ad-${k}-e`} lang="bn">
      {err}
    </span>
  ) : null;
}

/** ErrorPatterns.dc.html §2, form-level failure. */
export function FailAlert() {
  return (
    <div className="alert" role="alert">
      <b lang="bn">ফর্মটি জমা দেওয়া যায়নি</b>
      <span lang="bn">সংযোগে সমস্যা হয়েছে। আপনার লেখা সব ঠিকই আছে, আবার চেষ্টা করুন।</span>
    </div>
  );
}
