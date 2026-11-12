import type { Route } from "next";
import Link from "next/link";
import { formatTaka } from "@repo/ui/lib/utils";
import { Icon } from "@/components/icon";
import type { AccountOrder } from "@/lib/account";
import { ReorderButton } from "./reorder-button";

const trackHref = (n: string) => `/track?order=${encodeURIComponent(n)}` as Route;

/** Order cards (Account.dc.html; AccountStates.dc.html D). */
export function OrderList({ orders }: { orders: AccountOrder[] }) {
  return (
    <ul className="olist">
      {orders.map((o) => (
        <li key={o.number} className="oc">
          <div className="oc-h">
            <b>{o.number}</b>
            <span className={`st ${o.cls}`} lang="bn">
              {o.status}
            </span>
          </div>
          <div className="oc-m">
            <span>{o.date}</span>
            <span className="tt">{formatTaka(o.total)}</span>
          </div>
          <div className="oc-a">
            <Link className="lk" href={trackHref(o.number)} lang="bn">
              বিস্তারিত দেখুন
            </Link>
            {o.track && (
              <Link className="lk" href={trackHref(o.number)} lang="bn">
                অর্ডার ট্র্যাক করুন
              </Link>
            )}
            {o.reorder && <ReorderButton orderNumber={o.number} />}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function OrdersEmpty({ text }: { text: string }) {
  return (
    <div className="empty">
      <span className="eic ak-blot v2" aria-hidden="true">
        <Icon name="jar" />
      </span>
      <b lang="bn">এখনও কোনো অর্ডার নেই</b>
      <p lang="bn">{text}</p>
      <Link className="ak-btn ak-btn--brand sm2" href="/shop" lang="bn">
        আচার দেখুন
      </Link>
    </div>
  );
}
