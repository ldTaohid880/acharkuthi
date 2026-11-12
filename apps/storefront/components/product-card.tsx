import Link from "next/link";
import { formatTaka } from "@repo/ui/lib/utils";
import { defaultVariant, heatOf, isInStock } from "@/lib/product-view";
import type { CatalogProduct } from "@/lib/queries";
import { productHref } from "@/lib/routes";
import { AddToBasket } from "./add-to-basket";
import { CardRestock } from "./card-restock";
import { JarMark, PlusMark } from "./card-marks";

/**
 * Product card from Figma (file CS3OBckQHvZI2cLHG70kgc, node 2:226; card component 2:134): photo in a rounded frame,
 * Bangla and English names, three chillies | jar + weight, price and a round "+" (bell when sold out).
 * Owner answers: see memory "product-card-figma".
 */
export function ProductCard({ product }: { product: CatalogProduct }) {
  const variant = defaultVariant(product.variants);
  if (!variant) return null;
  const heat = heatOf(product.spiceLevel);
  const inStock = isInStock(product.variants) && variant.stock > 0;
  const photo = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const href = productHref(product.slug);
  const weight = variant.weightGrams;

  return (
    <article className={inStock ? "pcard" : "pcard is-out"}>
      <div className="pc-photo">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded URLs, any host */}
        <img src={photo?.url ?? "/jar.svg"} alt={photo?.alt ?? ""} loading="lazy" />
        {inStock ? null : (
          <span className="pc-band" aria-hidden="true">
            Out of stock
          </span>
        )}
      </div>
      <div className="pc-body">
        <h3 className="pc-names">
          <Link className="stretch" href={href}>
            {product.nameBn ? (
              <span className="pc-bn" lang="bn">
                {product.nameBn}
              </span>
            ) : null}
            <span className="pc-en">{product.name}</span>
            {inStock ? null : <span className="pc-sr"> (out of stock)</span>}
          </Link>
        </h3>
        <div className="pc-meta">
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
          {weight ? (
            <span className="pc-weight">
              <JarMark />
              {weight} g
            </span>
          ) : null}
        </div>
        <div className="pc-buy">
          <span className="pc-price">{formatTaka(variant.price)}</span>
          {inStock ? (
            <AddToBasket
              className="pc-btn above"
              plusIcon={<PlusMark />}
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
