import type { MetadataRoute } from "next";

/** /robots.txt: the back office is never crawled (pages also carry noindex in the root layout). */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
