import Link from "next/link";
import { formatTaka } from "@repo/ui/lib/utils";
import { formatBnDate, statusView, type TrackedOrder } from "@/lib/track";
import { Icon } from "./icon";

/** Track.dc.html result view. No hooks: rendered by the server page (owner) and by the lookup form (guest). */
export function TrackResult({ order, fromAccount }: { order: TrackedOrder; fromAccount: boolean }) {
  const v = statusView(order.status);
  return (
    <div>
      {fromAccount && (
        <div className="acctbar">
          <span lang="bn">আপনার অ্যাকাউন্টের অর্ডার</span>
          <Link className="back" href={"/account/orders" as never}>
            <Icon name="arrow" />
            <span lang="bn">আমার অর্ডারে ফিরুন</span>
          </Link>
        </div>
      )}
      <div className="tk-sumbar">
        <dl>
          <div>
            <dt lang="bn">অর্ডার নম্বর</dt>
            <dd>{order.orderNumber}</dd>
          </div>
          <div>
            <dt lang="bn">অর্ডারের তারিখ</dt>
            <dd lang="bn">{formatBnDate(new Date(order.createdAt))}</dd>
          </div>
          <div>
            <dt lang="bn">পেমেন্ট</dt>
            <dd lang="bn">{order.cod ? "ক্যাশ অন ডেলিভারি" : "অনলাইন পেমেন্ট"}</dd>
          </div>
          <div>
            <dt lang="bn">আনুমানিক ডেলিভারি</dt>
            <dd lang="bn">{v.showsEta && order.etaDate ? formatBnDate(order.etaDate) : "–"}</dd>
          </div>
        </dl>
        <span className={`badge ${v.badge}`.trim()} lang="bn" role="status">
          {v.title}
        </span>
      </div>
      <p className="tk-next" lang="bn">
        <b>{v.lead}</b> {v.next}
      </p>
      {v.stages && (
        <ol className="tl" aria-label="অর্ডারের ধাপ">
          {v.stages.map((s) => (
            <li key={s.en} className={s.cls} aria-current={s.current ? "step" : undefined}>
              <span className="mk" aria-hidden="true">
                {s.mark}
              </span>
              <div className="lb" lang="bn">
                {s.bn}
              </div>
              <div className="en">{s.en}</div>
              <div className="nt2" lang="bn">
                {s.note}
              </div>
            </li>
          ))}
        </ol>
      )}
      {v.exception && (
        <div className={v.exception.soft ? "exc soft" : "exc"} role="status">
          <h3 lang="bn">{v.exception.title}</h3>
          <p lang="bn">{v.exception.body}</p>
          <p lang="bn">
            <Link href={v.exception.href}>{v.exception.link}</Link>
          </p>
        </div>
      )}
      <div className="tk-cols">
        <div>
          <section className="tk-sec" aria-labelledby="od-h">
            <h2 id="od-h" lang="bn">
              অর্ডারের পণ্য
            </h2>
            <ul className="ti">
              {order.items.map((it, i) => (
                <li key={it.id}>
                  <span className={i % 2 ? "th t2" : "th"}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- product photos and the local jar SVG */}
                    <img src={it.image ?? "/jar.svg"} alt="" />
                  </span>
                  <div>
                    <b lang="bn">{it.name}</b>
                    <small lang="bn">
                      {[it.detail, `${formatTaka(it.unitPrice)} × ${it.quantity}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </div>
                  <span className="ln">{formatTaka(it.unitPrice * it.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="tot">
              <div lang="bn">
                <dt>পণ্যের মোট</dt>
                <dd>{formatTaka(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div lang="bn">
                  <dt>ডিসকাউন্ট</dt>
                  <dd>−{formatTaka(order.discount)}</dd>
                </div>
              )}
              <div lang="bn">
                <dt>ডেলিভারি চার্জ</dt>
                <dd>{formatTaka(order.shippingFee)}</dd>
              </div>
              <div className="f" lang="bn">
                <dt>মোট</dt>
                <dd>{formatTaka(order.total)}</dd>
              </div>
            </dl>
          </section>
        </div>
        <div>
          <section className="tk-sec" aria-labelledby="dl-h">
            <h2 id="dl-h" lang="bn">
              ডেলিভারির তথ্য
            </h2>
            <dl className="di">
              <div>
                <dt lang="bn">এলাকা</dt>
                <dd lang="bn">
                  {order.district ? `${order.district} জেলা` : "–"}{" "}
                  <small className="tk-muted">(পুরো ঠিকানা নিরাপত্তার জন্য দেখানো হয় না)</small>
                </dd>
              </div>
              <div>
                <dt lang="bn">পদ্ধতি</dt>
                <dd lang="bn">{order.inDhaka ? "ঢাকার ভেতরে ডেলিভারি" : "ঢাকার বাইরে ডেলিভারি"}</dd>
              </div>
              <div>
                <dt lang="bn">কুরিয়ার</dt>
                <dd lang="bn">{order.courierName ?? "এখনও নির্ধারিত হয়নি"}</dd>
              </div>
              <div>
                <dt lang="bn">ট্র্যাকিং রেফারেন্স</dt>
                <dd lang="bn">{order.trackingRef ?? "নেই"}</dd>
              </div>
            </dl>
          </section>
          <div className="help2">
            <h2 lang="bn">অর্ডার নিয়ে কোনো সমস্যা?</h2>
            <div className="acts">
              <Link className="ak-btn ak-btn--line" href="/contact" lang="bn">
                যোগাযোগ করুন
              </Link>
              <Link className="ak-btn ak-btn--text" href="/shop" lang="bn">
                আরও আচার দেখুন
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
