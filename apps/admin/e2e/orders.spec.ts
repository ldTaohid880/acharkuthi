import { formatTaka } from "@repo/ui/lib/utils";
import { makeOrder, orderStatus, settings } from "./support/data";
import { one, q } from "./support/env";
import { expect, fill, test } from "./support/fixtures";

test.describe("dashboard", () => {
  test("today's numbers match the database", async ({ page, t }) => {
    // Start of today in Dhaka (UTC+6, no DST).
    const now = new Date();
    const dhaka = new Date(now.getTime() + 6 * 3600_000);
    const start = new Date(Date.UTC(dhaka.getUTCFullYear(), dhaka.getUTCMonth(), dhaka.getUTCDate()) - 6 * 3600_000);
    await page.goto("/");
    const today = await one<{ n: number }>("select count(*) n from orders where created_at >= ?", [start]);
    const delivered = await one<{ n: number }>(
      "select count(distinct order_id) n from order_status_events where status = 'delivered' and created_at >= ?",
      [start],
    );
    const cell = (label: string) =>
      page.getByText(label, { exact: true }).locator("visible=true").first().locator("xpath=ancestor::div[1]");
    const value = async (label: string) => {
      const txt = await cell(label).innerText();
      const nums = txt.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).match(/\d+/g) ?? [];
      return Number(nums.at(-1));
    };
    expect(await value(t.dash.ordersToday)).toBe(Number(today?.n));
    expect(await value(t.dash.deliveredToday)).toBe(Number(delivered?.n));
  });
});

test.describe("orders list", () => {
  test("search by number, name and phone; date presets", async ({ page, t, phone }) => {
    const o = await makeOrder("pending", { name: "E2E Searchable Buyer" });
    await page.goto("/orders");
    const search = page.getByRole("searchbox", { name: t.orders.searchAria }).locator("visible=true").first();
    for (const term of [o.number, "E2E Searchable", "01900000099"]) {
      await search.fill(term);
      await expect(page.getByText(o.number).locator("visible=true").first()).toBeVisible();
    }
    await search.fill("AK-000000-000000");
    await expect(page.getByText(t.orders.empty).locator("visible=true").first()).toBeVisible();
    await search.fill("");
    // The search applies after a short pause; wait for it before using another filter.
    await expect(page).not.toHaveURL(/[?&]q=/);
    // Phones put the date range in the filter sheet; the presets are checked at desktop width.
    if (phone) return;
    // Date: "Today" keeps today's order.
    await page.getByRole("button", { name: t.orders.date, exact: true }).locator("visible=true").first().click();
    await page.getByRole("button", { name: t.orders.datePresets.today }).locator("visible=true").first().click();
    // A preset applies at once: the button then reads "Date: Today".
    await expect(
      page.getByRole("button", { name: new RegExp(`${t.orders.date}.*${t.orders.datePresets.today}`) }).locator("visible=true").first(),
    ).toBeVisible();
    await expect(page.getByText(o.number).locator("visible=true").first()).toBeVisible();
  });

  test("status filter via the attention board", async ({ page, t }) => {
    const o = await makeOrder("confirmed");
    await page.goto("/orders");
    await page.getByRole("link", { name: new RegExp(`^${t.orders.attn.confirmed}`) }).locator("visible=true").first().click();
    await expect(page).toHaveURL(/status=confirmed/);
    await expect(page.getByText(o.number).locator("visible=true").first()).toBeVisible();
    await page.getByRole("link", { name: new RegExp(`^${t.orders.attn.new}`) }).locator("visible=true").first().click();
    await expect(page).toHaveURL(/status=new/);
    await expect(page.getByText(o.number).locator("visible=true")).toHaveCount(0);
  });

  test("the list shows each order's jar count", async ({ page, t }) => {
    const o = await makeOrder("pending", { name: "E2E Count Buyer" });
    await page.goto(`/orders?q=${o.number}`);
    // Filtered to this one order: a table row on desktop, a card on phones.
    await expect(page.getByText(o.number).locator("visible=true").first()).toBeVisible();
    await expect(page.getByText(fill(t.orders.items, { n: 1 })).locator("visible=true").first()).toBeVisible();
    await expect(page.getByText(/(^|[^\d])4 items/).locator("visible=true")).toHaveCount(0);
  });
});

test.describe("order detail", () => {
  test("status: Confirmed → Processing → Shipped → Delivered", async ({ page, t }) => {
    const o = await makeOrder("pending");
    await page.goto(`/orders/${o.id}`);
    await expect(page.getByText(o.number).locator("visible=true").first()).toBeVisible();
    await page.getByRole("button", { name: t.orders.actPhone.confirm }).locator("visible=true").first().click();
    await expect.poll(() => orderStatus(o.id)).toBe("confirmed");
    await page.getByRole("button", { name: t.orders.actPhone.pack }).locator("visible=true").first().click();
    await expect.poll(() => orderStatus(o.id)).toBe("processing");
    await page.getByRole("button", { name: t.orders.markShipped }).locator("visible=true").first().click();
    await expect.poll(() => orderStatus(o.id)).toBe("shipped");
    await page.getByRole("button", { name: t.orders.markDelivered }).locator("visible=true").first().click();
    await expect.poll(() => orderStatus(o.id)).toBe("delivered");
    const events = await q<{ status: string }>(
      "select status from order_status_events where order_id = ? order by id",
      [o.id],
    );
    expect(events.map((e) => e.status)).toEqual(["confirmed", "processing", "shipped", "delivered"]);
  });

  test("cancel with a reason", async ({ page, t }) => {
    const o = await makeOrder("pending");
    await page.goto(`/orders/${o.id}`);
    const direct = page.getByRole("button", { name: t.orders.cancel }).locator("visible=true");
    if (await direct.count()) await direct.first().click();
    else {
      // Phones: Cancel lives in the "More actions" menu.
      await page.getByRole("button", { name: t.orders.more }).locator("visible=true").first().click();
      await page.getByRole("menuitem", { name: t.orders.cancel }).click();
    }
    const dlg = page.getByRole("dialog").or(page.getByRole("alertdialog")).first();
    await expect(dlg).toContainText(fill(t.orders.cancelTitle, { id: o.number }));
    await dlg.getByText(t.orders.reasons.no_answer).click();
    await dlg.getByRole("button", { name: t.orders.doCancel }).click();
    await expect.poll(() => orderStatus(o.id)).toBe("cancelled");
    const row = await one<{ cancel_reason: string }>("select cancel_reason from orders where id = ?", [o.id]);
    expect(row?.cancel_reason).toBe("no_answer");
  });

  test("edit the address before booking: the fee follows the delivery zone", async ({ page, t }) => {
    const s = await settings();
    const o = await makeOrder("confirmed", { zone: "in" });
    await page.goto(`/orders/${o.id}`);
    await page.getByRole("button", { name: t.orders.detail.editAddress }).locator("visible=true").first().click();
    const dlg = page.getByRole("dialog");
    await dlg.locator("#ea-division").selectOption("চট্টগ্রাম");
    await dlg.locator("#ea-district").selectOption("চট্টগ্রাম");
    await dlg.locator("#ea-upazila").selectOption({ index: 1 });
    await expect(dlg.getByText(t.orders.detail.feeChangeOut)).toBeVisible();
    await dlg.getByRole("button", { name: t.orders.detail.save }).click();
    await expect(dlg).toBeHidden();
    const row = await one<{ delivery_zone: string; shipping_fee: number; total: number; ship_district: string }>(
      "select delivery_zone, shipping_fee, total, ship_district from orders where id = ?",
      [o.id],
    );
    expect(row?.delivery_zone).toBe("out");
    expect(row?.ship_district).toBe("চট্টগ্রাম");
    expect(row?.shipping_fee).toBe(s!.delivery_fee_out);
    expect(row?.total).toBe(30000 + s!.delivery_fee_out);
    await page.reload();
    await expect(page.getByText(formatTaka(30000 + s!.delivery_fee_out)).first()).toBeAttached();
  });

  test("packing slip print page", async ({ page }) => {
    const o = await makeOrder("processing");
    const res = await page.goto(`/orders/${o.id}/print`);
    expect(res?.status()).toBe(200);
    await expect(page.getByText(o.number).first()).toBeVisible();
    await expect(page.getByText("E2E Admin Pickle").first()).toBeVisible();
    await expect(page.getByText("E2E Admin Order").first()).toBeVisible();
  });
});

test.describe("manual order", () => {
  test("/orders/new starts Confirmed and records its source", async ({ page, t }) => {
    const c = t.orders.create;
    const v = await one<{ id: number; stock: number }>(
      "select v.id, v.stock from product_variants v join products p on p.id = v.product_id where p.slug = 'lemon' and v.is_active = 1 limit 1",
    );
    await page.goto("/orders/new");
    await page.getByRole("button", { name: t.orders.detail.sources.phone, exact: true }).click();
    await page.getByLabel(c.searchPh).fill("Lemon");
    await page.getByRole("button", { name: /Lemon Pickle/ }).first().click();
    await page.locator("#no-name").fill("E2E Manual Buyer");
    await page.locator("#no-phone").fill("01900000098");
    await page.locator("#no-division").selectOption("ঢাকা");
    await page.locator("#no-district").selectOption("ঢাকা");
    await page.locator("#no-upazila").selectOption({ index: 1 });
    await page.locator("#no-address").fill("বাড়ি ৪, রোড ১০, স্কুলের পাশে");
    await page.getByRole("button", { name: c.submit }).locator("visible=true").first().click();
    await expect(page).toHaveURL(/\/orders\/\d+$/, { timeout: 15_000 });
    const row = await one<{ id: number; status: string; source: string }>(
      "select id, status, source from orders where customer_name = 'E2E Manual Buyer' order by id desc limit 1",
    );
    expect(row?.status).toBe("confirmed");
    expect(row?.source).toBe("phone");
    await expect(page.getByText(t.orders.detail.sources.phone).locator("visible=true").first()).toBeVisible();
    const after = await one<{ stock: number }>("select stock from product_variants where id = ?", [v?.id]);
    expect(after?.stock).toBe((v?.stock ?? 0) - 1);
  });
});
