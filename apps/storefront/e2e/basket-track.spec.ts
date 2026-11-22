import { formatTaka } from "@repo/ui/lib/utils";
import { SLOT_PRICE, exec, one } from "./support/db";
import { expect, test } from "./support/fixtures";
import { basketWithSlot } from "./support/shop";

test.describe("basket", () => {
  test("change quantity, remove with undo, then the empty state", async ({ page, p, t, slot }) => {
    const mini = t.mini;
    await basketWithSlot(page, slot, 1);
    await page.goto(p("/basket"));
    await expect(page.getByRole("heading", { level: 1, name: t.basket.title })).toBeVisible();
    const row = page.locator("li.bk-row").first();
    await expect(row).toContainText(formatTaka(SLOT_PRICE));
    const stepper = row.getByRole("group");
    await stepper.getByRole("button", { name: mini.more }).click();
    await expect(stepper.locator("output")).toHaveText("2");
    await expect(row.locator(".bk-lt")).toContainText(formatTaka(SLOT_PRICE * 2));
    const summary = page.locator("aside.bk-side");
    await expect(summary.locator(".r.tot dd")).toHaveText(formatTaka(SLOT_PRICE * 2));
    await expect(summary).toContainText(t.basket.items(2));
    await stepper.getByRole("button", { name: mini.less }).click();
    await expect(stepper.locator("output")).toHaveText("1");
    // Minus is disabled at 1.
    await expect(stepper.getByRole("button", { name: mini.less })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await row.locator(".bk-rm").click();
    const notice = page.locator(".nt[role=status]").first();
    await expect(notice).toBeVisible();
    await notice.getByRole("button", { name: mini.undo }).click();
    await expect(page.locator("li.bk-row")).toHaveCount(1);
    await page.locator("li.bk-row .bk-rm").click();
    await expect(page.locator(".empty h2")).toHaveText(mini.emptyTitle);
    await expect(page.locator(".empty").getByRole("link")).toHaveAttribute("href", p("/shop"));
  });

  test("the summary leaves delivery and coupon to checkout", async ({ page, p, t, slot }) => {
    await basketWithSlot(page, slot, 1);
    await page.goto(p("/basket"));
    const summary = page.locator("main");
    await expect(summary).toContainText(t.basket.deliveryLater);
    await expect(summary).toContainText(t.basket.couponLater);
    await page
      .getByRole("link", { name: t.basket.checkout })
      .locator("visible=true")
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`${p("/checkout")}$`));
  });

  test("an empty basket shows the empty state", async ({ page, p, t }) => {
    await page.goto(p("/basket"));
    await expect(page.locator(".empty h2")).toHaveText(t.mini.emptyTitle);
  });
});

/** Track tests' own phone numbers, apart from the checkout tests' ones. */
const testPhone = (slot: number) => `0191000000${slot}`;

test.describe("track an order", () => {
  test.describe.configure({ mode: "serial" });
  const number = (slot: number) => `AK-261116-99000${slot}`;

  test.beforeEach(async ({ slot }) => {
    await exec("delete from orders where order_number = ?", [number(slot)]);
    await exec(
      `insert into orders (order_number, status, customer_name, customer_phone, shipping_address,
         ship_upazila, ship_district, delivery_zone, source, subtotal, shipping_fee, total)
       values (?, 'processing', 'E2E Tracker', ?, 'বাড়ি ১, ঢাকা', 'ধানমন্ডি', 'ঢাকা', 'in', 'website', 30000, 7000, 37000)`,
      [number(slot), testPhone(slot)],
    );
    const o = await one<{ id: number }>("select id from orders where order_number = ?", [
      number(slot),
    ]);
    await exec(
      `insert into order_items (order_id, product_name, variant_label, unit_price, quantity)
       values (?, 'E2E Test Pickle', '100 g', 30000, 1)`,
      [o?.id],
    );
  });
  test.afterAll(async ({}, info) => {
    void info;
    await exec("delete from orders where order_number like 'AK-261116-99000%'");
  });

  test("order number plus phone shows the timeline in the page language", async ({
    page,
    p,
    t,
    lang,
    slot,
  }) => {
    await page.goto(p("/track"));
    await page.locator("#t-no").fill(number(slot));
    await page.locator("#t-ct").fill(testPhone(slot));
    await page.getByRole("button", { name: t.track.find }).click();
    const steps = page.getByRole("list", { name: t.track.steps });
    await expect(steps).toBeVisible();
    const labels = await steps.locator(".lb").allInnerTexts();
    expect(labels).toEqual(
      lang === "en"
        ? ["Confirmed", "Packed", "On the way", "Delivered"]
        : ["অর্ডার নিশ্চিত", "প্যাকেট প্রস্তুত", "পথে আছে", "পৌঁছে গেছে"],
    );
    await expect(steps.locator(".lb").first()).toHaveAttribute("lang", lang);
    // The current step is "Packed" (processing).
    await expect(steps.locator('li[aria-current="step"] .lb')).toHaveText(labels[1] ?? "");
    // Step notes and the status line are in the page language too.
    const notes = (await steps.locator(".nt2").allInnerTexts()).join(" ");
    const lead = await page.locator(".tk-next").innerText();
    if (lang === "en") {
      expect(notes).not.toMatch(/[ঀ-৿]/);
      expect(lead).not.toMatch(/[ঀ-৿]{3}/);
    } else expect(lead).toMatch(/[ঀ-৿]/);
    await expect(page.getByText(number(slot)).first()).toBeVisible();
  });

  test("wrong details show the error state", async ({ page, p, t, slot }) => {
    await page.goto(p("/track"));
    await page.locator("#t-no").fill(number(slot));
    await page.locator("#t-ct").fill("01999999999");
    await page.getByRole("button", { name: t.track.find }).click();
    await expect(page.getByRole("alert").filter({ hasText: t.track.noMatchTitle })).toBeVisible();
  });

  test("empty and malformed fields show their errors", async ({ page, p, t }) => {
    await page.goto(p("/track"));
    await page.getByRole("button", { name: t.track.find }).click();
    const err = t.track.err;
    await expect(page.getByText(err["অর্ডার নম্বর লিখুন"] ?? "অর্ডার নম্বর লিখুন")).toBeVisible();
    await expect(
      page.getByText(err["ইমেইল অথবা মোবাইল নম্বর লিখুন"] ?? "ইমেইল অথবা মোবাইল নম্বর লিখুন"),
    ).toBeVisible();
  });

  test("a malformed order number shows the format error", async ({ page, p, t }) => {
    await page.goto(p("/track"));
    await page.locator("#t-no").fill("12345");
    await page.locator("#t-ct").fill("01700000000");
    await page.getByRole("button", { name: t.track.find }).click();
    const bad = "অর্ডার নম্বরটি ঠিক মনে হচ্ছে না। যেমন: AK-261108-123456";
    await expect(page.getByText(t.track.err[bad] ?? bad)).toBeVisible({ timeout: 4000 });
  });

  test("errors still show after a no-match result when the fields are cleared", async ({
    page,
    p,
    t,
    slot,
  }) => {
    await page.goto(p("/track"));
    await page.locator("#t-no").fill(number(slot));
    await page.locator("#t-ct").fill("01999999999");
    await page.getByRole("button", { name: t.track.find }).click();
    await expect(page.getByRole("alert").filter({ hasText: t.track.noMatchTitle })).toBeVisible();
    await page.locator("#t-no").fill("");
    await page.locator("#t-ct").fill("");
    await page.getByRole("button", { name: t.track.find }).click();
    const empty = "অর্ডার নম্বর লিখুন";
    await expect(page.getByText(t.track.err[empty] ?? empty)).toBeVisible({ timeout: 4000 });
  });
});
