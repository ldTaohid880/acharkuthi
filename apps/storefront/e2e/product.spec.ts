import { formatTaka } from "@repo/ui/lib/utils";
import { E2E_NAME, E2E_SLUG, SLOT_PRICE, exec, one, q, slotLabel } from "./support/db";
import { expect, test } from "./support/fixtures";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("product page", () => {
  test("variant picker, quantity, add to basket and the mini-basket", async ({
    page,
    p,
    t,
    slot,
    mobile,
  }) => {
    const pk = t.picker;
    await page.goto(p(`/pickles/${E2E_SLUG}`));
    const sizes = page.getByRole("radiogroup", { name: pk.packageSize });
    const mine = sizes.getByRole("radio", { name: `${slotLabel(slot)}, ${formatTaka(SLOT_PRICE)}` });
    await mine.click();
    await expect(mine).toHaveAttribute("aria-checked", "true");

    const qty = page.getByRole("group", { name: pk.qty }).locator("visible=true").first();
    await qty.getByRole("button", { name: pk.more }).click();
    await qty.getByRole("button", { name: pk.more }).click();
    const add = page.locator("button.addb:visible").first();
    if (!mobile) await expect(add).toContainText(formatTaka(SLOT_PRICE * 3));
    await add.click();
    await expect(page.getByText(pk.added(3, slotLabel(slot))).locator("visible=true").first()).toBeVisible();

    // Mini-basket: open from the header, it lists the line; quantity and remove work there too.
    await page.getByRole("button", { name: t.header.basket(3) }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    const line = drawer.locator("li.mrow").filter({ hasText: slotLabel(slot) });
    await expect(line).toContainText(formatTaka(SLOT_PRICE * 3));
    await line.getByRole("button", { name: t.mini.less }).click();
    await expect(line).toContainText(formatTaka(SLOT_PRICE * 2));
    await expect(drawer.getByRole("link", { name: t.mini.checkout })).toHaveAttribute(
      "href",
      p("/checkout"),
    );
    await line.locator(".bk-rm").click();
    await expect(drawer.getByText(t.mini.emptyTitle)).toBeVisible();
    await drawer.getByRole("button", { name: t.mini.closeBasket }).click();
    await expect(drawer).toBeHidden();
  });

  test("gallery shows the product photo or the jar art", async ({ page, p, t, mobile }) => {
    await page.goto(p("/pickles/raw-mango"));
    const photos = await q<{ url: string }>(
      "select i.url from product_images i join products p on p.id = i.product_id where p.slug = 'raw-mango'",
    );
    const gallery = mobile ? page.locator(".gwrapm") : page.locator(".page-product .jarimg").first();
    await expect(gallery).toBeVisible();
    if (photos[0]) {
      const img = mobile ? page.locator(".gwrapm img").first() : page.locator(".jarimg").first();
      await expect(img).toBeVisible();
      const ok = await img.evaluate((el) => (el as HTMLImageElement).naturalWidth > 0);
      expect(ok, "product photo loads").toBe(true);
    }
    if (mobile) await expect(page.locator(".gtrack")).toHaveAttribute("aria-label", photos.length > 1 ? t.gallery.photos : t.gallery.one);
  });

  test("story and care: page language first, else the other language with its lang", async ({
    page,
    p,
    t,
    lang,
  }) => {
    await page.goto(p(`/pickles/${E2E_SLUG}`));
    // Description: both languages stored, so the page language shows.
    const desc = page.locator(".sdesc");
    await expect(desc).toHaveAttribute("lang", lang);
    await expect(desc).toHaveText(lang === "en" ? "E2E English description." : "ই২ই বাংলা বিবরণ।");
    // Taste (flavor): both stored.
    const story = page.locator("section[aria-labelledby=dh]");
    await expect(story.getByRole("heading", { name: t.pdp.storyTitle })).toBeVisible();
    const taste = story.locator("dt", { hasText: t.pdp.flavor }).locator("xpath=following-sibling::dd[1]");
    await expect(taste).toHaveAttribute("lang", lang);
    await expect(taste).toHaveText(lang === "en" ? "E2E flavour text" : "ই২ই স্বাদের বর্ণনা");
    // Storage: Bangla only, so the English page falls back to Bangla, marked lang="bn".
    const care = page.locator("section[aria-labelledby=ih]");
    await expect(care.getByRole("heading", { name: t.pdp.careTitle })).toBeVisible();
    const storage = care.locator("details", { hasText: t.pdp.storage });
    await storage.locator("summary").click();
    await expect(storage.locator(".pnl")).toHaveAttribute("lang", "bn");
    await expect(storage.locator(".pnl")).toHaveText("ই২ই সংরক্ষণ");
  });

  test("reviews: rating filter, photo filter, sort and the shop's reply", async ({ page, p, t }) => {
    const pdp = t.pdp;
    await page.goto(p(`/pickles/${E2E_SLUG}`));
    const list = page.locator("ul.rlist > li.rv");
    await expect(list).toHaveCount(3);
    // Newest first by default: Four (1 day), Three, Five.
    await expect(list.first()).toContainText("E2E Reviewer Four");
    await expect(page.locator(".rv-rep").first()).toContainText("E2E thank you for the note");

    const chips = page.getByRole("group", { name: pdp.filterByRating });
    await chips.getByRole("link", { name: /^5/ }).click();
    await expect(page).toHaveURL(/rating=5/);
    await expect(list).toHaveCount(1);
    await expect(list.first()).toContainText("E2E Reviewer Five");
    await chips.getByRole("link", { name: /^2/ }).click();
    await expect(page.getByText(pdp.noMatchTitle)).toBeVisible();
    await page.getByRole("link", { name: pdp.clearFilter }).click();
    await expect(list).toHaveCount(3);

    await chips.getByRole("link", { name: pdp.withPhotos }).click();
    await expect(page).toHaveURL(/photo=1/);
    await expect(list).toHaveCount(1);
    await expect(list.first().locator("img").first()).toBeVisible();
    await chips.getByRole("link", { name: pdp.withPhotos }).click();
    await expect(page).not.toHaveURL(/photo=1/);
    await expect(list).toHaveCount(3);

    await page.locator("#rs").selectOption({ label: pdp.sort.low });
    await expect(page).toHaveURL(/rsort=low/);
    await expect(list.first()).toContainText("E2E Reviewer Three");
    await page.locator("#rs").selectOption({ label: pdp.sort.high });
    await expect(list.first()).toContainText("E2E Reviewer Five");
  });

  test("review form: validation, photo type and size limits, then a successful send", async ({
    page,
    p,
    t,
  }) => {
    const rv = t.review;
    await page.goto(p(`/pickles/${E2E_SLUG}`));
    await page.getByRole("button", { name: rv.write }).click();
    const dlg = page.getByRole("dialog");
    await expect(dlg.getByRole("heading", { name: rv.title(E2E_NAME) }).or(dlg.locator("#wrh"))).toBeVisible();
    await dlg.locator("button[type=submit]").click();
    await expect(dlg.getByText(rv.err.rating)).toBeVisible();
    await expect(dlg.getByText(rv.err.bodyEmpty)).toBeVisible();
    await expect(dlg.getByText(rv.err.name)).toBeVisible();

    await dlg.locator('input[name="name"]').fill("E2E Guest Reviewer");
    await dlg.getByRole("radio", { name: rv.star(4) }).click();
    await dlg.locator('textarea[name="body"]').fill("short");
    await expect(dlg.getByText(rv.err.bodyShort)).toBeVisible();
    await dlg.locator('textarea[name="body"]').fill("E2E: tangy and just hot enough, ate it with rice.");

    // A text file renamed as an image is refused by its bytes.
    const file = dlg.locator('input[type="file"]');
    await file.setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not an image at all") });
    await dlg.locator("button[type=submit]").click();
    await expect(dlg.getByRole("alert").filter({ hasText: lang(t) === "en" ? rv.err.photo : /JPG|PNG|WebP/ })).toBeVisible();
    // Over 5 MB.
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024 + 10)]);
    await dlg.getByRole("button", { name: rv.removePhoto }).click().catch(() => undefined);
    await file.setInputFiles({ name: "big.png", mimeType: "image/png", buffer: big });
    await dlg.locator("button[type=submit]").click();
    await expect(dlg.getByRole("alert").filter({ hasText: lang(t) === "en" ? rv.err.photo : /৫|5/ }).first()).toBeVisible();
    // A real PNG is accepted.
    await dlg.getByRole("button", { name: rv.removePhoto }).click().catch(() => undefined);
    await file.setInputFiles({ name: "ok.png", mimeType: "image/png", buffer: PNG });
    await dlg.locator("button[type=submit]").click();
    await expect(dlg.getByText(rv.doneTitle)).toBeVisible({ timeout: 15_000 });
    const saved = await one<{ is_approved: number; photo_url: string | null; rating: number }>(
      "select is_approved, photo_url, rating from reviews where name = 'E2E Guest Reviewer' order by id desc limit 1",
    );
    expect(saved?.is_approved).toBe(0);
    expect(saved?.rating).toBe(4);
    expect(saved?.photo_url).toMatch(/^\/uploads\/reviews\/.+\.png$/);
    // Not shown until approved.
    await page.reload();
    await expect(page.getByText("E2E Guest Reviewer")).toHaveCount(0);
    await exec("delete from reviews where name = 'E2E Guest Reviewer' and photo_url is null");
  });

  test("restock alert on a sold-out product", async ({ page, p, t, lang, slot }) => {
    const rs = t.restock;
    await page.goto(p("/pickles/tamarind"));
    await expect(page.getByText(t.picker.outTitle)).toBeVisible();
    await expect(page.locator("button.addb")).toHaveCount(0);
    const open = page.getByRole("button", { name: rs.open });
    if (await open.isVisible()) await open.click();
    const form = page.locator("form.rs-form");
    await form.locator("button[type=submit]").click();
    await expect(form.getByRole("alert")).toBeVisible();
    await form.getByPlaceholder(rs.placeholder).fill("hello");
    await form.locator("button[type=submit]").click();
    // English shows the dictionary's wording; Bangla shows the validator's own Bangla message.
    if (lang === "en") await expect(form.getByRole("alert")).toHaveText(rs.invalid);
    else await expect(form.getByRole("alert")).toContainText("ইমেইল");
    const contact = `e2e-restock-${slot}-${Date.now()}@example.test`;
    await form.getByPlaceholder(rs.placeholder).fill(contact);
    await form.locator("button[type=submit]").click();
    await expect(page.getByText(rs.done)).toBeVisible();
    const row = await one<{ contact_kind: string }>(
      "select contact_kind from restock_requests where contact = ?",
      [contact],
    );
    expect(row?.contact_kind).toBe("email");
  });
});

/** The page language of a dictionary (the English one has English labels). */
const lang = (t: { nav: { shop: string } }) => (t.nav.shop === "Shop" ? "en" : "bn");
