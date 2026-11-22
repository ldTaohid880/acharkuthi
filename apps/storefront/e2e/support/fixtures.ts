import { test as base, expect, type Page } from "@playwright/test";
import { getDict } from "../../lib/i18n/dict";
import { localePath, type Lang } from "../../lib/i18n/lang";
import { SLOTS, slotSku } from "./db";

export type Dict = ReturnType<typeof getDict>;

interface Fixtures {
  /** Page language of this project: Bangla at "/", English at "/en". */
  lang: Lang;
  /** The storefront dictionary in the page language. */
  t: Dict;
  /** "/shop" → "/shop" (bn) or "/en/shop" (en). */
  p: (path: string) => string;
  /** Phone-width project (390 px). */
  mobile: boolean;
  /** This project's own size of the test pickle (stock never shared between projects). */
  slot: number;
  sku: string;
  /** Screenshot of every known app bug (a test marked test.fail()), for the report. */
  bugShot: undefined;
}

export const test = base.extend<Fixtures>({
  lang: ["bn", { option: true }],
  t: async ({ lang }, use) => use(getDict(lang)),
  p: async ({ lang }, use) => use((path: string) => localePath(lang, path)),
  mobile: async ({ viewport }, use) => use((viewport?.width ?? 1440) < 720),
  slot: async ({}, use, info) => use(SLOTS[info.project.name] ?? 1),
  sku: async ({ slot }, use) => use(slotSku(slot)),
  bugShot: [
    async ({ page }, use, info) => {
      await use(undefined);
      if (info.expectedStatus === "failed")
        await page.screenshot({ path: info.outputPath("known-bug.png") }).catch(() => undefined);
    },
    { auto: true },
  ],
});

export { expect };

/** Writes the basket straight into localStorage (zustand persist), then reloads. */
export async function seedBasket(
  page: Page,
  lines: {
    variantId: number;
    productName: string;
    variantLabel: string;
    unitPrice: number;
    quantity: number;
    slug?: string;
  }[],
) {
  await page.evaluate((l) => {
    localStorage.setItem("acharkuthi-cart", JSON.stringify({ state: { lines: l }, version: 0 }));
  }, lines);
}

/** Digits in the page language (Bangla digits on the Bangla site where the UI uses them). */
export const bnDigits = (s: string) => s.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);

/** Escapes text for a RegExp. */
export const re = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
