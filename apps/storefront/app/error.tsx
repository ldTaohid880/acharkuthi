"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** The design's "something went wrong" page. Retry re-renders the failed segment. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-error">
      <main className="er-main">
        <div className="wrap">
          <div className="er-copy card">
            <div className="er-ic calm ak-blot" style={{ width: 96, height: 92 }}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 12a8 8 0 1 1-2.5-5.8" />
                <path d="M20 4v5h-5" />
              </svg>
            </div>
            <span className="ak-eyebrow" lang="bn">
              সাময়িক সমস্যা
            </span>
            <h1 lang="bn" id="er-h">
              কিছু একটা সমস্যা হয়েছে।
            </h1>
            <p className="msg" lang="bn">
              এই মুহূর্তে পাতাটি দেখানো যাচ্ছে না। আবার চেষ্টা করুন।
            </p>
            <p className="en">Something went wrong on our side.</p>
            <div className="er-acts">
              <button
                type="button"
                className="ak-btn ak-btn--brand"
                aria-busy={busy}
                disabled={busy}
                lang="bn"
                onClick={() => {
                  setBusy(true);
                  reset();
                }}
              >
                {busy ? <span className="er-spin" aria-hidden="true" /> : null}
                {busy ? "আবার চেষ্টা হচ্ছে…" : "আবার চেষ্টা করুন"}
              </button>
              <Link className="ak-btn ak-btn--line" href="/" lang="bn">
                হোমে ফিরে যান
              </Link>
            </div>
            <p className="er-help" lang="bn">
              সমস্যা থেকে গেলে আমাদের জানান: <Link href="/contact">যোগাযোগ করুন</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
