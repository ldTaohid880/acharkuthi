"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import type { AccountReview } from "@/lib/account";

const TABS = {
  product: {
    t: "পণ্যের রিভিউ",
    where: "এই রিভিউগুলো শুধু সংশ্লিষ্ট আচারের পাতায় দেখা যায়।",
    emptyT: "এখনও কোনো পণ্যের রিভিউ নেই",
    emptyS: "কেনা আচারের পাতা থেকে রিভিউ লিখতে পারবেন।",
    live: "পণ্যের পাতায় দেখা যায়",
  },
  overall: {
    t: "Acharkuthi নিয়ে রিভিউ",
    where: "এই রিভিউগুলো শুধু হোমপেজে দেখা যায়, কোনো নির্দিষ্ট আচারের সাথে যুক্ত নয়।",
    emptyT: "Acharkuthi নিয়ে এখনও কিছু লেখেননি",
    emptyS: "হোমপেজ থেকে আপনার সামগ্রিক অভিজ্ঞতা জানাতে পারবেন।",
    live: "হোমপেজে দেখা যায়",
  },
} as const;

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

/** Two separate review kinds behind tabs (Account.dc.html, view "reviews"). */
export function ReviewsView({
  product,
  overall,
}: {
  product: AccountReview[];
  overall: AccountReview[];
}) {
  const [tab, setTab] = useState<keyof typeof TABS>("product");
  const T = TABS[tab];
  const list = tab === "product" ? product : overall;
  return (
    <div>
      <h1 className="h1a" lang="bn">
        আমার রিভিউ
      </h1>
      <p className="sub" lang="bn">
        পণ্যের রিভিউ আর Acharkuthi নিয়ে রিভিউ আলাদা। দুটোই এখানে দেখতে পাবেন।
      </p>
      <div className="tabs2" role="tablist" aria-label="রিভিউয়ের ধরন">
        {(Object.keys(TABS) as (keyof typeof TABS)[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            className={tab === k ? "on" : ""}
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            lang="bn"
          >
            {TABS[k].t}
          </button>
        ))}
      </div>
      <p className="where" lang="bn">
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
                  <b lang="bn">{r.title}</b>
                  <span className="chip2" lang="bn">
                    {r.approved ? T.live : "যাচাইয়ের অপেক্ষায়"}
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
          <b lang="bn">{T.emptyT}</b>
          <p lang="bn">{T.emptyS}</p>
        </div>
      )}
    </div>
  );
}
