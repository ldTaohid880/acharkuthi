import { expect, test } from "@playwright/test";

const PAGES: [string, RegExp][] = [
  ["/our-story", /ঐতিহ্যের/],
  ["/contact", /বলার/],
  ["/faq", /প্রশ্ন/],
  ["/shipping-policy", /ডেলিভারি নীতি/],
  ["/return-refund-policy", /./],
  ["/privacy-policy", /./],
  ["/terms-and-conditions", /./],
  ["/unavailable", /সেবাটি/],
];

for (const [path, heading] of PAGES) {
  test(`${path} renders its heading`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(heading);
  });
}

test("unknown URLs show the 404 page", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
});

test("faq answers open", async ({ page }) => {
  await page.goto("/faq");
  const first = page.locator("details.fq").first();
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
});

test("contact form reports every missing field", async ({ page }) => {
  await page.goto("/contact");
  await page.locator(".fcard form button[type=submit]").click();
  await expect(page.locator(".summary")).toBeVisible();
  await expect(page.locator(".ak-help.is-error")).toHaveCount(4);
});
