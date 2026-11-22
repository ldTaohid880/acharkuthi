import { formatTaka } from "@repo/ui/lib/utils";
import Link from "next/link";
import { getDict } from "@/lib/i18n/dict";
import { localePath, type Lang } from "@/lib/i18n/lang";
import { defaultVariant, heatOf } from "@/lib/product-view";
import { getCategories, getFeaturedProducts } from "@/lib/queries";
import { HeaderClient } from "./header-client";
import { Icon } from "./icon";

/** Announcement strip and header, in the page language (memory: storefront-bilingual). */
export async function SiteHeader({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const [categories, featured] = await Promise.all([getCategories(), getFeaturedProducts(1)]);
  const top = featured[0];
  const topVariant = top ? defaultVariant(top.variants) : undefined;

  return (
    <>
      <div className="strip" lang={lang}>
        <Icon name="truck" />
        <span className="only-desk">{t.header.stripDesk}</span>
        <span className="only-mob">{t.header.stripMob}</span>
        <Link href={localePath(lang, "/shipping-policy")}>{t.header.stripLink}</Link>
      </div>
      <HeaderClient
        shelves={categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          nameBn: c.nameBn,
          imageUrl: c.imageUrl,
          // Admin category tagline, in the page language (owner, 2026-11-22).
          tagline: (lang === "bn" ? c.taglineBn : c.tagline) ?? null,
        }))}
        feature={
          top && topVariant
            ? {
                slug: top.slug,
                photo: [...top.images].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? null,
                // Bangla name in Bangla, English in English (memory: storefront-bilingual).
                name: lang === "bn" ? (top.nameBn ?? top.name) : top.name,
                nameLang: lang === "bn" && top.nameBn ? "bn" : "en",
                meta: `${t.heat[heatOf(top.spiceLevel).word]} · ${formatTaka(topVariant.price)}`,
              }
            : null
        }
      />
    </>
  );
}
