import Link from "next/link";
import { formatTaka } from "@repo/ui/lib/utils";
import { placeName } from "@repo/validators";
import { getDict } from "@/lib/i18n/dict";
import { localePath, type Lang } from "@/lib/i18n/lang";
import { formatDate, statusView, type TrackedOrder } from "@/lib/track";
import { Icon } from "./icon";

/**
 * Track.dc.html result view. No hooks: rendered by the server page (owner) and by the lookup form
 * (guest), so the page language comes in as a prop.
 */
export function TrackResult({
  order,
  fromAccount,
  lang,
}: {
  order: TrackedOrder;
  fromAccount: boolean;
  lang: Lang;
}) {
  const t = getDict(lang).track;
  const to = (path: string) => localePath(lang, path);
  const v = statusView(order.status, order.handedOver, lang);
  const en = lang === "en";
  return (
    <div>
      {fromAccount && (
        <div className="acctbar">
          <span lang={lang}>{t.yourOrder}</span>
          <Link className="back" href={to("/account/orders")}>
            <Icon name="arrow" />
            <span lang={lang}>{t.backOrders}</span>
          </Link>
        </div>
      )}
      <div className="tk-sumbar">
        <dl>
          <div>
            <dt lang={lang}>{t.orderNo}</dt>
            <dd>{order.orderNumber}</dd>
          </div>
          <div>
            <dt lang={lang}>{t.date}</dt>
            <dd lang={lang}>{formatDate(new Date(order.createdAt), lang)}</dd>
          </div>
          <div>
            <dt lang={lang}>{t.payment}</dt>
            <dd lang={lang}>{order.cod ? t.cod : t.online}</dd>
          </div>
          <div>
            <dt lang={lang}>{t.eta}</dt>
            <dd lang={lang}>
              {v.showsEta && order.etaDate ? formatDate(order.etaDate, lang) : "–"}
            </dd>
          </div>
        </dl>
        <span className={`badge ${v.badge}`.trim()} lang={lang} role="status">
          {v.title}
        </span>
      </div>
      <p className="tk-next" lang={lang}>
        <b>{v.lead}</b> {v.next}
      </p>
      {v.stages && (
        <ol className="tl" aria-label={t.steps}>
          {v.stages.map((s) => (
            <li key={s.en} className={s.cls} aria-current={s.current ? "step" : undefined}>
              <span className="mk" aria-hidden="true">
                {s.mark}
              </span>
              {/* Both step names show, the page language first (as product names do). */}
              <div className="lb" lang={lang}>
                {en ? s.en : s.bn}
              </div>
              <div className="en" lang={en ? "bn" : "en"}>
                {en ? s.bn : s.en}
              </div>
              <div className="nt2" lang={lang}>
                {s.note}
              </div>
            </li>
          ))}
        </ol>
      )}
      {v.exception && (
        <div className={v.exception.soft ? "exc soft" : "exc"} role="status">
          <h3 lang={lang}>{v.exception.title}</h3>
          <p lang={lang}>{v.exception.body}</p>
          <p lang={lang}>
            <Link href={to(v.exception.href)}>{v.exception.link}</Link>
          </p>
        </div>
      )}
      <div className="tk-cols">
        <div>
          <section className="tk-sec" aria-labelledby="od-h">
            <h2 id="od-h" lang={lang}>
              {t.items}
            </h2>
            <ul className="ti">
              {order.items.map((it, i) => (
                <li key={it.id}>
                  <span className={i % 2 ? "th t2" : "th"}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- product photos and the local jar SVG */}
                    <img src={it.image ?? "/jar.svg"} alt="" />
                  </span>
                  <div>
                    <b lang={en ? "en" : "bn"}>{en ? it.nameEn : it.name}</b>
                    <small lang={lang}>
                      {[
                        en ? it.detailEn : it.detail,
                        `${formatTaka(it.unitPrice)} × ${it.quantity}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </div>
                  <span className="ln">{formatTaka(it.unitPrice * it.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="tot">
              <div lang={lang}>
                <dt>{t.subtotal}</dt>
                <dd>{formatTaka(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div lang={lang}>
                  <dt>{t.discount}</dt>
                  <dd>−{formatTaka(order.discount)}</dd>
                </div>
              )}
              <div lang={lang}>
                <dt>{t.fee}</dt>
                <dd>{formatTaka(order.shippingFee)}</dd>
              </div>
              <div className="f" lang={lang}>
                <dt>{t.total}</dt>
                <dd>{formatTaka(order.total)}</dd>
              </div>
            </dl>
          </section>
        </div>
        <div>
          <section className="tk-sec" aria-labelledby="dl-h">
            <h2 id="dl-h" lang={lang}>
              {t.deliveryInfo}
            </h2>
            <dl className="di">
              <div>
                <dt lang={lang}>{t.area}</dt>
                <dd lang={lang}>
                  {order.district ? t.district(placeName(order.district, lang)) : "–"}{" "}
                  <small className="tk-muted">{t.hidden}</small>
                </dd>
              </div>
              <div>
                <dt lang={lang}>{t.method}</dt>
                <dd lang={lang}>{order.inDhaka ? t.inDhaka : t.outDhaka}</dd>
              </div>
              <div>
                <dt lang={lang}>{t.courier}</dt>
                <dd lang={lang}>{order.courierName ?? t.noCourier}</dd>
              </div>
              <div>
                <dt lang={lang}>{t.ref}</dt>
                <dd lang={lang}>{order.trackingRef ?? t.noRef}</dd>
              </div>
            </dl>
          </section>
          <div className="help2">
            <h2 lang={lang}>{t.helpTitle}</h2>
            <div className="acts">
              <Link className="ak-btn ak-btn--line" href={to("/contact")} lang={lang}>
                {t.contactUs}
              </Link>
              <Link className="ak-btn ak-btn--text" href={to("/shop")} lang={lang}>
                {t.keep}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
