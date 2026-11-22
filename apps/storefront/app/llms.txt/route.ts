import { asc, bySortOrder, db, eq, getShopRules, schema } from "@repo/db";
import { formatTaka } from "@repo/ui/lib/utils";
import { localePath } from "@/lib/i18n/lang";
import { pickString } from "@/lib/i18n/pick";
import { heatOf } from "@/lib/product-view";
import { productHref } from "@/lib/routes";
import {
  realCopy,
  SITE_EMAIL,
  SITE_NAME,
  SITE_NAME_BN,
  SITE_SOCIAL,
  SITE_WHATSAPP,
} from "@/lib/seo";
import { absolute } from "@/lib/site-url";
import { RECIPES_LIVE } from "@/lib/features";

// Built from the live catalogue and settings on each request (the build has no database).
export const dynamic = "force-dynamic";

/**
 * /llms.txt (llmstxt.org): a plain summary of the shop for AI assistants (owner request,
 * 2026-11-15). Facts follow the policy pages (memory: policy-decisions); prices, stock and
 * delivery charges are live. Placeholder copy is never included. Written in English for the
 * assistants; links go to the English pages (/en/…), with each Bangla page named once at the top.
 */
/** Absolute URL of a page's English version. */
const en = (path: string) => absolute(localePath("en", path));

export async function GET() {
  const [products, { fees, codEnabled }] = await Promise.all([
    db.query.products.findMany({
      where: eq(schema.products.isActive, true),
      with: {
        variants: true,
        category: true,
      },
      orderBy: [asc(schema.products.id)],
    }),
    getShopRules(),
  ]);

  const lines: string[] = [
    `# ${SITE_NAME_BN} (${SITE_NAME})`,
    "",
    "> Heritage Bengali pickles (achar) from Dhaka, Bangladesh: recipes handed down for generations, stone-ground spices, wood-pressed mustard oil, no preservatives. Delivery to all 64 districts of Bangladesh. Cash on delivery only, no advance payment.",
    "",
    `The site is in two languages with the same pages: Bangla at ${absolute("/")} and English at ${absolute("/en")} (every path is the same, with /en in front). Product names are shown in both scripts. Prices are in Bangladeshi taka (৳).`,
    "",
    "## Pickles",
    "",
  ];

  for (const p of products) {
    const sizes = p.variants.filter((v) => v.isActive).sort(bySortOrder);
    if (sizes.length === 0) continue;
    const name = p.nameBn ? `${p.name} · ${p.nameBn}` : p.name;
    const offer = sizes
      .map((v) => `${v.label} ${formatTaka(v.price)}${v.stock > 0 ? "" : " (out of stock)"}`)
      .join(", ");
    const about = [
      realCopy(pickString("en", p.descriptionBn, p.description)),
      `Spice: ${heatOf(p.spiceLevel).word}.`,
      realCopy(pickString("en", p.ingredients, p.ingredientsEn))
        ? `Ingredients: ${realCopy(pickString("en", p.ingredients, p.ingredientsEn))}.`
        : null,
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(`- [${name}](${en(productHref(p.slug))}): ${offer}. ${about}`.trim());
  }

  lines.push(
    "",
    "## Ordering, delivery and payment",
    "",
    `- Order on the website; no account needed. ${codEnabled ? "Payment is cash on delivery only." : "Orders are paused right now."}`,
    `- Delivery charge: ${formatTaka(fees.in)} inside Dhaka district, ${formatTaka(fees.out)} everywhere else in Bangladesh, shown at checkout before ordering.`,
    "- Usually packed within 1 working day, then about 1–2 days inside Dhaka and 3–5 days outside (estimates).",
    "- Orders can be cancelled or changed free of charge until they are handed to the courier.",
    `- Track an order with its order number and phone number: ${en("/track")}`,
    "",
    "## Returns and refunds",
    "",
    "- Broken, leaking, wrong, missing or spoiled jars: report within 24 hours of delivery with the order number and photos for a free replacement, or a refund if preferred.",
    "- Refunds go to bKash or Nagad within 7 working days of approval. Taste preference or change of mind is not returnable (food).",
    "",
    "## Contact",
    "",
    `- WhatsApp: ${SITE_WHATSAPP}`,
    `- Email: ${SITE_EMAIL}`,
    ...SITE_SOCIAL.map((s) => `- ${s.includes("facebook") ? "Facebook" : "Instagram"}: ${s}`),
    `- Contact form: ${en("/contact")}`,
    "",
    "## Pages",
    "",
    `- [Shop all pickles](${en("/shop")})`,
    ...(RECIPES_LIVE ? [`- [Recipes](${en("/recipes")})`] : []),
    `- [FAQ](${en("/faq")})`,
    `- [Shipping and delivery](${en("/shipping-policy")})`,
    `- [Returns and refunds](${en("/return-refund-policy")})`,
    `- [Privacy policy](${en("/privacy-policy")})`,
    `- [Terms and conditions](${en("/terms-and-conditions")})`,
    `- [Our story](${en("/our-story")})`,
    "",
    "## In Bangla (বাংলায়)",
    "",
    `- [আচারের দোকান](${absolute("/shop")})`,
    `- [সাধারণ জিজ্ঞাসা](${absolute("/faq")})`,
    `- [ডেলিভারি নীতি](${absolute("/shipping-policy")})`,
    `- [ফেরত ও রিফান্ড নীতি](${absolute("/return-refund-policy")})`,
    "",
  );

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
