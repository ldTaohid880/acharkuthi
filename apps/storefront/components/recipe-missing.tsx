"use client";

import Link from "next/link";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { RecipeCardLink } from "@/components/recipes-view";
import { useLang } from "@/lib/i18n/lang-context";
import type { RecipeCard } from "@/lib/recipe-view";

/** Unknown recipe (RecipeDetail.dc.html / RecipeDetailMobile.dc.html, view "missing"), in the page language. */
export function RecipeMissing({ related }: { related: RecipeCard[] }) {
  const { lang, t: all, href } = useLang();
  const t = all.recipes;
  return (
    <>
      <Container>
        <div className="rd-miss" role="alert">
          <div className="eb ak-blot v2" aria-hidden="true">
            <Icon name="jar" />
          </div>
          <h2 lang={lang}>{t.missH}</h2>
          <p lang={lang}>{t.missP}</p>
          <div className="acts">
            <Link className="ak-btn ak-btn--brand" href={href("/recipes") as never} lang={lang}>
              {t.allBtn}
            </Link>
            <Link className="ak-btn ak-btn--line" href={href("/shop") as never} lang={lang}>
              {t.missShop}
            </Link>
          </div>
        </div>
      </Container>
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
                href={href("/recipes") as never}
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
    </>
  );
}
