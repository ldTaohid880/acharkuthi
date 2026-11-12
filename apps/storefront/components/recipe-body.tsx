"use client";

import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  SERVING_OPTIONS,
  groupIngredients,
  ingredientAmount,
  toBn,
  type IngredientLine,
} from "@/lib/recipe-view";

export interface BodyIngredient extends IngredientLine {
  group: string;
}
export interface BodyStep {
  title: string;
  text: string;
  time?: string | undefined;
  heat?: string | undefined;
  tip?: string | undefined;
  imageUrl?: string | undefined;
}

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

type Ticks = Record<number, boolean>;

/**
 * Ingredients and steps of RecipeDetail.dc.html: the servings scaler, tick-off ingredients and
 * steps with progress, and (phone only) the sticky "উপকরণ / প্রণালী" bar. Ticks live in the
 * browser only. `children` (tips and the pickle block) are server-rendered and sit after the steps.
 */
export function RecipeBody({
  slug,
  isSample,
  baseServings,
  ingredients,
  steps,
  children,
}: {
  slug: string;
  isSample: boolean;
  baseServings: number | null;
  ingredients: BodyIngredient[];
  steps: BodyStep[];
  children?: ReactNode;
}) {
  const base = baseServings ?? SERVING_OPTIONS[1];
  const [servings, setServings] = useState<number>(base);
  const [ingOn, setIngOn] = useState<Ticks>({});
  const [stepOn, setStepOn] = useState<Ticks>({});
  const [sec, setSec] = useState<"ing" | "stp">("ing");

  const flip = (set: Dispatch<SetStateAction<Ticks>>, i: number) =>
    set((m) => ({ ...m, [i]: !m[i] }));
  const go = (e: React.MouseEvent, id: "ing" | "stp") => {
    e.preventDefault();
    setSec(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const options: number[] = (SERVING_OPTIONS as readonly number[]).includes(base)
    ? [...SERVING_OPTIONS]
    : [...SERVING_OPTIONS, base].sort((a, b) => a - b);
  const groups = groupIngredients(ingredients.map((x, i) => ({ ...x, i })));
  const ingDone = ingredients.filter((_, i) => ingOn[i]).length;
  const stepDone = steps.filter((_, i) => stepOn[i]).length;
  const next = steps.findIndex((_, i) => !stepOn[i]);

  return (
    <>
      {steps.length > 0 && ingredients.length > 0 ? (
        <nav className="rd-sn only-mob" aria-label="রেসিপির অংশ">
          <a href="#ing" aria-current={sec === "ing"} onClick={(e) => go(e, "ing")} lang="bn">
            উপকরণ
          </a>
          <a href="#stp" aria-current={sec === "stp"} onClick={(e) => go(e, "stp")} lang="bn">
            প্রণালী
          </a>
          <span className="rd-prog" lang="bn" aria-hidden="true">
            <b>{toBn(stepDone)}</b>/{toBn(steps.length)}
          </span>
        </nav>
      ) : null}
      <div className="wrap rd-main">
        {ingredients.length > 0 ? (
          <aside className="rd-ingp" id="ing" aria-labelledby="ing-h">
            <div className="rd-head">
              <h2 className="rd-h2" id="ing-h" lang="bn">
                উপকরণ
              </h2>
              <p className="rd-sub" lang="bn">
                {toBn(servings)} জনের জন্য{isSample ? " · পরিমাণ নমুনা" : ""}
              </p>
            </div>
            <div className="rd-sv" role="group" aria-label="কত জনের জন্য">
              <span lang="bn">কত জন?</span>
              {options.map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={servings === o}
                  onClick={() => setServings(o)}
                  lang="bn"
                >
                  {toBn(o)} জন
                </button>
              ))}
            </div>
            <p className="rd-prog" aria-live="polite" lang="bn">
              <b>{toBn(ingDone)}</b> / {toBn(ingredients.length)} টি গোছানো হয়েছে
            </p>
            <div className="rd-bar" aria-hidden="true">
              <span style={{ width: `${Math.round((ingDone / ingredients.length) * 100)}%` }} />
            </div>
            {isSample ? (
              <div className="ph rd-ing-ph" role="img" aria-label="উপকরণের ছবি">
                <svg className="x" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <path
                    d="M0 0L100 100M100 0L0 100"
                    stroke="#c4c3a5"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    fill="none"
                  />
                </svg>
                <span className="dir">
                  <b>recipe-{slug}-ingredients.jpg · 16:10</b>
                </span>
              </div>
            ) : null}
            <ul className="rd-il" aria-labelledby="ing-h">
              {groups.map((g) => (
                <li key={g.group} className="rd-grp">
                  <p className="rd-gh" lang="bn">
                    {g.group}
                  </p>
                  <ul className="rd-il">
                    {g.items.map((it) => (
                      <li key={it.i} className={`rd-ing${ingOn[it.i] ? " is-on" : ""}`}>
                        <label className="rd-chk">
                          <input
                            type="checkbox"
                            checked={!!ingOn[it.i]}
                            onChange={() => flip(setIngOn, it.i)}
                          />
                          <span className="box" aria-hidden="true" />
                          <span className="nm">
                            <b lang="bn">{it.name}</b>
                            {it.note ? <small lang="bn">{it.note}</small> : null}
                          </span>
                          <span className="qt" lang="bn">
                            {ingredientAmount(it, servings, base)}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
        <section className="rd-steps" id="stp" aria-labelledby={steps.length > 0 ? "stp-h" : undefined}>
          {steps.length > 0 ? (
            <>
              <div className="rd-head">
                <div>
                  <h2 className="rd-h2" id="stp-h" lang="bn">
                    প্রস্তুত প্রণালী
                  </h2>
                  <p className="rd-sub" lang="bn">
                    {toBn(steps.length)}টি ধাপ · হয়ে গেলে টিক দিয়ে রাখুন
                  </p>
                </div>
                <div>
                  <p className="rd-prog" aria-live="polite" lang="bn">
                    <b>{toBn(stepDone)}</b> / {toBn(steps.length)} ধাপ সম্পন্ন
                  </p>
                  <div className="rd-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round((stepDone / steps.length) * 100)}%` }} />
                  </div>
                </div>
              </div>
              <ol className="rd-sl" aria-labelledby="stp-h">
                {steps.map((s, i) => {
                  const done = !!stepOn[i];
                  return (
                    <li
                      key={i}
                      className={`rd-st${done ? " is-done" : i === next ? " is-next" : ""}`}
                      id={`st${i + 1}`}
                    >
                      <div className={`rd-no ak-blot ${["", "v2", "v3"][i % 3]}`} aria-hidden="true">
                        <span>{toBn(i + 1)}</span>
                      </div>
                      <div className="rd-sb">
                        <h3 lang="bn">
                          <span className="sr">ধাপ {toBn(i + 1)}: </span>
                          {s.title}
                        </h3>
                        {s.time || s.heat ? (
                          <div className="rd-chips">
                            {s.time ? (
                              <span className="rd-tm" lang="bn">
                                {clock}
                                {s.time}
                              </span>
                            ) : null}
                            {s.heat ? (
                              <span className="rd-tm hot" lang="bn">
                                {s.heat}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        <p lang="bn">{s.text}</p>
                        {s.imageUrl ? (
                          <div className="ph rd-step-ph">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={s.imageUrl}
                              alt={s.title}
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
                        ) : null}
                        {s.tip ? (
                          <aside className="rd-note" lang="bn">
                            <b>ছোট্ট পরামর্শ: </b>
                            {s.tip}
                          </aside>
                        ) : null}
                        <label className="rd-done">
                          <input
                            type="checkbox"
                            checked={done}
                            onChange={() => flip(setStepOn, i)}
                          />
                          <span className="box" aria-hidden="true" />
                          <span lang="bn">{done ? "হয়ে গেছে" : "ধাপটি হয়ে গেলে টিক দিন"}</span>
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : null}
          {children}
        </section>
      </div>
    </>
  );
}
