import { expect, pageDoesNotScroll, test } from "./support/fixtures";

/**
 * Owner rule (2026-11-13): on phones the page never scrolls as a whole; only the list or body
 * ScrollArea scrolls, and headers and save bars stay put.
 */
const PAGES = ["/", "/orders", "/products", "/stock", "/categories", "/coupons", "/customers", "/reviews", "/messages", "/restock-alerts", "/settings", "/more"];

test.describe("phone layout", () => {
  test.beforeEach(({ phone }) => test.skip(!phone, "phone project only"));

  for (const path of PAGES) {
    test(`${path}: the page never scrolls; only a ScrollArea does`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await pageDoesNotScroll(page), "document scrolls").toBe(true);
      // Scrolling the body area moves a ScrollArea viewport, not the window, and the header stays.
      const header = page.locator("header").first();
      const top = (await header.boundingBox())?.y ?? 0;
      await page.mouse.move(195, 500);
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      if (await header.count()) expect((await header.boundingBox())?.y ?? 0).toBe(top);
      const viewports = page.locator("[data-slot=scroll-area-viewport], [data-radix-scroll-area-viewport]");
      expect(await viewports.count()).toBeGreaterThan(0);
    });
  }
});
