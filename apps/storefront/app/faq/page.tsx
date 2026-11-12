import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";
import { html } from "@/content/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about ordering, delivery and payment.",
};

export default function Page() {
  return <DocPage html={html} />;
}
