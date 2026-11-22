"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  HEAT_LEVELS,
  SHOP_SORTS,
  shopQuery,
  type ShopQuery,
} from "@repo/validators";
import { Container } from "@/components/container";
import { Heat, Icon } from "@/components/icon";
import { PriceRange } from "@/components/price-range";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { ProductCard } from "@/components/product-card";
import { ShopSheets } from "@/components/shop-sheets";
import { applyShopQuery, priceBounds, sizeOptions } from "@/lib/product-view";
import type { CatalogProduct } from "@/lib/queries";
import { localePath, splitLangPath, type Lang } from "@/lib/i18n/lang";
import { useLang } from "@/lib/i18n/lang-context";
import { pickText } from "@/lib/i18n/pick";
import { shopHref } from "@/lib/routes";
import { RECIPES_LIVE } from "@/lib/features";

// Sort labels, heat words and all copy come from lib/i18n/dict.ts (memory: storefront-bilingual).
const HEAT_PODS = { none: 0, mild: 1, medium: 2, hot: 3 } as const;
const HEAT_LABEL = { none: "Not spicy", mild: "Mild", medium: "Medium", hot: "Hot" } as const;

export interface ShopShelf {
  slug: string;
  name: string;
  nameBn?: string | null;
  /** English; `descriptionBn` is the Bangla twin (lib/i18n/pick falls back between them). */
  description: string | null;
  descriptionBn?: string | null;
  /** Shop header photo for this shelf, set in admin; null shows the default. */
  headerImageUrl?: string | null;
}

/** Default Shop header photo (All pickles, and shelves without their own). */
const HEADER = "/images/shop/header-1440.webp";

interface Props {
  /** Every active product. The shop is small, so filtering, sorting and paging run here. */
  products: CatalogProduct[];
  shelves: ShopShelf[];
  /** Shelf from the URL, or undefined for "All pickles". */
  initialShelf: string | undefined;
  initialQuery: ShopQuery;
}

type Patch = Partial<ShopQuery>;
type OnClick = (e: MouseEvent<HTMLAnchorElement>) => void;

/** URL for these filters. Defaults are omitted, so links stay short and shareable. */
/** A shelf slug, or `null` for all pickles. */
type Shelf = string | null | undefined;
const ALL_SHELVES = null;

function href(lang: Lang, shelf: string | undefined, q: ShopQuery): Route {
  const params = new URLSearchParams();
  if (q.sort !== "popular") params.set("sort", q.sort);
  for (const h of q.heat) params.append("heat", h);
  if (q.inStock) params.set("inStock", "1");
  if (q.minPrice !== undefined) params.set("minPrice", String(q.minPrice));
  if (q.maxPrice !== undefined) params.set("maxPrice", String(q.maxPrice));
  if (q.size) params.set("size", q.size);
  if (q.q) params.set("q", q.q);
  const qs = params.toString();
  const base = shopHref(shelf);
  return localePath(lang, qs ? `${base}?${qs}` : base) as Route;
}

/** Reads shelf + filters back from the address bar (Back / Forward). */
function fromLocation(shelves: ShopShelf[]): { shelf: string | undefined; query: ShopQuery } {
  const sp = new URLSearchParams(window.location.search);
  const raw: Record<string, unknown> = {};
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    raw[key] = all.length > 1 ? all : all[0];
  }
  // "/shop/mango" or "/en/shop/mango": the shelf follows "/shop/" either way.
  const seg = splitLangPath(window.location.pathname).path.split("/")[2];
  const shelf = seg && shelves.some((s) => s.slug === seg) ? seg : undefined;
  return { shelf, query: shopQuery.parse(raw) };
}

const NO_FILTERS: Patch = {
  heat: [],
  inStock: false,
  minPrice: undefined,
  maxPrice: undefined,
  size: undefined,
  q: undefined,
};

/**
 * Shop grid with filters, sort and "Load more" (Shop.dc.html / ShopMobile.dc.html). Every control
 * is still a real link (works without JavaScript and in a new tab), but a plain click updates the
 * list in place and rewrites the address bar instead of asking the server again.
 */
export function ShopView({ products, shelves, initialShelf, initialQuery }: Props) {
  const [shelfSlug, setShelfSlug] = useState(initialShelf);
  const [query, setQuery] = useState(initialQuery);
  const { lang, t: all } = useLang();
  const t = all.shop;
  /** Shelf name in the page language: short in chips and crumbs, full label in titles. */
  const shelfName = (s: ShopShelf) => (lang === "bn" ? (s.nameBn ?? s.name) : s.name);
  const shelfLabel = (s: ShopShelf) =>
    lang === "bn" ? (all.shelf.label[s.slug] ?? `${s.nameBn ?? s.name} আচার`) : s.name;

  // Back / Forward restore the filters that were in the address bar.
  useEffect(() => {
    const onPop = () => {
      const s = fromLocation(shelves);
      setShelfSlug(s.shelf);
      setQuery(s.query);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [shelves]);

  const shelf = shelves.find((s) => s.slug === shelfSlug);
  const shelfDesc = shelf ? pickText(lang, shelf.descriptionBn, shelf.description) : null;
  // Tab title follows the shelf (the server sets it on first load).
  useEffect(() => {
    // The brand in the page language, as the server's title template writes it.
    document.title = `${shelf ? t.titleShelf(shelfLabel(shelf)) : t.titleAll} | ${all.meta.site}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the title follows the shelf and language only
  }, [shelf, lang]);
  const inShelf = useMemo(
    () => (shelfSlug ? products.filter((p) => p.category?.slug === shelfSlug) : products),
    [products, shelfSlug],
  );
  const matching = useMemo(() => applyShopQuery(inShelf, query), [inShelf, query]);
  const bounds = useMemo(() => priceBounds(inShelf), [inShelf]);
  const sizes = useMemo(() => sizeOptions(inShelf), [inShelf]);
  // Owner (2026-11-22): no "Load more"; every jar is listed and card photos load lazily.
  const items = matching;
  const matched = matching.length;
  /** How many jars an option would show, keeping every other filter as it is. */
  const countWith = (patch: Patch) => applyShopQuery(inShelf, { ...query, ...patch }).length;

  /** The query after `patch`. */
  const nextQuery = (patch: Patch): ShopQuery => ({ ...query, ...patch });
  // `nextShelf`: omit to stay on this shelf; pass ALL_SHELVES (null) for all pickles. (A plain
  // `undefined` would fall back to the default and keep the current shelf.)
  const link = (patch: Patch, nextShelf: Shelf = shelfSlug) =>
    href(lang, nextShelf ?? undefined, nextQuery(patch));
  const apply = (patch: Patch, shelfArg: Shelf = shelfSlug) => {
    const nextShelf = shelfArg ?? undefined;
    const next = nextQuery(patch);
    const url = href(lang, nextShelf, next);
    if (nextShelf !== shelfSlug) {
      window.history.pushState(null, "", url);
    } else {
      window.history.replaceState(null, "", url);
    }
    setShelfSlug(nextShelf);
    setQuery(next);
  };
  /** onClick for a link: a plain click applies in place; a modified click opens the link. */
  const on =
    (patch: Patch, nextShelf: Shelf = shelfSlug): OnClick =>
    (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      apply(patch, nextShelf);
    };

  const lo = bounds ? Math.floor(bounds.min / 100) : 0;
  const hi = bounds ? Math.ceil(bounds.max / 100) : 0;
  const clearHref = link(NO_FILTERS, ALL_SHELVES);
  const clearAll = on(NO_FILTERS, ALL_SHELVES);

  const chips: { label: string; patch: Patch; shelf: Shelf }[] = [
    ...(query.q ? [{ label: `“${query.q}”`, patch: { q: undefined }, shelf: shelfSlug }] : []),
    ...query.heat.map((h) => ({
      label: t.heatChip(all.heat[HEAT_LABEL[h]]),
      patch: { heat: query.heat.filter((x) => x !== h) },
      shelf: shelfSlug,
    })),
    ...(query.inStock ? [{ label: t.inStock, patch: { inStock: false }, shelf: shelfSlug }] : []),
    ...(query.minPrice !== undefined || query.maxPrice !== undefined
      ? [
          {
            label: `৳${query.minPrice ?? lo}–৳${query.maxPrice ?? hi}`,
            patch: { minPrice: undefined, maxPrice: undefined },
            shelf: shelfSlug,
          },
        ]
      : []),
    ...(query.size ? [{ label: query.size, patch: { size: undefined }, shelf: shelfSlug }] : []),
  ];
  // Badge on the Filter button: one per active filter chip (the shelf is shown by the tabs).
  const filterCount = chips.length;

  /** Price from the slider or the From / To boxes, in whole taka; swapped if typed backwards. */
  const setPrice = (min: number | undefined, max: number | undefined) => {
    const clamp = (n: number | undefined) =>
      n === undefined || !Number.isFinite(n) ? undefined : Math.max(lo, Math.min(n, hi));
    let a = clamp(min);
    let b = clamp(max);
    if (a !== undefined && b !== undefined && a > b) [a, b] = [b, a];
    if (a === lo) a = undefined;
    if (b === hi) b = undefined;
    if (a !== query.minPrice || b !== query.maxPrice) apply({ minPrice: a, maxPrice: b });
  };
  const readBox = (v: string) => {
    const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
    return Number.isNaN(n) ? undefined : n;
  };

  return (
    <main className="page-shop" lang={lang}>
      {/* Photo header (owner redesign 2026-11-22, from the owner's concept): a short still life with
          the title on its left. A shelf shows its own name and description. */}
      <section className="sh-hero" aria-labelledby="sh-h">
        {/* The shelf's own photo from admin, else the default (wide, jar on the right). */}
        <picture className="sh-bg" key={shelf?.headerImageUrl ?? HEADER}>
          <img
            src={shelf?.headerImageUrl ?? HEADER}
            {...(shelf?.headerImageUrl
              ? {}
              : { srcSet: `${HEADER} 1440w, /images/shop/header-2400.webp 2400w`, sizes: "100vw" })}
            alt=""
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <Container className="sh-copy">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href={localePath(lang, "/")}>{t.crumbHome}</Link>
            <span aria-hidden="true">/</span>
            {shelf ? (
              <>
                <Link href={link({}, ALL_SHELVES)} onClick={on({}, ALL_SHELVES)}>
                  {t.crumbShop}
                </Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page">{shelfName(shelf)}</span>
              </>
            ) : (
              <span aria-current="page">{t.crumbShop}</span>
            )}
          </nav>
          <span className="ak-eyebrow">{t.eyebrow}</span>
          <h1 className="h-xl" id="sh-h">
            {shelf ? shelfLabel(shelf) : t.heroTitle}
          </h1>
          <p className="lede" lang={shelfDesc?.lang}>
            {shelfDesc?.text ?? t.heroLede}
          </p>
        </Container>
      </section>

      <Container>
        <div className="shop">
          <ShopSheets />
          {/* Shelf tabs: one line that scrolls sideways when the shelves run past the edge. */}
          <div className="bar">
            <nav className="cats" aria-label={t.category}>
              <Link
                className={`sh-tab ${shelf ? "" : "is-on"}`}
                href={link({}, ALL_SHELVES)}
                onClick={on({}, ALL_SHELVES)}
                aria-current={shelf ? undefined : "page"}
              >
                {t.all}
              </Link>
              {shelves.map((s) => (
                <Link
                  key={s.slug}
                  className={`sh-tab ${shelfSlug === s.slug ? "is-on" : ""}`}
                  href={link({}, s.slug)}
                  onClick={on({}, s.slug)}
                  aria-current={shelfSlug === s.slug ? "page" : undefined}
                >
                  {shelfName(s)}
                </Link>
              ))}
            </nav>
          </div>
          {/* Toolbar (owner, 2026-11-22): search, then Filter and Sort, one line at every width.
              Sticky on phones, where Filter and Sort are round icon buttons and open the sheets. */}
          <div className="shop-tb">
            <ShopSearch
              value={query.q ?? ""}
              action={localePath(lang, shopHref(shelfSlug)) as Route}
              query={query}
              onSearch={(q) => apply({ q: q || undefined })}
            />
            <details className="filt-m">
              <summary>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
                  <circle cx="16" cy="7" r="2" />
                  <circle cx="8" cy="17" r="2" />
                </svg>
                <span className="tb-l">{t.filter}</span>
                {filterCount > 0 ? (
                  <span className="n">{filterCount}</span>
                ) : null}
              </summary>
            </details>
            <SortMenu query={query} link={link} on={on} className="sortw" label={t.sortBy} />
            <SortMenu
              query={query}
              link={link}
              on={on}
              className="sortw m-sort"
              label={t.sortShortLabel}
              mobile
            />
          </div>
          <Link className="scrim" href={link({})} aria-hidden="true" tabIndex={-1} />
          <aside className="fil" aria-label={t.filters}>
            <div className="fil-h">
              <span className="grab" aria-hidden="true" />
              <h2>{t.filters}</h2>
              <Link className="fil-x" href={link({})} aria-label={t.closeFilters}>
                <Icon name="close" />
              </Link>
            </div>
            {/* The options scroll in a ScrollArea (owner, 2026-11-22); header and footer stay put. */}
            <ScrollArea className="fil-body" viewportClassName="fil-vp">
              {bounds && hi > lo ? (
                <details open className="f-price">
                  <summary>
                    {t.price}
                    <span className="only-mob">{t.priceUnit}</span>
                  </summary>
                  <div className="gb">
                    <PriceRange
                      lo={lo}
                      hi={hi}
                      min={Math.max(lo, Math.min(query.minPrice ?? lo, hi))}
                      max={Math.min(hi, Math.max(query.maxPrice ?? hi, lo))}
                      onChange={setPrice}
                    />
                    <form
                      method="get"
                      action={localePath(lang, shopHref(shelfSlug))}
                      className="prs"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        setPrice(
                          readBox(String(f.get("minPrice") ?? "")),
                          readBox(String(f.get("maxPrice") ?? "")),
                        );
                      }}
                    >
                      {query.heat.map((h) => (
                        <input key={h} type="hidden" name="heat" value={h} />
                      ))}
                      {query.inStock ? <input type="hidden" name="inStock" value="1" /> : null}
                      {query.sort !== "popular" ? (
                        <input type="hidden" name="sort" value={query.sort} />
                      ) : null}
                      {query.size ? <input type="hidden" name="size" value={query.size} /> : null}
                      <label>
                        <span className="sr only-desk">{t.lowest}</span>
                        <span className="only-mob">{t.from}</span>
                        <input
                          key={`min-${query.minPrice ?? ""}`}
                          className="ak-input"
                          type="text"
                          inputMode="numeric"
                          name="minPrice"
                          placeholder={`৳${lo}`}
                          defaultValue={query.minPrice ?? ""}
                          pattern="[0-9]*"
                          onBlur={(e) => setPrice(readBox(e.target.value), query.maxPrice)}
                        />
                      </label>
                      <span aria-hidden="true" className="dash">
                        –
                      </span>
                      <label>
                        <span className="sr only-desk">{t.highest}</span>
                        <span className="only-mob">{t.to}</span>
                        <input
                          key={`max-${query.maxPrice ?? ""}`}
                          className="ak-input"
                          type="text"
                          inputMode="numeric"
                          name="maxPrice"
                          placeholder={`৳${hi}`}
                          defaultValue={query.maxPrice ?? ""}
                          pattern="[0-9]*"
                          onBlur={(e) => setPrice(query.minPrice, readBox(e.target.value))}
                        />
                      </label>
                      <button type="submit" className="sr">
                        {t.applyPrice}
                      </button>
                    </form>
                  </div>
                </details>
              ) : null}
              <details open>
                <summary>{t.spice}</summary>
                <div className="gb">
                  {HEAT_LEVELS.map((h) => {
                    const checked = query.heat.includes(h);
                    const n = countWith({ heat: [h] });
                    const zero = !checked && n === 0;
                    const next = checked ? query.heat.filter((x) => x !== h) : [...query.heat, h];
                    return (
                      <Link
                        key={h}
                        className={`chk ${checked ? "on" : ""} ${zero ? "is-zero" : ""}`}
                        href={link({ heat: next })}
                        onClick={on({ heat: next })}
                        role="checkbox"
                        aria-checked={checked}
                        aria-disabled={zero ? true : undefined}
                      >
                        <span className="box" />
                        {all.heat[HEAT_LABEL[h]]}
                        <span className="fn">{n}</span>
                        <Heat pods={HEAT_PODS[h]} />
                      </Link>
                    );
                  })}
                </div>
              </details>
              <details open>
                <summary>{t.availability}</summary>
                <div className="gb">
                  <Link
                    className={`sw ${query.inStock ? "on" : ""}`}
                    href={link({ inStock: !query.inStock })}
                    onClick={on({ inStock: !query.inStock })}
                    role="switch"
                    aria-checked={query.inStock}
                  >
                    <span>
                      {t.inStockOnly} <span className="fn">{countWith({ inStock: true })}</span>
                    </span>
                    <span className="tg" />
                  </Link>
                </div>
              </details>
              {sizes.length > 0 ? (
                <details open>
                  <summary>{t.size}</summary>
                  <div className="gb">
                    <div className="szs">
                      {sizes.map((z) => {
                        const picked = query.size === z;
                        const n = countWith({ size: z });
                        const zero = !picked && n === 0;
                        return (
                          <Link
                            key={z}
                            className={`ak-chip ${picked ? "is-on" : ""} ${zero ? "is-zero" : ""}`}
                            href={link({ size: picked ? undefined : z })}
                            onClick={on({ size: picked ? undefined : z })}
                            // A link can't carry aria-pressed; the toggle role matches the heat and
                            // stock filters' role="checkbox" / "switch" links.
                            role="button"
                            aria-pressed={picked}
                            aria-disabled={zero ? true : undefined}
                          >
                            {z}
                            <span className="fn">{n}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </details>
              ) : null}
            </ScrollArea>
            <div className="fil-f">
              <Link className="tx" href={clearHref} onClick={clearAll}>
                {t.clearAll}
              </Link>
              {/* Filters already apply live; this only closes the sheet (see ShopSheets). */}
              <Link
                className="ak-btn ak-btn--sun"
                href={link({})}
                onClick={(e) => e.preventDefault()}
              >
                {t.show(matched)}
              </Link>
            </div>
          </aside>

          <section aria-labelledby="res-h">
            <div className="res">
              {/* No visible count (owner, 2026-11-22); screen readers still hear the result. */}
              <h2 className="cnt" id="res-h" aria-live="polite">
                {lang === "bn" ? (
                  <>
                    <b>{matched}</b>টি আচার পাওয়া গেছে
                  </>
                ) : (
                  <>
                    <b>{matched}</b> {matched === 1 ? "pickle" : "pickles"} found
                  </>
                )}
              </h2>
            </div>
            {chips.length > 0 ? (
              <div className="act" aria-label={t.activeFilters}>
                {chips.map((c) => (
                  <Link
                    key={c.label}
                    className="fc"
                    href={link(c.patch, c.shelf)}
                    onClick={on(c.patch, c.shelf)}
                    aria-label={t.removeFilter(c.label)}
                  >
                    {c.label}
                    <Icon name="close" />
                  </Link>
                ))}
                <Link className="clr" href={clearHref} onClick={clearAll}>
                  {t.clearAll}
                </Link>
              </div>
            ) : null}

            <div className="gw">
              <div className="grid">
                {items.length > 0 ? (
                  items.map((p) => <ProductCard key={p.id} product={p} lang={lang} />)
                ) : (
                  <div className="empty">
                    <div className="eb ak-blot v2" aria-hidden="true">
                      <Icon name="jar" />
                    </div>
                    <h2>{t.emptyTitle}</h2>
                    <p>{t.emptyText}</p>
                    <Link
                      className="ak-btn ak-btn--brand"
                      style={{ minHeight: 48 }}
                      href={clearHref}
                      onClick={clearAll}
                    >
                      {t.clearFilters}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </Container>

      {/* Closing band (owner concept 2026-11-22): achar with the meal, on to the recipes. Hidden
          while Recipes is (lib/features). */}
      {RECIPES_LIVE ? (
        <section className="sh-band" aria-labelledby="sh-band-h">
        <picture className="sh-bg">
          <source media="(max-width: 720px)" srcSet="/images/shop/band-mobile-900.webp" />
          <img
            src="/images/shop/band-1440.webp"
            srcSet="/images/shop/band-1440.webp 1440w, /images/shop/band-2400.webp 2400w"
            sizes="100vw"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </picture>
        <Container className="sh-copy">
          <h2 className="h-l" id="sh-band-h">
            {t.bandTitle}
          </h2>
          <Link className="ak-btn ak-btn--sun" href={localePath(lang, "/recipes")}>
            {t.bandCta} <Icon name="arrow" />
          </Link>
        </Container>
        </section>
      ) : null}
    </main>
  );
}

/** Sort control: a disclosure with the sort options as links. Choosing one closes it. */
function SortMenu({
  query,
  link,
  on,
  className,
  label,
  mobile,
}: {
  query: ShopQuery;
  link: (patch: Patch) => Route;
  on: (patch: Patch) => OnClick;
  className: string;
  label: string;
  mobile?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const t = useLang().t.shop;
  // Dropdown behaviour: a click or tap outside, or Escape, closes it; clicks inside keep it open.
  useEffect(() => {
    const close = (e: Event) => {
      const d = ref.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) {
        d.open = false;
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <details ref={ref} className={className}>
      <summary className="sortb">
        {mobile ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 5v14M4 15l4 4 4-4M16 19V5M12 9l4-4 4 4" />
          </svg>
        ) : null}
        <span className="tb-l">
          {label} <b>{mobile ? t.sortShort[query.sort] : t.sort[query.sort]}</b>
        </span>
        {mobile ? null : <span className="chev" aria-hidden="true" />}
      </summary>
      <div className="sortm">
        {mobile ? (
          <div className="sort-h">
            <span className="grab" aria-hidden="true" />
            <h2>{t.sortSheet}</h2>
            <Link className="fil-x" href={link({})} aria-label={t.closeSort}>
              <Icon name="close" />
            </Link>
          </div>
        ) : null}
        {SHOP_SORTS.map((s) => (
          <Link
            key={s}
            href={link({ sort: s })}
            onClick={(e) => {
              on({ sort: s })(e);
              const d = e.currentTarget.closest("details");
              if (d) d.open = false;
            }}
            aria-current={query.sort === s ? "true" : undefined}
          >
            {t.sort[s]}
          </Link>
        ))}
      </div>
    </details>
  );
}

/**
 * Shop search (owner design, no artboard): filters the grid in the browser as the shopper types.
 * A GET form, so it still works without JavaScript; the other filters ride along as hidden fields.
 */
function ShopSearch({
  value,
  action,
  query,
  onSearch,
}: {
  value: string;
  action: Route;
  query: ShopQuery;
  onSearch: (q: string) => void;
}) {
  const [text, setText] = useState(value);
  const t = useLang().t.shop;
  // A chip, "Clear all" or Back changed the search from outside: show it in the box.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (value !== text.trim()) setText(value);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = (v: string, wait: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(v.trim()), wait);
  };
  return (
    <form
      className="srch shop-srch"
      role="search"
      method="get"
      action={action}
      onSubmit={(e) => {
        e.preventDefault();
        run(text, 0);
      }}
    >
      <Icon name="search" />
      <label className="sr" htmlFor="shop-search">
        {t.searchLabel}
      </label>
      <input
        id="shop-search"
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        maxLength={80}
        placeholder={t.searchPlaceholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          run(e.target.value, 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && text) {
            setText("");
            run("", 0);
          }
        }}
      />
      {text ? (
        <button
          type="button"
          className="shop-srch-x"
          aria-label={t.clearSearch}
          onClick={() => {
            setText("");
            run("", 0);
          }}
        >
          <Icon name="close" />
        </button>
      ) : null}
      {query.sort !== "popular" ? <input type="hidden" name="sort" value={query.sort} /> : null}
      {query.heat.map((h) => (
        <input key={h} type="hidden" name="heat" value={h} />
      ))}
      {query.inStock ? <input type="hidden" name="inStock" value="1" /> : null}
      {query.size ? <input type="hidden" name="size" value={query.size} /> : null}
    </form>
  );
}
