import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@repo/auth";
import { trackOrderParam } from "@repo/validators";
import { TrackResult } from "@/components/track-result";
import { TrackView } from "@/components/track-view";
import { ownedOrder } from "@/lib/track-server";

export const metadata: Metadata = { title: "অর্ডার ট্র্যাক করুন", robots: { index: false } };

/**
 * Order tracking (Track.dc.html, TrackMobile.dc.html, TrackStates.dc.html).
 * Guests look up by order number + checkout email or phone. A signed-in owner opening
 * `/track?order=AK-…` from My Orders sees the result directly; anyone else gets the form.
 */
export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  const { order: raw } = await searchParams;
  const number = trackOrderParam.safeParse(typeof raw === "string" ? raw : "");
  let owned = null;
  if (number.success) {
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
    if (session) owned = await ownedOrder(number.data, session.user.id).catch(() => null);
  }
  return (
    <main className="wrap doc-main tk-main">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Track an order</span>
      </nav>
      <div className="tk-head">
        <h1 className="tk-h1" lang="bn">
          আপনার অর্ডার কোথায়?
        </h1>
        <p className="tk-sub" lang="bn">
          অর্ডারের বর্তমান অবস্থা জানতে নিচের তথ্য দিন।
        </p>
      </div>
      {owned ? <TrackResult order={owned} fromAccount /> : <TrackView initialOrder={number.success ? number.data : ""} />}
    </main>
  );
}
