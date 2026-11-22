"use client";

import { Container } from "@/components/container";
import { useLang } from "@/lib/i18n/lang-context";

/** Loading state from RecipeDetail.dc.html: blocks that keep the page's footprint. */
export function RecipeSkeleton() {
  const { t } = useLang();
  return (
    <div className="page-recipes page-rd" aria-busy="true">
      <main>
        <Container className="rd-sk" role="status" aria-label={t.recipes.loading}>
          <div className="sk-top">
            <div className="sk-l">
              <i style={{ height: 16, width: "40%" }} />
              <i style={{ height: 52, width: "80%" }} />
              <i style={{ height: 18, width: "60%" }} />
              <i style={{ height: 18, width: "90%" }} />
              <i style={{ height: 18, width: "85%" }} />
            </div>
            <i className="ph0" />
          </div>
          <div className="sk-main">
            <div>
              <i style={{ height: 36, width: "50%" }} />
              {[1, 2, 3, 4, 5].map((n) => (
                <i key={n} style={{ height: 52 }} />
              ))}
            </div>
            <div>
              <i style={{ height: 36, width: "40%" }} />
              <i style={{ height: 60 }} />
              <i style={{ height: 90 }} />
              <i style={{ height: 60 }} />
              <i style={{ height: 90 }} />
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
