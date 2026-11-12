import type { Metadata } from "next";
import Link from "next/link";
import { recipesQuery } from "@repo/validators";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { RecipesView } from "@/components/recipes-view";
import { getPickleLinks, getRecipeCards } from "@/lib/recipe-queries";
import { productHref } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Recipes",
  description: "Everyday meals, simple serving ideas and a few new ways to enjoy achar.",
};

/** The board's "Serving ideas" band: pairing copy is page text; the pickle link is a real product. */
const PAIRS = [
  {
    file: "pair-khichuri.jpg",
    alt: "Khichuri with mango pickle",
    dir: "Khichuri in a brass bowl with a spoonful of mango achar on the side.",
    title: "খিচুড়ির সাথে আমের আচার",
    text: "Sharp, tangy mango cuts through a rich, buttery khichuri.",
    pickle: "raw-mango",
  },
  {
    file: "pair-porota.jpg",
    alt: "Paratha with a hot pickle",
    dir: "Folded porota on a plate with a spicy pickle in a small saucer.",
    title: "পরোটার সাথে ঝাল আচার",
    text: "A little heat on warm, flaky porota is hard to beat.",
    label: "Spicy pickles",
    href: "/shop?heat=hot",
  },
  {
    file: "pair-dal-bhat.jpg",
    alt: "Dal and rice with a lemon pickle",
    dir: "Dal and rice with a lemon pickle on the rim of the plate, a green chili beside it.",
    title: "ডাল-ভাতের সাথে লেবুর আচার",
    text: "Gently sour lemon lifts the simplest plate of dal and rice.",
    pickle: "lemon",
  },
] as const;

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, unknown>>;
}) {
  const [recipes, sp] = await Promise.all([getRecipeCards(), searchParams]);
  const query = recipesQuery.parse(sp);
  const pickles = await getPickleLinks(
    PAIRS.flatMap((p) => ("pickle" in p ? [p.pickle] : [])),
  );

  return (
    <div className="page-recipes">
      <main>
        <section className="intro" aria-labelledby="rc-h">
          <Container className="intro-in">
            <div>
              <span className="ak-eyebrow" lang="bn">
                রেসিপি · Recipes
              </span>
              <h1 className="h1-bn" id="rc-h" lang="bn">
                <span className="l">আচারের সাথে</span>
                <span className="l">
                  আরও <span className="ak-brush">কত কিছু</span>!
                </span>
              </h1>
              <p className="ak-aside-l aside">So much more than a spoonful on the side.</p>
              <p className="lede-bn" lang="bn">
                রোজকার ভাত থেকে বিশেষ আয়োজন, আচার পাশে থাকলে সবই একটু বেশি মজার।
              </p>
              <p className="lede-en">
                Everyday meals, simple serving ideas and a few new ways to enjoy achar.
              </p>
            </div>
            <figure style={{ margin: 0, position: "relative" }}>
              <div
                className="ph"
                role="img"
                aria-label="A steel plate of khichuri with a small bowl of achar"
              >
                <div className="ph-in">
                  <svg className="x" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
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
              <span className="ak-hand-bn hn" lang="bn">
                পাতের পাশে একটু আচার
              </span>
            </figure>
          </Container>
        </section>

        <RecipesView recipes={recipes} initialQuery={query} />

        <section className="pair" aria-labelledby="pi-h">
          <div className="ak-deckle deck-t" aria-hidden="true" />
          <Container>
            <div className="pair-head">
              <div>
                <span className="ak-eyebrow">পরিবেশনের ধারণা · Serving ideas</span>
                <h2 className="h2-bn" id="pi-h" lang="bn">
                  পাতে যে জুটি জমে যায়
                </h2>
                <p className="h2-en">Good company on the plate</p>
              </div>
              <p className="intro-p">
                These are pairing ideas, not full recipes. Sample pairings, to be confirmed.
              </p>
            </div>
            <div className="pairs">
              {PAIRS.map((p) => {
                const pickle = "pickle" in p ? pickles.get(p.pickle) : undefined;
                const link = pickle
                  ? { href: productHref(pickle.slug), label: pickle.name }
                  : "href" in p
                    ? { href: p.href as never, label: p.label }
                    : null;
                return (
                  <article className="pr" key={p.file}>
                    <div className="ph" role="img" aria-label={p.alt}>
                      <div className="ph-in">
                        <svg className="x" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
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
                    <span className="tg idea">পরিবেশনের ধারণা</span>
                    <h3 lang="bn">{p.title}</h3>
                    <p>{p.text}</p>
                    {link ? (
                      <Link className="pl" href={link.href}>
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
              <span className="ak-eyebrow">Continue</span>
              <h2 className="h2-bn" id="rz-h" lang="bn">
                পাতের পাশে একটা বয়াম থাকুক
              </h2>
              <p className="h2-en">Keep a jar close to the table.</p>
              <p className="p-en">When you are ready for your next meal, the shelf is here.</p>
            </div>
            <div className="cta-col">
              <Link className="ak-btn ak-btn--sun" href="/shop" style={{ minHeight: 52 }}>
                Explore the shop{" "}
                <span className="ak-ico">
                  <Icon name="arrow" />
                </span>
              </Link>
              <Link className="ak-btn ak-btn--text" href="/our-story">
                Read our story
              </Link>
            </div>
          </Container>
        </section>
      </main>
    </div>
  );
}
