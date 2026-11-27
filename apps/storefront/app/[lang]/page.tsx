import Link from "next/link";
import { Container } from "@/components/container";
import { FeaturedPicks } from "@/components/featured-picks";
import { HomeReviews } from "@/components/home-reviews";
import { Icon } from "@/components/icon";
import { ShelfArt } from "@/components/shelf-art";
import {
  getBestsellerProductId,
  getCategories,
  getFeaturedProducts,
  getSiteReviews,
  getSiteReviewStats,
} from "@/lib/queries";
import { getDict } from "@/lib/i18n/dict";
import { localePath } from "@/lib/i18n/lang";
import { shopHref } from "@/lib/routes";
import { JsonLd } from "@/components/json-ld";
import { langOf, organizationJsonLd, pageMeta } from "@/lib/seo";
import { getShareCard } from "@/lib/share-card";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang = await langOf(params);
  const [title, description] = getDict(lang).meta.home;
  return pageMeta({
    title,
    description,
    path: "/",
    lang,
    card: await getShareCard(lang, undefined, undefined, "home"),
  });
}

const PROMISES = [
  ["Heritage recipes", "ঐতিহ্যবাহী রেসিপি"],
  ["Stone-ground spices", "শিলে বাটা মসলা"],
  ["Wood-pressed mustard oil", "ঘানি ভাঙা সরিষার তেল"],
  ["No preservatives", "প্রিজারভেটিভ ছাড়া"],
] as const;

const DISC = [
  { cls: "f ak-blot" },
  { cls: "b ak-blot v2" },
  { cls: "f ak-blot v3" },
  { cls: "b ak-blot" },
] as const;

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  // Mirror rule (owner, 2026-11-16): each site's own language is the main copy; the small accent
  // lines (eyebrows, the second product or shelf name) are in the other language.
  const all = getDict(lang);
  const t = all.home;
  const en = lang === "en";
  const href = (p: string) => localePath(lang, p);
  const [shelves, featured, reviews, reviewStats, bestsellerId] = await Promise.all([
    getCategories(),
    getFeaturedProducts(3),
    getSiteReviews(),
    getSiteReviewStats(),
    getBestsellerProductId(),
  ]);

  return (
    <main className="page-home">
      {/* The site's only Organization block: brand identity and official profiles (lib/seo.ts). */}
      <JsonLd data={organizationJsonLd(lang)} />
      {/* Hero: full-bleed still life (owner, 2026-11-20). Desktop image from 721px, phone image below. */}
      <section className="hero hero-photo" aria-labelledby="hero-h">
        <picture className="hero-bg">
          <source
            media="(max-width: 720px)"
            srcSet="/images/hero/hero-mobile-720.webp 720w, /images/hero/hero-mobile-1080.webp 1080w"
            sizes="100vw"
          />
          <img
            src="/images/hero/hero-desktop-1440.webp"
            srcSet="/images/hero/hero-desktop-1440.webp 1440w, /images/hero/hero-desktop-2400.webp 2400w"
            sizes="100vw"
            alt={t.heroAlt}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <Container className="hero-copy">
          <span className="hero-eyebrow" lang={lang}>
            {t.heroEyebrow}
          </span>
          <h1 className="h-xl" id="hero-h" lang={lang}>
            {t.heroTitle}
          </h1>
          <p className="lede" lang={lang}>
            {t.heroLede}
          </p>
          <div className="cta" lang={lang}>
            <Link className="ak-btn ak-btn--brand" href={href(shopHref())}>
              {t.shop}{" "}
              <span className="ak-ico">
                <Icon name="arrow" />
              </span>
            </Link>
            <Link className="ak-btn ak-btn--text" href={href("/our-story")}>
              {t.how}
            </Link>
          </div>
          <p className="hero-note" lang={lang}>
            <span className="hero-note-rule" aria-hidden="true">
              <Icon name="leaf" />
            </span>
            {t.heroNote}
          </p>
        </Container>
        <div className="ak-deckle deck-b" aria-hidden="true" />
      </section>

      {/* Shop by shelf */}
      {shelves.length > 0 ? (
        <section className="sec" aria-labelledby="pantry-h">
          <Container className="pantry">
            <div>
              <span className="ak-eyebrow" lang={lang}>
                {t.shelfEyebrow}
              </span>
              {en ? (
                <h2 className="h-l" id="pantry-h" lang="en">
                  Heritage pickles
                </h2>
              ) : (
                <h2 className="h-l" id="pantry-h" lang="bn">
                  ঐতিহ্যের আচারসমূহ
                </h2>
              )}
              <p className="lede only-desk" lang={lang}>
                {t.shelfLede}
              </p>
              <div className="only-desk" style={{ marginTop: 24 }}>
                <Link className="ak-btn ak-btn--text" href={href(shopHref())} lang={lang}>
                  {t.shopAll}
                </Link>
              </div>
            </div>
            {/* Owner decision (2026-11-09): no "Shop →" under each disc; the whole disc is the link. */}
            <div className="discs">
              {shelves.map((s, i) => (
                <Link key={s.slug} className="disc" href={href(shopHref(s.slug))}>
                  <span className={`db ${DISC[i % 4]?.cls ?? ""}`}>
                    <ShelfArt slug={s.slug} imageUrl={s.imageUrl} />
                  </span>
                  {/* Both shelf names; the page language first (as product names). */}
                  {en || !s.nameBn ? (
                    <>
                      <span className="dn" lang="en">
                        {s.name}
                      </span>
                      {s.nameBn ? (
                        <span className="dbn" lang="bn">
                          {s.nameBn}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <span className="dn" lang="bn">
                        {s.nameBn}
                      </span>
                      <span className="dbn" lang="en">
                        {s.name}
                      </span>
                    </>
                  )}
                </Link>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* Featured picks (owner mockup, 2026-11-21): replaces the "From our shelf" band. */}
      <FeaturedPicks products={featured} bestsellerId={bestsellerId} lang={lang} />

      {/* Story */}
      <section className="sec" id="story" aria-labelledby="story-h">
        <Container className="story">
          <div className="story-ph">
            {/* Story photo (owner, 2026-11-22 heritage restyle): Nobabi Lassi on travertine, olive green; wide on desktop, tall on phones. */}
            <picture className="slot">
              <source media="(max-width: 720px)" srcSet="/images/home/story-mobile-900.webp" />
              <img
                src="/images/home/story-900.webp"
                srcSet="/images/home/story-900.webp 900w, /images/home/story-1400.webp 1400w"
                sizes="(max-width: 720px) 100vw, 55vw"
                alt={t.kitchenAlt}
                loading="lazy"
                decoding="async"
              />
            </picture>
          </div>
          <div>
            <span className="ak-eyebrow" lang={lang}>
              {t.storyEyebrow}
            </span>
            <h2 className="h-l" id="story-h" lang={lang}>
              {t.storyTitle}
            </h2>
            <p className="first" lang={lang}>
              <span className="only-desk">{t.storyDesk}</span>
              <span className="only-mob">{t.storyMob}</span>
            </p>
            <ul className="promises">
              {PROMISES.map(([enText, bn], i) => (
                <li key={enText}>
                  <span className="n">0{i + 1}</span>
                  {/* Both lines; the page language first. */}
                  <span>
                    <b lang={lang}>{en ? enText : bn}</b>
                    <span lang={en ? "bn" : "en"}>{en ? bn : enText}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link className="ak-btn ak-btn--line go" href={href("/our-story")} lang={lang}>
              {t.readStory} <Icon name="arrow" />
            </Link>
          </div>
        </Container>
      </section>

      <HomeReviews reviews={reviews} stats={reviewStats} />
    </main>
  );
}
