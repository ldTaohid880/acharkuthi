import Link from "next/link";
import { getDict } from "@/lib/i18n/dict";
import { localePath } from "@/lib/i18n/lang";
import { langOf } from "@/lib/seo";

/** Signed out (Account.dc.html, view "out"; AccountStates.dc.html G). Public. */
export default async function SignedOutPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getDict(lang).account;
  const href = (p: string) => localePath(lang, p);
  return (
    <div className="done" role="status" style={{ padding: "24px 0" }}>
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
      <h1 lang={lang}>{t.outTitle}</h1>
      <p lang={lang}>{t.outText}</p>
      <div className="acts">
        <Link className="ak-btn ak-btn--brand" href={href("/login?next=%2Faccount")} lang={lang}>
          {t.signInAgain}
        </Link>
        <Link className="ak-btn ak-btn--line" href={href("/shop")} lang={lang}>
          {t.keepShopping}
        </Link>
      </div>
    </div>
  );
}
