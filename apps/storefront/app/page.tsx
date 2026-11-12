import Link from "next/link";
import { formatTaka } from "@repo/ui/lib/utils";
import { AddToBasket } from "@/components/add-to-basket";
import { Container } from "@/components/container";
import { HomeReviews } from "@/components/home-reviews";
import { CardRestock } from "@/components/card-restock";
import { Icon } from "@/components/icon";
import { ProductCard } from "@/components/product-card";
import { shelfIcon } from "@/components/shelf-icon";
import { defaultVariant, heatOf, isInStock } from "@/lib/product-view";
import {
  getCategories,
  getFeaturedProducts,
  getSiteReviews,
  type CatalogProduct,
} from "@/lib/queries";
import { productHref, shopHref } from "@/lib/routes";

const PROMISES = [
  ["Our mothers' recipes", "মা-খালাদের রেসিপি"],
  ["Spices ground at home", "ঘরে বাটা মসলা"],
  ["Wood-pressed mustard oil", "ঘানি ভাঙা সরিষার তেল"],
  ["No preservatives", "প্রিজারভেটিভ ছাড়া"],
] as const;

const DISC = [
  { cls: "f ak-blot" },
  { cls: "b ak-blot v2" },
  { cls: "f ak-blot v3" },
  { cls: "b ak-blot" },
] as const;

export default async function HomePage() {
  const [shelves, featured, reviews] = await Promise.all([
    getCategories(),
    getFeaturedProducts(5),
    getSiteReviews(),
  ]);
  const [lead, ...rest] = featured;
  const leadVariant = lead ? defaultVariant(lead.variants) : undefined;

  return (
    <main className="page-home">
      {/* Hero */}
      <section className="hero on-band" aria-labelledby="hero-h">
        <Container className="hero-grid">
          <div>
            <span className="ak-eyebrow">Homemade Bengali pickles · Dhaka</span>
            <h1 className="h-xl" id="hero-h">
              Some tastes stay in the <span className="acc">heart</span>
              <span className="only-desk">, not just on the tongue</span>.
            </h1>
            <p className="lede">
              <span className="only-desk">
                Old family recipes from our mothers and aunts. Spices ground at home, cured in pure
                wood-pressed mustard oil, with no preservatives.
              </span>
              <span className="only-mob">
                Old family recipes from our mothers and aunts, cured in pure wood-pressed mustard
                oil. No preservatives.
              </span>
            </p>
            <div className="cta">
              <Link className="ak-btn ak-btn--sun" href={shopHref()}>
                Shop pickles{" "}
                <span className="ak-ico">
                  <Icon name="arrow" />
                </span>
              </Link>
              <a className="ak-btn ak-btn--text" href="#story">
                How we make it
              </a>
            </div>
            <ul className="facts">
              <li>
                <Icon name="leaf" />
                100% homemade
              </li>
              <li>
                <Icon name="sun" />
                Chemical free
              </li>
              <li>
                <Icon name="truck" />
                Cash on delivery
              </li>
            </ul>
          </div>
          <div className="hero-art">
            <div className="ak-blot breathe sunblot" aria-hidden="true" />
            <div className="ingr ingr-b ak-blot v2" aria-hidden="true">
              <Icon name="chili" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- local SVG still-life */}
            <img
              className="hero-jar"
              src="/jar.svg"
              alt={`A jar of Acharkuthi ${lead?.name ?? "pickle"}, capped with kraft paper and tied with twine`}
            />
            <div className="ingr ingr-a ak-blot v3" aria-hidden="true">
              <Icon name="mango" />
            </div>
            {lead && leadVariant ? (
              <div className="peek">
                <div className="peek-t">
                  <div className="peek-n">{lead.name}</div>
                  <div className="peek-m">
                    {heatOf(lead.spiceLevel).word} heat · {leadVariant.label} ·{" "}
                    {formatTaka(leadVariant.price)}
                  </div>
                </div>
                {isInStock(lead.variants) && leadVariant.stock > 0 ? (
                  <AddToBasket
                    line={{
                      variantId: leadVariant.id,
                      slug: lead.slug,
                      productName: lead.name,
                      variantLabel: leadVariant.label,
                      unitPrice: leadVariant.price,
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </Container>
        <div className="ak-deckle deck-b" aria-hidden="true" />
      </section>

      {/* Shop by shelf */}
      {shelves.length > 0 ? (
        <section className="sec" aria-labelledby="pantry-h">
          <Container className="pantry">
            <div>
              <span className="ak-eyebrow">Shop by shelf</span>
              <h2 className="h-l" id="pantry-h">
                Four shelves, one <span className="only-desk">home </span>kitchen
              </h2>
              <p className="lede only-desk">
                Start with the fruit you grew up with. Every jar is made the same slow way,
                whichever shelf it sits on.
              </p>
              <div className="only-desk" style={{ marginTop: 24 }}>
                <Link className="ak-btn ak-btn--text" href={shopHref()}>
                  Shop all pickles
                </Link>
              </div>
            </div>
            {/* Owner decision (2026-11-09): no "Shop →" under each disc; the whole disc is the link. */}
            <div className="discs">
              {shelves.map((s, i) => (
                <Link key={s.slug} className="disc" href={shopHref(s.slug)}>
                  <span className={`db ${DISC[i % 4]?.cls ?? ""}`}>
                    <Icon name={shelfIcon(s.slug)} />
                  </span>
                  <span className="dn">{s.name}</span>
                  {s.nameBn ? (
                    <span className="dbn" lang="bn">
                      {s.nameBn}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* From our shelf */}
      {lead ? (
        <section className="sec band on-band" id="shop" aria-labelledby="shelf-h">
          <div className="ak-deckle deck-t" aria-hidden="true" />
          <Container>
            <div className="shelf-h">
              <div>
                <span className="ak-eyebrow">From our shelf</span>
                <h2 className="h-l" id="shelf-h">
                  Filled by hand this week
                </h2>
                <p className="lede only-desk">
                  Sour, sweet and hot in the balance our kitchen remembers.
                </p>
              </div>
              <Link className="ak-btn ak-btn--line only-desk" href={shopHref()}>
                Shop all pickles
              </Link>
            </div>
            <div className="shelf">
              <FeatureCard product={lead} />
              <div className="prail">
                {rest.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="hint" aria-hidden="true">
                <span className="bar" />
                <span className="bar off" />
                <span className="bar off" />
                <span style={{ marginLeft: 6 }}>Swipe for more</span>
              </div>
              <div className="band-cta">
                <Link
                  className="ak-btn ak-btn--line"
                  href={shopHref()}
                  style={{ minHeight: 50, padding: "0 28px" }}
                >
                  Shop all pickles
                </Link>
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      {/* Story */}
      <section className="sec" id="story" aria-labelledby="story-h">
        <Container className="story">
          <div className="story-ph">
            <span className="ak-hand-bn note" lang="bn">
              মা-খালাদের হাতের রেসিপি
            </span>
            <div
              className="slot"
              role="img"
              aria-label="Our home kitchen in afternoon sun, mango slices drying on a bamboo sieve"
            >
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <path
                  d="M0 0L100 100M100 0L0 100"
                  stroke="#c4c3a5"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                  fill="none"
                />
              </svg>
            </div>
          </div>
          <div>
            <span className="ak-eyebrow">Our story</span>
            <h2 className="h-l" id="story-h">
              Do you remember the afternoons of childhood?
            </h2>
            <p className="first">
              <span className="only-desk">
                Mango slices drying in the sun, the sharp smell of mustard oil from the kitchen, the
                pickle Mother mixed by hand. Acharkuthi comes from that feeling.
              </span>
              <span className="only-mob">
                Mango drying in the sun, mustard oil in the air, pickle mixed by Mother’s hand.
                Acharkuthi comes from that feeling.
              </span>
            </p>
            <ul className="promises">
              {PROMISES.map(([en, bn], i) => (
                <li key={en}>
                  <span className="n">0{i + 1}</span>
                  <span>
                    <b>{en}</b>
                    <span lang="bn">{bn}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Link className="ak-btn ak-btn--line go" href="/our-story">
              Read our story <Icon name="arrow" />
            </Link>
          </div>
        </Container>
      </section>

      <HomeReviews reviews={reviews} />
    </main>
  );
}

/**
 * The large bestseller card at the head of the shelf grid. Owner redesign (2026-11-11, Option A,
 * memory "home-feature-card"): the product card (Figma 2:226) scaled up. Photo on top, Bangla name
 * first, English under it, one description line, chillies, then price / weight on one line and a
 * wide "Add to basket" that becomes "Added − n +".
 */
function FeatureCard({ product }: { product: CatalogProduct }) {
  const variant = defaultVariant(product.variants);
  if (!variant) return null;
  const heat = heatOf(product.spiceLevel);
  const inStock = isInStock(product.variants) && variant.stock > 0;
  const photo = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const weight = variant.weightGrams;
  return (
    <article className={inStock ? "fcard" : "fcard is-out"}>
      <div className="fc-photo">
        <span className="ak-tag">Bestseller</span>
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded URLs, any host */}
        <img src={photo?.url ?? "/jar.svg"} alt={photo?.alt ?? ""} />
        {inStock ? null : (
          <span className="pc-band" aria-hidden="true">
            Out of stock
          </span>
        )}
      </div>
      <div className="fc-body">
        <h3 className="fc-names">
          <Link className="stretch" href={productHref(product.slug)}>
            {product.nameBn ? (
              <span className="fc-bn" lang="bn">
                {product.nameBn}
              </span>
            ) : null}
            <span className="fc-en">{product.name}</span>
            {inStock ? null : <span className="pc-sr"> (out of stock)</span>}
          </Link>
        </h3>
        {product.description ? <p className="fc-desc">{product.description}</p> : null}
        <span className="pc-heat" role="img" aria-label={`Spice level ${heat.pods} of 3`}>
          {[1, 2, 3].map((n) => (
            // eslint-disable-next-line @next/next/no-img-element -- static decorative SVG
            <img
              key={n}
              className={n > heat.pods ? "chilli off" : "chilli"}
              src="/chilli.svg"
              alt=""
              width={28}
              height={35}
            />
          ))}
        </span>
        <div className="fc-buy">
          <span className="fc-pw">
            <span className="fc-price">{formatTaka(variant.price)}</span>
            {weight ? <span className="fc-wt">{weight} g</span> : null}
          </span>
          {inStock ? (
            <AddToBasket
              wide
              line={{
                variantId: variant.id,
                slug: product.slug,
                productName: product.name,
                variantLabel: variant.label,
                unitPrice: variant.price,
                heat: heat.word,
                maxQty: variant.stock,
              }}
            />
          ) : (
            <CardRestock variantId={variant.id} productName={product.name} />
          )}
        </div>
      </div>
    </article>
  );
}
