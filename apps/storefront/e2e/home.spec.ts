import { expect, test } from "@playwright/test";

test("home page shows the hero and main navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Some tastes stay in the heart",
  );
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
});
