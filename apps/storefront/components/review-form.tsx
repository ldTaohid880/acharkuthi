"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitProductReview, type ProductReviewState } from "@/app/actions/product-review";
import { getDict, type Dict } from "@/lib/i18n/dict";
import { useLang } from "@/lib/i18n/lang-context";
import { Icon } from "./icon";

const SPICE = ["low", "ok", "high"] as const;

const initial: ProductReviewState = { status: "idle", errors: {} };

type Err = Dict["review"]["err"];
const rateError = (r: number, e: Err) => (r ? "" : e.rating);
const textError = (t: string, e: Err) =>
  t.trim().length === 0 ? e.bodyEmpty : t.trim().length < 10 ? e.bodyShort : "";

/** Check panel shown on success (Product.dc.html .wok). */
function Tick() {
  return (
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
  );
}

/**
 * "রিভিউ লিখুন" button and dialog (form from (Product.dc.html / ProductStates section F). Anyone can write;
 * guests also give a name. Reviews wait for admin approval before they show.
 */
export function ReviewForm({
  productId,
  productName,
  signedIn,
}: {
  productId: number;
  productName: string;
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [spice, setSpice] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [touched, setTouched] = useState(false);
  const [tried, setTried] = useState(false);
  const { lang } = useLang();
  const t = getDict(lang).review;
  // The labels below set their font inline: the page language's UI face.
  const uiFont = lang === "bn" ? "var(--font-ui-bn)" : "var(--font-ui)";
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(
    async (prev: ProductReviewState, data: FormData) => {
      const next = await submitProductReview(prev, data);
      if (next.status === "ok") {
        setRating(0);
        setName("");
        setTitle("");
        setBody("");
        setSpice("");
        setPhoto(null);
      }
      return next;
    },
    initial,
  );
  const done = state.status === "ok" && tried;

  const toggle = () => {
    setOpen((o) => !o);
    setTried(false);
    setTouched(false);
  };

  // Modal behaviour, as the home page review dialog: Escape closes, page behind does not scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const local = {
    rating: tried ? rateError(rating, t.err) : "",
    body: touched || tried ? textError(body, t.err) : "",
    name: tried && !signedIn && !name.trim() ? t.err.name : "",
  };
  const raw = state.status === "invalid" && tried ? state.errors : {};
  // The server's messages are Bangla; on the English page each field gets its English message.
  const server =
    lang === "bn"
      ? raw
      : {
          name: raw.name ? t.err.name : "",
          rating: raw.rating ? t.err.rating : "",
          title: raw.title ? t.err.title : "",
          body: raw.body ? t.err.bodyShort : "",
          photo: raw.photo ? t.err.photo : "",
        };
  const err = {
    name: local.name || server.name || "",
    rating: local.rating || server.rating || "",
    title: server.title ?? "",
    body: local.body || server.body || "",
    photo: server.photo ?? "",
  };
  const hasErr = Object.values(err).some(Boolean);

  return (
    <>
      <div
        style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
      >
        <button
          type="button"
          className="ak-btn ak-btn--brand"
          style={{ minHeight: 50 }}
          aria-expanded={open}
          onClick={toggle}
          lang={lang}
        >
          {t.write}
        </button>
      </div>
      {open ? (
        <div className="wr-ov" onClick={toggle}>
          <section
            className="wr"
            lang={lang}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wrh"
            onClick={(ev) => ev.stopPropagation()}
          >
            <button type="button" className="wr-x" aria-label={t.close} onClick={toggle} autoFocus>
              <Icon name="close" />
            </button>
            {done ? (
              <div className="wok" role="status">
                <div className="eb ak-blot v2" aria-hidden="true">
                  <Tick />
                </div>
                <h3 id="wrh">{t.doneTitle}</h3>
                <p>{t.doneText}</p>
                <div className="wr-act" style={{ justifyContent: "center" }}>
                  <button type="button" className="ak-btn ak-btn--line" onClick={toggle}>
                    {t.close}
                  </button>
                </div>
              </div>
            ) : (
              <form
                action={action}
                noValidate
                onSubmit={(e) => {
                  setTried(true);
                  if (
                    rateError(rating, t.err) ||
                    textError(body, t.err) ||
                    (!signedIn && !name.trim())
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                <h3 id="wrh">{t.title(productName)}</h3>
                <p className="ak-help" style={{ margin: "4px 0 0" }}>
                  {t.intro}
                  <span style={{ color: "var(--error)" }}>*</span>
                  {t.required}
                </p>
                <input type="hidden" name="productId" value={productId} />
                <input type="hidden" name="rating" value={rating || ""} />
                <input type="hidden" name="spice" value={spice} />
                <input type="text" name="website" tabIndex={-1} autoComplete="off" hidden />
                <div className="fg">
                  {signedIn ? null : (
                    <label className="ak-field">
                      <span>
                        {t.name}
                        <em aria-hidden="true">*</em>
                      </span>
                      <input
                        className={`ak-input ${err.name ? "is-error" : ""}`}
                        type="text"
                        name="name"
                        autoComplete="name"
                        maxLength={120}
                        aria-required="true"
                        aria-invalid={!!err.name}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                      {err.name ? (
                        <span className="ak-help is-error" role="alert">
                          {err.name}
                        </span>
                      ) : null}
                    </label>
                  )}
                  <div>
                    <span style={{ font: `600 15px/1.3 ${uiFont}` }} id="rl">
                      {t.rating}
                      <em
                        style={{ color: "var(--error)", fontStyle: "normal", marginLeft: 4 }}
                        aria-hidden="true"
                      >
                        *
                      </em>
                    </span>
                    <div className="rate" role="radiogroup" aria-labelledby="rl">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          className={rating >= n ? "on" : undefined}
                          aria-checked={rating === n}
                          aria-label={t.star(n)}
                          onClick={() => setRating(n)}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    {err.rating ? (
                      <span className="ak-help is-error" role="alert">
                        {err.rating}
                      </span>
                    ) : null}
                  </div>
                  <label className="ak-field">
                    <span>
                      {t.headline} <small>{t.optional}</small>
                    </span>
                    <input
                      className="ak-input"
                      type="text"
                      name="title"
                      maxLength={120}
                      placeholder={t.headlinePh}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    {err.title ? (
                      <span className="ak-help is-error" role="alert">
                        {err.title}
                      </span>
                    ) : null}
                  </label>
                  <label className="ak-field">
                    <span>
                      {t.body}
                      <em aria-hidden="true">*</em>
                    </span>
                    <textarea
                      className={`ak-input ${err.body ? "is-error" : ""}`}
                      name="body"
                      maxLength={1500}
                      placeholder={t.bodyPh}
                      aria-required="true"
                      aria-invalid={!!err.body}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      onBlur={() => setTouched(true)}
                    />
                    {err.body ? (
                      <span className="ak-help is-error" role="alert">
                        {err.body}
                      </span>
                    ) : null}
                  </label>
                  <div>
                    <span style={{ font: `600 15px/1.3 ${uiFont}` }}>
                      {t.spice}{" "}
                      <small
                        style={{
                          font: `400 13px/1 ${uiFont}`,
                          color: "var(--ink-muted)",
                          marginLeft: 6,
                        }}
                      >
                        {t.optional}
                      </small>
                    </span>
                    <div className="chipsrow" style={{ marginTop: 10 }}>
                      {SPICE.map((k) => (
                        <button
                          key={k}
                          type="button"
                          className={`ak-chip ${spice === k ? "is-on" : ""}`}
                          aria-pressed={spice === k}
                          onClick={() => setSpice((s) => (s === k ? "" : k))}
                        >
                          {t.spiceWord[k]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={{ font: `600 15px/1.3 ${uiFont}` }}>
                      {t.photo}{" "}
                      <small
                        style={{
                          font: `400 13px/1 ${uiFont}`,
                          color: "var(--ink-muted)",
                          marginLeft: 6,
                        }}
                      >
                        {t.optional}
                      </small>
                    </span>
                    <div className="upl" style={{ marginTop: 10 }}>
                      <input
                        ref={fileRef}
                        type="file"
                        name="photo"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                      />
                      <button
                        type="button"
                        className="ak-btn ak-btn--line"
                        onClick={() => {
                          if (photo) {
                            setPhoto(null);
                            if (fileRef.current) fileRef.current.value = "";
                          } else fileRef.current?.click();
                        }}
                      >
                        {photo ? t.removePhoto : t.addPhoto}
                      </button>
                      {photo ? (
                        <>
                          <span className="th" style={{ background: "var(--field)" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                            <img
                              src={URL.createObjectURL(photo)}
                              alt=""
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </span>
                          <span className="ak-help">{photo.name}</span>
                        </>
                      ) : null}
                    </div>
                    {err.photo ? (
                      <span className="ak-help is-error" role="alert" style={{ marginTop: 8 }}>
                        {err.photo}
                      </span>
                    ) : null}
                  </div>
                </div>
                {tried && hasErr ? (
                  <div className="carterr" role="alert" style={{ marginTop: 20 }}>
                    <b>{t.fixTitle}</b>
                    <span>{t.fixText}</span>
                  </div>
                ) : null}
                {tried && state.status === "fail" && !pending ? (
                  <div className="carterr" role="alert" style={{ marginTop: 20 }}>
                    <b>{t.failTitle}</b>
                    <span>{t.failText}</span>
                  </div>
                ) : null}
                <div className="wr-act">
                  {pending ? (
                    <button
                      type="button"
                      className="ak-btn ak-btn--sun"
                      style={{ minHeight: 52 }}
                      disabled
                      aria-busy="true"
                    >
                      <span className="spin" aria-hidden="true" />
                      {t.sending}
                    </button>
                  ) : (
                    <button type="submit" className="ak-btn ak-btn--sun" style={{ minHeight: 52 }}>
                      {t.submit}
                    </button>
                  )}
                  <button type="button" className="ak-btn ak-btn--line" onClick={toggle}>
                    {t.cancel}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}

/** "আবার চেষ্টা করুন" for the reviews error state: re-renders the page on the server. */
export function RetryReviews() {
  const router = useRouter();
  const { lang, t } = useLang();
  return (
    <button
      type="button"
      className="ak-btn ak-btn--line"
      onClick={() => router.refresh()}
      lang={lang}
    >
      {t.review.retry}
    </button>
  );
}
