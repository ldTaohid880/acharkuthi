import { one, q } from "./support/db";
import { expect, test } from "./support/fixtures";
import { pick } from "./support/shop";

const num = (s: string) =>
  Number(s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/[^\d]/g, ""));

test.describe("content pages", () => {
  const PAGES = [
    ["/our-story", "story"],
    ["/contact", "contact"],
    ["/faq", "faq"],
    ["/shipping-policy", "shipping"],
    ["/return-refund-policy", "returns"],
    ["/privacy-policy", "privacy"],
    ["/terms-and-conditions", "terms"],
    ["/recipes", "recipes"],
  ] as const;
  for (const [path, key] of PAGES) {
    test(`${path} renders in the page language`, async ({ page, p, t, lang }) => {
      const res = await page.goto(p(path));
      expect(res?.status()).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page).toHaveTitle(new RegExp(`^${t.meta[key][0]}`));
      const h1 = page.getByRole("heading", { level: 1 }).first();
      await expect(h1).toBeVisible();
      expect((await h1.innerText()).trim().length).toBeGreaterThan(2);
    });
  }

  test("FAQ answers open and close", async ({ page, p }) => {
    await page.goto(p("/faq"));
    const first = page.locator("details.fq").first();
    await first.locator("summary").click();
    await expect(first).toHaveAttribute("open", "");
    await first.locator("summary").click();
    await expect(first).not.toHaveAttribute("open", "");
  });

  test("policy pages show the live delivery fees", async ({ page, p }) => {
    const f = await one<{ delivery_fee_in: number; delivery_fee_out: number }>(
      "select delivery_fee_in, delivery_fee_out from shop_settings where id = 1",
    );
    await page.goto(p("/shipping-policy"));
    const body = await page.locator("main").innerText();
    const bn = (n: number) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)] ?? d);
    const fee = (paisa: number) => [String(paisa / 100), bn(paisa / 100)];
    expect(fee(f!.delivery_fee_in).some((x) => body.includes(x))).toBe(true);
    expect(fee(f!.delivery_fee_out).some((x) => body.includes(x))).toBe(true);
  });
});

test.describe("contact form", () => {
  test("validation, then a successful send", async ({ page, p, t, slot }) => {
    const c = t.contact;
    const msg = (bn: string) => c.err[bn] ?? bn;
    await page.goto(p("/contact"));
    const form = page.locator(".fcard form");
    await form.locator("button[type=submit]").click();
    // The form is reset to the server's echo when the action answers: wait for that first.
    await expect(form.locator("button[type=submit][aria-busy=true], button[type=submit] .spin:visible")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".fcard .summary")).toBeVisible();
    for (const bn of ["নামটি লিখুন", "ইমেইল লিখুন", "একটি বিষয় বেছে নিন", "আপনার বার্তা লিখুন"])
      await expect(form.locator(".ak-help.is-error").getByText(msg(bn), { exact: true })).toBeVisible();

    await form.locator('input[name="email"]').fill("nope");
    await form.locator('input[name="phone"]').fill("123");
    await form.locator('textarea[name="message"]').fill("short");
    await form.locator("button[type=submit]").click();
    // The form is reset to the server's echo when the action answers: wait for that first.
    await expect(form.locator("button[type=submit][aria-busy=true], button[type=submit] .spin:visible")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    for (const bn of [
      "ইমেইলটি ঠিক মনে হচ্ছে না, যেমন: name@example.com",
      "ফোন নম্বরটি ঠিক করুন, যেমন: 01XXXXXXXXX",
      "আরেকটু বিস্তারিত লিখুন (কমপক্ষে ১০ অক্ষর)",
    ])
      await expect(form.locator(".ak-help.is-error").getByText(msg(bn), { exact: true })).toBeVisible();

    const email = `e2e-contact-${slot}-${Date.now()}@example.test`;
    // A fresh form for the send (React resets an action form to the server's echo when it answers).
    await page.reload();
    await form.locator('input[name="name"]').fill("E2E Contact");
    await form.locator('input[name="email"]').fill(email);
    await form.locator('input[name="phone"]').fill("");
    await pick(page, c.subject, c.sProduct);
    await form.locator('textarea[name="message"]').fill("E2E: is the mango pickle very hot?");
    await expect(form.locator('input[name="email"]')).toHaveValue(email);
    await form.locator("button[type=submit]").click();
    await expect(page.getByRole("heading", { name: c.okTitle })).toBeVisible();
    const row = await one<{ subject: string; name: string }>(
      "select subject, name from contact_messages where email = ?",
      [email],
    );
    expect(row?.subject).toBe("product");
    expect(row?.name).toBe("E2E Contact");
    await page.getByRole("button", { name: c.another }).click();
    await expect(form.locator('input[name="name"]')).toHaveValue("");
  });
});

test.describe("recipes", () => {
  const recipes = () =>
    q<{ slug: string; category: string; total_minutes: number }>(
      "select slug, category, total_minutes from recipes where is_published = 1",
    );

  test("list: category chips, under 15 minutes, load more", async ({ page, p, t }) => {
    const all = await recipes();
    await page.goto(p("/recipes"));
    const cnt = page.locator(".disc .cnt b").first();
    await expect.poll(async () => num(await cnt.innerText())).toBe(all.length);
    const cards = page.locator(".rgrid > a");
    await expect(cards).toHaveCount(Math.min(6, all.length));
    if (all.length > 6) {
      await page.getByRole("button", { name: t.recipes.more }).click();
      await expect(cards).toHaveCount(all.length);
    }
    const chips = page.getByRole("group", { name: t.recipes.catAria });
    await chips.getByRole("button", { name: t.recipes.chips.rice }).click();
    await expect(chips.getByRole("button", { name: t.recipes.chips.rice })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const rice = all.filter((r) => r.category === "rice");
    await expect.poll(async () => num(await cnt.innerText())).toBe(rice.length);
    await chips.getByRole("button", { name: t.recipes.quick }).click();
    const quickRice = rice.filter((r) => r.total_minutes <= 15);
    await expect.poll(async () => num(await cnt.innerText())).toBe(quickRice.length);
    await chips.getByRole("button", { name: t.recipes.chips.all }).click();
    const quick = all.filter((r) => r.total_minutes <= 15);
    await expect.poll(async () => num(await cnt.innerText())).toBe(quick.length);
    for (const h of await cards.evaluateAll((as) => as.map((a) => a.getAttribute("href"))))
      expect(h?.startsWith(p("/recipes/"))).toBe(true);
  });

  test("detail: servings scaler, ticking ingredients and steps, print", async ({
    page,
    p,
    t,
    lang,
  }) => {
    const r = t.recipes;
    await page.goto(p("/recipes/khichuri"));
    const sv = page.getByRole("group", { name: r.howManyAria });
    await expect(sv.getByRole("button", { name: r.people(4) })).toHaveAttribute("aria-pressed", "true");
    // Base 4 people: rice is 1 cup. For 8 people it doubles.
    const first = page.locator(".rd-chk .qt").first();
    await expect(first).toHaveText(lang === "en" ? "1 cup" : "১ কাপ");
    await sv.getByRole("button", { name: r.people(8) }).click();
    await expect(first).toHaveText(lang === "en" ? "2 cups" : "২ কাপ");
    await expect(first).toHaveAttribute("lang", lang);

    const ing = page.locator(".rd-chk input[type=checkbox]");
    const total = await ing.count();
    await ing.nth(0).check({ force: true });
    await ing.nth(1).check({ force: true });
    await expect(page.locator("#ing .rd-prog b").first()).toHaveText(lang === "en" ? "2" : "২");
    const steps = page.locator(".rd-done input[type=checkbox]");
    await steps.first().check({ force: true });
    await expect(steps.first()).toBeChecked();
    expect(total).toBeGreaterThan(2);

    await page.evaluate(() => {
      (window as unknown as { __printed: number }).__printed = 0;
      window.print = () => {
        (window as unknown as { __printed: number }).__printed++;
      };
    });
    await page.getByRole("button", { name: r.print }).first().click();
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
  });

  test("a missing recipe shows the recipe 404", async ({ page, p, t }) => {
    const res = await page.goto(p("/recipes/no-such-recipe"));
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: t.recipes.missH })).toBeVisible();
  });
});

test.describe("error pages", () => {
  test("site 404 in the page language", async ({ page, p, lang }) => {
    const res = await page.goto(p("/no-such-page"));
    expect(res?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: lang === "en" ? /home|shop/i : /হোম|আচার|দোকান/ }).first()).toBeVisible();
  });

  test("/unavailable", async ({ page, p, t }) => {
    const res = await page.goto(p("/unavailable"));
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(t.errors.unTitle);
    await expect(page.getByRole("link", { name: t.errors.unShop })).toHaveAttribute("href", p("/shop"));
  });

  test("error page (app/[lang]/error.tsx)", async () => {
    // No page can be made to throw from the outside (inputs are parsed with .catch() defaults and
    // the database is up), so the error boundary can't be reached without an app-side hook.
    test.fixme(true, "error boundary not reachable from a browser without changing app code");
  });
});

test.describe("newsletter", () => {
  test("footer signup: invalid email, then success", async ({ page, p, t, slot }) => {
    await page.goto(p("/faq"));
    const form = page.getByRole("form", { name: t.newsletter.label });
    await form.locator('input[name="email"]').fill("not-an-email");
    await form.locator("button[type=submit]").click();
    await expect(form.getByRole("alert")).toHaveText(t.newsletter.invalid);
    const email = `e2e-news-${slot}-${Date.now()}@example.test`;
    await form.locator('input[name="email"]').fill(email);
    await form.locator("button[type=submit]").click();
    await expect(form.getByRole("status")).toHaveText(t.newsletter.ok);
    expect(await one("select id from newsletter_subscribers where email = ?", [email])).toBeTruthy();
  });
});
