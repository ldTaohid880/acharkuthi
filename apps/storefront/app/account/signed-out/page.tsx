import Link from "next/link";

/** Signed out (Account.dc.html, view "out"; AccountStates.dc.html G). Public. */
export default function SignedOutPage() {
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
      <h1 lang="bn">সাইন আউট হয়েছে</h1>
      <p lang="bn">আবার দেখা হবে। গেস্ট হিসেবে অর্ডার করতে অ্যাকাউন্ট লাগে না।</p>
      <div className="acts">
        <Link className="ak-btn ak-btn--brand" href="/login?next=%2Faccount" lang="bn">
          আবার সাইন ইন করুন
        </Link>
        <Link className="ak-btn ak-btn--line" href="/shop" lang="bn">
          কেনাকাটা চালিয়ে যান
        </Link>
      </div>
    </div>
  );
}
