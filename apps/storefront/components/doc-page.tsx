import { localizeLinks } from "@/lib/i18n/html";
import type { Lang } from "@/lib/i18n/lang";

/**
 * Policy and FAQ pages. The copy is the design's own markup with the owner's real policy text
 * (2026-11-15), stored in `content/*.ts`; delivery fees are filled in by `withDeliveryFees`.
 * It is trusted static content from this repository, never user input. The English site uses the
 * `content/*-en.ts` versions; internal links follow the page language.
 */
export function DocPage({ html, lang }: { html: string; lang: Lang }) {
  return (
    <div className="page-doc">
      <main className="wrap doc-main" dangerouslySetInnerHTML={{ __html: localizeLinks(html, lang) }} />
    </div>
  );
}
