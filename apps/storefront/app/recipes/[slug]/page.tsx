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
import { Photo, RecipeCardLink } from "@/components/recipes-view";
import { formatWeight, defaultVariant } from "@/lib/product-view";
import { getRecipeBySlug, getRelatedRecipes } from "@/lib/recipe-queries";
import { RECIPE_CATEGORY_LABEL, levelLabel, tipLines, toBn } from "@/lib/recipe-view";
import { productHref } from "@/lib/routes";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getRecipeBySlug((await params).slug);
  if (!found) return { title: "Recipe not found" };
  return { title: found.recipe.title, description: found.recipe.subtitle };
}

type FoundRecipe = NonNullable<Awaited<ReturnType<typeof getRecipeBySlug>>>;

/** The lookup runs before any Suspense boundary, so an unknown slug gets a real 404 status. */
export default async function RecipePage({ params }: Props) {
  const found = await getRecipeBySlug((await params).slug);
  if (!found) notFound();
  return (
    <Suspense fallback={<RecipeSkeleton />}>
      <RecipeDetail found={found} />
    </Suspense>
  );
}

async function RecipeDetail({ found }: { found: FoundRecipe }) {
  const { recipe, product } = found;
  const related = await getRelatedRecipes(recipe);

  const ingredients = recipe.ingredients ?? [];
  const steps = recipe.steps ?? [];
  const tips = recipe.tips ?? [];
  const variant = product ? defaultVariant(product.variants) : undefined;

  const metaCells: { label: string; value: string; dots?: boolean }[] = [];
  if (recipe.prepMinutes !== null) metaCells.push({ label: "প্রস্তুতি", value: `${toBn(recipe.prepMinutes)} মিনিট` });
  if (recipe.cookMinutes !== null) metaCells.push({ label: "রান্না", value: `${toBn(recipe.cookMinutes)} মিনিট` });
  metaCells.push({ label: "মোট সময়", value: `${toBn(recipe.totalMinutes)} মিনিট` });
  if (recipe.servings !== null) metaCells.push({ label: "পরিবেশন", value: `${toBn(recipe.servings)} জন` });
  metaCells.push({ label: "কাঠিন্য", value: levelLabel(recipe.difficulty), dots: true });

  const sampleNote = recipe.isSample ? (
    <p className="rd-sample" lang="bn">
      <span>
        <b>নমুনা রেসিপি।</b> সময়, পরিমাণ ও ধাপ এখনো রান্না করে যাচাই করা হয়নি। চূড়ান্ত রেসিপি
        অনুমোদনের পর বদলাবে।
      </span>
    </p>
  ) : null;
  const acts = (
    <div className="rd-acts">
      <PrintButton />
      {ingredients.length > 0 ? (
        <a className="ak-btn ak-btn--line" href="#ing" lang="bn">
          উপকরণে যান
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
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <Link href="/recipes">Recipes</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page" lang="bn">
                {recipe.title}
              </span>
            </nav>
            <div className="rd-topgrid">
              <div>
                <span className="ak-eyebrow" lang="bn">
                  রেসিপি · {RECIPE_CATEGORY_LABEL[recipe.category]}
                </span>
                <h1 id="rd-h" lang="bn">
                  {recipe.title}
                </h1>
                <p className="en">{recipe.subtitle}</p>
                {recipe.summary ? (
                  <p className="lede" lang="bn">
                    {recipe.summary}
                  </p>
                ) : null}
                <div className="only-desk">
                  {sampleNote}
                  {acts}
                </div>
              </div>
              <Photo r={recipe} ratio="4 / 3" />
            </div>
            <div className="rd-meta" role="list" aria-label="রেসিপির তথ্য">
              {metaCells.map((c) => (
                <div key={c.label} role="listitem">
                  <small lang="bn">{c.label}</small>
                  <b lang="bn">{c.value}</b>
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
            <div className="rd-info" aria-label="টিপস ও পরিবেশন">
              {tips.map((t, i) => {
                const lines = tipLines(t.text);
                return (
                  <details key={t.title} open={i === 0}>
                    <summary lang="bn">{t.title}</summary>
                    {lines ? (
                      <ul lang="bn">
                        {lines.map((l) => (
                          <li key={l}>{l}</li>
                        ))}
                      </ul>
                    ) : (
                      <p lang="bn">{t.text}</p>
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
                  <span className="lbl" id="pair-h" lang="bn">
                    এই খাবারের সাথে
                  </span>
                  <h3 lang="bn">{product.nameBn ?? product.name}</h3>
                  {product.nameBn ? <div className="en">{product.name}</div> : null}
                  <div className="pr">
                    {formatTaka(variant.price)}
                    {variant.weightGrams !== null ? <small>{formatWeight(variant.weightGrams)}</small> : null}
                  </div>
                  {recipe.isSample ? (
                    <p className="why" lang="bn">
                      নমুনা জুটি: রেসিপি পাতার পরিবেশন-ধারণা অনুযায়ী। চূড়ান্ত নিশ্চিতকরণ বাকি।
                    </p>
                  ) : null}
                </div>
                <div className="cta">
                  <Link className="ak-btn ak-btn--line" href={productHref(product.slug)} lang="bn">
                    পণ্য দেখুন <Icon name="arrow" />
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
                  <span className="ak-eyebrow">আরও রেসিপি · More recipes</span>
                  <h2 className="h2-bn" id="rel-h" lang="bn">
                    আরও কিছু রান্নার গল্প
                  </h2>
                </div>
                <Link className="ak-btn ak-btn--line" href="/recipes" style={{ minHeight: 48 }} lang="bn">
                  সব রেসিপি
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
