import { existsSync, readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { placeName, upazilasOf } from "@repo/validators";
import { exec, one, q, testPhone } from "./support/db";
import { SERVER_LOG, loadCreds, stateFile } from "./support/env";
import { expect, test } from "./support/fixtures";

const newPassword = () => `${loadCreds().password}x2`;

async function signIn(page: Page, p: (s: string) => string, email: string, password: string) {
  await page.goto(p("/login"));
  await page.locator("#a-l-em").fill(email);
  await page.locator("#a-l-pw").fill(password);
  await page.locator("form.form button[type=submit]").click();
}

/** The newest reset link for `email`: from the server log (dev mail), else the reset token row. */
async function resetLink(
  email: string,
  callbackURL: string,
): Promise<{ url: string; from: string }> {
  if (existsSync(SERVER_LOG)) {
    const lines = readFileSync(SERVER_LOG, "utf8").split("\n").reverse();
    const hit = lines.find((l) => l.includes(`password reset link for ${email}:`));
    if (hit)
      return {
        url: hit.slice(hit.indexOf(": ", hit.indexOf(email)) + 2).trim(),
        from: "server log",
      };
  }
  const user = await one<{ id: string }>("select id from user where email = ?", [email]);
  const row = await one<{ identifier: string }>(
    "select identifier from verification where value = ? and identifier like 'reset-password:%' order by created_at desc limit 1",
    [user?.id],
  );
  if (!row) throw new Error("no reset token found");
  // The same link Better Auth mails: /api/auth/reset-password/<token>?callbackURL=<redirectTo>.
  const token = row.identifier.slice("reset-password:".length);
  return {
    url: `/api/auth/reset-password/${token}?callbackURL=${encodeURIComponent(callbackURL)}`,
    from: "reset token in the database (no dev log line)",
  };
}

test.describe("account: sign-up, sign-in, sign-out, password reset", () => {
  test.describe.configure({ mode: "serial" });
  const email = (slot: number, run: string) => `e2e-acct-${slot}-${run}@example.test`;

  test("sign-up, then sign-out and sign back in", async ({ page, p, t, slot }) => {
    const a = t.auth;
    const { run, password } = loadCreds();
    await page.goto(p("/login?view=register"));
    await page.locator("form.form button[type=submit]").click();
    await expect(page.getByText(a.fixTitle(4))).toBeVisible();
    await page.locator("#a-r-nm").fill("E2E Account");
    await page.locator("#a-r-em").fill(email(slot, run));
    await page.locator("#a-r-pw").fill(password);
    await page.locator("#a-r-cf").fill(password);
    await page.locator("form.form button[type=submit]").click();
    await expect(page.getByRole("heading", { name: a.madeTitle })).toBeVisible({ timeout: 15_000 });
    expect(await one("select id from user where email = ?", [email(slot, run)])).toBeTruthy();

    // Same email again: "already has an account".
    await page.context().clearCookies();
    await page.goto(p("/login?view=register"));
    await page.locator("#a-r-nm").fill("E2E Account");
    await page.locator("#a-r-em").fill(email(slot, run));
    await page.locator("#a-r-pw").fill(password);
    await page.locator("#a-r-cf").fill(password);
    await page.locator("form.form button[type=submit]").click();
    await expect(page.getByText(a.existsTitle)).toBeVisible();

    await signIn(page, p, email(slot, run), password);
    await expect(page.getByRole("heading", { name: a.inTitle })).toBeVisible({ timeout: 15_000 });
    await page.goto(p("/account/settings"));
    await page.getByRole("button", { name: t.account.signOut }).first().click();
    await page.getByRole("button", { name: t.account.outYes }).click();
    await expect(page.getByRole("heading", { name: t.account.outTitle })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${p("/account/signed-out")}$`));
    await page.goto(p("/account"));
    await expect(page).toHaveURL(new RegExp(`${p("/login")}`));
  });

  test("wrong password shows the error", async ({ page, p, t, slot }) => {
    await signIn(page, p, email(slot, loadCreds().run), "Wrong-pass-123");
    await expect(page.getByRole("alert").filter({ hasText: t.auth.badTitle })).toBeVisible();
  });

  test("forgot password: the link opens the same-language login page and sets a new password", async ({
    page,
    p,
    t,
    lang,
    slot,
  }) => {
    const a = t.auth;
    const who = email(slot, loadCreds().run);
    await page.goto(p("/login?view=forgot"));
    await page.locator("#a-f-em").fill(who);
    const sent = page.waitForRequest((r) => r.url().includes("/api/auth/request-password-reset"));
    await page.locator("form.form button[type=submit]").click();
    const redirectTo = ((await sent).postDataJSON() as { redirectTo: string }).redirectTo;
    // The request asks for this language's login page.
    expect(redirectTo).toBe(p("/login"));
    // Locally (no SMTP) the link is logged; `next start` runs as production, where a missing SMTP
    // setup refuses to send. Either way a reset token exists.
    await expect(
      page.getByRole("heading", { name: a.mailTitle }).or(page.getByText(a.sendFail)),
    ).toBeVisible({ timeout: 15_000 });
    const mailed = await page.getByRole("heading", { name: a.mailTitle }).isVisible();
    test.info().annotations.push({
      type: "reset-mail",
      description: mailed
        ? "reset link sent (dev log)"
        : "production server without SMTP: send failed",
    });

    const { url: link, from } = await resetLink(who, redirectTo);
    test.info().annotations.push({ type: "reset-link-source", description: from });
    await page.goto(link);
    await expect(page).toHaveURL(new RegExp(`${p("/login")}\\?token=`));
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.getByRole("heading", { name: a.resetTitle })).toBeVisible();
    await page.locator("#a-p-pw").fill(newPassword());
    await page.locator("#a-p-cf").fill(newPassword());
    await page.locator("form.form button[type=submit]").click();
    await expect(page.getByRole("heading", { name: a.changedTitle })).toBeVisible();
    await page.getByRole("button", { name: a.signInNow }).click();
    await page.locator("#a-l-em").fill(who);
    await page.locator("#a-l-pw").fill(newPassword());
    await page.locator("form.form button[type=submit]").click();
    await expect(page.getByRole("heading", { name: a.inTitle })).toBeVisible({ timeout: 15_000 });
    // The used link no longer works.
    await page.goto(link);
    await expect(page.getByText(a.expTitle)).toBeVisible();
  });
});

test.describe("account pages (signed in)", () => {
  test.use({
    storageState: async ({}, use, info) => use(stateFile(info.project.name)),
  });
  const shopper = () =>
    one<{ id: string; email: string }>("select id, email from user where email = ?", [
      loadCreds().shoppers[test.info().project.name],
    ]);

  test("overview and orders list", async ({ page, p, t, slot }) => {
    const me = await shopper();
    const number = `AK-261116-98000${slot}`;
    await exec("delete from orders where order_number = ?", [number]);
    await exec(
      `insert into orders (order_number, user_id, status, customer_name, customer_phone, shipping_address,
        ship_upazila, ship_district, delivery_zone, subtotal, shipping_fee, total)
       values (?, ?, 'confirmed', 'E2E Account Order', ?, 'বাড়ি ১', 'ধানমন্ডি', 'ঢাকা', 'in', 30000, 7000, 37000)`,
      [number, me?.id, testPhone(slot)],
    );
    try {
      await page.goto(p("/account"));
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        t.account.hello("E2E").split(",")[0] ?? "",
      );
      await page.goto(p("/account/orders"));
      const card = page.locator("li.oc").filter({ hasText: number });
      await expect(card).toBeVisible();
      await expect(card.getByRole("link").first()).toHaveAttribute("href", new RegExp(number));
    } finally {
      await exec("delete from orders where order_number = ?", [number]);
    }
  });

  test("addresses: add, edit, set default, delete; place names saved in Bangla", async ({
    page,
    p,
    t,
    lang,
    slot,
  }) => {
    const a = t.account;
    const me = await shopper();
    await exec("delete from addresses where user_id = ?", [me?.id]);
    await page.goto(p("/account/addresses"));
    await page.getByRole("button", { name: a.addAddr }).click();
    await page.getByRole("button", { name: a.saveAddr }).click();
    await expect(
      page.getByText(a.err["ঠিকানার একটি নাম দিন"] ?? "ঠিকানার একটি নাম দিন"),
    ).toBeVisible();

    const add = async (label: string, place: [string, string]) => {
      await page.locator("#ad-label").fill(label);
      await page.locator("#ad-name").fill("E2E Receiver");
      await page.locator("#ad-phone").fill(testPhone(slot));
      await page.locator("#ad-division").selectOption(place[0]);
      await page.locator("#ad-district").selectOption(place[1]);
      await page.locator("#ad-upazila").selectOption(upazilasOf(place[0], place[1])[0] ?? "");
      await page.locator("#ad-line").fill("বাড়ি ৭, রোড ২, স্কুলের পাশে");
      await page.getByRole("button", { name: a.saveAddr }).click();
      await expect(page.locator("li.ac").filter({ hasText: label })).toBeVisible();
    };
    // English pages show English division names in the list.
    await expect(page.locator("#ad-division option").nth(3)).toHaveText(placeName("ঢাকা", lang));
    await add("E2E Home", ["ঢাকা", "ঢাকা"]);
    await page.getByRole("button", { name: a.newAddr }).click();
    await add("E2E Office", ["চট্টগ্রাম", "চট্টগ্রাম"]);

    const rows = await q<{
      label: string;
      division: string;
      district: string;
      city: string;
      is_default: number;
    }>(
      "select label, division, district, city, is_default from addresses where user_id = ? order by id",
      [me?.id],
    );
    expect(rows.map((r) => [r.label, r.division, r.district])).toEqual([
      ["E2E Home", "ঢাকা", "ঢাকা"],
      ["E2E Office", "চট্টগ্রাম", "চট্টগ্রাম"],
    ]);
    for (const r of rows) expect(r.city).toMatch(/[ঀ-৿]/);
    expect(rows[0]?.is_default).toBe(1);

    // Edit the office label.
    const office = page.locator("li.ac").filter({ hasText: "E2E Office" });
    await office.getByRole("button", { name: a.edit }).click();
    await page.locator("#ad-label").fill("E2E Office 2");
    await page.getByRole("button", { name: a.saveAddr }).click();
    await expect(page.locator("li.ac").filter({ hasText: "E2E Office 2" })).toBeVisible();

    // Make it the default.
    const office2 = page.locator("li.ac").filter({ hasText: "E2E Office 2" });
    await office2.getByRole("button", { name: a.setDefault }).click();
    await expect(office2.getByText(a.default)).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await one<{ is_default: number }>(
              "select is_default from addresses where label = 'E2E Office 2' and user_id = ?",
              [me?.id],
            )
          )?.is_default,
      )
      .toBe(1);

    // Delete the home address (confirm).
    const home = page.locator("li.ac").filter({ hasText: "E2E Home" });
    await home.getByRole("button", { name: a.del }).click();
    await home.getByRole("button", { name: a.delYes }).click();
    await expect(page.locator("li.ac").filter({ hasText: "E2E Home" })).toHaveCount(0);
    expect(await q("select id from addresses where user_id = ?", [me?.id])).toHaveLength(1);
  });

  test("reviews page has both review tabs", async ({ page, p, t }) => {
    await page.goto(p("/account/reviews"));
    const tabs = page.getByRole("tablist", { name: t.account.reviewKinds });
    await expect(tabs.getByRole("tab", { name: t.account.prodTab })).toBeVisible();
    await tabs.getByRole("tab", { name: t.account.siteTab }).click();
    await expect(page.getByText(t.account.siteWhere)).toBeVisible();
  });

  test("settings: change the name", async ({ page, p, t, slot }) => {
    await page.goto(p("/account/settings"));
    await page.locator("section[aria-labelledby=sp1] button.lk").first().click();
    const name = page.getByPlaceholder(t.account.fullName);
    await name.fill(`E2E Renamed ${slot}`);
    await page
      .locator("section[aria-labelledby=sp1]")
      .getByRole("button", { name: t.account.save })
      .click();
    await expect(page.getByText(t.account.profSaved)).toBeVisible();
    const me = await shopper();
    expect(
      (await one<{ name: string }>("select name from user where id = ?", [me?.id]))?.name,
    ).toBe(`E2E Renamed ${slot}`);
  });
});
