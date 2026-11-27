/**
 * Acharkuthi's OFFICIAL social profiles (owner, 2026-11-27). Fake pages use the brand's name, so
 * every social link on the site (footer, Contact, schema.org sameAs, llms.txt) comes from this one
 * list. Never write a social URL anywhere else, and never add one the owner hasn't confirmed.
 */
export const OFFICIAL_SOCIAL = {
  facebook: "https://www.facebook.com/acharkuthi",
  instagram: "https://www.instagram.com/acharkuthi_store",
  tiktok: "https://www.tiktok.com/@acharkuthi_store",
  youtube: "https://www.youtube.com/@acharkuthi",
} as const;

export type SocialNetwork = keyof typeof OFFICIAL_SOCIAL;

/** The order the profiles are shown in, and their display names. */
export const SOCIAL_ORDER = ["facebook", "instagram", "tiktok", "youtube"] as const;
export const SOCIAL_NAME: Record<SocialNetwork, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

/** Profile pages for schema.org sameAs (a chat link is not a profile, so WhatsApp is left out). */
export const SAME_AS = SOCIAL_ORDER.map((n) => OFFICIAL_SOCIAL[n]);

/** Customer-service phone, international format; it is the WhatsApp number. */
export const SITE_PHONE = "+8801624607294";
/** WhatsApp chat with the shop. */
export const SITE_WHATSAPP = `https://wa.me/${SITE_PHONE.slice(1)}`;

/** rel for links to our own profiles: "me" tells crawlers the profile belongs to this site. */
export const REL_ME = "me noopener";
