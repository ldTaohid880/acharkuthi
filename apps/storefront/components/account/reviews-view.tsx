"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import type { AccountReview } from "@/lib/account";
import type { Dict } from "@/lib/i18n/dict";
import { useLang } from "@/lib/i18n/lang-context";

const tabs = (t: Dict["account"]) => ({
  product: {
    t: t.prodTab,
    where: t.prodWhere,
    emptyT: t.prodEmpty,
    emptyS: t.prodEmptyText,
    live: t.prodLive,
  },
  overall: {
    t: t.siteTab,
    where: t.siteWhere,
    emptyT: t.siteEmpty,
    emptyS: t.siteEmptyText,
    live: t.siteLive,
  },
});
type TabKey = "product" | "overall";

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

/** Two separate review kinds behind tabs (Account.dc.html, view "reviews"). */
export function ReviewsView({
  product,
  overall,
}: {
  product: AccountReview[];
  overall: AccountReview[];
}) {
  const { lang, t: all } = useLang();
  const t = all.account;
  const TABS = tabs(t);
  const [tab, setTab] = useState<TabKey>("product");
  const T = TABS[tab];
  const list = tab === "product" ? product : overall;
  return (
    <div>
      <h1 className="h1a" lang={lang}>
        {t.myReviews}
      </h1>
      <p className="sub" lang={lang}>
        {t.reviewsSub}
      </p>
      <div className="tabs2" role="tablist" aria-label={t.reviewKinds}>
        {(["product", "overall"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            className={tab === k ? "on" : ""}
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            lang={lang}
          >
            {TABS[k].t}
          </button>
        ))}
      </div>
      <p className="where" lang={lang}>
        {T.where}
      </p>
      {list.length > 0 ? (
        <ul className="rvl">
          {list.map((r) => (
            <li key={r.id} className={`rv ${tab === "product" ? "prod" : "overall"}`}>
              <span className={`rvi ak-blot ${tab === "product" ? "" : "v2"}`} aria-hidden="true">
                <Icon name={tab === "product" ? "jar" : "sun"} />
              </span>
              <div>
                <div className="rv-t">
                  <b lang={lang}>{r.title}</b>
                  <span className="chip2" lang={lang}>
                    {r.approved ? T.live : t.pending}
                  </span>
                </div>
                <div className="rv-s">
                  <span className="rst" role="img" aria-label={`${r.rating} of 5`}>
                    {stars(r.rating)}
                  </span>
                  <span className="rd">{r.date}</span>
                </div>
                {r.text && <p className="rv-x">{r.text}</p>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <span className="eic ak-blot v2" aria-hidden="true">
            <Icon name="sun" />
          </span>
          <b lang={lang}>{T.emptyT}</b>
          <p lang={lang}>{T.emptyS}</p>
        </div>
      )}
    </div>
  );
}
