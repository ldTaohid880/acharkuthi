import type { Metadata } from "next";
import Link from "next/link";
import { getDict } from "@/lib/i18n/dict";
import { localePath } from "@/lib/i18n/lang";
import { shopHref } from "@/lib/routes";
import { langOf } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  return { title: getDict(await langOf(params)).meta.unavailable, robots: { index: false } };
}

/** The design's "temporarily unavailable" screen. Nothing links here yet; it is ready for when a feature is paused. */
export default async function UnavailablePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getDict(lang).errors;
  const other = lang === "en" ? "bn" : "en";
  const href = (p: string) => localePath(lang, p);
  return (
    <div className="page-unavail">
      <main className="er-main">
        <div className="wrap">
          <div className="er-copy card">
            <div className="er-ic pause ak-blot v3" style={{ width: 96, height: 92 }}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M10 9v6M14 9v6" />
              </svg>
            </div>
            <span className="ak-eyebrow" lang="bn">
              {t.unEyebrow}
            </span>
            <h1 lang={lang} id="er-h">
              {t.unTitle}
            </h1>
            <p className="msg" lang={lang}>
              {t.unMsg}
            </p>
            <p className="en" lang={other}>
              {t.unAccent}
            </p>
            <div className="er-acts">
              <Link
                className="ak-btn ak-btn--brand"
                href={href("/unavailable") as never}
                lang={lang}
              >
                {t.retry}
              </Link>
              <Link className="ak-btn ak-btn--line" href={href(shopHref()) as never} lang={lang}>
                {t.unShop}
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
