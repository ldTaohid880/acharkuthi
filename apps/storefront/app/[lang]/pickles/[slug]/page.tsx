import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@repo/auth";
import type { Route } from "next";
import { REVIEW_PAGE_SIZE, reviewQuery } from "@repo/validators";
import { Icon } from "@/components/icon";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { fitFor } from "@/lib/image-fit";
import { RetryReviews, ReviewForm } from "@/components/review-form";
import { ReviewSort } from "@/components/review-sort";
import { VariantPicker } from "@/components/variant-picker";
import { formatWeight, heatOf } from "@/lib/product-view";
import {
  getProductBySlug,
  getProductReviews,
  getRelatedProducts,
  type ProductReview,
} from "@/lib/queries";
import { productHref, shopHref } from "@/lib/routes";
import { getDict } from "@/lib/i18n/dict";
import { localePath } from "@/lib/i18n/lang";
import { pickString, pickText, type LocalText } from "@/lib/i18n/pick";
import { breadcrumbJsonLd, langOf, pageMeta, productJsonLd, realCopy } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { PixelViewContent } from "@/components/pixel-view-content";
import { formatTaka } from "@repo/ui/lib/utils";

interface Props {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<Record<string, unknown>>;
}

const RATING_CHIPS = [5, 4, 3, 2, 1] as const;
// Review sort and spice words come from lib/i18n/dict.ts (pdp).

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  const lang = await langOf(params);
  if (!product) return { title: getDict(lang).pdp.notFound };
  const from = product.variants
    .filter((v) => v.isActive)
    .reduce((m, v) => Math.min(m, v.price), Number.POSITIVE_INFINITY);
  const photo = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  return pageMeta({
    // The page language's name first; both names, so searches in either script match.
    title: product.nameBn
      ? lang === "bn"
        ? `${product.nameBn} · ${product.name}`
        : `${product.name} · ${product.nameBn}`
      : product.name,
    description:
      realCopy(pickString(lang, product.descriptionBn, product.description)) ??
      (lang === "bn"
        ? `${product.nameBn ?? product.name}, আচারকুঠির ঐতিহ্যবাহী প্রণালীতে তৈরি${Number.isFinite(from) ? `, দাম ${formatTaka(from)} থেকে` : ""}। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।`
        : `${product.name}, made the heritage way by Acharkuthi in Dhaka${Number.isFinite(from) ? `, from ${formatTaka(from)}` : ""}. Cash on delivery across Bangladesh.`),
    path: `/pickles/${product.slug}`,
    lang,
    image: photo
      ? { url: photo.url, width: photo.width ?? undefined, height: photo.height ?? undefined }
      : undefined,
  });
}

export default async function ProductPage({ params, searchParams }: Props) {
  const product = await getProductBySlug((await params).slug);
  const rq = reviewQuery.parse(await searchParams);
  if (!product) notFound();
  const lang = await langOf(params);
  const t = getDict(lang).pdp;
  const to = (path: string) => localePath(lang, path);
  const dateFmt = new Intl.DateTimeFormat(t.dateLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  /** The page language's product name (Bangla when there is one, in Bangla). */
  const displayName = lang === "bn" ? (product.nameBn ?? product.name) : product.name;

  const variants = product.variants
    .filter((v) => v.isActive)
    // Size chips follow the admin's order ("টেনে ক্রম বদলান"), then creation order.
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((v) => ({
      id: v.id,
      label: v.label,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stock: v.stock,
      weightGrams: v.weightGrams,
    }));
  if (variants.length === 0) notFound();

  const [related, loaded, session] = await Promise.all([
    getRelatedProducts(product.id, product.categoryId),
    getProductReviews(product.id).catch((err: unknown) => {
      console.error("product reviews failed", err);
      return null;
    }),
    auth.api.getSession({ headers: await headers() }).catch(() => null),
  ]);
  const heat = heatOf(product.spiceLevel);
  const reviewsFailed = loaded === null;
  const reviews: ProductReview[] = loaded ?? [];
  const matching = reviews
    .filter((r) => rq.rating === undefined || r.rating === rq.rating)
    .filter((r) => !rq.photo || r.photoUrl)
    .sort((a, b) =>
      rq.rsort === "high"
        ? b.rating - a.rating || +b.createdAt - +a.createdAt
        : rq.rsort === "low"
          ? a.rating - b.rating || +b.createdAt - +a.createdAt
          : +b.createdAt - +a.createdAt,
    );
  const shown = matching.slice(0, rq.rshow ?? REVIEW_PAGE_SIZE);
  /** URL for the review list with `patch` applied. Defaults are omitted. */
  const reviewHref = (patch: {
    rating?: number | undefined;
    rsort?: string;
    rshow?: number;
    photo?: boolean;
  }) => {
    const next = { rating: rq.rating, rsort: rq.rsort, photo: rq.photo, ...patch };
    const params = new URLSearchParams();
    if (next.rating !== undefined) params.set("rating", String(next.rating));
    if (next.photo) params.set("photo", "1");
    if (next.rsort !== "new") params.set("rsort", next.rsort);
    if (patch.rshow !== undefined) params.set("rshow", String(patch.rshow));
    const qs = params.toString();
    return to(`/pickles/${product.slug}${qs ? `?${qs}` : ""}#reviews`);
  };
  const average = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;
  const sorted = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  // Owner (2026-11-22): the photo flagged for Home's "বিশেষ বাছাই" stays off the product page
  // (unless it is the only photo).
  const gallery = sorted.filter((i) => !i.isFeatured);
  const images = (gallery.length > 0 ? gallery : sorted).map((i) => ({
    url: i.url,
    alt: pickString(lang, i.altBn, i.alt) || t.jar(displayName),
    fit: i.width && i.height ? fitFor(i.width, i.height) : undefined,
  }));
  // Stored detail text in the page language, or the other language until it is translated.
  const local = (bn: string | null, en: string | null) => pickText(lang, bn, en);
  const description = local(product.descriptionBn, product.description);
  const story = (
    [
      [t.flavor, local(product.flavor, product.flavorEn)],
      [t.texture, local(product.texture, product.textureEn)],
      [t.serving, local(product.serving, product.servingEn)],
    ] satisfies [string, LocalText | null][]
  ).filter((d): d is [string, LocalText] => !!d[1]);
  const weights = [...new Set(variants.flatMap((v) => (v.weightGrams ? [v.weightGrams] : [])))];
  const care = (
    [
      [t.ingredients, local(product.ingredients, product.ingredientsEn)],
      [t.netWeight, weights.length ? { text: weights.map(formatWeight).join(" / "), lang } : null],
      [t.storage, local(product.storage, product.storageEn)],
      [t.shelfLife, local(product.shelfLife, product.shelfLifeEn)],
      [t.allergens, local(product.allergens, product.allergensEn)],
      [t.packaging, local(product.packaging, product.packagingEn)],
    ] satisfies [string, LocalText | null][]
  ).filter((d): d is [string, LocalText] => !!d[1]);

  const meta = getDict(lang).meta;
  const crumb = { home: meta.crumbHome, shop: meta.shop };
  const shelfName = (c: { name: string; nameBn: string | null }) =>
    lang === "bn" ? (c.nameBn ?? c.name) : c.name;
  const jsonLd = [
    productJsonLd({
      lang,
      slug: product.slug,
      name: product.name,
      nameBn: product.nameBn,
      description: description?.text ?? null,
      ingredients: local(product.ingredients, product.ingredientsEn)?.text ?? null,
      shelfLife: local(product.shelfLife, product.shelfLifeEn)?.text ?? null,
      storage: local(product.storage, product.storageEn)?.text ?? null,
      allergens: local(product.allergens, product.allergensEn)?.text ?? null,
      heat: getDict(lang).heat[heat.word],
      category: product.category ? shelfName(product.category) : null,
      images: images.map((i) => i.url),
      variants: product.variants
        .filter((v) => v.isActive)
        .map((v) => ({ sku: v.sku, label: v.label, price: v.price, stock: v.stock })),
      reviews,
    }),
    breadcrumbJsonLd(
      [
        [crumb.home, "/"],
        [crumb.shop, shopHref()],
        ...(product.category
          ? ([[shelfName(product.category), shopHref(product.category.slug)]] as const)
          : []),
        [displayName, productHref(product.slug)],
      ],
      lang,
    ),
  ];

  return (
    <main className="page-product">
      <JsonLd data={jsonLd} />
      {variants[0] ? (
        <PixelViewContent
          variantId={variants[0].id}
          name={product.name}
          price={variants[0].price}
        />
      ) : null}
      <div className="wrap pgap">
        <nav className="crumbs" aria-label="Breadcrumb" style={{ paddingTop: 20 }}>
          <Link href={to("/")} lang={lang}>
            {t.crumbHome}
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={to(shopHref())} lang={lang}>
            {t.crumbShop}
          </Link>
          {product.category ? (
            <>
              <span aria-hidden="true">/</span>
              <Link href={to(shopHref(product.category.slug))} lang={lang}>
                {lang === "bn"
                  ? (product.category.nameBn ?? product.category.name)
                  : product.category.name}
              </Link>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span aria-current="page" lang={lang === "bn" && product.nameBn ? "bn" : "en"}>
            {displayName}
          </span>
        </nav>

        <div className="pgrid">
          <ProductGallery name={product.name} images={images} />
          <div>
            {product.nameBn && lang === "bn" ? (
              <>
                <h1 className="h1p" lang="bn">
                  {product.nameBn}
                </h1>
                <p className="enn">{product.name}</p>
              </>
            ) : product.nameBn ? (
              // English page: English name large, Bangla under it (owner, 2026-11-16).
              <>
                <h1 className="h1p" lang="en" style={{ fontFamily: "var(--font-display)" }}>
                  {product.name}
                </h1>
                <p className="enn" lang="bn">
                  {product.nameBn}
                </p>
              </>
            ) : (
              <h1 className="h1p" style={{ fontFamily: "var(--font-display)" }}>
                {product.name}
              </h1>
            )}
            {description ? (
              <p className="sdesc" lang={description.lang}>
                {description.text}
              </p>
            ) : null}
            {reviews.length > 0 ? (
              <div className="rsum">
                <span className="stars" role="img" aria-label={t.avg(average.toFixed(1))}>
                  <span className="bg" aria-hidden="true">
                    ★★★★★
                  </span>
                  <span
                    className="fg"
                    aria-hidden="true"
                    style={{ width: `${(average / 5) * 100}%` }}
                  >
                    ★★★★★
                  </span>
                </span>
                <b style={{ color: "var(--ink)" }}>{average.toFixed(1)}</b>
                <a href="#reviews" lang={lang}>
                  {t.reviews(reviews.length)}
                </a>
              </div>
            ) : null}
            <VariantPicker
              slug={product.slug}
              name={product.name}
              nameBn={product.nameBn}
              heat={heat}
              variants={variants}
            />
          </div>
        </div>

        {story.length > 0 ? (
          <section className="sec2" aria-labelledby="dh">
            <div className="two">
              <h2 className="h2p" id="dh" lang={lang}>
                {t.storyTitle}
              </h2>
              <dl className="dl">
                {/* Labels in the page language; stored text in its own language (lib/i18n/pick). */}
                {story.map(([k, v]) => (
                  <div key={k}>
                    <dt lang={lang}>{k}</dt>
                    <dd lang={v.lang}>{v.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        ) : null}

        {care.length > 0 ? (
          <section className="sec2" aria-labelledby="ih">
            <div className="two">
              <h2 className="h2p" id="ih" lang={lang}>
                {t.careTitle}
              </h2>
              <div className="acc">
                {care.map(([k, v]) => (
                  <details key={k}>
                    <summary lang={lang}>
                      {k}
                      <Icon name="plus" />
                    </summary>
                    <div className="pnl" lang={v.lang}>
                      {v.text}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="sec2" id="reviews" aria-labelledby="rv-h">
          <h2 className="h2p" id="rv-h" lang={lang} style={{ marginBottom: 28 }}>
            {t.reviewsTitle}
          </h2>
          <div className="rvw">
            {reviewsFailed ? (
              <div className="rstate" role="alert">
                <b lang={lang}>{t.reviewsFailTitle}</b>
                <span lang={lang}>{t.reviewsFailText}</span>
                <br />
                <RetryReviews />
              </div>
            ) : reviews.length > 0 ? (
              <>
                <div className="rv-sum">
                  <div>
                    <div className="big">
                      {average.toFixed(1)}
                      <small> / 5</small>
                    </div>
                    <span className="stars" role="img" aria-label={t.avg(average.toFixed(1))}>
                      <span className="bg" aria-hidden="true">
                        ★★★★★
                      </span>
                      <span
                        className="fg"
                        aria-hidden="true"
                        style={{ width: `${(average / 5) * 100}%` }}
                      >
                        ★★★★★
                      </span>
                    </span>
                    <div
                      style={{
                        font: "400 14px/1.5 var(--font-ui)",
                        color: "var(--ink-muted)",
                        marginTop: 6,
                      }}
                      lang={lang}
                    >
                      {t.reviewsOf(reviews.length)}
                    </div>
                  </div>
                  <ul className="dist" aria-label={t.breakdown}>
                    {[5, 4, 3, 2, 1].map((n) => {
                      const count = reviews.filter((r) => r.rating === n).length;
                      return (
                        <li key={n}>
                          <span>{n}★</span>
                          <span className="bar">
                            <i style={{ width: `${(count / reviews.length) * 100}%` }} />
                          </span>
                          <span>{count}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <ReviewForm productId={product.id} productName={displayName} signedIn={!!session} />
                <div className="rctl">
                  <div className="chips" role="group" aria-label={t.filterByRating}>
                    <Link
                      className={`ak-chip ${rq.rating === undefined ? "is-on" : ""}`}
                      href={reviewHref({ rating: undefined }) as Route}
                      scroll={false}
                      aria-current={rq.rating === undefined ? "true" : undefined}
                      lang={lang}
                    >
                      {t.all}
                    </Link>
                    {RATING_CHIPS.map((n) => (
                      <Link
                        key={n}
                        className={`ak-chip ${rq.rating === n ? "is-on" : ""}`}
                        href={reviewHref({ rating: n }) as Route}
                        scroll={false}
                        aria-current={rq.rating === n ? "true" : undefined}
                      >
                        {n}★
                      </Link>
                    ))}
                    <Link
                      className={`ak-chip ${rq.photo ? "is-on" : ""}`}
                      href={reviewHref({ photo: !rq.photo }) as Route}
                      scroll={false}
                      aria-current={rq.photo ? "true" : undefined}
                      lang={lang}
                    >
                      {t.withPhotos}
                    </Link>
                  </div>
                  <ReviewSort
                    current={rq.rsort}
                    options={(["new", "high", "low"] as const).map((k) => ({
                      key: k,
                      label: t.sort[k],
                      href: reviewHref({ rsort: k }),
                    }))}
                  />
                </div>
                <ul className="rlist">
                  {shown.map((r) => (
                    <li key={r.id} className="rv">
                      <div className="rv-h">
                        <span className="stars sm" role="img" aria-label={t.rated(r.rating)}>
                          <span className="bg" aria-hidden="true">
                            ★★★★★
                          </span>
                          <span
                            className="fg"
                            aria-hidden="true"
                            style={{ width: `${(r.rating / 5) * 100}%` }}
                          >
                            ★★★★★
                          </span>
                        </span>
                        {r.name ? <b>{r.name}</b> : null}
                        {r.verified ? (
                          <span className="vp" lang={lang}>
                            {t.verified}
                          </span>
                        ) : null}
                        <span className="dt">{dateFmt.format(r.createdAt)}</span>
                      </div>
                      {r.title ? <h3>{r.title}</h3> : null}
                      {r.comment ? <p>{r.comment}</p> : null}
                      {r.spice ? (
                        <div className="sp-fb" lang={lang}>
                          {t.spice}
                          {t.spiceWord[r.spice]}
                        </div>
                      ) : null}
                      {r.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- customer upload
                        <img
                          className="ph"
                          src={r.photoUrl}
                          alt={t.customerPhoto}
                          style={{ objectFit: "cover", display: "block" }}
                        />
                      ) : null}
                      {r.reply ? (
                        <div className="rv-rep">
                          <b lang={lang}>{t.reply}</b>
                          <p lang="bn">{r.reply}</p>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {matching.length === 0 ? (
                  <div className="rstate">
                    <b lang={lang}>{t.noMatchTitle}</b>
                    <span lang={lang}>{t.noMatchText}</span>
                    <br />
                    <Link
                      className="ak-btn ak-btn--line"
                      href={reviewHref({ rating: undefined, photo: false }) as Route}
                      scroll={false}
                      lang={lang}
                    >
                      {t.clearFilter}
                    </Link>
                  </div>
                ) : null}
                {shown.length < matching.length ? (
                  <div className="rmore">
                    <div className="cnt" lang={lang}>
                      {t.shownOf(shown.length, matching.length)}
                    </div>
                    <Link
                      className="ak-btn ak-btn--line"
                      style={{ minHeight: 50, padding: "0 28px" }}
                      href={reviewHref({ rshow: shown.length + REVIEW_PAGE_SIZE }) as Route}
                      scroll={false}
                      lang={lang}
                    >
                      {t.moreReviews}
                    </Link>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <ReviewForm productId={product.id} productName={displayName} signedIn={!!session} />
                <div className="rstate">
                  <b lang={lang}>{t.noneTitle}</b>
                  <span lang={lang}>{t.noneText}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {related.length > 0 ? (
          <section className="sec2" aria-labelledby="rel-h">
            <div className="relh">
              <h2 className="h2p" id="rel-h" lang={lang}>
                {t.relatedTitle}
              </h2>
              <Link className="relall" href={to(shopHref())} lang={lang}>
                {t.shopAll}
              </Link>
            </div>
            <ul
              className="rel"
              style={{
                listStyle: "none",
                marginLeft: 0,
                marginRight: 0,
                marginBottom: 0,
                paddingLeft: 0,
                paddingRight: 0,
              }}
            >
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} lang={lang} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
