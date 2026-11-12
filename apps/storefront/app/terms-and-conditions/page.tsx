import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";
import { html } from "@/content/terms";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "The terms for using the Acharkuthi store.",
};

export default function Page() {
  return <DocPage html={html} />;
}
