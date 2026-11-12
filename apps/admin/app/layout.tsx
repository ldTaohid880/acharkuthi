import type { Metadata } from "next";
import { Anek_Bangla, Geist_Mono, Inter } from "next/font/google";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

// admin.css: Inter (Latin) + Anek Bangla (Bangla) in one stack, Geist Mono for codes and numbers.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const anek = Anek_Bangla({
  subsets: ["bengali", "latin"],
  variable: "--font-anek",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Acharkuthi Admin", template: "%s | Acharkuthi Admin" },
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} ${anek.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
