import type { Metadata } from "next";
import Link from "next/link";
import { shopHref } from "@/lib/routes";

export const metadata: Metadata = { title: "Service unavailable" };

/** The design's "temporarily unavailable" screen. Nothing links here yet; it is ready for when a feature is paused. */
export default function UnavailablePage() {
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
              সাময়িকভাবে বন্ধ
            </span>
            <h1 lang="bn" id="er-h">
              এই মুহূর্তে সেবাটি পাওয়া যাচ্ছে না
            </h1>
            <p className="msg" lang="bn">
              কিছুক্ষণের জন্য এই সুবিধাটি ব্যবহার করা যাচ্ছে না। কত সময় লাগবে তা এখনই বলা যাচ্ছে
              না। একটু পরে আবার চেষ্টা করুন।
            </p>
            <p className="en">This is temporary. Nothing you did caused it.</p>
            <div className="er-acts">
              <Link className="ak-btn ak-btn--brand" href="/unavailable" lang="bn">
                আবার চেষ্টা করুন
              </Link>
              <Link className="ak-btn ak-btn--line" href={shopHref()} lang="bn">
                দোকানে ফিরে যান
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
