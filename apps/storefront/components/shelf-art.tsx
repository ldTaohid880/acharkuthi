import { Icon } from "./icon";
import { shelfIcon } from "./shelf-icon";

/**
 * A shelf's picture inside its disc: the category image set in admin (owner, 2026-11-21), or the
 * shelf icon while a category has none. Decorative; the shelf name sits next to it.
 */
export function ShelfArt({ slug, imageUrl }: { slug: string; imageUrl?: string | null }) {
  if (imageUrl)
    // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded art on the R2 host
    return <img className="shelf-img" src={imageUrl} alt="" loading="lazy" decoding="async" />;
  return <Icon name={shelfIcon(slug)} />;
}
