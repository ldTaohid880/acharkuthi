import type { Metadata } from "next";
import Link from "next/link";
import { recipesQuery } from "@repo/validators";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { RecipesView } from "@/components/recipes-view";
import { getDict } from "@/lib/i18n/dict";
import { localePath } from "@/lib/i18n/lang";
import { getPickleLinks, getRecipeCards } from "@/lib/recipe-queries";
import { productHref } from "@/lib/routes";
import { langOf, pageMeta } from "@/lib/seo";
import { RECIPES_LIVE } from "@/lib/features";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang = await langOf(params);
  const [title, description] = getDict(lang).meta.recipes;
  return pageMeta({
    title,
    description,
    path: "/recipes",
    lang,
  });
}

/** The board's "Serving ideas" band: pairing copy is page text (dict recipes.pairs); the pickle link is a real product. */
const PAIRS = [
  {
    key: "khichuri",
    file: "pair-khichuri.jpg",
    alt: "Khichuri with mango pickle",
    dir: "Khichuri in a brass bowl with a spoonful of mango achar on the side.",
    pickle: "raw-mango",
  },
  {
    key: "porota",
    file: "pair-porota.jpg",
    alt: "Paratha with a hot pickle",
    dir: "Folded porota on a plate with a spicy pickle in a small saucer.",
    href: "/shop?heat=hot",
  },
  {
    key: "dal",
    file: "pair-dal-bhat.jpg",
    alt: "Dal and rice with a lemon pickle",
    dir: "Dal and rice with a lemon pickle on the rim of the plate, a green chili beside it.",
    pickle: "lemon",
  },
] as const;

export default async function RecipesPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, unknown>>;
}) {
  if (!RECIPES_LIVE) notFound();
  const [recipes, sp, lang] = await Promise.all([getRecipeCards(), searchParams, langOf(params)]);
  const t = getDict(lang).recipes;
  const en = lang === "en";
  const other = en ? "bn" : "en";
  const href = (p: string) => localePath(lang, p) as never;
  const query = recipesQuery.parse(sp);
  const pickles = await getPickleLinks(PAIRS.flatMap((p) => ("pickle" in p ? [p.pickle] : [])));

  return (
    <div className="page-recipes">
      <main>
        <section className="intro" aria-labelledby="rc-h">
          <Container className="intro-in">
            <div>
              <span className="ak-eyebrow" lang={lang}>
                {t.eyebrow}
              </span>
              {en ? (
                <h1 className="h1-bn" id="rc-h" lang="en">
                  <span className="l">Achar goes with</span>
                  <span className="l">
                    <span className="ak-brush">so much</span> more!
                  </span>
                </h1>
              ) : (
                <h1 className="h1-bn" id="rc-h" lang="bn">
                  <span className="l">আচারের সাথে</span>
                  <span className="l">
                    আরও <span className="ak-brush">কত কিছু</span>!
                  </span>
                </h1>
              )}
              <p className="ak-aside-l aside" lang={other}>
                {t.aside}
              </p>
              <p className="lede-bn" lang={lang}>
                {t.lede}
              </p>
              <p className="lede-en" lang={other}>
                {t.ledeAccent}
              </p>
            </div>
            <figure style={{ margin: 0, position: "relative" }}>
              <div
                className="ph"
                role="img"
                aria-label="A steel plate of khichuri with a small bowl of achar"
              >
                <div className="ph-in">
                  <svg
                    className="x"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M0 0L100 100M100 0L0 100"
                      stroke="#c4c3a5"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                      fill="none"
                    />
                  </svg>
                </div>
                <span className="dir">
                  <b>recipes-intro.jpg · 5:4</b>A steel plate of steaming khichuri, a small bowl of
                  achar and a wedge of lemon. Warm window light.
                </span>
              </div>
            </figure>
          </Container>
        </section>

        <RecipesView recipes={recipes} initialQuery={query} />

        <section className="pair" aria-labelledby="pi-h">
          <div className="ak-deckle deck-t" aria-hidden="true" />
          <Container>
            <div className="pair-head">
              <div>
                <span className="ak-eyebrow" lang={lang}>
                  {t.pairEyebrow}
                </span>
                <h2 className="h2-bn" id="pi-h" lang={lang}>
                  {t.pairH}
                </h2>
                <p className="h2-en" lang={other}>
                  {t.pairSub}
                </p>
              </div>
              <p className="intro-p" lang={lang}>
                {t.pairIntro}
              </p>
            </div>
            <div className="pairs">
              {PAIRS.map((p) => {
                const pickle = "pickle" in p ? pickles.get(p.pickle) : undefined;
                const [title, text] = t.pairs[p.key];
                const link = pickle
                  ? {
                      href: href(productHref(pickle.slug)),
                      label: en ? pickle.name : (pickle.nameBn ?? pickle.name),
                    }
                  : "href" in p
                    ? { href: href(p.href), label: t.spicy }
                    : null;
                return (
                  <article className="pr" key={p.file}>
                    <div className="ph" role="img" aria-label={p.alt}>
                      <div className="ph-in">
                        <svg
                          className="x"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M0 0L100 100M100 0L0 100"
                            stroke="#c4c3a5"
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                            fill="none"
                          />
                        </svg>
                      </div>
                      <span className="dir">
                        <b>{p.file}</b>
                        {p.dir}
                      </span>
                    </div>
                    <span className="tg idea" lang={lang}>
                      {t.idea}
                    </span>
                    <h3 lang={lang}>{title}</h3>
                    <p lang={lang}>{text}</p>
                    {link ? (
                      <Link
                        className="pl"
                        href={link.href}
                        lang={pickle && !en && pickle.nameBn ? "bn" : lang}
                      >
                        {link.label} <Icon name="arrow" />
                      </Link>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </Container>
        </section>

        <section className="close" aria-labelledby="rz-h">
          <Container className="close-in">
            <div>
              <span className="ak-eyebrow" lang="en">
                {t.closeEyebrow}
              </span>
              <h2 className="h2-bn" id="rz-h" lang={lang}>
                {t.closeH}
              </h2>
              <p className="h2-en" lang={other}>
                {t.closeSub}
              </p>
              <p className="p-en" lang={lang}>
                {t.closeP}
              </p>
            </div>
            <div className="cta-col">
              <Link
                className="ak-btn ak-btn--sun"
                href={href("/shop")}
                style={{ minHeight: 52 }}
                lang={lang}
              >
                {t.shop}{" "}
                <span className="ak-ico">
                  <Icon name="arrow" />
                </span>
              </Link>
              <Link className="ak-btn ak-btn--text" href={href("/our-story")} lang={lang}>
                {t.story}
              </Link>
            </div>
          </Container>
        </section>
      </main>
    </div>
  );
}
