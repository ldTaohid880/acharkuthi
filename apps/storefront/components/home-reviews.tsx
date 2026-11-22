"use client";

import { useActionState, useEffect, useState } from "react";
import { submitSiteReview, type SiteReviewState } from "@/app/actions/site-review";
import { useLang } from "@/lib/i18n/lang-context";
import type { SiteReview, SiteReviewStats } from "@/lib/queries";
import { Icon } from "./icon";

const initialState: SiteReviewState = {
  status: "idle",
  errors: {},
  values: { name: "", rating: "", body: "" },
};

function Stars({ value }: { value: number }) {
  const { t } = useLang();
  return (
    <span className="vc-st" role="img" aria-label={t.home.rvRating(value)}>
      <span className="b" aria-hidden="true">
        ★★★★★
      </span>
      <span className="f" aria-hidden="true" style={{ width: `${value * 20}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

/** "আচারকুঠির উত্তর" under a review, when the shop has replied (admin Reviews page). */
function Reply({ r }: { r: SiteReview }) {
  const { lang, t: all } = useLang();
  const t = all.home;
  return r.reply ? (
    <div className="vc-rep">
      <b lang={lang}>{t.rvReply}</b>
      {/* The shop's reply is stored text (Bangla). */}
      <p lang="bn">{r.reply}</p>
    </div>
  ) : null;
}

function By({ r }: { r: SiteReview }) {
  const t = useLang().t.home;
  return (
    <div className="vc-by">
      <span className="vc-av" aria-hidden="true">
        <span className="in">{r.who.replace(/^\[?/, "").charAt(0).toUpperCase() || "C"}</span>
      </span>
      <span>
        <b>{r.who}</b>
        <span className="vc-d">{r.date}</span>
        {r.ver ? (
          <span className="vc-vf" lang="en">
            {t.rvVerified}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function ReviewDialog({ onClose }: { onClose: () => void }) {
  const { lang, t: all } = useLang();
  const t = all.home;
  const [state, action, pending] = useActionState(submitSiteReview, initialState);
  // Schema messages are Bangla; the English site maps them (dict `home.err`).
  const tr = (m: string | undefined) => (m ? (t.err[m] ?? m) : m);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const errCount = Object.keys(state.errors).length;
  const e = state.errors;
  return (
    <div className="vc-ov" onClick={onClose}>
      <div
        className="vc-dlg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vc-dt"
        onClick={(ev) => ev.stopPropagation()}
      >
        <button type="button" className="vc-x" aria-label={t.rvClose} onClick={onClose}>
          <Icon name="close" />
        </button>
        {state.status === "ok" ? (
          <div className="vc-ok" role="status">
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
            <h3 className="vc-dt" id="vc-dt" lang={lang}>
              {t.rvOkTitle}
            </h3>
            <p lang={lang}>{t.rvOkText}</p>
            <button type="button" className="ak-btn ak-btn--line" onClick={onClose} lang={lang}>
              {t.rvClose}
            </button>
          </div>
        ) : (
          <form action={action} noValidate>
            <span className="ak-eyebrow" lang="bn">
              {t.rvFormEyebrow}
            </span>
            <h3 className="vc-dt" id="vc-dt" lang={lang}>
              {t.rvShare}
            </h3>
            <p className="vc-note" lang={lang}>
              {t.rvNote} <span style={{ color: "var(--error)" }}>*</span>
              {t.rvReq}
            </p>
            {state.status === "fail" ? (
              <div className="vc-alert" role="alert">
                <b lang={lang}>{t.rvFail}</b>
                <span lang={lang}>{t.rvFailText}</span>
              </div>
            ) : null}
            {state.status === "invalid" && errCount > 0 ? (
              <div className="vc-alert" role="alert">
                <b lang={lang}>{t.rvFix(errCount)}</b>
                <span lang={lang}>{t.rvFixText}</span>
              </div>
            ) : null}
            <div className="vc-fg">
              <label className="ak-field">
                <span lang={lang}>
                  {t.rvName}
                  <em aria-hidden="true">*</em>
                </span>
                <input
                  className={`ak-input ${e.name ? "is-error" : ""}`}
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder={t.rvNamePh}
                  defaultValue={state.values.name}
                  aria-required="true"
                  aria-invalid={Boolean(e.name)}
                />
                <span className="ak-help" lang={lang}>
                  {t.rvNameHelp}
                </span>
                {e.name ? (
                  <span className="ak-help is-error" role="alert">
                    {tr(e.name)}
                  </span>
                ) : null}
              </label>
              <div>
                <span className="vc-l" id="vc-rl" lang={lang}>
                  {t.rvStars}
                  <em aria-hidden="true">*</em>
                </span>
                <input type="hidden" name="rating" value={rating || state.values.rating} />
                <div className="vc-rate" role="radiogroup" aria-labelledby="vc-rl">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      className={(rating || Number(state.values.rating)) >= n ? "on" : ""}
                      aria-checked={(rating || Number(state.values.rating)) === n}
                      aria-label={t.rvStar(n)}
                      onClick={() => setRating(n)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {e.rating ? (
                  <span className="ak-help is-error" role="alert">
                    {tr(e.rating)}
                  </span>
                ) : null}
              </div>
              <label className="ak-field">
                <span lang={lang}>
                  {t.rvBody}
                  <em aria-hidden="true">*</em>
                </span>
                <textarea
                  className={`ak-input ${e.body ? "is-error" : ""}`}
                  name="body"
                  placeholder={t.rvBodyPh}
                  defaultValue={state.values.body}
                  aria-required="true"
                  aria-invalid={Boolean(e.body)}
                />
                {e.body ? (
                  <span className="ak-help is-error" role="alert">
                    {tr(e.body)}
                  </span>
                ) : null}
              </label>
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: -9999,
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                }}
              >
                <input name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
            </div>
            <div className="vc-act">
              {pending ? (
                <button
                  type="button"
                  className="ak-btn ak-btn--sun"
                  disabled
                  aria-busy="true"
                  lang={lang}
                >
                  <span className="vc-spin" aria-hidden="true" />
                  {t.rvSending}
                </button>
              ) : (
                <button type="submit" className="ak-btn ak-btn--sun" lang={lang}>
                  {t.rvSend}
                </button>
              )}
              <button type="button" className="ak-btn ak-btn--line" onClick={onClose} lang={lang}>
                {t.rvCancel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** Home shows at most four reviews: one featured card and three in the column beside it. */
const MAX = 4;

/**
 * Home page customer reviews (owner concept, 2026-11-22, calmed down): a centred header with the
 * live average and count, a heritage photo with the featured review card over it, up to three more
 * reviews in a ruled column (a swipe rail on phones), and the invite to add yours. Owner,
 * 2026-11-22: no paging, and no sample placeholders in production; with no approved reviews yet
 * only the header and the invite show.
 */
export function HomeReviews({ reviews, stats }: { reviews: SiteReview[]; stats: SiteReviewStats }) {
  const { lang, t: all } = useLang();
  const t = all.home;
  const [open, setOpen] = useState(false);

  const items = reviews.slice(0, MAX);
  const feat = items[0];
  const rest = items.slice(1);
  const avg = stats.average.toFixed(1);

  return (
    <section className="sec vc hr" id="reviews" aria-labelledby="vc-h">
      <div className="wrap">
        <header className="hr-head">
          <span className="ak-eyebrow hr-eyebrow" lang={lang}>
            {t.rvEyebrow}
          </span>
          <h2 className="vc-h" id="vc-h" lang={lang}>
            {t.rvTitle}
          </h2>
          <p className="vc-lede" lang={lang}>
            {t.rvLede}
          </p>
          {stats.count > 0 ? (
            <p className="hr-sum">
              <Stars value={stats.average} />
              <span className="hr-avg" aria-label={t.rvAverage(avg)}>
                {avg}
                <small>/5</small>
              </span>
              <span className="hr-count" lang={lang}>
                {t.rvCount(stats.count)}
              </span>
            </p>
          ) : null}
        </header>

        {feat ? (
          <div className={`hr-body ${rest.length === 0 ? "solo" : ""}`}>
            <div className="hr-stage">
              <picture className="hr-photo">
                <img
                  src="/images/story/shared-800.webp"
                  srcSet="/images/story/shared-800.webp 800w, /images/story/shared-1400.webp 1400w"
                  sizes="(max-width: 720px) 100vw, 30vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <figure className="hr-feat">
                <span className="hr-mark" aria-hidden="true">
                  &ldquo;
                </span>
                <blockquote className="hr-q" lang="bn">
                  {feat.text}
                </blockquote>
                <Stars value={feat.s} />
                <Reply r={feat} />
                <figcaption>
                  <By r={feat} />
                </figcaption>
              </figure>
            </div>

            {rest.length > 0 ? (
              <ul className="hr-list">
                {rest.map((r, i) => (
                  <li key={i}>
                    <span className="hr-mark sm" aria-hidden="true">
                      &ldquo;
                    </span>
                    <p className="hr-q" lang="bn">
                      {r.text}
                    </p>
                    <Stars value={r.s} />
                    <Reply r={r} />
                    <By r={r} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="hr-cta">
          <p className="hr-invite" lang={lang}>
            {t.rvInvite}
          </p>
          <button
            type="button"
            className="ak-btn ak-btn--brand"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
            lang={lang}
          >
            {t.rvShare}
            <Icon name="arrow" />
          </button>
        </div>
      </div>

      {open ? <ReviewDialog onClose={() => setOpen(false)} /> : null}
    </section>
  );
}
