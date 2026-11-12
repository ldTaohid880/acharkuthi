import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";
import { html } from "@/content/returns";

export const metadata: Metadata = {
  title: "Returns and refunds",
  description: "Our return and refund policy.",
};

export default function Page() {
  return <DocPage html={html} />;
}
