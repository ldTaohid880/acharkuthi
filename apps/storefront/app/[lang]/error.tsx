"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/lang-context";

/** The design's "something went wrong" page. Retry re-renders the failed segment. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const { lang, t: all, href } = useLang();
  const t = all.errors;
  const other = lang === "en" ? "bn" : "en";

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
              {t.eyebrow}
            </span>
            <h1 lang={lang} id="er-h">
              {t.title}
            </h1>
            <p className="msg" lang={lang}>
              {t.msg}
            </p>
            <p className="en" lang={other}>
              {t.accent}
            </p>
            <div className="er-acts">
              <button
                type="button"
                className="ak-btn ak-btn--brand"
                aria-busy={busy}
                disabled={busy}
                lang={lang}
                onClick={() => {
                  setBusy(true);
                  reset();
                }}
              >
                {busy ? <span className="er-spin" aria-hidden="true" /> : null}
                {busy ? t.retrying : t.retry}
              </button>
              <Link className="ak-btn ak-btn--line" href={href("/") as never} lang={lang}>
                {t.home}
              </Link>
            </div>
            <p className="er-help" lang={lang}>
              {t.help}
              <Link href={href("/contact") as never}>{t.contact}</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
