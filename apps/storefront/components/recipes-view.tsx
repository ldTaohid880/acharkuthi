"use client";

import Link, { useLinkStatus } from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { RecipesQuery } from "@repo/validators";
import { Icon } from "@/components/icon";
import { useLang } from "@/lib/i18n/lang-context";
import {
  RECIPE_CHIPS,
  applyRecipesQuery,
  levelWord,
  nextLimit,
  recipeText,
  type RecipeCard,
} from "@/lib/recipe-view";
import { recipeHref } from "@/lib/routes";

const PAGE = 6;

const clock = (
  <svg
    className="ico"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const chevron = (d: string) => (
  <svg
    className="ico"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

/** The design's photo slot: a real image when there is one, otherwise the crossed placeholder. */
export function Photo({
  r,
  ratio,
  className,
}: {
  r: RecipeCard;
  ratio?: string;
  className?: string;
}) {
  const alt = recipeText(r, useLang().lang).alt;
  const style = ratio ? { aspectRatio: ratio } : undefined;
  if (r.imageUrl) {
    return (
      <div className={`ph ${className ?? ""}`} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ph-img"
          src={r.imageUrl}
          alt={alt}
          loading="lazy"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    );
  }
  return (
    <div className={`ph ${className ?? ""}`} role="img" aria-label={alt} style={style}>
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
        <b>{r.imageFile}</b>
        {alt}
      </span>
    </div>
  );
}

export function Meta({ r }: { r: RecipeCard }) {
  const { lang, t: all } = useLang();
  const t = all.recipes;
  return (
    <div className="meta" lang={lang}>
      <span>
        {clock}
        {t.mins(r.totalMinutes)}
      </span>
      <span>
        <span className="lv" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <i key={n} className={r.difficulty >= n ? "on" : undefined} />
          ))}
        </span>
        {levelWord(t.levels, r.difficulty)}
      </span>
    </div>
  );
}

/** Shows "খুলছে…" while the recipe page loads (the board's opening state). */
function GoLabel() {
  const { pending } = useLinkStatus();
  const { lang, t } = useLang();
  return (
    <span className="go" data-pending={pending ? "" : undefined}>
      <span lang={lang}>{pending ? t.recipes.opening : t.recipes.view}</span>
      <Icon name="arrow" />
    </span>
  );
}

export function RecipeCardLink({ r, wide }: { r: RecipeCard; wide: boolean }) {
  const { lang, t: all, href } = useLang();
  const t = all.recipes;
  const rt = recipeText(r, lang);
  return (
    <Link
      className={`rc${wide ? " wide" : ""}`}
      href={href(recipeHref(r.slug))}
      // No aria-label: the name comes from the card's visible text (title, time, level), so
      // what a voice-control user reads out matches (WCAG 2.5.3).
    >
      <Photo r={r} />
      <span className="tg" lang={lang}>
        {t.tag} · {t.chips[r.category]}
      </span>
      <h3 lang={rt.title.lang}>{rt.title.text}</h3>
      {rt.accent ? <p lang={rt.accent.lang}>{rt.accent.text}</p> : null}
      <Meta r={r} />
      <GoLabel />
    </Link>
  );
}

export function RecipesView({
  recipes,
  initialQuery,
}: {
  recipes: RecipeCard[];
  initialQuery: RecipesQuery;
}) {
  const [cat, setCat] = useState(initialQuery.cat);
  const [quick, setQuick] = useState(initialQuery.quick);
  const [limit, setLimit] = useState(initialQuery.show ?? PAGE);
  const [fe, setFe] = useState(0);
  const { lang, t: all, href } = useLang();
  const t = all.recipes;
  const other = lang === "en" ? "bn" : "en";

  const featured = useMemo(
    () =>
      recipes
        .filter((r) => r.featuredOrder !== null)
        .sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0)),
    [recipes],
  );
  const list = useMemo(() => applyRecipesQuery(recipes, { cat, quick }), [recipes, cat, quick]);
  const shown = list.slice(0, limit);
  const total = list.length;

  const syncUrl = useCallback((next: { cat: string; quick: boolean; limit: number }) => {
    const sp = new URLSearchParams();
    if (next.cat !== "all") sp.set("cat", next.cat);
    if (next.quick) sp.set("quick", "1");
    if (next.limit > PAGE) sp.set("show", String(next.limit));
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, []);

  const update = (nextCat: typeof cat, nextQuick: boolean) => {
    setCat(nextCat);
    setQuick(nextQuick);
    setLimit(PAGE);
    syncUrl({ cat: nextCat, quick: nextQuick, limit: PAGE });
  };
  const more = () => {
    const l = nextLimit(limit);
    setLimit(l);
    syncUrl({ cat, quick, limit: l });
  };

  const f = featured.length > 0 ? featured[fe % featured.length] : undefined;
  const ft = f ? recipeText(f, lang) : undefined;
  const step = (d: number) => setFe((i) => (i + d + featured.length) % featured.length);

  return (
    <>
      {f ? (
        <section className="feat" aria-label={t.featAria}>
          <div className="wrap feat-in">
            <Photo r={f} ratio="4 / 3" />
            <article
              className="feat-card"
              style={{ transform: "rotate(-1.5deg)", transformOrigin: "center" }}
            >
              <span className="tg" lang={lang}>
                {t.featTag}
              </span>
              <h2 lang={ft?.title.lang}>{ft?.title.text}</h2>
              {ft?.accent ? (
                <p className="en" lang={ft.accent.lang}>
                  {ft.accent.text}
                </p>
              ) : null}
              {ft?.summary ? (
                <p className="d" lang={ft.summary.lang}>
                  {ft.summary.text}
                </p>
              ) : null}
              <Meta r={f} />
              <div className="feat-act">
                <Link
                  className="ak-btn ak-btn--brand"
                  href={href(recipeHref(f.slug))}
                  style={{ minHeight: 48 }}
                  lang={lang}
                >
                  {t.view}{" "}
                  <span className="ak-ico">
                    <Icon name="arrow" />
                  </span>
                </Link>
                {featured.length > 1 ? (
                  <div className="fnav" role="group" aria-label={t.featNav}>
                    <button type="button" aria-label={t.prev} onClick={() => step(-1)}>
                      {chevron("M15 6l-6 6 6 6")}
                    </button>
                    <span aria-live="polite">
                      {(fe % featured.length) + 1} / {featured.length}
                    </span>
                    <button type="button" aria-label={t.next} onClick={() => step(1)}>
                      {chevron("M9 6l6 6-6 6")}
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          </div>
        </section>
      ) : null}

      <section className="disc" id="all-recipes" aria-labelledby="rd-h">
        <div className="wrap">
          <div className="disc-head">
            <div>
              <span className="ak-eyebrow" lang={lang}>
                {t.browseEyebrow}
              </span>
              <h2 className="h2-bn" id="rd-h" lang={lang}>
                {t.browseH}
              </h2>
              <p className="h2-en" lang={other}>
                {t.browseSub}
              </p>
            </div>
            {recipes.some((r) => r.isSample) ? (
              <p className="sample" lang={lang}>
                {t.sample}
              </p>
            ) : null}
          </div>
          <div className="cats" role="group" aria-label={t.catAria}>
            {RECIPE_CHIPS.map((key) => (
              <button
                key={key}
                type="button"
                className={`ak-chip${cat === key ? " is-on" : ""}`}
                aria-pressed={cat === key}
                lang={lang}
                onClick={() => update(key, quick)}
              >
                {t.chips[key]}
              </button>
            ))}
            <span className="sep" aria-hidden="true" />
            <button
              type="button"
              className={`ak-chip${quick ? " is-on" : ""}`}
              aria-pressed={quick}
              lang={lang}
              onClick={() => update(cat, !quick)}
            >
              {t.quick}
            </button>
          </div>
          <div className="cnt" aria-live="polite">
            <b>{total}</b>
            <span lang={lang}>{t.countUnit}</span> ·{" "}
            <span lang={other}>{t.countAccent(total)}</span>
          </div>
          <div className="rgw">
            <div className="rgrid">
              {total === 0 ? (
                <div className="empty">
                  <div className="eb ak-blot v2" aria-hidden="true">
                    <Icon name="jar" />
                  </div>
                  <h3 lang={lang}>{t.emptyH}</h3>
                  <p lang={lang}>{t.emptyP}</p>
                  <button
                    type="button"
                    className="ak-btn ak-btn--brand"
                    style={{ minHeight: 48 }}
                    onClick={() => update("all", false)}
                    lang={lang}
                  >
                    {t.allBtn}
                  </button>
                </div>
              ) : (
                shown.map((r, i) => <RecipeCardLink key={r.id} r={r} wide={i % 5 === 0} />)
              )}
            </div>
          </div>
          {total > 0 ? (
            <div className="more">
              <div className="cnt" style={{ margin: 0 }} lang={lang}>
                {t.seen} <b>{shown.length}</b> / <b>{total}</b>
              </div>
              <div className="pg" aria-hidden="true">
                <span style={{ width: `${Math.round((shown.length / total) * 100)}%` }} />
              </div>
              {total > limit ? (
                <button
                  type="button"
                  className="ak-btn ak-btn--line"
                  style={{ minHeight: 50, padding: "0 30px" }}
                  onClick={more}
                  lang={lang}
                >
                  {t.more}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
