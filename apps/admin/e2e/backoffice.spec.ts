import type { Page } from "@playwright/test";
import { formatTaka } from "@repo/ui/lib/utils";
import { settings } from "./support/data";
import { STOREFRONT_URL, exec, one, q } from "./support/env";
import { expect, fill, test } from "./support/fixtures";

const visible = (page: Page, sel: string) => page.locator(`${sel} >> visible=true`).first();

/** A storefront basket with one lemon jar, then the English checkout page. */
async function storefrontCheckout(page: Page) {
  const v = await one<{ id: number; price: number }>(
    "select v.id, v.price from product_variants v join products p on p.id = v.product_id where p.slug = 'lemon' and v.is_active = 1 and v.stock > 0 limit 1",
  );
  await page.goto(`${STOREFRONT_URL}/unavailable`);
  await page.evaluate(
    (line) => {
      localStorage.setItem(
        "acharkuthi-cart",
        JSON.stringify({ state: { lines: [line] }, version: 0 }),
      );
    },
    {
      variantId: v?.id,
      productName: "Lemon Pickle",
      variantLabel: "300 g",
      unitPrice: v?.price,
      quantity: 1,
    },
  );
  await page.goto(`${STOREFRONT_URL}/en/checkout`);
  return v!;
}

test.describe("categories", () => {
  test("create, edit with description language tabs, reorder, delete", async ({ page, t }) => {
    const c = t.cats;
    const tag = Date.now().toString(36);
    const slug = `e2e-${tag}`;
    const nm = `ই২ই তাক ${tag}`;
    await page.goto("/categories");
    await page
      .getByRole("button", { name: c.newCategory })
      .or(page.getByRole("link", { name: c.newCategory }))
      .locator("visible=true")
      .first()
      .click();
    await page.waitForLoadState("networkidle");
    const nameBn = page.getByLabel(c.nameBn).locator("visible=true").first();
    await nameBn.fill(nm);
    await page.getByLabel(c.nameEn).locator("visible=true").first().fill("E2E Shelf");
    await page.getByLabel(c.slug).locator("visible=true").first().fill(slug);
    const desc = page.getByLabel(c.description).locator("visible=true").first();
    await desc.fill("ই২ই তাকের বিবরণ");
    const tabs = page
      .getByRole("radiogroup", { name: c.contentLang })
      .locator("visible=true")
      .first();
    // The English tab carries the "empty" dot until its text is written.
    await expect(
      tabs.getByRole("radio", { name: new RegExp(`English.*${c.contentLangEmpty}`) }),
    ).toHaveCount(1);
    await tabs.getByRole("radio", { name: /English/ }).click();
    await desc.fill("E2E shelf description");
    await expect(nameBn).toHaveValue(nm);
    await page
      .getByRole("button", { name: c.save, exact: true })
      .locator("visible=true")
      .first()
      .click();
    await expect
      .poll(async () =>
        one<{ description: string; description_bn: string }>(
          "select description, description_bn from categories where slug = ?",
          [slug],
        ),
      )
      .toMatchObject({ description: "E2E shelf description", description_bn: "ই২ই তাকের বিবরণ" });

    // Reorder: move it up one place.
    const before = await one<{ sort_order: number }>(
      "select sort_order from categories where slug = ?",
      [slug],
    );
    await page.goto("/categories");
    const reorder = page.getByRole("button", { name: c.reorder });
    if (await reorder.isVisible()) await reorder.click();
    const up = page
      .getByRole("button", { name: fill(c.upAria, { name: nm }) })
      .locator("visible=true");
    if (await up.count()) {
      await up.first().click();
      await page.waitForLoadState("networkidle");
    } else {
      // Desktop: drag the handle above the row before it.
      const handles = page.getByRole("button", { name: /^Drag / }).locator("visible=true");
      const mine = page
        .getByRole("button", { name: fill(c.dragAria, { name: nm }) })
        .locator("visible=true")
        .first();
      await mine.dragTo(handles.nth((await handles.count()) - 2));
    }
    const done = page.getByRole("button", { name: c.done });
    if (await done.isVisible()) await done.click();
    await expect
      .poll(
        async () =>
          (
            await one<{ sort_order: number }>("select sort_order from categories where slug = ?", [
              slug,
            ])
          )?.sort_order,
      )
      .toBeLessThan(before?.sort_order ?? 0);

    // Delete.
    const trash = page
      .getByRole("button", { name: fill(c.deleteAria, { name: nm }) })
      .locator("visible=true");
    if (await trash.count()) await trash.first().click();
    else {
      // Phones: open the category, then "Delete category".
      await page.getByText(nm).locator("visible=true").first().click();
      await page
        .getByRole("button", { name: c.deleteCategory })
        .locator("visible=true")
        .first()
        .click();
    }
    // Confirm when asked (the dialog's own Delete button).
    const confirm = page
      .getByRole("alertdialog")
      .or(page.getByRole("dialog"))
      .getByRole("button", { name: c.doDelete, exact: true });
    await confirm
      .last()
      .click({ timeout: 8000 })
      .catch(() => undefined);
    await expect
      .poll(async () => (await q("select id from categories where slug = ?", [slug])).length)
      .toBe(0);
  });
});

test.describe("coupons", () => {
  test("create a percent and a fixed coupon with limits and dates, then use one on the storefront", async ({
    page,
    t,
  }) => {
    const c = t.coupons;
    const tag = Date.now().toString(36).toUpperCase();
    const make = async (code: string, kind: "percent" | "fixed", value: string) => {
      await page.goto("/coupons");
      await page
        .getByRole("button", { name: c.add })
        .or(page.getByRole("link", { name: c.add }))
        .or(page.getByRole("link", { name: c.addShort }))
        .locator("visible=true")
        .first()
        .click();
      await page.waitForLoadState("networkidle");
      await visible(page, '[id^="cp-code-"]').fill(code);
      await page
        .getByRole("radio", { name: kind === "percent" ? c.percent : c.fixed })
        .or(page.getByRole("radio", { name: kind === "percent" ? c.percent : c.fixedShort }))
        .locator("visible=true")
        .first()
        .click();
      await visible(page, '[id^="cp-v-"]').fill(value);
      await visible(page, '[id^="cp-min-"]').fill("100");
      await visible(page, '[id^="cp-lim-"]').fill("5");
      // Ends: pick the last day shown in the calendar.
      await page
        .getByRole("button", { name: c.end })
        .or(page.getByLabel(c.end))
        .locator("visible=true")
        .first()
        .click();
      await page.getByRole("grid").locator("button:not([disabled])").last().click();
      // The calendar stays open after a pick; close it so it doesn't cover the form.
      if (await page.getByRole("grid").count()) await page.keyboard.press("Escape");
      await expect(visible(page, '[id^="cp-code-"]')).toHaveValue(code);
      await page
        .getByRole("button", { name: c.save, exact: true })
        .locator("visible=true")
        .first()
        .click();
      await expect
        .poll(async () => (await q("select id from coupons where code = ?", [code])).length)
        .toBe(1);
    };
    await make(`E2EPCT${tag}`, "percent", "10");
    await make(`E2EFIX${tag}`, "fixed", "50");
    const rows = await q<{
      code: string;
      type: string;
      value: number;
      min_order_amount: number;
      max_uses: number;
      ends_at: Date | null;
    }>(
      "select code, type, value, min_order_amount, max_uses, ends_at from coupons where code in (?, ?) order by code",
      [`E2EFIX${tag}`, `E2EPCT${tag}`],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      type: "fixed",
      value: 5000,
      min_order_amount: 10000,
      max_uses: 5,
    });
    expect(rows[1]).toMatchObject({
      type: "percent",
      value: 10,
      min_order_amount: 10000,
      max_uses: 5,
    });
    for (const r of rows) expect(r.ends_at).not.toBeNull();

    // Use the percent coupon at the storefront checkout.
    const v = await storefrontCheckout(page);
    const box = page.locator(".cp:visible").first();
    await box.getByRole("button", { name: "Have a promo code?" }).click();
    await box.getByPlaceholder("Enter code").fill(`E2EPCT${tag}`);
    await box.getByRole("button", { name: "Apply" }).click();
    await expect(box.locator(".cp-ok")).toContainText(`E2EPCT${tag}`);
    await expect(page.locator(".ck dl.tot:visible .disc dd").first()).toHaveText(
      `−${formatTaka(Math.round(v.price / 10))}`,
    );
  });
});

test.describe("reviews", () => {
  test("approve, reply, hide; the reply shows on the storefront", async ({ page, t }) => {
    const r = t.reviews;
    const p = await one<{ id: number; slug: string }>(
      "select id, slug from products where slug = 'olive'",
    );
    const name = `E2E Moderated ${Date.now().toString(36)}`;
    await exec(
      "insert into reviews (product_id, name, rating, title, comment, is_approved) values (?, ?, 4, 'E2E title', 'E2E: lovely olive pickle, not too sour.', 0)",
      [p?.id, name],
    );
    const row = () =>
      one<{ is_approved: number; reply: string | null }>(
        "select is_approved, reply from reviews where name = ?",
        [name],
      );
    const open = async (url: string) => {
      await page.goto(url);
      await page.getByText(name).locator("visible=true").first().click();
      await page.waitForLoadState("networkidle");
    };
    /** The review's own card or detail pane: the nearest block holding its name and buttons. */
    const card = () =>
      page
        .getByText(name)
        .locator("visible=true")
        .last()
        .locator("xpath=ancestor::*[.//button][1]");
    await open("/reviews");
    const approve = card().getByRole("button", { name: r.approve });
    await (
      (await approve.count())
        ? approve.first()
        : page.getByRole("button", { name: r.approve }).locator("visible=true").first()
    ).click();
    await expect.poll(async () => (await row())?.is_approved).toBe(1);

    await open("/reviews?status=approved");
    await page
      .getByRole("textbox", { name: r.replyAria })
      .or(page.getByPlaceholder(r.replyPh))
      .locator("visible=true")
      .first()
      .fill("E2E: thank you!");
    await page.getByRole("button", { name: r.replySave }).locator("visible=true").first().click();
    await expect.poll(async () => (await row())?.reply).toBe("E2E: thank you!");

    await page.goto(`${STOREFRONT_URL}/en/pickles/${p?.slug}`);
    const li = page.locator("li.rv").filter({ hasText: name });
    await expect(li).toBeVisible();
    await expect(li.locator(".rv-rep")).toContainText("E2E: thank you!");

    await open("/reviews?status=approved");
    await page.getByRole("button", { name: r.hide }).locator("visible=true").first().click();
    await expect.poll(async () => (await row())?.is_approved).toBe(0);
    await page.goto(`${STOREFRONT_URL}/en/pickles/${p?.slug}`);
    await expect(page.locator("li.rv").filter({ hasText: name })).toHaveCount(0);
  });
});

test.describe("restock, customers, messages, stock", () => {
  test("restock requests and alerts list a sold-out size's requests", async ({ page, t }) => {
    const v = await one<{ id: number }>(
      "select v.id from product_variants v join products p on p.id = v.product_id where p.slug = 'tamarind' limit 1",
    );
    const contact = `e2e-admin-restock-${Date.now()}@example.test`;
    await exec(
      "insert into restock_requests (variant_id, contact, contact_kind) values (?, ?, 'email')",
      [v?.id, contact],
    );
    await page.goto("/restock-alerts");
    await expect(page.getByText(t.restock.title).locator("visible=true").first()).toBeVisible();
    await expect(page.getByText(contact).locator("visible=true").first()).toBeVisible();
    const res = await page.goto("/restock-requests");
    expect(res?.status()).toBeLessThan(400);
  });

  test("customers: search and open a customer", async ({ page, t }) => {
    const c = t.customers;
    const email =
      (
        await one<{ email: string }>(
          "select email from user where email like 'e2e-admin-customer-%' limit 1",
        )
      )?.email ?? "";
    await page.goto("/customers");
    await page
      .getByRole("textbox", { name: c.searchAria })
      .or(page.getByRole("searchbox", { name: c.searchAria }))
      .locator("visible=true")
      .first()
      .fill(email);
    await expect(page.getByText(email).locator("visible=true").first()).toBeVisible();
    await page.getByText(email).locator("visible=true").first().click();
    await expect(
      page
        .getByText(c.kOrders)
        .or(page.getByText(c.detail.kOrdersShort))
        .locator("visible=true")
        .first(),
    ).toBeVisible();
  });

  test("messages: a storefront contact message arrives", async ({ page, t, phone }) => {
    const email = `e2e-admin-msg-${Date.now()}@example.test`;
    await page.goto(`${STOREFRONT_URL}/en/contact`);
    const form = page.locator(".fcard form");
    await form.locator('input[name="name"]').fill("E2E Messenger");
    await form.locator('input[name="email"]').fill(email);
    await form.getByRole("combobox", { name: "Subject" }).click();
    await page.getByRole("option", { name: "About delivery" }).click();
    await form
      .locator('textarea[name="message"]')
      .fill("E2E: when will my order arrive in Sylhet?");
    await form.locator("button[type=submit]").click();
    await expect(page.getByRole("heading", { name: "Your message has been sent" })).toBeVisible();

    await page.goto("/messages");
    // Phones list the newest first without a search box.
    if (!phone)
      await page
        .getByRole("textbox", { name: t.messages.searchAria })
        .or(page.getByRole("searchbox", { name: t.messages.searchAria }))
        .locator("visible=true")
        .first()
        .fill(email);
    await expect(page.getByText("E2E Messenger").locator("visible=true").first()).toBeVisible();
    await page.getByText("E2E Messenger").locator("visible=true").first().click();
    await expect(
      page.getByText("E2E: when will my order arrive in Sylhet?").locator("visible=true").first(),
    ).toBeVisible();
    await expect(
      page.getByText(t.messages.subjects.delivery).locator("visible=true").first(),
    ).toBeVisible();
  });

  test("stock page edits change the stock", async ({ page, t }) => {
    const s = t.stock;
    const v = await one<{ id: number; stock: number; label: string; name_bn: string }>(
      "select v.id, v.stock, v.label, p.name_bn from product_variants v join products p on p.id = v.product_id where p.slug = 'olive' limit 1",
    );
    await page.goto("/stock");
    const input = page
      .getByRole("spinbutton", { name: fill(s.stockOf, { name: v!.name_bn, size: v!.label }) })
      .or(page.getByLabel(fill(s.stockOf, { name: v!.name_bn, size: v!.label })))
      .locator("visible=true")
      .first();
    try {
      await input.fill(String(v!.stock + 3));
      await page
        .getByRole("button", { name: s.save, exact: true })
        .locator("visible=true")
        .first()
        .click();
      await expect
        .poll(
          async () =>
            (
              await one<{ stock: number }>("select stock from product_variants where id = ?", [
                v!.id,
              ])
            )?.stock,
        )
        .toBe(v!.stock + 3);
    } finally {
      await exec("update product_variants set stock = ? where id = ?", [v!.stock, v!.id]);
    }
  });
});

test.describe("settings", () => {
  test.describe.configure({ mode: "serial" });

  test("delivery fees are reflected at storefront checkout", async ({ page, t }) => {
    const st = t.settings;
    const before = await settings();
    try {
      await page.goto("/settings");
      await visible(page, "#d-in").fill("75");
      await visible(page, "#d-out").fill("135");
      await page
        .locator("section, form")
        .filter({ has: page.locator("#d-in") })
        .getByRole("button", { name: st.save })
        .locator("visible=true")
        .first()
        .click();
      await expect.poll(async () => (await settings())?.delivery_fee_in).toBe(7500);
      expect((await settings())?.delivery_fee_out).toBe(13500);
      await storefrontCheckout(page);
      const opts = page.getByRole("radiogroup", { name: "Delivery method" });
      await expect(opts.getByRole("radio").nth(0)).toContainText(formatTaka(7500));
      await expect(opts.getByRole("radio").nth(1)).toContainText(formatTaka(13500));
    } finally {
      await exec(
        "update shop_settings set delivery_fee_in = ?, delivery_fee_out = ? where id = 1",
        [before?.delivery_fee_in, before?.delivery_fee_out],
      );
    }
  });

  test("the cash-on-delivery switch closes storefront checkout", async ({ page, t }) => {
    const st = t.settings;
    try {
      await page.goto("/settings");
      const sw = page.getByRole("switch", { name: st.codOn }).locator("visible=true").first();
      await expect(sw).toHaveAttribute("aria-checked", "true");
      await sw.click();
      await expect.poll(async () => (await settings())?.cod_enabled).toBe(0);
      await storefrontCheckout(page);
      await expect(
        page.getByText("We're not taking orders right now").locator("visible=true").first(),
      ).toBeVisible();
      await expect(page.locator("button.place:visible")).toHaveCount(0);
      await page.goto("/settings");
      await page.getByRole("switch", { name: st.codOn }).locator("visible=true").first().click();
      await expect.poll(async () => (await settings())?.cod_enabled).toBe(1);
    } finally {
      await exec("update shop_settings set cod_enabled = 1 where id = 1");
    }
  });
});
