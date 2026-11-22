import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { PromiseIcon } from "@/components/promise-icon";
import { storyCopy } from "@/content/story-page";
import { getDict } from "@/lib/i18n/dict";
import { localePath } from "@/lib/i18n/lang";
import { productHref, shopHref } from "@/lib/routes";
import { langOf, pageMeta } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang = await langOf(params);
  const [title, description] = getDict(lang).meta.story;
  return pageMeta({
    title,
    description,
    path: "/our-story",
    lang,
  });
}

const IMG = "/images/story";

/** A photo band image: 800 / 1440 / 2400 wide WebP. */
function Wide({ name, alt, className }: { name: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static responsive WebP set
    <img
      className={className}
      src={`${IMG}/${name}-1440.webp`}
      srcSet={`${IMG}/${name}-800.webp 800w, ${IMG}/${name}-1440.webp 1440w, ${IMG}/${name}-2400.webp 2400w`}
      sizes="100vw"
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}

/** A 4:3 content photo: 800 / 1400 wide WebP. */
function Photo({ name, alt, sizes }: { name: string; alt: string; sizes: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static responsive WebP set
    <img
      src={`${IMG}/${name}-1400.webp`}
      srcSet={`${IMG}/${name}-800.webp 800w, ${IMG}/${name}-1400.webp 1400w`}
      sizes={sizes}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
}

/**
 * Our story (owner restyle, 2026-11-20): a mix of the Our story board and the owner's reference.
 * Dark photo bands carry the header, the philosophy and the close; light split bands and a craft
 * row carry the rest. One responsive markup for every width.
 */
export default async function OurStoryPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = storyCopy(lang);
  const href = (p: string) => localePath(lang, p);
  return (
    <div className="page-story">
      <main className="st" lang={lang}>
        {/* Header: full-bleed photo, copy on the shaded wall. */}
        <section className="st-hero" aria-labelledby="st-h">
          <picture className="st-bg">
            <source
              media="(max-width: 720px)"
              srcSet={`${IMG}/hero-mobile-720.webp 720w, ${IMG}/hero-mobile-1080.webp 1080w`}
              sizes="100vw"
            />
            <img
              src={`${IMG}/hero-1440.webp`}
              srcSet={`${IMG}/hero-1440.webp 1440w, ${IMG}/hero-2400.webp 2400w`}
              sizes="100vw"
              alt={t.heroAlt}
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <Container className="st-hero-in">
            <span className="st-eyebrow">{t.eyebrow}</span>
            <h1 id="st-h" className="st-h1">
              {t.title}
            </h1>
            <p className="st-lede">{t.lede}</p>
            <nav className="st-chapters" aria-label={t.eyebrow}>
              {t.chapters.map(([n, label], i) => (
                <a key={n} href={`#chapter-${i + 1}`}>
                  <span className="n">{n}</span>
                  {label}
                </a>
              ))}
            </nav>
          </Container>
        </section>

        {/* Chapter one: photo left, words right. */}
        <section className="st-split" id="chapter-1" aria-labelledby="c1-h">
          <figure className="st-split-img">
            <Photo name="lunch" alt={t.c1.alt} sizes="(max-width: 720px) 100vw, 50vw" />
          </figure>
          <div className="st-split-copy">
            <span className="st-eyebrow">{t.c1.eyebrow}</span>
            <h2 id="c1-h" className="st-h2">
              {t.c1.title}
            </h2>
            <p className="st-body">{t.c1.body}</p>
            <p className="st-quote">{t.c1.quote}</p>
          </div>
        </section>

        {/* Chapter two: the craft row. */}
        <section className="st-craft" id="chapter-2" aria-labelledby="c2-h">
          <Container>
            <div className="st-craft-head">
              <div>
                <span className="st-eyebrow">{t.craft.eyebrow}</span>
                <h2 id="c2-h" className="st-h2">
                  {t.craft.title}
                </h2>
              </div>
              <ul className="st-pills">
                {t.craft.pills.map((p, i) => (
                  <li key={p}>
                    <PromiseIcon index={i} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="st-cards">
              {t.craft.cards.map((c) => (
                <figure key={c.img} className="st-card">
                  <div className="st-card-img">
                    <Photo
                      name={c.img}
                      alt={c.alt}
                      sizes="(max-width: 720px) 100vw, (max-width: 980px) 50vw, 33vw"
                    />
                  </div>
                  <figcaption>
                    <h3>{c.title}</h3>
                    <p>{c.body}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </Container>
        </section>

        {/* Chapter three: dark photo band. */}
        <section className="st-band st-phil" id="chapter-3" aria-labelledby="c3-h">
          <Wide name="phil" alt={t.phil.alt} className="st-band-img" />
          <Container className="st-band-in">
            <span className="st-eyebrow">{t.phil.eyebrow}</span>
            <h2 id="c3-h" className="st-h2">
              {t.phil.title}
            </h2>
            <p className="st-body">{t.phil.lede}</p>
            <ol className="st-points">
              {t.phil.points.map(([h, p]) => (
                <li key={h}>
                  <h3>{h}</h3>
                  <p>{p}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        {/* The gift: words left, photo right. */}
        <section className="st-split st-split--rev" aria-labelledby="gift-h">
          <figure className="st-split-img">
            <Photo name="shared" alt={t.gift.alt} sizes="(max-width: 720px) 100vw, 50vw" />
          </figure>
          <div className="st-split-copy">
            <h2 id="gift-h" className="st-h2">
              {t.gift.title}
            </h2>
            <p className="st-body">{t.gift.body}</p>
          </div>
        </section>

        {/* Close: green photo band with the way to the shop. */}
        <section className="st-band st-close" aria-labelledby="c4-h">
          <Wide name="close" alt={t.close.alt} className="st-band-img" />
          <Container className="st-band-in">
            <span className="st-eyebrow">{t.close.eyebrow}</span>
            <h2 id="c4-h" className="st-h2">
              {t.close.title}
            </h2>
            <p className="st-body">{t.close.body}</p>
            <div className="st-cta">
              <Link className="ak-btn ak-btn--sun" href={href(shopHref())}>
                {t.close.shop}{" "}
                <span className="ak-ico">
                  <Icon name="arrow" />
                </span>
              </Link>
              <Link className="ak-btn ak-btn--text st-link" href={href(productHref("raw-mango"))}>
                {t.close.start}
              </Link>
            </div>
          </Container>
        </section>
      </main>
    </div>
  );
}
