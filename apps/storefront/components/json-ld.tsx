import { ldJson } from "@/lib/seo";

/** schema.org structured data for search engines and AI assistants (one or more objects). */
export function JsonLd({ data }: { data: unknown }) {
  // Trusted server data, serialised with "<" escaped (lib/seo.ts ldJson).
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(data) }} />;
}
