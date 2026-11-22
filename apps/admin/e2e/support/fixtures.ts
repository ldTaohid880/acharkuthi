import { test as base, expect, type Page } from "@playwright/test";
import { dicts, type Dict } from "../../lib/i18n/dict";
import { loadCreds, one, stateFile, type Who } from "./env";

interface Fixtures {
  /** Signed-in role for the page (owner unless a test says otherwise). */
  as: Who;
  /** Admin dictionary in the signed-in user's admin language. */
  t: Dict;
  phone: boolean;
  /** Screenshot of every known app bug (a test marked test.fail()), for the report. */
  bugShot: undefined;
}

export const test = base.extend<Fixtures>({
  as: ["owner", { option: true }],
  storageState: async ({ as }, use) => use(stateFile(as)),
  t: async ({ as }, use) => {
    const email = loadCreds().emails[as];
    const row = await one<{ admin_lang: string }>("select admin_lang from user where email = ?", [
      email,
    ]);
    await use(dicts[row?.admin_lang === "bn" ? "bn" : "en"]);
  },
  phone: async ({ viewport }, use) => use((viewport?.width ?? 1440) < 768),
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
export type { Dict };

/** "{n} orders" → "3 orders". */
export const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(v[k] ?? ""));

/** The page itself must not scroll (owner rule: only lists / bodies scroll, in a ScrollArea). */
export async function pageDoesNotScroll(page: Page) {
  return page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return el.scrollHeight <= window.innerHeight + 1;
  });
}
