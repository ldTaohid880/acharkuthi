import Link from "next/link";
import { Icon } from "@/components/icon";
import { OrderList, OrdersEmpty } from "@/components/account/order-list";
import { getAccountOrders, getAccountProfile, requireUser } from "@/lib/account";
import type { Dict } from "@/lib/i18n/dict";
import { getDict } from "@/lib/i18n/dict";
import { localePath } from "@/lib/i18n/lang";
import { langOf } from "@/lib/seo";

const quick = (t: Dict["account"]): { href: string; t: string; s: string }[] => [
  { href: "/account/orders", t: t.myOrders, s: t.ordersHint },
  { href: "/account/addresses", t: t.addresses, s: t.addressesHint },
  { href: "/account/reviews", t: t.myReviews, s: t.reviewsHint },
  { href: "/account/settings", t: t.settings, s: t.settingsHint },
];

/** Account overview (Account.dc.html, view "overview"). */
export default async function AccountPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getDict(lang).account;
  const href = (p: string) => localePath(lang, p);
  const user = await requireUser("/account", lang);
  const [p, recent] = await Promise.all([
    getAccountProfile(user.id),
    getAccountOrders(user.id, 2, lang),
  ]);
  return (
    <div>
      <h1 className="h1a" lang={lang}>
        {t.hello(p.name)}
      </h1>
      <p className="sub" lang={lang}>
        {t.overviewSub}
      </p>
      <ul className="qlinks">
        {quick(t).map((q) => (
          <li key={q.href}>
            <Link className="ql" href={href(q.href)}>
              <span>
                <b lang={lang}>{q.t}</b>
                <small lang={lang}>{q.s}</small>
              </span>
              <Icon name="arrow" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="sech">
        <h2 lang={lang}>{t.recent}</h2>
        {recent.length > 0 && (
          <Link className="lk" href={href("/account/orders")} lang={lang}>
            {t.allOrders}
          </Link>
        )}
      </div>
      {recent.length > 0 ? (
        <OrderList orders={recent} lang={lang} />
      ) : (
        <OrdersEmpty text={t.firstJar} lang={lang} />
      )}
    </div>
  );
}
