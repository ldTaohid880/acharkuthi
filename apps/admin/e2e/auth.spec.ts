import { expect, test } from "@playwright/test";

test("unauthenticated users are sent to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
});
