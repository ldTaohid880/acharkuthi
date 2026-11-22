import type { Page } from "@playwright/test";
import { formatTaka } from "@repo/ui/lib/utils";
import { STOREFRONT_URL, exec, one, q } from "./support/env";
import { expect, fill, test, type Dict } from "./support/fixtures";

/** A product of the suite's own, with a size that has an order (can't be deleted) and one that doesn't. */
async function makeProduct() {
  const tag = Date.now().toString(36);
  const slug = `e2e-admin-${tag}`;
  const name = `E2E Admin Pickle ${tag}`;
  const nameBn = `ই২ই অ্যাডমিন আচার ${tag}`;
  const cat = await one<{ id: number }>("select id from categories where slug = 'mango'");
  await exec(
    `insert into products (category_id, name, name_bn, slug, description, spice_level, is_active)
     values (?, ?, ?, ?, 'E2E admin English description.', 1, 1)`,
    [cat?.id, name, nameBn, slug],
  );
  const p = await one<{ id: number }>("select id from products where slug = ?", [slug]);
  for (const [i, label] of ["250 g", "500 g"].entries())
    await exec(
      `insert into product_variants (product_id, sku, label, price, stock, is_active, sort_order)
       values (?, ?, ?, ?, 20, 1, ?)`,
      [p?.id, `${slug}-${i}`.toUpperCase(), label, 20000 + i * 10000, i],
    );
  const used = await one<{ id: number }>("select id from product_variants where sku = ?", [`${slug}-0`.toUpperCase()]);
  // An old cancelled order that used the 250 g size.
  await exec(
    `insert into orders (order_number, status, customer_name, customer_phone, shipping_address, subtotal, total)
     values (?, 'cancelled', 'E2E Old Order', '01900000097', 'ঢাকা', 20000, 20000)`,
    [`AK-261116-96${String(Date.now() % 10000).padStart(4, "0")}`],
  );
  const o = await one<{ id: number }>("select id from orders where customer_name = 'E2E Old Order' order by id desc limit 1");
  await exec(
    "insert into order_items (order_id, variant_id, product_name, variant_label, unit_price, quantity) values (?, ?, 'E2E Admin Pickle', '250 g', 20000, 1)",
    [o?.id, used?.id],
  );
  return { id: Number(p?.id), slug, name, nameBn };
}

const save = async (page: Page, t: Dict) => {
  await page.getByRole("button", { name: t.pedit.save, exact: true }).locator("visible=true").first().click();
};

test.describe("products", () => {
  test("list: hide and show with undo", async ({ page, t, phone }) => {
    test.skip(phone, "phone product cards have no row menu; hide/show is checked at desktop width");
    const p = await makeProduct();
    const active = async () =>
      (await one<{ is_active: number }>("select is_active from products where id = ?", [p.id]))?.is_active;
    await page.goto("/products");
    await page.getByRole("textbox", { name: t.products.searchAria }).locator("visible=true").first().fill(p.name);
    const row = page.locator("tr, li, [role=row]").filter({ hasText: p.nameBn }).locator("visible=true").first();
    await row.getByRole("button", { name: t.products.more }).click();
    await page.getByRole("menuitem", { name: t.products.hide }).click();
    await expect.poll(active).toBe(0);
    await expect(page.getByText(fill(t.products.hiddenToast, { name: p.nameBn })).locator("visible=true").first()).toBeVisible();
    await page.getByRole("button", { name: t.products.undo }).locator("visible=true").first().click();
    await expect.poll(active).toBe(1);

    await row.getByRole("button", { name: t.products.more }).click();
    await page.getByRole("menuitem", { name: t.products.hide }).click();
    await expect.poll(active).toBe(0);
    await row.getByRole("button", { name: t.products.more }).click();
    await page.getByRole("menuitem", { name: t.products.show }).click();
    await expect.poll(active).toBe(1);
  });

  test("edit: language tabs, the empty-language dot and the fallback badge; saved text shows on the storefront", async ({
    page,
    t,
    phone,
  }) => {
    const pe = t.pedit;
    const p = await makeProduct();
    await page.goto(`/products/${p.id}`);
    const desc = page.getByRole("textbox", { name: pe.description });
    const descCard = page.locator("section").filter({ has: desc });
    const tabs = descCard.getByRole("radiogroup", { name: pe.contentLang });
    // Bangla description is empty: its tab carries the dot (", has empty fields").
    await expect(tabs.getByRole("radio", { name: new RegExp(pe.contentLangEmpty) })).toHaveCount(1);
    await expect(tabs.getByRole("radio", { checked: true })).toContainText("বাংলা");
    await desc.fill("ই২ই অ্যাডমিন বাংলা বিবরণ।");
    await expect(tabs.getByRole("radio", { name: new RegExp(pe.contentLangEmpty) })).toHaveCount(0);
    await tabs.getByRole("radio", { name: /English/ }).click();
    await expect(desc).toHaveValue("E2E admin English description.");
    await desc.fill("E2E admin English description, edited.");

    // Details: fill flavour in Bangla only; the English field then says it shows the other language.
    const flav = page.locator("#pd-flavor");
    await flav.fill("ই২ই টক-ঝাল স্বাদ");
    const detCard = page.locator("section").filter({ has: flav });
    await detCard.getByRole("radiogroup", { name: pe.contentLang }).getByRole("radio", { name: /English/ }).click();
    if (!phone) await expect(detCard.getByText(pe.emptyFallback).locator("visible=true").first()).toBeVisible();
    await expect(flav).toHaveValue("");
    await detCard.getByRole("radiogroup", { name: pe.contentLang }).getByRole("radio", { name: /বাংলা/ }).click();

    await save(page, t);
    await expect.poll(async () => (await one<{ d: string | null }>("select description_bn d from products where id = ?", [p.id]))?.d, { timeout: 20_000 }).toBe("ই২ই অ্যাডমিন বাংলা বিবরণ।");
    const row = await one<{ description: string; description_bn: string; flavor: string; flavor_en: string | null }>(
      "select description, description_bn, flavor, flavor_en from products where id = ?",
      [p.id],
    );
    expect(row?.description_bn).toBe("ই২ই অ্যাডমিন বাংলা বিবরণ।");
    expect(row?.description).toBe("E2E admin English description, edited.");
    expect(row?.flavor).toBe("ই২ই টক-ঝাল স্বাদ");
    expect(row?.flavor_en ?? "").toBe("");

    // This browser is en-US: choose Bangla, or "/" would send it to /en.
    await page.context().addCookies([{ name: "ak_lang", value: "bn", url: STOREFRONT_URL }]);
    await page.goto(`${STOREFRONT_URL}/pickles/${p.slug}`);
    await expect(page.locator(".sdesc")).toHaveText("ই২ই অ্যাডমিন বাংলা বিবরণ।");
    await page.goto(`${STOREFRONT_URL}/en/pickles/${p.slug}`);
    await expect(page.locator(".sdesc")).toHaveText("E2E admin English description, edited.");
    const dd = page.locator("section[aria-labelledby=dh] dd").first();
    await expect(dd).toHaveText("ই২ই টক-ঝাল স্বাদ");
    await expect(dd).toHaveAttribute("lang", "bn");
  });

  test("sizes: add, reorder, delete; an ordered size can only be turned off", async ({ page, t, phone }) => {
    test.skip(phone, "the size editor is checked at desktop width (phone rows are collapsed cards)");
    const pe = t.pedit;
    const p = await makeProduct();
    await page.goto(`/products/${p.id}`);
    // The ordered 250 g size: delete is refused, offering "Turn off".
    await page.getByRole("button", { name: fill(pe.deleteAria, { label: "250 g" }) }).locator("visible=true").first().click();
    const dlg = page.getByRole("dialog").or(page.getByRole("alertdialog")).first();
    await expect(dlg).toContainText(fill(pe.inUseTitle, { label: "250 g" }));
    await dlg.getByRole("button", { name: pe.turnOff }).click();

    // Add a size.
    await page.getByRole("button", { name: pe.addSize }).locator("visible=true").first().click();
    const label = page.locator('input[id$="-l"]').last();
    await label.fill("1 kg");
    await page.locator('input[id$="-s"]').last().fill(`${p.slug}-NEW`.toUpperCase());
    await page.locator('input[id$="-p"]').last().fill("650");
    await page.locator('input[id$="-k"]').last().fill("7");
    // Move 500 g above 250 g: arrows on phones, drag on desktop.
    const up = page.getByRole("button", { name: fill(pe.upAria, { label: "500 g" }) }).locator("visible=true");
    if (await up.count()) await up.first().click();
    else
      await page
        .getByRole("button", { name: fill(pe.dragAria, { label: "500 g" }) })
        .locator("visible=true")
        .first()
        .dragTo(page.getByRole("button", { name: fill(pe.dragAria, { label: "250 g" }) }).locator("visible=true").first());
    await save(page, t);
    await expect.poll(async () => (await q("select id from product_variants where product_id = ? and label = '1 kg'", [p.id])).length, { timeout: 20_000 }).toBe(1);

    const sizes = await q<{ label: string; is_active: number; price: number; stock: number }>(
      "select label, is_active, price, stock from product_variants where product_id = ? order by sort_order",
      [p.id],
    );
    expect(sizes.map((s) => s.label)).toEqual(["500 g", "250 g", "1 kg"]);
    expect(sizes.find((s) => s.label === "250 g")?.is_active).toBe(0);
    expect(sizes.find((s) => s.label === "1 kg")).toMatchObject({ price: 65000, stock: 7 });

    // Delete the new, never-ordered size.
    await page.reload();
    await page.getByRole("button", { name: fill(pe.deleteAria, { label: "1 kg" }) }).locator("visible=true").first().click();
    const del = page.getByRole("dialog").or(page.getByRole("alertdialog")).first();
    await del.getByRole("button", { name: pe.doDelete }).click();
    await save(page, t);
    await expect.poll(async () => (await q("select id from product_variants where product_id = ? and label = '1 kg'", [p.id])).length).toBe(0);
  });

  test("cost and profit per unit", async ({ page, t, phone }) => {
    const p = await makeProduct();
    await page.goto(`/products/${p.id}`);
    const cost = phone ? page.locator('input[id$="-$"]').first() : page.getByLabel(t.pedit.cost, { exact: true }).locator("visible=true").first();
    await cost.fill("120");
    // 250 g sells at ৳200: profit ৳80.
    await expect(page.getByText(formatTaka(8000)).first()).toBeVisible();
    await cost.fill("250");
    await expect(page.getByText(`-${formatTaka(5000)}`).or(page.getByText(`−${formatTaka(5000)}`)).or(page.getByText(formatTaka(-5000))).first()).toBeVisible();
    await cost.fill("150");
    await save(page, t);
    await expect.poll(async () => (await one<{ cost_price: number }>("select cost_price from product_variants where product_id = ? and label = '250 g'", [p.id]))?.cost_price).toBe(15000);
  });

  test("validation summary and the slug-taken error", async ({ page, t }) => {
    const pe = t.pedit;
    const p = await makeProduct();
    await page.goto(`/products/${p.id}`);
    // A missing Bangla name: the summary and the field error.
    await page.locator("#pe-bn").fill("");
    await save(page, t);
    await expect(page.getByText(pe.errTitle.split("{n}")[0] ?? "").locator("visible=true").first()).toBeVisible();
    await expect(page.getByText(pe.errNameBn).locator("visible=true").first()).toBeVisible();
    // A slug another product has: refused by the server.
    await page.locator("#pe-bn").fill(p.nameBn);
    await page.locator("#pe-slug").fill("lemon");
    await save(page, t);
    await expect(page.getByText(/another product has this slug|sumSlug/i).or(page.getByText(pe.sumSlug)).locator("visible=true").first()).toBeVisible({ timeout: 15_000 });
    expect((await one<{ slug: string }>("select slug from products where id = ?", [p.id]))?.slug).toBe(p.slug);
  });
});
