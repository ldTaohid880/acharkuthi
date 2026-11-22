import type { Page } from "@playwright/test";
import { q } from "./support/db";
import { expect, test } from "./support/fixtures";

interface DbProduct {
  slug: string;
  name: string;
  name_bn: string | null;
  spice: number;
  shelf: string | null;
  min_price: number;
  stock: number;
}
/** What the shop should list: active products with an active size. */
const catalogue = () =>
  q<DbProduct>(
    `select p.slug, p.name, p.name_bn, p.spice_level spice, c.slug shelf,
            min(v.price) min_price, sum(v.stock) stock
       from products p
       join product_variants v on v.product_id = p.id and v.is_active = 1
       left join categories c on c.id = p.category_id
      where p.is_active = 1
      group by p.id`,
  );

const cards = (page: Page) => page.locator(".page-shop .grid a.stretch");
const slugsShown = async (page: Page) =>
  (await cards(page).evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""))).map(
    (h) => h.split("/pickles/")[1] ?? "",
  );
/**
 * [cards on screen, matching jars]. The count is not shown (owner, 2026-11-22); it is read from
 * the screen-reader heading ("11 pickles found" / "১১টি আচার পাওয়া গেছে").
 */
async function counts(page: Page): Promise<[number, number]> {
  const b = await page.locator("#res-h b").innerText();
  const matched = Number(b.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))));
  return [await cards(page).count(), matched];
}

/** Opens the filter panel (desktop) or sheet (phones) when the filters are not on screen. */
async function filters(page: Page, _mobile: boolean) {
  const panel = page.locator("aside.fil");
  if (!(await panel.isVisible())) await page.locator("details.filt-m summary").click();
  await expect(panel).toBeVisible();
  return panel;
}

test.describe("shop", () => {
  test("all pickles: every jar at once, no Load more", async ({ page, p }) => {
    const all = await catalogue();
    await page.goto(p("/shop"));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const [shown, matched] = await counts(page);
    expect(matched).toBe(all.length);
    expect(shown).toBe(all.length);
    await expect(page.locator(".more")).toHaveCount(0);
    // Card photos load as they scroll in.
    expect(
      await page.locator(".page-shop .grid img:not(.chilli)").evaluateAll((im) =>
        im.every((i) => i.getAttribute("loading") === "lazy"),
      ),
    ).toBe(true);
    // Every card links in the page language.
    for (const h of await cards(page).evaluateAll((as) => as.map((a) => a.getAttribute("href"))))
      expect(h?.startsWith(p("/pickles/"))).toBe(true);
  });

  test("each shelf page lists only that shelf", async ({ page, p }) => {
    const all = await catalogue();
    const shelves = await q<{ slug: string; name: string; name_bn: string | null }>(
      "select slug, name, name_bn from categories where is_active = 1 order by sort_order",
    );
    for (const s of shelves) {
      await page.goto(p(`/shop/${s.slug}`));
      const want = all.filter((x) => x.shelf === s.slug).map((x) => x.slug).sort();
      const [, matched] = await counts(page);
      expect(matched, s.slug).toBe(want.length);
      expect((await slugsShown(page)).sort(), s.slug).toEqual(want);
      await expect(page.locator('nav.crumbs [aria-current="page"]')).toBeVisible();
    }
  });

  for (const [word, slug] of [
    ["aam", "raw-mango"],
    ["আম", "raw-mango"],
    ["lemon", "lemon"],
    ["লেবু", "lemon"],
    ["roshun", "spicy-garlic"],
    ["Garlic", "spicy-garlic"],
  ] as const) {
    test(`search "${word}" finds ${slug}`, async ({ page, p }) => {
      await page.goto(p("/shop"));
      const box = page.locator("#shop-search");
      // Typing before hydration is lost on a slow dev server; type again until the URL follows.
      await expect(async () => {
        await box.fill("");
        await box.fill(word);
        await expect(page).toHaveURL(new RegExp(`[?&]q=${encodeURIComponent(word)}`), {
          timeout: 2000,
        });
      }).toPass({ timeout: 30_000 });
      await expect.poll(() => slugsShown(page)).toContain(slug);
      const shown = await slugsShown(page);
      expect(shown.length).toBeLessThan((await catalogue()).length);
      // Kept on reload.
      await page.reload();
      await expect(page.locator("#shop-search")).toHaveValue(word);
      expect(await slugsShown(page)).toEqual(shown);
    });
  }

  test("a search with no match shows the empty state", async ({ page, p, t }) => {
    await page.goto(p("/shop?q=zzzznothing"));
    await expect(page.locator(".grid .empty h2")).toHaveText(t.shop.emptyTitle);
    await page.locator(".grid .empty a").click();
    await expect(cards(page)).not.toHaveCount(0);
  });

  test("heat filter and in-stock switch, kept on reload", async ({ page, p, t, mobile }) => {
    const all = await catalogue();
    await page.goto(p("/shop"));
    let panel = await filters(page, mobile);
    await panel.getByRole("checkbox").filter({ hasText: t.heat.Hot }).click();
    await expect(page).toHaveURL(/[?&]heat=hot/);
    const hot = all.filter((x) => x.spice === 3);
    await expect.poll(async () => (await counts(page))[1]).toBe(hot.length);

    panel = await filters(page, mobile);
    await panel.getByRole("switch").click();
    await expect(page).toHaveURL(/[?&]inStock=1/);
    const hotInStock = hot.filter((x) => x.stock > 0);
    await expect.poll(async () => (await counts(page))[1]).toBe(hotInStock.length);

    await page.reload();
    expect((await counts(page))[1]).toBe(hotInStock.length);
    panel = await filters(page, mobile);
    await expect(panel.getByRole("checkbox").filter({ hasText: t.heat.Hot })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(panel.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    // Active-filter chips remove a filter (desktop); phones switch it off in the sheet.
    if (mobile) {
      await (await filters(page, mobile)).getByRole("switch").click();
      await expect(page).not.toHaveURL(/inStock/);
      return;
    }
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: t.shop.removeFilter(t.shop.inStock) })
      .or(page.getByRole("link", { name: t.shop.removeFilter(t.shop.inStock) }))
      .first()
      .click();
    await expect(page).not.toHaveURL(/inStock/);
  });

  test("in stock only drops the sold-out tamarind", async ({ page, p }) => {
    await page.goto(p("/shop?inStock=1"));
    expect(await slugsShown(page)).not.toContain("tamarind");
    await page.goto(p("/shop"));
    expect(await slugsShown(page)).toContain("tamarind");
  });

  test("price slider narrows the list and lands in the URL", async ({ page, p, mobile }) => {
    const all = await catalogue();
    await page.goto(p("/shop"));
    const panel = await filters(page, mobile);
    const hi = panel.getByLabel("Highest price, taka");
    const max = Number(await hi.getAttribute("max"));
    const cut = 225;
    expect(max).toBeGreaterThan(cut);
    if (await hi.isVisible()) await hi.fill(String(cut));
    else {
      // Phones: the From / To boxes.
      await panel.locator('input[name="maxPrice"]').fill(String(cut));
      await panel.locator('input[name="maxPrice"]').press("Enter");
    }
    await expect(page).toHaveURL(new RegExp(`[?&]maxPrice=${cut}`));
    const want = all.filter((x) => x.min_price <= cut * 100).length;
    await expect.poll(async () => (await counts(page))[1]).toBe(want);
    await page.reload();
    expect((await counts(page))[1]).toBe(want);
  });

  test("sort by price, low to high and high to low", async ({ page, p, t, mobile }) => {
    await page.goto(p("/shop"));
    const sortBox = page.locator(mobile ? "details.m-sort" : "details.sortw:not(.m-sort)");
    for (const s of ["price-asc", "price-desc"] as const) {
      await sortBox.locator("summary").click();
      await sortBox.getByRole("link", { name: t.shop.sort[s] }).click();
      await expect(page).toHaveURL(new RegExp(`sort=${s}`));
      const prices = (await page.locator(".grid .pc-price").allInnerTexts()).map((x) =>
        Number(x.replace(/[^\d]/g, "")),
      );
      const sorted = [...prices].sort((a, b) => (s === "price-asc" ? a - b : b - a));
      expect(prices, s).toEqual(sorted);
    }
    await page.reload();
    await expect(page).toHaveURL(/sort=price-desc/);
    await expect(sortBox.locator("summary")).toContainText(
      mobile ? t.shop.sortShort["price-desc"] : t.shop.sort["price-desc"],
    );
  });
});
