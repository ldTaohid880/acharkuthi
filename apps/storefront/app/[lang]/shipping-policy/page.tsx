import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/dict";
import { DocPage } from "@/components/doc-page";
import { html } from "@/content/shipping";
import { html as htmlEn } from "@/content/shipping-en";
import { withDeliveryFees } from "@/lib/doc-fees";
import { langOf, pageMeta } from "@/lib/seo";
import { getShareCard } from "@/lib/share-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang = await langOf(params);
  const [title, description] = getDict(lang).meta.shipping;
  return pageMeta({
    title,
    description,
    path: "/shipping-policy",
    lang,
    card: await getShareCard(lang, undefined, undefined, "policies"),
  });
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  return <DocPage html={await withDeliveryFees(lang === "en" ? htmlEn : html)} lang={lang} />;
}
