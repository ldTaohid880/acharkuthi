import { formatTaka } from "@repo/ui/lib/utils";
import Link from "next/link";
import { defaultVariant, heatOf } from "@/lib/product-view";
import { getCategories, getFeaturedProducts } from "@/lib/queries";
import { HeaderClient } from "./header-client";
import { Icon } from "./icon";

export async function SiteHeader() {
  const [categories, featured] = await Promise.all([getCategories(), getFeaturedProducts(1)]);
  const top = featured[0];
  const topVariant = top ? defaultVariant(top.variants) : undefined;

  return (
    <>
      <div className="strip">
        <Icon name="truck" />
        <span className="only-desk">Cash on delivery. Pay when your jar arrives.</span>
        <span className="only-mob">Cash on delivery. Pay when it arrives.</span>
        <Link href="/shipping-policy">Delivery and payment</Link>
      </div>
      <HeaderClient
        shelves={categories.map((c) => ({ slug: c.slug, name: c.name, nameBn: c.nameBn }))}
        feature={
          top && topVariant
            ? {
                slug: top.slug,
                name: top.name,
                meta: `${heatOf(top.spiceLevel).word} · ${formatTaka(topVariant.price)}`,
              }
            : null
        }
      />
    </>
  );
}
