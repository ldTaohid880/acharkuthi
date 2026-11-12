"use client";

import { useActionState, useEffect, useState } from "react";
import { submitSiteReview, type SiteReviewState } from "@/app/actions/site-review";
import type { SiteReview } from "@/lib/queries";
import { Icon } from "./icon";

const A =
  "[Sample review text. A few sentences in the customer's own words about their overall experience with Acharkuthi will appear here, kept exactly as submitted.]";
const B = "[Sample review text. One or two sentences from a customer.]";
const C = "[Sample review text.]";
const D = "[Sample review text with a mixed experience. Critical feedback is shown, not hidden.]";

/** Shown until real approved reviews exist, exactly as the design's placeholders. */
const SAMPLE: SiteReview[] = [
  { who: "[Customer name]", s: 5, text: A, date: "[date]", ver: true },
  { who: "[Customer name]", s: 5, text: B, date: "[date]", ver: false },
  { who: "[Customer name]", s: 4, text: C, date: "[date]", ver: true },
  { who: "[Customer name]", s: 3, text: D, date: "[date]", ver: false },
  { who: "[Customer name]", s: 5, text: B, date: "[date]", ver: false },
  { who: "[Customer name]", s: 5, text: A, date: "[date]", ver: true },
];

const initialState: SiteReviewState = {
  status: "idle",
  errors: {},
  values: { name: "", rating: "", body: "" },
};

function Stars({ value }: { value: number }) {
  return (
    <span className="vc-st" role="img" aria-label={`Rating ${value} of 5`}>
      <span className="b" aria-hidden="true">
        ★★★★★
      </span>
      <span className="f" aria-hidden="true" style={{ width: `${value * 20}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

function By({ r }: { r: SiteReview }) {
  return (
    <div className="vc-by">
      <span className="vc-av" aria-hidden="true">
        <span className="in">{r.who.replace(/^\[?/, "").charAt(0).toUpperCase() || "C"}</span>
      </span>
      <span>
        <b>{r.who}</b>
        <span className="vc-d">{r.date}</span>
        {r.ver ? <span className="vc-vf">Verified customer</span> : null}
      </span>
    </div>
  );
}

function ReviewDialog({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState(submitSiteReview, initialState);
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
        <button type="button" className="vc-x" aria-label="বন্ধ করুন" onClick={onClose}>
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
            <h3 className="vc-dt" id="vc-dt" lang="bn">
              ধন্যবাদ, আপনার রিভিউ পেয়েছি
            </h3>
            <p lang="bn">
              রিভিউটি জমা হয়েছে। এটি এখনই সাইটে দেখা নাও যেতে পারে, প্রকাশের আগে যাচাই লাগতে পারে।
            </p>
            <button type="button" className="ak-btn ak-btn--line" onClick={onClose} lang="bn">
              বন্ধ করুন
            </button>
          </div>
        ) : (
          <form action={action} noValidate>
            <span className="ak-eyebrow" lang="bn">
              Acharkuthi · সামগ্রিক অভিজ্ঞতা
            </span>
            <h3 className="vc-dt" id="vc-dt" lang="bn">
              আপনার অভিজ্ঞতা জানান
            </h3>
            <p className="vc-note" lang="bn">
              এটি Acharkuthi নিয়ে আপনার সামগ্রিক অভিজ্ঞতার রিভিউ, কোনো নির্দিষ্ট আচার নিয়ে নয়।{" "}
              <span style={{ color: "var(--error)" }}>*</span> চিহ্নিত ঘর আবশ্যক।
            </p>
            {state.status === "fail" ? (
              <div className="vc-alert" role="alert">
                <b lang="bn">রিভিউটি জমা দেওয়া যায়নি</b>
                <span lang="bn">আপনার লেখা এখানেই আছে। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।</span>
              </div>
            ) : null}
            {state.status === "invalid" && errCount > 0 ? (
              <div className="vc-alert" role="alert">
                <b lang="bn">{errCount}টি ঘর ঠিক করতে হবে</b>
                <span lang="bn">লাল চিহ্নিত ঘরগুলো দেখুন।</span>
              </div>
            ) : null}
            <div className="vc-fg">
              <label className="ak-field">
                <span lang="bn">
                  আপনার নাম<em aria-hidden="true">*</em>
                </span>
                <input
                  className={`ak-input ${e.name ? "is-error" : ""}`}
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="যে নামে দেখাতে চান"
                  defaultValue={state.values.name}
                  aria-required="true"
                  aria-invalid={Boolean(e.name)}
                />
                <span className="ak-help" lang="bn">
                  এই নামটি রিভিউয়ের পাশে দেখা যেতে পারে।
                </span>
                {e.name ? (
                  <span className="ak-help is-error" role="alert">
                    {e.name}
                  </span>
                ) : null}
              </label>
              <div>
                <span className="vc-l" id="vc-rl" lang="bn">
                  Acharkuthi-কে কত তারকা দেবেন?<em aria-hidden="true">*</em>
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
                      aria-label={`${n} star`}
                      onClick={() => setRating(n)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {e.rating ? (
                  <span className="ak-help is-error" role="alert">
                    {e.rating}
                  </span>
                ) : null}
              </div>
              <label className="ak-field">
                <span lang="bn">
                  আপনার অভিজ্ঞতা<em aria-hidden="true">*</em>
                </span>
                <textarea
                  className={`ak-input ${e.body ? "is-error" : ""}`}
                  name="body"
                  placeholder="অর্ডার, ডেলিভারি, স্বাদ, যোগাযোগ, যেভাবে ভালো লাগে লিখুন"
                  defaultValue={state.values.body}
                  aria-required="true"
                  aria-invalid={Boolean(e.body)}
                />
                {e.body ? (
                  <span className="ak-help is-error" role="alert">
                    {e.body}
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
                  lang="bn"
                >
                  <span className="vc-spin" aria-hidden="true" />
                  জমা হচ্ছে…
                </button>
              ) : (
                <button type="submit" className="ak-btn ak-btn--sun" lang="bn">
                  রিভিউ জমা দিন
                </button>
              )}
              <button type="button" className="ak-btn ak-btn--line" onClick={onClose} lang="bn">
                বাতিল
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** Home page "overall experience" section: a featured review, two more, paging, and a form to add yours. */
export function HomeReviews({ reviews }: { reviews: SiteReview[] }) {
  const sample = reviews.length === 0;
  const all = sample ? SAMPLE : reviews;
  const [page, setPage] = useState(0);
  const [mob, setMob] = useState(0);
  const [open, setOpen] = useState(false);

  const pages = Math.max(1, Math.ceil(all.length / 3));
  const pg = Math.min(page, pages - 1);
  const items = all.slice(pg * 3, pg * 3 + 3);
  const feat = items[0];
  const rest = items.slice(1);
  const cur = all[Math.min(mob, all.length - 1)];

  const cta = (
    <div className="vc-cta">
      <button
        type="button"
        className="ak-btn ak-btn--brand"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        lang="bn"
      >
        আপনার অভিজ্ঞতা জানান
      </button>
    </div>
  );
  const note = sample ? (
    <p className="vc-sample">
      <span className="vc-chip">Sample content</span>
      <span>Demonstration reviews, not real customers.</span>
    </p>
  ) : null;

  return (
    <section className="sec vc" id="reviews" aria-labelledby="vc-h">
      <div className="wrap vc-grid vc-desk">
        <div>
          <span className="ak-eyebrow">Overall experience</span>
          <h2 className="vc-h" id="vc-h" lang="bn">
            আপনাদের <span className="ak-brush">ভালোবাসায়</span>
          </h2>
          <p className="vc-lede" lang="bn">
            Acharkuthi নিয়ে যাঁরা নিজের কথা লিখেছেন, তাঁদের কয়েকজনের কথা।
          </p>
          {cta}
          <div className="vc-nav" role="group" aria-label="Browse customer reviews">
            <button
              type="button"
              className="p"
              aria-label="Previous reviews"
              aria-disabled={pg === 0}
              onClick={() => setPage(Math.max(0, pg - 1))}
            >
              <Icon name="arrow" />
            </button>
            <span className="vc-pos" aria-live="polite">
              {pg + 1} / {pages}
            </span>
            <button
              type="button"
              aria-label="Next reviews"
              aria-disabled={pg === pages - 1}
              onClick={() => setPage(Math.min(pages - 1, pg + 1))}
            >
              <Icon name="arrow" />
            </button>
          </div>
          {note}
        </div>
        <div>
          {feat ? (
            <figure className="vc-feat" style={{ margin: 0 }}>
              <Stars value={feat.s} />
              <blockquote className="vc-q" style={{ marginLeft: 0, marginRight: 0 }} lang="bn">
                {feat.text}
              </blockquote>
              <figcaption>
                <By r={feat} />
              </figcaption>
            </figure>
          ) : null}
          <ul className="vc-rest">
            {rest.map((r, i) => (
              <li key={i}>
                <Stars value={r.s} />
                <p className="vc-q" lang="bn">
                  {r.text}
                </p>
                <By r={r} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="g vc-mob">
        <span className="ak-eyebrow">Overall experience</span>
        <h2 className="vc-h" lang="bn">
          আপনাদের <span className="ak-brush">ভালোবাসায়</span>
        </h2>
        <p className="vc-lede" lang="bn">
          Acharkuthi নিয়ে যাঁরা নিজের কথা লিখেছেন, তাঁদের কয়েকজনের কথা।
        </p>
        {cur ? (
          <figure className="vc-mq" style={{ marginLeft: 0, marginRight: 0 }}>
            <Stars value={cur.s} />
            <blockquote className="vc-q" style={{ marginLeft: 0, marginRight: 0 }} lang="bn">
              {cur.text}
            </blockquote>
            <figcaption>
              <By r={cur} />
            </figcaption>
          </figure>
        ) : null}
        <div className="vc-nav" role="group" aria-label="Browse customer reviews">
          <button
            type="button"
            className="p"
            aria-label="Previous review"
            aria-disabled={mob === 0}
            onClick={() => setMob(Math.max(0, mob - 1))}
          >
            <Icon name="arrow" />
          </button>
          <span className="vc-dots" aria-hidden="true">
            {all.map((_, i) => (
              <i key={i} className={i === mob ? "on" : ""} />
            ))}
          </span>
          <span className="sr" aria-live="polite">
            {mob + 1} / {all.length}
          </span>
          <button
            type="button"
            aria-label="Next review"
            aria-disabled={mob >= all.length - 1}
            onClick={() => setMob(Math.min(all.length - 1, mob + 1))}
          >
            <Icon name="arrow" />
          </button>
        </div>
        {note}
        {cta}
      </div>

      {open ? <ReviewDialog onClose={() => setOpen(false)} /> : null}
    </section>
  );
}
