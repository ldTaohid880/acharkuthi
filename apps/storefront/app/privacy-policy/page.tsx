import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";
import { html } from "@/content/privacy";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Acharkuthi handles your personal information.",
};

export default function Page() {
  return <DocPage html={html} />;
}
