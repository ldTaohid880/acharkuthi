"use client";

import { html } from "@/content/not-found";
import { html as htmlEn, htmlMobile as htmlMobileEn } from "@/content/not-found-en";
import { html as htmlMobile } from "@/content/not-found-mobile";
import { localizeLinks } from "@/lib/i18n/html";
import { useLang } from "@/lib/i18n/lang-context";

/**
 * The design's 404. Desktop and phone markup differ, so both render and CSS shows one. A client
 * component only to read the page language (not-found gets no params); the English site gets
 * content/not-found-en.ts (memory: storefront-bilingual, "mirror" rule).
 */
export default function NotFound() {
  const { lang } = useLang();
  const en = lang === "en";
  const desk = en ? localizeLinks(htmlEn, lang) : html;
  const mob = en ? localizeLinks(htmlMobileEn, lang) : htmlMobile;
  return (
    <div className="page-notfound">
      <main className="er-main">
        <div className="nf-desk" dangerouslySetInnerHTML={{ __html: desk }} />
        <div className="nf-mob" dangerouslySetInnerHTML={{ __html: mob }} />
      </main>
    </div>
  );
}
