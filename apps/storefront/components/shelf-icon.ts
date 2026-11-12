import type { IconName } from "./icon";

const BY_SLUG: Record<string, IconName> = {
  mango: "mango",
  lemon: "sun",
  special: "pot",
  mixed: "jar",
};

/** Illustration icon for a shelf; unknown shelves fall back to the jar. */
export const shelfIcon = (slug: string): IconName => BY_SLUG[slug] ?? "jar";

/** Plain English tagline under each shelf name (design copy). */
export const shelfBlurb = (slug: string): string =>
  ({
    mango: "Raw mango",
    lemon: "Gently sour",
    special: "Olive, tamarind, garlic",
    mixed: "A little of everything",
  })[slug] ?? "";

/** Bengali shelf labels used by the mobile menu (design copy). */
export const shelfLabelBn = (slug: string, fallback: string): string =>
  ({ mango: "আমের আচার", lemon: "লেবুর আচার", special: "বিশেষ আচার", mixed: "মিশ্র আচার" })[slug] ??
  fallback;
