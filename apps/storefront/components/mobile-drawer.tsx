"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { shopHref, soon } from "@/lib/routes";
import { useBasketUi } from "@/lib/basket-ui";
import { Icon } from "./icon";
import { shelfIcon, shelfLabelBn } from "./shelf-icon";

interface Shelf {
  slug: string;
  name: string;
}

const PAGES = [
  ["/", "হোম"],
  ["/our-story", "আমাদের গল্প"],
  ["/recipes", "রেসিপি"],
  ["/contact", "যোগাযোগ"],
] as const;

const HELP = [
  ["/track", "অর্ডার ট্র্যাক করুন"],
  ["/faq", "প্রশ্নোত্তর"],
  ["/shipping-policy", "ডেলিভারি নীতি"],
  ["/return-refund-policy", "ফেরত ও রিফান্ড"],
  ["/privacy-policy", "গোপনীয়তা"],
  ["/terms-and-conditions", "শর্তাবলি"],
] as const;

/** Blot tint per tile, alternating like the desktop mega menu (.db.f / .db.b, v1-v3). */
const TILE = ["db f ak-blot", "db b ak-blot v2", "db f ak-blot v3", "db b ak-blot"] as const;

/**
 * Left drawer menu for phones. Redesigned at the user's request ("pickle shelf"): category tiles
 * first, then pages, a cash-on-delivery band, login and basket tiles, and help links.
 * Visual language (blots, field/band tints, display type) comes from the design system.
 */
export function MobileDrawer({
  id,
  open,
  onClose,
  shelves,
  count,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  shelves: Shelf[];
  count: number;
}) {
  const openBasket = useBasketUi((s) => s.openBasket);
  const pathname = usePathname();
  const inShop = pathname.startsWith("/shop") || pathname.startsWith("/pickles");

  return (
    <>
      <div className={`mn-s ${open ? "open" : ""}`} onClick={onClose} aria-hidden="true" />
      <aside
        id={id}
        className={`mn-d ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="মেনু"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="mn-h">
          <Link
            className="ak-logo"
            href="/"
            aria-label="Acharkuthi হোম"
            style={{ height: 36 }}
            onClick={onClose}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand art */}
            <img src="/brand/mark-96.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand art */}
            <img src="/brand/wordmark-80.png" alt="" style={{ height: 28 }} />
          </Link>
          <button type="button" className="ib" aria-label="মেনু বন্ধ করুন" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <ScrollArea className="mn-b">
          <section className="mn-shelf" aria-labelledby="mn-sh">
            <div className="mn-sh-h">
              <h2 id="mn-sh" lang="bn">
                আচারের তাক
              </h2>
              <Link
                className={`mn-all ${inShop ? "is-cur" : ""}`}
                href={shopHref()}
                lang="bn"
                onClick={onClose}
              >
                সব আচার <Icon name="arrow" />
              </Link>
            </div>
            <ul className="mn-tiles">
              {shelves.map((s, i) => {
                const href = shopHref(s.slug);
                return (
                  <li key={s.slug}>
                    <Link
                      className={`mn-tile ${pathname === href ? "is-cur" : ""}`}
                      href={href}
                      lang="bn"
                      onClick={onClose}
                    >
                      <span className={TILE[i % TILE.length]}>
                        <Icon name={shelfIcon(s.slug)} />
                      </span>
                      {shelfLabelBn(s.slug, s.name)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
          <nav aria-label="প্রধান মেনু">
            <ul className="mn-l">
              {PAGES.map(([href, label]) => (
                <li key={href} className={pathname === href ? "is-cur" : undefined}>
                  <Link
                    className="mn-a"
                    href={href === "/" || href === "/recipes" ? href : soon(href)}
                    lang="bn"
                    onClick={onClose}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mn-cod" lang="bn">
            {/* Brand line: Bangla take on the tagline "The taste of tradition." */}
            <Icon name="jar" />
            ঐতিহ্যের স্বাদ, প্রতিটি বয়ামে
          </p>
          <div className="mn-acts">
            <Link className="mn-act" href={soon("/account")} lang="bn" onClick={onClose}>
              <Icon name="user" />
              লগইন
            </Link>
            <button
              type="button"
              className="mn-act"
              onClick={() => {
                onClose();
                openBasket();
              }}
              aria-label={`ঝুড়ি, ${count} টি`}
            >
              <Icon name="basket" />
              <span lang="bn">ঝুড়ি</span>
              {count > 0 ? (
                <span className="mn-n" aria-hidden="true">
                  {count}
                </span>
              ) : (
                <span className="mn-e" lang="bn">
                  খালি
                </span>
              )}
            </button>
          </div>
          <nav className="mn-help" aria-labelledby="mn-hh">
            <h2 id="mn-hh" lang="bn">
              সাহায্য
            </h2>
            <ul>
              {HELP.map(([href, label]) => (
                <li key={href}>
                  <Link href={soon(href)} lang="bn" onClick={onClose}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}
