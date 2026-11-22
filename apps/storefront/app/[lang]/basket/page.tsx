import type { Metadata } from "next";
import Link from "next/link";
import { BasketView } from "@/components/basket-view";
import { getDict } from "@/lib/i18n/dict";
import { localePath } from "@/lib/i18n/lang";
import { langOf } from "@/lib/seo";

interface Params {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = getDict(await langOf(params)).basket;
  return { title: t.metaTitle, robots: { index: false } };
}

/** Basket (Basket.dc.html desktop, BasketMobile.dc.html phone). The cart is on the device; prices come from the database. */
export default async function BasketPage({ params }: Params) {
  const lang = await langOf(params);
  const t = getDict(lang).basket;
  return (
    <main className="wrap bk-main page-basket">
      <nav className="crumbs" aria-label="Breadcrumb" lang={lang}>
        <Link href={localePath(lang, "/")}>{t.crumbHome}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t.crumb}</span>
      </nav>
      <div className="bk-head">
        <h1 className="bk-h1" lang={lang}>
          {t.title}
        </h1>
        <p className="bk-sub" lang={lang}>
          {t.sub}
        </p>
      </div>
      <BasketView />
    </main>
  );
}
