import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@repo/auth";
import { trackOrderParam } from "@repo/validators";
import { TrackResult } from "@/components/track-result";
import { TrackView } from "@/components/track-view";
import { getDict } from "@/lib/i18n/dict";
import { localePath } from "@/lib/i18n/lang";
import { langOf } from "@/lib/seo";
import { ownedOrder } from "@/lib/track-server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  return { title: getDict(await langOf(params)).track.metaTitle, robots: { index: false } };
}

/**
 * Order tracking (Track.dc.html, TrackMobile.dc.html, TrackStates.dc.html).
 * Guests look up by order number + checkout email or phone. A signed-in owner opening
 * `/track?order=AK-…` from My Orders sees the result directly; anyone else gets the form.
 */
export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  const lang = await langOf(params);
  const t = getDict(lang).track;
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
        <Link href={localePath(lang, "/")}>{t.crumbHome}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t.crumb}</span>
      </nav>
      <div className="tk-head">
        <h1 className="tk-h1" lang={lang}>
          {t.title}
        </h1>
        <p className="tk-sub" lang={lang}>
          {t.sub}
        </p>
      </div>
      {owned ? (
        <TrackResult order={owned} fromAccount lang={lang} />
      ) : (
        <TrackView initialOrder={number.success ? number.data : ""} />
      )}
    </main>
  );
}
