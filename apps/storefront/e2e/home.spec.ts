import { one, q } from "./support/db";
import { expect, test } from "./support/fixtures";

test.describe("home", () => {
  test("hero, main navigation, shelves, bestseller card and story", async ({
    page,
    p,
    t,
    lang,
    mobile,
  }) => {
    await page.goto(p("/"));
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toHaveAttribute("lang", lang);
    await expect(h1).toContainText(lang === "en" ? "bring childhood back" : /শৈশব/);
    if (!mobile) await expect(page.getByRole("navigation", { name: t.header.main })).toBeVisible();
    else await expect(page.getByRole("button", { name: t.header.openMenu })).toBeVisible();
    await expect(page.locator(".hero").getByRole("link", { name: t.home.shop })).toHaveAttribute(
      "href",
      p("/shop"),
    );

    // Shelf discs: one per active shelf, linking to it in the page language.
    const shelves = await q<{ slug: string }>(
      "select slug from categories where is_active = 1 order by sort_order",
    );
    const discs = page.locator(".discs a.disc");
    await expect(discs).toHaveCount(shelves.length);
    expect(await discs.evaluateAll((as) => as.map((a) => a.getAttribute("href")))).toEqual(
      shelves.map((s) => p(`/shop/${s.slug}`)),
    );

    // Featured picks (owner mockup 2026-11-21): up to three cards, each linking to its pickle.
    const shelf = page.locator("#shop .fpk-grid");
    await expect(page.locator("#fpk-h")).toHaveText(t.home.fromTitle);
    const cards = shelf.locator(".fpk-card");
    expect(await cards.count()).toBeLessThanOrEqual(3);
    await expect(cards.locator("a.stretch").first()).toBeVisible();
    for (const h of await shelf
      .locator("a[href*='/pickles/']")
      .evaluateAll((as) => as.map((a) => a.getAttribute("href"))))
      expect(h?.startsWith(p("/pickles/"))).toBe(true);

    await expect(page.locator("#story h2")).toHaveText(t.home.storyTitle);
    await expect(
      page.locator("#story").getByRole("link", { name: t.home.readStory }),
    ).toHaveAttribute("href", p("/our-story"));
  });

  test("reviews section shows approved site reviews", async ({ page, p, t, mobile }) => {
    const approved = await one<{ n: number }>(
      "select count(*) n from site_reviews where is_approved = 1",
    );
    await page.goto(p("/"));
    const sec = page.locator("#reviews");
    await expect(sec).toBeVisible();
    await expect(sec.getByRole("button", { name: t.home.rvShare }).first()).toBeVisible();
    if (Number(approved?.n) === 0 && !mobile)
      await expect(sec.getByText(t.home.rvSample).locator("visible=true").first()).toBeVisible();
  });

  test("site-review form: validation errors, then a successful send", async ({
    page,
    p,
    t,
    slot,
  }) => {
    const h = t.home;
    const msg = (bn: string) => h.err[bn] ?? bn;
    await page.goto(p("/"));
    await page.locator("#reviews").getByRole("button", { name: h.rvShare }).first().click();
    const dlg = page.getByRole("dialog");
    await expect(dlg).toBeVisible();
    await dlg.locator("button[type=submit]").click();
    await expect(dlg.getByText(h.rvFix(3))).toBeVisible();
    for (const bn of ["আপনার নাম লিখুন", "তারকা দিয়ে রেটিং বেছে নিন", "আপনার অভিজ্ঞতা লিখুন"])
      await expect(dlg.getByText(msg(bn), { exact: true })).toBeVisible();

    const name = `E2E Site ${slot}-${Date.now()}`;
    await dlg.locator('input[name="name"]').fill(name);
    await dlg.getByRole("radio", { name: h.rvStar(5) }).click();
    await dlg.locator('textarea[name="body"]').fill("ভালো");
    await dlg.locator("button[type=submit]").click();
    await expect(
      dlg.getByText(msg("আরেকটু বিস্তারিত লিখুন (কমপক্ষে ১০ অক্ষর)"), { exact: true }),
    ).toBeVisible();
    await dlg
      .locator('textarea[name="body"]')
      .fill("E2E: quick delivery and the jar was sealed well.");
    await dlg.locator("button[type=submit]").click();
    await expect(dlg.getByText(h.rvOkTitle)).toBeVisible();
    const row = await one<{ rating: number; is_approved: number }>(
      "select rating, is_approved from site_reviews where name = ?",
      [name],
    );
    expect(row?.rating).toBe(5);
    expect(row?.is_approved).toBe(0);
    await dlg.getByRole("button", { name: h.rvClose }).first().click();
    await expect(dlg).toBeHidden();
  });
});
