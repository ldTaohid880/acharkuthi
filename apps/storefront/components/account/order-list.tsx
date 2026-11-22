import Link from "next/link";
import { formatTaka } from "@repo/ui/lib/utils";
import { Icon } from "@/components/icon";
import type { AccountOrder } from "@/lib/account";
import { getDict } from "@/lib/i18n/dict";
import { localePath, type Lang } from "@/lib/i18n/lang";
import { ReorderButton } from "./reorder-button";

const trackHref = (lang: Lang, n: string) =>
  localePath(lang, `/track?order=${encodeURIComponent(n)}`);

/** Order cards (Account.dc.html; AccountStates.dc.html D). */
export function OrderList({ orders, lang }: { orders: AccountOrder[]; lang: Lang }) {
  const t = getDict(lang).account;
  return (
    <ul className="olist">
      {orders.map((o) => (
        <li key={o.number} className="oc">
          <div className="oc-h">
            <b>{o.number}</b>
            <span className={`st ${o.cls}`} lang={lang}>
              {o.status}
            </span>
          </div>
          <div className="oc-m">
            <span>{o.date}</span>
            <span className="tt">{formatTaka(o.total)}</span>
          </div>
          <div className="oc-a">
            <Link className="lk" href={trackHref(lang, o.number)} lang={lang}>
              {t.details}
            </Link>
            {o.track && (
              <Link className="lk" href={trackHref(lang, o.number)} lang={lang}>
                {t.track}
              </Link>
            )}
            {o.reorder && <ReorderButton orderNumber={o.number} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function OrdersEmpty({ text, lang }: { text: string; lang: Lang }) {
  const t = getDict(lang).account;
  const href = (p: string) => localePath(lang, p);
  return (
    <div className="empty">
      <span className="eic ak-blot v2" aria-hidden="true">
        <Icon name="jar" />
      </span>
      <b lang={lang}>{t.noOrders}</b>
      <p lang={lang}>{text}</p>
      <Link className="ak-btn ak-btn--brand sm2" href={href("/shop")} lang={lang}>
        {t.browse}
      </Link>
    </div>
  );
}
