import { productOgTags, type ProductOgInput } from "@/lib/seo";

/**
 * og:type=product and the product:* tags (price, availability, SKU …) that Facebook, Messenger
 * and Pinterest read. Next.js metadata can't print them (its `other` field writes `name=`, and its
 * og:type list has no "product"), so they are rendered here; React hoists <meta> into <head>.
 */
export function ProductOg(props: ProductOgInput) {
  return (
    <>
      {productOgTags(props).map(([property, content]) => (
        <meta key={property} property={property} content={content} />
      ))}
    </>
  );
}
