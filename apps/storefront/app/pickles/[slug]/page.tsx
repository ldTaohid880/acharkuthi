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
import { shopHref } from "@/lib/routes";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, unknown>>;
}

const RATING_CHIPS = [5, 4, 3, 2, 1] as const;
const REVIEW_SORT_LABEL = {
  new: "নতুন আগে",
  high: "বেশি রেটিং আগে",
  low: "কম রেটিং আগে",
} as const;
const SPICE_LABEL = { low: "কম ঝাল", ok: "ঠিক ঝাল", high: "বেশি ঝাল" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return { title: "Pickle not found" };
  return { title: product.name, description: product.description ?? undefined };
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function ProductPage({ params, searchParams }: Props) {
  const product = await getProductBySlug((await params).slug);
  const rq = reviewQuery.parse(await searchParams);
  if (!product) notFound();

  const variants = product.variants
    .filter((v) => v.isActive)
    .sort((a, b) => a.price - b.price)
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
    return `/pickles/${product.slug}${qs ? `?${qs}` : ""}#reviews`;
  };
  const average = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;
  const images = [...product.images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => ({ url: i.url, alt: i.alt ?? `${product.name} jar` }));
  const story = (
    [
      ["স্বাদ", product.flavor],
      ["টেক্সচার", product.texture],
      ["কীভাবে খাবেন", product.serving],
    ] satisfies [string, string | null][]
  ).filter((d): d is [string, string] => !!d[1]);
  const weights = [...new Set(variants.flatMap((v) => (v.weightGrams ? [v.weightGrams] : [])))];
  const care = (
    [
      ["উপকরণ", product.ingredients],
      ["নিট ওজন", weights.length ? weights.map(formatWeight).join(" / ") : null],
      ["সংরক্ষণ", product.storage],
      ["মেয়াদ", product.shelfLife],
      ["অ্যালার্জেন তথ্য", product.allergens],
      ["প্যাকেজিং", product.packaging],
    ] satisfies [string, string | null][]
  ).filter((d): d is [string, string] => !!d[1]);

  return (
    <main className="page-product">
      <div className="wrap pgap">
        <nav className="crumbs" aria-label="Breadcrumb" style={{ paddingTop: 20 }}>
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href={shopHref()}>Shop</Link>
          {product.category ? (
            <>
              <span aria-hidden="true">/</span>
              <Link href={shopHref(product.category.slug)}>{product.category.name}</Link>
            </>
          ) : null}
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className="pgrid">
          <ProductGallery name={product.name} images={images} />
          <div>
            {product.nameBn ? (
              <>
                <h1 className="h1p" lang="bn">
                  {product.nameBn}
                </h1>
                <p className="enn">{product.name}</p>
              </>
            ) : (
              <h1 className="h1p" style={{ fontFamily: "var(--font-display)" }}>
                {product.name}
              </h1>
            )}
            {product.description ? <p className="sdesc">{product.description}</p> : null}
            {reviews.length > 0 ? (
              <div className="rsum">
                <span
                  className="stars"
                  role="img"
                  aria-label={`Average rating ${average.toFixed(1)} out of 5`}
                >
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
                <a href="#reviews">
                  {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                </a>
              </div>
            ) : null}
            <VariantPicker
              slug={product.slug}
              name={product.name}
              heat={heat}
              variants={variants}
            />
          </div>
        </div>

        {story.length > 0 ? (
          <section className="sec2" aria-labelledby="dh">
            <div className="two">
              <h2 className="h2p" id="dh" lang="bn">
                আচারের কথা
              </h2>
              <dl className="dl">
                {story.map(([k, v]) => (
                  <div key={k}>
                    <dt lang="bn">{k}</dt>
                    <dd lang="bn">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        ) : null}

        {care.length > 0 ? (
          <section className="sec2" aria-labelledby="ih">
            <div className="two">
              <h2 className="h2p" id="ih" lang="bn">
                তথ্য ও যত্ন
              </h2>
              <div className="acc">
                {care.map(([k, v]) => (
                  <details key={k}>
                    <summary lang="bn">
                      {k}
                      <Icon name="plus" />
                    </summary>
                    <div className="pnl" lang="bn">
                      {v}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="sec2" id="reviews" aria-labelledby="rv-h">
          <h2 className="h2p" id="rv-h" lang="bn" style={{ marginBottom: 28 }}>
            এই আচারের রিভিউ
          </h2>
          <div className="rvw">
            {reviewsFailed ? (
              <div className="rstate" role="alert">
                <b lang="bn">রিভিউ লোড করা যায়নি</b>
                <span lang="bn">পণ্যের বাকি তথ্য আগের মতোই আছে।</span>
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
                    <span
                      className="stars"
                      role="img"
                      aria-label={`Average rating ${average.toFixed(1)} out of 5`}
                    >
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
                    >
                      {reviews.length} {reviews.length === 1 ? "review" : "reviews"} of this product
                    </div>
                  </div>
                  <ul className="dist" aria-label="Rating breakdown">
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
                <ReviewForm
                  productId={product.id}
                  productName={product.name}
                  signedIn={!!session}
                />
                <div className="rctl">
                  <div className="chips" role="group" aria-label="Filter by rating">
                    <Link
                      className={`ak-chip ${rq.rating === undefined ? "is-on" : ""}`}
                      href={reviewHref({ rating: undefined }) as Route}
                      scroll={false}
                      aria-current={rq.rating === undefined ? "true" : undefined}
                      lang="bn"
                    >
                      সব
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
                      lang="bn"
                    >
                      ছবিসহ
                    </Link>
                  </div>
                  <ReviewSort
                    current={rq.rsort}
                    options={(["new", "high", "low"] as const).map((k) => ({
                      key: k,
                      label: REVIEW_SORT_LABEL[k],
                      href: reviewHref({ rsort: k }),
                    }))}
                  />
                </div>
                <ul className="rlist">
                  {shown.map((r) => (
                    <li key={r.id} className="rv">
                      <div className="rv-h">
                        <span
                          className="stars sm"
                          role="img"
                          aria-label={`Rated ${r.rating} out of 5`}
                        >
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
                        {r.verified ? <span className="vp">Verified purchase</span> : null}
                        <span className="dt">{dateFmt.format(r.createdAt)}</span>
                      </div>
                      {r.title ? <h3>{r.title}</h3> : null}
                      {r.comment ? <p>{r.comment}</p> : null}
                      {r.spice ? (
                        <div className="sp-fb" lang="bn">
                          ঝাল: {SPICE_LABEL[r.spice]}
                        </div>
                      ) : null}
                      {r.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- customer upload
                        <img
                          className="ph"
                          src={r.photoUrl}
                          alt="Customer photo"
                          style={{ objectFit: "cover", display: "block" }}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
                {matching.length === 0 ? (
                  <div className="rstate">
                    <b lang="bn">এই ফিল্টারে কোনো রিভিউ নেই</b>
                    <span lang="bn">অন্য রেটিং বা সব রিভিউ দেখুন।</span>
                    <br />
                    <Link
                      className="ak-btn ak-btn--line"
                      href={reviewHref({ rating: undefined, photo: false }) as Route}
                      scroll={false}
                      lang="bn"
                    >
                      ফিল্টার মুছুন
                    </Link>
                  </div>
                ) : null}
                {shown.length < matching.length ? (
                  <div className="rmore">
                    <div className="cnt">
                      {shown.length} of {matching.length} reviews shown
                    </div>
                    <Link
                      className="ak-btn ak-btn--line"
                      style={{ minHeight: 50, padding: "0 28px" }}
                      href={reviewHref({ rshow: shown.length + REVIEW_PAGE_SIZE }) as Route}
                      scroll={false}
                      lang="bn"
                    >
                      আরও রিভিউ দেখুন
                    </Link>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <ReviewForm
                  productId={product.id}
                  productName={product.name}
                  signedIn={!!session}
                />
                <div className="rstate">
                  <b lang="bn">এই পণ্যের এখনও কোনো রিভিউ নেই</b>
                  <span lang="bn">কিনে থাকলে প্রথম রিভিউটি আপনি লিখতে পারেন।</span>
                </div>
              </>
            )}
          </div>
        </section>

        {related.length > 0 ? (
          <section className="sec2" aria-labelledby="rel-h">
            <div className="relh">
              <h2 className="h2p" id="rel-h" lang="bn">
                এগুলোও ভালো লাগতে পারে
              </h2>
              <Link className="relall" href={shopHref()}>
                Shop all pickles
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
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
