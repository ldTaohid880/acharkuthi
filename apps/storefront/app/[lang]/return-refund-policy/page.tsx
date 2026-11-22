import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/dict";
import { DocPage } from "@/components/doc-page";
import { html } from "@/content/returns";
import { html as htmlEn } from "@/content/returns-en";
import { langOf, pageMeta } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang = await langOf(params);
  const [title, description] = getDict(lang).meta.returns;
  return pageMeta({
    title,
    description,
    path: "/return-refund-policy",
    lang,
  });
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  return <DocPage html={lang === "en" ? htmlEn : html} lang={lang} />;
}
