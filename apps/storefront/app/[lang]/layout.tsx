import type { Metadata } from "next";
import {
  Anek_Bangla,
  Baloo_2,
  Caveat,
  Fraunces,
  Galada,
  Instrument_Sans,
  Tiro_Bangla,
} from "next/font/google";
import "@repo/ui/globals.css";
import "../design.css";
import "../design-pages.css";
import "../design-pages-extra.css";
import "../design-reviews.css";
import "../design-mobile.css";
import "../design-drawer.css";
import { BasketBar } from "@/components/basket-bar";
import { JsonLd } from "@/components/json-ld";
import { MiniBasket } from "@/components/mini-basket";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { DEFAULT_IMAGE, langOf, SITE_NAME, SITE_NAME_BN, storeJsonLd } from "@/lib/seo";
import { getDict } from "@/lib/i18n/dict";
import { isLang, OG_LOCALE, type Lang } from "@/lib/i18n/lang";
import { LangProvider } from "@/lib/i18n/lang-context";
import { siteUrl } from "@/lib/site-url";
import { notFound } from "next/navigation";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-baloo",
  display: "swap",
});
const anek = Anek_Bangla({
  subsets: ["bengali", "latin"],
  variable: "--font-anek",
  display: "swap",
});
const tiro = Tiro_Bangla({
  subsets: ["bengali", "latin"],
  weight: "400",
  variable: "--font-tiro-bangla",
  display: "swap",
});
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-caveat",
  display: "swap",
});
const galada = Galada({
  subsets: ["bengali", "latin"],
  weight: "400",
  variable: "--font-galada",
  display: "swap",
});

/** Defaults for every page; public pages add their own canonical URL and preview (lib/seo.ts). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang = await langOf(params);
  const m = getDict(lang).meta;
  const [siteTitle, siteDescription] = m.home;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: siteTitle, template: `%s | ${m.site}` },
    description: siteDescription,
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      siteName: `${SITE_NAME_BN} · ${SITE_NAME}`,
      locale: OG_LOCALE[lang],
      alternateLocale: [OG_LOCALE[lang === "bn" ? "en" : "bn"]],
      title: siteTitle,
      description: siteDescription,
      images: [{ ...DEFAULT_IMAGE, alt: SITE_NAME }],
    },
    twitter: { card: "summary", images: [DEFAULT_IMAGE.url] },
  };
}

// The header reads the shelves from the database on every request.
export const dynamic = "force-dynamic";

/**
 * Root layout for both languages: Bangla is served from "/" (proxy.ts rewrites it to /bn) and
 * English from "/en" (memory: storefront-bilingual).
 */
export default async function RootLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ lang: string }> }>) {
  const { lang: raw } = await params;
  if (!isLang(raw)) notFound();
  const lang: Lang = raw;
  const fontVars = [fraunces, instrument, baloo, anek, tiro, caveat, galada]
    .map((f) => f.variable)
    .join(" ");
  return (
    // The page language, for screen readers, search engines and translation prompts. The Bangla
    // font rules (`:lang(bn)` in the design CSS) also require an explicit lang="bn" below <body>,
    // so unmarked text keeps the faces the boards were drawn with (they declare lang="en").
    <html lang={lang} data-site-lang={lang} className={fontVars}>
      <body className="ak">
        <LangProvider lang={lang}>
          <JsonLd data={storeJsonLd(lang)} />
          <SiteHeader lang={lang} />
          {children}
          <SiteFooter lang={lang} />
          <BasketBar />
          <MiniBasket />
        </LangProvider>
      </body>
    </html>
  );
}
