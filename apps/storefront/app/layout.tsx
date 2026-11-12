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
import "./design.css";
import "./design-pages.css";
import "./design-pages-extra.css";
import "./design-reviews.css";
import "./design-mobile.css";
import "./design-drawer.css";
import { BasketBar } from "@/components/basket-bar";
import { MiniBasket } from "@/components/mini-basket";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

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

export const metadata: Metadata = {
  title: { default: "Acharkuthi · Homemade Bengali pickles", template: "%s | Acharkuthi" },
  description:
    "Old family recipes from our mothers and aunts. Spices ground at home, cured in pure wood-pressed mustard oil, with no preservatives. Cash on delivery across Dhaka.",
};

// The header reads the shelves from the database on every request.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fontVars = [fraunces, instrument, baloo, anek, tiro, caveat, galada]
    .map((f) => f.variable)
    .join(" ");
  return (
    <html lang="en" className={fontVars}>
      <body className="ak">
        <SiteHeader />
        {children}
        <SiteFooter />
        <BasketBar />
        <MiniBasket />
      </body>
    </html>
  );
}
