"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitProductReview, type ProductReviewState } from "@/app/actions/product-review";
import { Icon } from "./icon";

const SPICE = [
  ["low", "কম ঝাল"],
  ["ok", "ঠিক ঝাল"],
  ["high", "বেশি ঝাল"],
] as const;

const initial: ProductReviewState = { status: "idle", errors: {} };

const rateError = (r: number) => (r ? "" : "তারকা দিয়ে রেটিং বেছে নিন");
const textError = (t: string) =>
  t.trim().length === 0
    ? "আপনার অভিজ্ঞতা লিখুন"
    : t.trim().length < 10
      ? "আরেকটু বিস্তারিত লিখুন (কমপক্ষে ১০ অক্ষর)"
      : "";

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
    rating: tried ? rateError(rating) : "",
    body: touched || tried ? textError(body) : "",
    name: tried && !signedIn && !name.trim() ? "আপনার নাম লিখুন" : "",
  };
  const server = state.status === "invalid" && tried ? state.errors : {};
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
          lang="bn"
        >
          রিভিউ লিখুন
        </button>
      </div>
      {open ? (
        <div className="wr-ov" onClick={toggle}>
          <section
            className="wr"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wrh"
            onClick={(ev) => ev.stopPropagation()}
          >
            <button
              type="button"
              className="wr-x"
              aria-label="বন্ধ করুন"
              onClick={toggle}
              autoFocus
            >
              <Icon name="close" />
            </button>
            {done ? (
              <div className="wok" role="status">
                <div className="eb ak-blot v2" aria-hidden="true">
                  <Tick />
                </div>
                <h3 id="wrh" lang="bn">
                  ধন্যবাদ, রিভিউ জমা হয়েছে
                </h3>
                <p lang="bn">আপনার রিভিউ আমাদের কাছে পৌঁছেছে। অনুমোদনের পর এটি এখানে দেখা যাবে।</p>
                <div className="wr-act" style={{ justifyContent: "center" }}>
                  <button type="button" className="ak-btn ak-btn--line" onClick={toggle} lang="bn">
                    বন্ধ করুন
                  </button>
                </div>
              </div>
            ) : (
              <form
                action={action}
                noValidate
                onSubmit={(e) => {
                  setTried(true);
                  if (rateError(rating) || textError(body) || (!signedIn && !name.trim())) {
                    e.preventDefault();
                  }
                }}
              >
                <h3 id="wrh" lang="bn">
                  {productName}-এর রিভিউ
                </h3>
                <p className="ak-help" style={{ margin: "4px 0 0" }} lang="bn">
                  শুধু এই পণ্য নিয়ে লিখুন। <span style={{ color: "var(--error)" }}>*</span> চিহ্নিত
                  ঘর আবশ্যক।
                </p>
                <input type="hidden" name="productId" value={productId} />
                <input type="hidden" name="rating" value={rating || ""} />
                <input type="hidden" name="spice" value={spice} />
                <input type="text" name="website" tabIndex={-1} autoComplete="off" hidden />
                <div className="fg">
                  {signedIn ? null : (
                    <label className="ak-field">
                      <span lang="bn">
                        আপনার নাম<em aria-hidden="true">*</em>
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
                    <span style={{ font: "600 15px/1.3 var(--font-ui-bn)" }} lang="bn" id="rl">
                      রেটিং
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
                          aria-label={`${n} star`}
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
                    <span lang="bn">
                      রিভিউয়ের শিরোনাম <small>ঐচ্ছিক</small>
                    </span>
                    <input
                      className="ak-input"
                      type="text"
                      name="title"
                      maxLength={120}
                      placeholder="এক লাইনে সারকথা"
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
                    <span lang="bn">
                      আপনার রিভিউ<em aria-hidden="true">*</em>
                    </span>
                    <textarea
                      className={`ak-input ${err.body ? "is-error" : ""}`}
                      name="body"
                      maxLength={1500}
                      placeholder="স্বাদ, ঝাল, আপনি কীভাবে খেয়েছেন"
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
                    <span style={{ font: "600 15px/1.3 var(--font-ui-bn)" }} lang="bn">
                      ঝাল কেমন ছিল?{" "}
                      <small
                        style={{
                          font: "400 13px/1 var(--font-ui-bn)",
                          color: "var(--ink-muted)",
                          marginLeft: 6,
                        }}
                      >
                        ঐচ্ছিক
                      </small>
                    </span>
                    <div className="chipsrow" style={{ marginTop: 10 }}>
                      {SPICE.map(([k, label]) => (
                        <button
                          key={k}
                          type="button"
                          className={`ak-chip ${spice === k ? "is-on" : ""}`}
                          aria-pressed={spice === k}
                          onClick={() => setSpice((s) => (s === k ? "" : k))}
                          lang="bn"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={{ font: "600 15px/1.3 var(--font-ui-bn)" }} lang="bn">
                      ছবি{" "}
                      <small
                        style={{
                          font: "400 13px/1 var(--font-ui-bn)",
                          color: "var(--ink-muted)",
                          marginLeft: 6,
                        }}
                      >
                        ঐচ্ছিক
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
                        lang="bn"
                        onClick={() => {
                          if (photo) {
                            setPhoto(null);
                            if (fileRef.current) fileRef.current.value = "";
                          } else fileRef.current?.click();
                        }}
                      >
                        {photo ? "ছবি সরান" : "ছবি যোগ করুন"}
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
                    <b lang="bn">রিভিউ জমা দেওয়ার আগে ঘরগুলো ঠিক করুন</b>
                    <span lang="bn">আপনার লেখা সব থাকছে।</span>
                  </div>
                ) : null}
                {tried && state.status === "fail" && !pending ? (
                  <div className="carterr" role="alert" style={{ marginTop: 20 }}>
                    <b lang="bn">রিভিউ জমা দেওয়া যায়নি</b>
                    <span lang="bn">আপনার লেখা সব থাকছে। আবার চেষ্টা করুন।</span>
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
                      lang="bn"
                    >
                      <span className="spin" aria-hidden="true" />
                      জমা হচ্ছে…
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="ak-btn ak-btn--sun"
                      style={{ minHeight: 52 }}
                      lang="bn"
                    >
                      রিভিউ জমা দিন
                    </button>
                  )}
                  <button type="button" className="ak-btn ak-btn--line" onClick={toggle} lang="bn">
                    বাতিল
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
  return (
    <button
      type="button"
      className="ak-btn ak-btn--line"
      onClick={() => router.refresh()}
      lang="bn"
    >
      আবার চেষ্টা করুন
    </button>
  );
}
