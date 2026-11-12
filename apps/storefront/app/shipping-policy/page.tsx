import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";
import { html } from "@/content/shipping";

export const metadata: Metadata = {
  title: "Shipping and delivery",
  description: "How and when your Acharkuthi order is delivered.",
};

export default function Page() {
  return <DocPage html={html} />;
}
