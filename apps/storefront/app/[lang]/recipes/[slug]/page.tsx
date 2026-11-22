import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatTaka } from "@repo/ui/lib/utils";
import { Icon } from "@/components/icon";
import { Container } from "@/components/container";
import { PrintButton } from "@/components/print-button";
import { RecipeBody } from "@/components/recipe-body";
import { RecipeSkeleton } from "@/components/recipe-skeleton";
import { formatWeight, defaultVariant } from "@/lib/product-view";
import { Photo, RecipeCardLink } from "@/components/recipes-view";
import { getDict } from "@/lib/i18n/dict";
import { localePath, type Lang } from "@/lib/i18n/lang";
import { getRecipeBySlug, getRelatedRecipes } from "@/lib/recipe-queries";
import {
  levelWord,
  localIngredient,
  localStep,
  localTip,
  recipeText,
  tipLines,
} from "@/lib/recipe-view";
import { productHref, recipeHref } from "@/lib/routes";
import { langOf, pageMeta, realCopy } from "@/lib/seo";
import { RECIPES_LIVE } from "@/lib/features";

interface Props {
  params: Promise<{ lang: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getRecipeBySlug((await params).slug);
  const lang = await langOf(params);
  if (!found) return { title: getDict(lang).meta.recipeMissing };
  const { recipe } = found;
  const rt = recipeText(recipe, lang);
  return {
    ...pageMeta({
      title: rt.title.text,
      description: realCopy(rt.summary?.text) ?? rt.accent?.text ?? recipe.subtitle,
      path: recipeHref(recipe.slug),
      lang,
      image: recipe.imageUrl ? { url: recipe.imageUrl } : undefined,
      type: "article",
    }),
    // The design's placeholder recipes stay out of search engines and AI until real ones replace them.
    ...(recipe.isSample ? { robots: { index: false, follow: true } } : {}),
  };
}

type FoundRecipe = NonNullable<Awaited<ReturnType<typeof getRecipeBySlug>>>;

/** The lookup runs before any Suspense boundary, so an unknown slug gets a real 404 status. */
export default async function RecipePage({ params }: Props) {
  if (!RECIPES_LIVE) notFound();
  const found = await getRecipeBySlug((await params).slug);
  if (!found) notFound();
  return (
    <Suspense fallback={<RecipeSkeleton />}>
      <RecipeDetail found={found} lang={await langOf(params)} />
    </Suspense>
  );
}

async function RecipeDetail({ found, lang }: { found: FoundRecipe; lang: Lang }) {
  const { recipe, product } = found;
  const t = getDict(lang).recipes;
  const en = lang === "en";
  const href = (p: string) => localePath(lang, p) as never;
  const related = await getRelatedRecipes(recipe);

  // Stored text in the page language, item by item (Bangla where there is no English twin yet).
  const rt = recipeText(recipe, lang);
  const ingredients = (recipe.ingredients ?? []).map((i) => localIngredient(i, lang));
  const steps = (recipe.steps ?? []).map((s) => localStep(s, lang));
  const tips = (recipe.tips ?? []).map((tp) => localTip(tp, lang));
  const variant = product ? defaultVariant(product.variants) : undefined;

  const metaCells: { label: string; value: string; dots?: boolean }[] = [];
  if (recipe.prepMinutes !== null)
    metaCells.push({ label: t.prep, value: t.minsLong(recipe.prepMinutes) });
  if (recipe.cookMinutes !== null)
    metaCells.push({ label: t.cook, value: t.minsLong(recipe.cookMinutes) });
  metaCells.push({ label: t.total, value: t.minsLong(recipe.totalMinutes) });
  if (recipe.servings !== null)
    metaCells.push({ label: t.serves, value: t.people(recipe.servings) });
  metaCells.push({
    label: t.difficulty,
    value: levelWord(t.levels, recipe.difficulty),
    dots: true,
  });

  const sampleNote = recipe.isSample ? (
    <p className="rd-sample" lang={lang}>
      <span>
        <b>{t.sampleB}</b> {t.sampleT}
      </span>
    </p>
  ) : null;
  const acts = (
    <div className="rd-acts">
      <PrintButton />
      {ingredients.length > 0 ? (
        <a className="ak-btn ak-btn--line" href="#ing" lang={lang}>
          {t.jump}
        </a>
      ) : null}
    </div>
  );

  return (
    <div className="page-recipes page-rd">
      <main>
        <section className="rd-top" aria-labelledby="rd-h">
          <Container>
            <nav className="rd-crumbs" aria-label="Breadcrumb">
              <Link href={href("/")}>Home</Link>
              <span aria-hidden="true">/</span>
              <Link href={href("/recipes")}>Recipes</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page" lang={rt.title.lang}>
                {rt.title.text}
              </span>
            </nav>
            <div className="rd-topgrid">
              <div>
                <span className="ak-eyebrow" lang={lang}>
                  {t.tag} · {t.chips[recipe.category]}
                </span>
                <h1 id="rd-h" lang={rt.title.lang}>
                  {rt.title.text}
                </h1>
                {rt.accent ? (
                  <p className="en" lang={rt.accent.lang}>
                    {rt.accent.text}
                  </p>
                ) : null}
                {rt.summary ? (
                  <p className="lede" lang={rt.summary.lang}>
                    {rt.summary.text}
                  </p>
                ) : null}
                <div className="only-desk">
                  {sampleNote}
                  {acts}
                </div>
              </div>
              <Photo r={recipe} ratio="4 / 3" />
            </div>
            <div className="rd-meta" role="list" aria-label={t.metaAria}>
              {metaCells.map((c) => (
                <div key={c.label} role="listitem">
                  <small lang={lang}>{c.label}</small>
                  <b lang={lang}>{c.value}</b>
                  {c.dots ? (
                    <span className="lv" aria-hidden="true">
                      {[1, 2, 3].map((n) => (
                        <i key={n} className={recipe.difficulty >= n ? "on" : undefined} />
                      ))}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="only-mob rd-mobacts">
              {sampleNote}
              {acts}
            </div>
          </Container>
        </section>

        <RecipeBody
          slug={recipe.slug}
          isSample={recipe.isSample}
          baseServings={recipe.servings}
          ingredients={ingredients}
          steps={steps}
        >
          {tips.length > 0 ? (
            <div className="rd-info" aria-label={t.tipsAria}>
              {tips.map((t, i) => {
                const lines = tipLines(t.text);
                return (
                  <details key={t.title} open={i === 0}>
                    <summary lang={t.lang}>{t.title}</summary>
                    {lines ? (
                      <ul lang={t.lang}>
                        {lines.map((l) => (
                          <li key={l}>{l}</li>
                        ))}
                      </ul>
                    ) : (
                      <p lang={t.lang}>{t.text}</p>
                    )}
                  </details>
                );
              })}
            </div>
          ) : null}
          {product && variant ? (
            <section className="rd-pairw" aria-labelledby="pair-h">
              <div className="rd-pair">
                <div className="jar ak-blot v2" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local SVG still-life */}
                  <img src="/jar.svg" alt="" />
                </div>
                <div>
                  <span className="lbl" id="pair-h" lang={lang}>
                    {t.pairLbl}
                  </span>
                  {en || !product.nameBn ? (
                    <>
                      <h3 lang="en">{product.name}</h3>
                      {product.nameBn ? (
                        <div className="en" lang="bn">
                          {product.nameBn}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <h3 lang="bn">{product.nameBn}</h3>
                      <div className="en">{product.name}</div>
                    </>
                  )}
                  <div className="pr">
                    {formatTaka(variant.price)}
                    {variant.weightGrams !== null ? (
                      <small>{formatWeight(variant.weightGrams)}</small>
                    ) : null}
                  </div>
                  {recipe.isSample ? (
                    <p className="why" lang={lang}>
                      {t.pairWhy}
                    </p>
                  ) : null}
                </div>
                <div className="cta">
                  <Link
                    className="ak-btn ak-btn--line"
                    href={href(productHref(product.slug))}
                    lang={lang}
                  >
                    {t.viewProduct} <Icon name="arrow" />
                  </Link>
                </div>
              </div>
            </section>
          ) : null}
        </RecipeBody>

        {related.length > 0 ? (
          <section className="rd-relw" aria-labelledby="rel-h">
            <Container>
              <div className="rel-head">
                <div>
                  <span className="ak-eyebrow" lang={lang}>
                    {t.relEyebrow}
                  </span>
                  <h2 className="h2-bn" id="rel-h" lang={lang}>
                    {t.relH}
                  </h2>
                </div>
                <Link
                  className="ak-btn ak-btn--line"
                  href={href("/recipes")}
                  style={{ minHeight: 48 }}
                  lang={lang}
                >
                  {t.relAll}
                </Link>
              </div>
              <div className="rgw">
                <div className="rgrid rel-g">
                  {related.map((r) => (
                    <RecipeCardLink key={r.id} r={r} wide={false} />
                  ))}
                </div>
              </div>
            </Container>
          </section>
        ) : null}
      </main>
    </div>
  );
}
