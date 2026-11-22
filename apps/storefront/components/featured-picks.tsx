import Link from "next/link";
import { formatTaka } from "@repo/ui/lib/utils";
import { defaultVariant, featuredBadge, heatOf, isInStock } from "@/lib/product-view";
import type { CatalogProduct } from "@/lib/queries";
import { getDict } from "@/lib/i18n/dict";
import { localePath, type Lang } from "@/lib/i18n/lang";
import { pickString } from "@/lib/i18n/pick";
import { productHref, shopHref } from "@/lib/routes";
import { AddToBasket } from "./add-to-basket";
import { CardRestock } from "./card-restock";
import { Container } from "./container";
import { Icon } from "./icon";

/**
 * Home "বিশেষ বাছাই" section (owner mockup 2026-11-21, docs/featured-section-mockup.jpg): three
 * identical cards with a 3:4 photo, one derived badge, name, the admin tagline, price / weight with
 * the chillies on the same row, and one full-width add button. Replaces the "From our shelf" band.
 * Phones: the cards scroll sideways (design-mobile.css "Home featured picks on phones").
 */
export function FeaturedPicks({
  products,
  bestsellerId,
  lang,
}: {
  products: CatalogProduct[];
  bestsellerId: number | undefined;
  lang: Lang;
}) {
  const all = getDict(lang);
  const t = all.home;
  if (products.length === 0) return null;
  return (
    <section className="sec fpk" id="shop" aria-labelledby="fpk-h">
      <Container>
        <div className="fpk-head">
          <div>
            <span className="fpk-eyebrow" lang={lang}>
              {t.fromEyebrow}
            </span>
            <h2 className="fpk-title" id="fpk-h" lang={lang}>
              {t.fromTitle}
            </h2>
            <p className="fpk-lede" lang={lang}>
              {t.fromLede}
            </p>
          </div>
          <Link className="fpk-all" href={localePath(lang, shopHref())} lang={lang}>
            {t.shopAll} <Icon name="arrow" />
          </Link>
        </div>
        <div className="fpk-grid">
          {/* The mockup's mango-leaf line art, redrawn whole in Gemini (owner: full leaves, no cut-outs). */}
          {/* eslint-disable-next-line @next/next/no-img-element -- static decorative image */}
          <img className="fpk-sprig" src="/images/home/featured-sprig.webp" alt="" width={1000} height={813} />
          {products.map((p) => (
            <PickCard key={p.id} product={p} bestsellerId={bestsellerId} lang={lang} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function PickCard({
  product,
  bestsellerId,
  lang,
}: {
  product: CatalogProduct;
  bestsellerId: number | undefined;
  lang: Lang;
}) {
  const all = getDict(lang);
  const variant = defaultVariant(product.variants);
  if (!variant) return null;
  const en = lang === "en";
  const heat = heatOf(product.spiceLevel);
  const inStock = isInStock(product.variants) && variant.stock > 0;
  // The photo flagged in admin for "বিশেষ বাছাই", else the main (first) photo.
  const sortedPhotos = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const photo = sortedPhotos.find((im) => im.isFeatured) ?? sortedPhotos[0];
  const badge = featuredBadge(product, bestsellerId);
  const name = en ? product.name : (product.nameBn ?? product.name);
  // The site's own line first, the other language when it is empty (owner, 2026-11-16).
  const tagline = en ? (product.taglineEn ?? product.tagline) : (product.tagline ?? product.taglineEn);
  const taglineLang = en ? (product.taglineEn ? "en" : "bn") : product.tagline ? "bn" : "en";
  return (
    <article className={inStock ? "fpk-card" : "fpk-card is-out"}>
      <div className="fpk-photo">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded URLs, any host */}
        <img
          src={photo?.url ?? "/jar.svg"}
          alt={pickString(lang, photo?.altBn, photo?.alt)}
          loading="lazy"
          decoding="async"
        />
        {badge ? (
          <span className={badge === "hot" ? "fpk-badge hot" : "fpk-badge"} lang={lang}>
            {all.home.badge[badge]}
          </span>
        ) : null}
        {inStock ? null : (
          <span className="pc-band" aria-hidden="true" lang={lang}>
            {all.card.out}
          </span>
        )}
      </div>
      <div className="fpk-body">
        <h3 className="fpk-name" lang={en ? "en" : product.nameBn ? "bn" : "en"}>
          <Link className="stretch" href={localePath(lang, productHref(product.slug))}>
            {name}
            {inStock ? null : <span className="pc-sr">{all.card.outSr}</span>}
          </Link>
        </h3>
        {tagline ? (
          <p className="fpk-line" lang={taglineLang}>
            {tagline}
          </p>
        ) : null}
        <div className="fpk-buy">
          <span className="fpk-pw">
            <span className="fpk-price">{formatTaka(variant.price)}</span>
            {variant.weightGrams ? (
              // Price and weight keep the Latin face in both languages, as on the product card.
              <span className="fpk-wt" lang="en">
                / {variant.weightGrams} g
              </span>
            ) : null}
          </span>
          <span className="pc-heat fpk-heat" role="img" aria-label={all.card.heat(heat.pods)}>
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
        </div>
        <div className="fpk-act">
          {inStock ? (
            <AddToBasket
              wide
              label={all.home.addToCart}
              line={{
                variantId: variant.id,
                slug: product.slug,
                productName: product.name,
                productNameBn: product.nameBn ?? undefined,
                variantLabel: variant.label,
                unitPrice: variant.price,
                heat: heat.word,
                maxQty: variant.stock,
              }}
            />
          ) : (
            <CardRestock
              variantId={variant.id}
              productName={en ? product.name : (product.nameBn ?? product.name)}
            />
          )}
        </div>
      </div>
    </article>
  );
}
