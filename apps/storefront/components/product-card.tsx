import Link from "next/link";
import { formatTaka } from "@repo/ui/lib/utils";
import { defaultVariant, heatOf, isInStock } from "@/lib/product-view";
import type { CatalogProduct } from "@/lib/queries";
import { getDict } from "@/lib/i18n/dict";
import { localePath, type Lang } from "@/lib/i18n/lang";
import { pickString } from "@/lib/i18n/pick";
import { productHref } from "@/lib/routes";
import { AddToBasket } from "./add-to-basket";
import { CardRestock } from "./card-restock";
import { JarMark, PlusMark } from "./card-marks";

/**
 * Product card from Figma (file CS3OBckQHvZI2cLHG70kgc, node 2:226; card component 2:134): photo in a rounded frame,
 * Bangla and English names, three chillies | jar + weight, price and a round "+" (bell when sold out).
 * Owner answers: see memory "product-card-figma".
 *
 * Both names show in both languages (memory: storefront-bilingual). The large line (.pc-bn) is
 * the page language's name and the small line (.pc-en) the other one: Bangla large in Bangla,
 * English large in English (owner, 2026-11-16).
 */
export function ProductCard({ product, lang }: { product: CatalogProduct; lang: Lang }) {
  const t = getDict(lang).card;
  const variant = defaultVariant(product.variants);
  if (!variant) return null;
  const heat = heatOf(product.spiceLevel);
  const inStock = isInStock(product.variants) && variant.stock > 0;
  const photo = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const href = localePath(lang, productHref(product.slug));
  const weight = variant.weightGrams;

  return (
    <article className={inStock ? "pcard" : "pcard is-out"}>
      <div className="pc-photo">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded URLs, any host */}
        <img src={photo?.url ?? "/jar.svg"} alt={pickString(lang, photo?.altBn, photo?.alt)} loading="lazy" />
        {inStock ? null : (
          <span className="pc-band" aria-hidden="true" lang={lang}>
            {t.out}
          </span>
        )}
      </div>
      <div className="pc-body">
        <h3 className="pc-names">
          <Link className="stretch" href={href}>
            {lang === "en" || !product.nameBn ? (
              <>
                <span className="pc-bn" lang="en">
                  {product.name}
                </span>
                {product.nameBn ? (
                  <span className="pc-en" lang="bn">
                    {product.nameBn}
                  </span>
                ) : null}
              </>
            ) : (
              <>
                <span className="pc-bn" lang="bn">
                  {product.nameBn}
                </span>
                <span className="pc-en" lang="en">
                  {product.name}
                </span>
              </>
            )}
            {inStock ? null : (
              <span className="pc-sr" lang={lang}>
                {t.outSr}
              </span>
            )}
          </Link>
        </h3>
        <div className="pc-meta">
          <span className="pc-heat" role="img" aria-label={t.heat(heat.pods)}>
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
          {/* Weight and price keep the card's Latin face in both languages (product-card-figma). */}
          {weight ? (
            <span className="pc-weight" lang="en">
              <JarMark />
              {weight} g
            </span>
          ) : null}
        </div>
        <div className="pc-buy">
          <span className="pc-price" lang="en">
            {formatTaka(variant.price)}
          </span>
          {inStock ? (
            <AddToBasket
              className="pc-btn above"
              plusIcon={<PlusMark />}
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
              productName={lang === "bn" ? (product.nameBn ?? product.name) : product.name}
            />
          )}
        </div>
      </div>
    </article>
  );
}
