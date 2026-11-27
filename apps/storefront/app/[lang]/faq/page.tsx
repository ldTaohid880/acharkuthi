import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/dict";
import { DocPage } from "@/components/doc-page";
import { html } from "@/content/faq";
import { html as htmlEn } from "@/content/faq-en";
import { withDeliveryFees } from "@/lib/doc-fees";
import { JsonLd } from "@/components/json-ld";
import { faqJsonLd, langOf, pageMeta } from "@/lib/seo";
import { getShareCard } from "@/lib/share-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang = await langOf(params);
  const [title, description] = getDict(lang).meta.faq;
  return pageMeta({
    title,
    description,
    path: "/faq",
    lang,
    card: await getShareCard(lang, undefined, undefined, "faq"),
  });
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const filled = await withDeliveryFees(lang === "en" ? htmlEn : html);
  return (
    <>
      <JsonLd data={faqJsonLd(filled, lang)} />
      <DocPage html={filled} lang={lang} />
    </>
  );
}
