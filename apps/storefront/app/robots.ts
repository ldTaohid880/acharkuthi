import type { MetadataRoute } from "next";
import { absolute } from "@/lib/site-url";

// Built on request, so the sitemap address always follows the running server's BETTER_AUTH_URL.
export const dynamic = "force-dynamic";

/**
 * /robots.txt. Shopping pages are open to crawlers; a shopper's own pages (basket, checkout,
 * account) and the API are not. Login and Track stay crawlable but carry `noindex` themselves.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Both languages: Bangla at "/", English under "/en".
      disallow: [
        "/api/",
        "/account",
        "/basket",
        "/checkout",
        "/en/account",
        "/en/basket",
        "/en/checkout",
      ],
    },
    sitemap: absolute("/sitemap.xml"),
  };
}
