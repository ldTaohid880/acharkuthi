import { loadCreds, passwordOf } from "./support/env";
import { expect, test } from "./support/fixtures";

test.describe("admin sign-in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  // Better Auth allows 3 sign-ins per 10 s per client; setup just used them.
  test.beforeAll(async () => new Promise((r) => setTimeout(r, 11_000)));

  test("unauthenticated users are sent to login", async ({ page }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "অ্যাডমিনে ঢুকুন" }).first()).toBeVisible();
  });

  test("owner signs in with the form and signs out", async ({ page, t, phone }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').fill(loadCreds().emails.owner);
    await page.locator('input[id$="-pass"]').fill(passwordOf("owner"));
    await expect(page.locator('input[id$="-pass"]')).toHaveValue(passwordOf("owner"));
    await page.locator('button[type="submit"]').click();
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
    await expect(
      page
        .getByRole("button", { name: t.nav.signOut })
        .or(page.getByRole("link", { name: t.nav.more }))
        .first(),
    ).toBeAttached();

    // Sign out: sidebar on desktop, the More page on phones.
    if (phone) await page.goto("/more");
    await page.getByRole("button", { name: t.nav.signOut }).locator("visible=true").first().click();
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/login/);
  });

  test("a wrong password shows the error", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.locator('input[type="email"]').fill(loadCreds().emails.owner);
    await page.locator('input[id$="-pass"]').fill("definitely-wrong-1");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole("alert").filter({ hasText: "ঢোকা গেল না" })).toBeVisible();
    await expect(page.getByText("পাসওয়ার্ড ভুল")).toBeVisible();
  });
});

test.describe("customer account", () => {
  test.use({ as: "customer" });
  test("a non-admin user gets no access", async ({ page }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "এই অ্যাকাউন্টের অ্যাক্সেস নেই" }),
    ).toBeVisible();
    for (const path of ["/", "/products", "/settings"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    }
  });
});

test.describe("staff account", () => {
  test.use({ as: "staff" });
  for (const path of ["/orders", "/stock", "/messages"]) {
    test(`staff can open ${path}`, async ({ page, t }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByText(t.forbidden.title)).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
    });
  }
  for (const path of [
    "/products",
    "/coupons",
    "/categories",
    "/settings",
    "/customers",
    "/reviews",
    "/restock-alerts",
  ]) {
    test(`staff get "no access" on ${path}`, async ({ page, t }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(403);
      await expect(page.getByText(t.forbidden.title)).toBeVisible();
    });
  }
  test("staff menu hides owner-only entries", async ({ page, t, phone }) => {
    test.skip(phone, "desktop sidebar");
    await page.goto("/orders");
    const nav = page.getByRole("navigation", { name: t.nav.label });
    await expect(
      nav.getByRole("link", { name: new RegExp(`^${t.nav.items.orders}`) }),
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: new RegExp(`^${t.nav.items.stock}`) }),
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: new RegExp(`^${t.nav.items.messages}`) }),
    ).toBeVisible();
    for (const k of ["coupons", "products", "settings", "customers", "reviews"] as const)
      await expect(nav.getByRole("link", { name: new RegExp(`^${t.nav.items[k]}`) })).toHaveCount(
        0,
      );
  });
});
