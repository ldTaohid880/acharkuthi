"use client";

import { Container } from "@/components/container";
import { useLang } from "@/lib/i18n/lang-context";

/**
 * Loading state from ShopStates ("Loading skeleton"), in the 2026-11-22 layout: eight card-shaped placeholders that keep the
 * footprint of a product card. Shown while a filter, sort or category change is fetched.
 */
export function ShopSkeleton({ shelfName }: { shelfName?: string }) {
  const { lang, t: all } = useLang();
  const t = all.shop;
  // `shelfName` is the page-language lead word ("Mango", "আমের"); none = all pickles.
  return (
    <main className="page-shop" aria-busy="true" lang={lang}>
      <section className="sh-hero" aria-labelledby="sh-h">
        <picture className="sh-bg">
          <img src="/images/shop/header-1440.webp" alt="" decoding="async" />
        </picture>
        <Container className="sh-copy">
          <span className="ak-eyebrow">{t.eyebrow}</span>
          <h1 className="h-xl" id="sh-h">
            {shelfName ?? t.heroTitle}
          </h1>
        </Container>
      </section>
      <Container>
        <div className="shop">
          <section className="gw" role="status" aria-label={t.loading}>
            <div className="grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="sk" aria-hidden="true">
                  <div className="s1" />
                  <div className="s2" />
                  <div className="s3" />
                  <div className="s4" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </Container>
    </main>
  );
}
