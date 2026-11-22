import { formatTaka } from "@repo/ui/lib/utils";
import { DIVISIONS, placeName, upazilasOf } from "@repo/validators";
import type { Page } from "@playwright/test";
import { E2E_SLUG, SLOTS, SLOT_PRICE, cancelOrder, exec, one, q, testPhone } from "./support/db";
import { expect, test, type Dict } from "./support/fixtures";
import { DHAKA, OUTSIDE, basketWithSlot, fillCheckout, pick, placeButton } from "./support/shop";

const fees = () =>
  one<{ delivery_fee_in: number; delivery_fee_out: number; cod_enabled: number }>(
    "select delivery_fee_in, delivery_fee_out, cod_enabled from shop_settings where id = 1",
  );

/** Orders placed by this project's test phone, newest first. */
const ordersOf = (phone: string) =>
  q<{
    order_number: string;
    status: string;
    subtotal: number;
    shipping_fee: number;
    total: number;
    delivery_zone: string;
    source: string;
  }>(
    "select order_number, status, subtotal, shipping_fee, total, delivery_zone, source from orders where customer_phone = ? order by id desc",
    [phone],
  );

test.describe("checkout", () => {
  // Orders and stock of this project's own test size: one at a time.
  test.describe.configure({ mode: "serial" });

  test.afterEach(async ({ slot }) => {
    for (const o of await ordersOf(testPhone(slot))) await cancelOrder(o.order_number);
  });

  test("every required field shows its error in the page language", async ({
    page,
    p,
    t,
    slot,
  }) => {
    const ck = t.checkout;
    await basketWithSlot(page, slot);
    await page.goto(p("/checkout"));
    await expect(page.getByRole("heading", { level: 1, name: ck.title })).toBeVisible();
    await expect(placeButton(page)).toBeVisible();
    await placeButton(page).click();

    const msg = (bn: string) => ck.err[bn] ?? bn;
    const summary = page.locator(".ck .note.err");
    await expect(summary).toBeVisible();
    for (const bn of [
      "পুরো নাম লিখুন",
      "মোবাইল নম্বর লিখুন",
      "বিভাগ বেছে নিন",
      "জেলা বেছে নিন",
      "উপজেলা / থানা বেছে নিন",
      "বিস্তারিত ঠিকানা লিখুন",
      "ডেলিভারি পদ্ধতি বেছে নিন",
    ])
      await expect(page.getByText(msg(bn), { exact: true }).first(), bn).toBeVisible();
    // Focus moves to the first invalid field.
    await expect(page.getByPlaceholder(ck.namePh)).toBeFocused();

    // Format errors: phone, email, short address, post code.
    await page.getByPlaceholder("01XXXXXXXXX", { exact: true }).fill("12345");
    await page.locator(".ck").getByPlaceholder("you@example.com").fill("not-an-email");
    await page.getByPlaceholder(ck.addrPh).fill("ঢাকা");
    await page.getByPlaceholder(ck.postalPh).fill("12");
    await placeButton(page).click();
    for (const bn of [
      "নম্বরটি ঠিক নয়। ১১ সংখ্যার নম্বর লিখুন, যেমন 01XXX-XXXXXX",
      "ইমেইলটি ঠিক মনে হচ্ছে না, যেমন: name@example.com",
      "বাড়ি, রাস্তা ও কাছের পরিচিত জায়গা লিখলে ডেলিভারি সহজ হবে",
      "পোস্ট কোড ৪ সংখ্যার হয়",
    ])
      await expect(page.getByText(msg(bn), { exact: true }).first(), bn).toBeVisible();
  });

  test("division and district follow the page language; upazila stays Bangla", async ({
    page,
    p,
    t,
    lang,
    slot,
  }) => {
    const ck = t.checkout;
    await basketWithSlot(page, slot);
    await page.goto(p("/checkout"));
    await page.getByRole("combobox", { name: ck.division, exact: true }).click();
    const options = await page.getByRole("option").allInnerTexts();
    expect(options.slice(1)).toEqual(DIVISIONS.map((d) => placeName(d, lang)));
    if (lang === "en") expect(options).toContain("Chattogram");
    await page.getByRole("option", { name: placeName("ঢাকা", lang), exact: true }).click();
    await pick(page, ck.district, placeName("ঢাকা", lang));
    await page.getByRole("combobox", { name: ck.upazila, exact: true }).click();
    const upas = (await page.getByRole("option").allInnerTexts()).slice(1);
    expect(upas).toEqual(upazilasOf("ঢাকা", "ঢাকা"));
    for (const u of upas) expect(u).toMatch(/[ঀ-৿]/);
    await expect(
      page.locator(".ak-sel").filter({ has: page.getByRole("listbox") }),
    ).toHaveAttribute("lang", "bn");
  });

  test("the delivery fee is the inside-Dhaka or outside fee from Settings", async ({
    page,
    p,
    t,
    lang,
    slot,
  }) => {
    const ck = t.checkout;
    const f = await fees();
    await basketWithSlot(page, slot);
    await page.goto(p("/checkout"));
    const sum = page.locator(".ck dl.tot:visible").first();
    await expect(sum).toContainText(ck.feeLater);
    // No delivery-method step: the district picks the zone and its field says which and the fee.
    await expect(page.getByRole("radiogroup", { name: ck.delivery.in.title })).toHaveCount(0);
    const zone = page.locator("#ck-district-help");

    await fillCheckout(page, t, lang, { phone: testPhone(slot), place: DHAKA });
    await expect(zone).toHaveText(
      ck.zoneNote(ck.delivery.in.title, formatTaka(f!.delivery_fee_in)),
    );
    await expect(sum).toContainText(formatTaka(f!.delivery_fee_in));
    await expect(sum.locator(".grand dd")).toHaveText(formatTaka(SLOT_PRICE + f!.delivery_fee_in));

    await pick(page, ck.division, placeName(OUTSIDE.division, lang));
    await pick(page, ck.district, placeName(OUTSIDE.district, lang));
    await expect(zone).toHaveText(
      ck.zoneNote(ck.delivery.out.title, formatTaka(f!.delivery_fee_out)),
    );
    await expect(sum.locator(".grand dd")).toHaveText(formatTaka(SLOT_PRICE + f!.delivery_fee_out));
  });

  test("places a real cash-on-delivery order and shows its number", async ({
    page,
    p,
    t,
    lang,
    slot,
  }) => {
    const ck = t.checkout;
    const f = await fees();
    await basketWithSlot(page, slot, 2);
    await page.goto(p("/checkout"));
    await fillCheckout(page, t, lang, { phone: testPhone(slot), name: "E2E Buyer" });
    // Let the re-quote for the new district settle before confirming.
    await expect(page.locator(".ck dl.tot:visible .grand dd").first()).toHaveText(
      formatTaka(SLOT_PRICE * 2 + f!.delivery_fee_in),
    );
    await placeButton(page).click();
    await expect(page.getByRole("heading", { level: 1, name: ck.okTitle })).toBeVisible({
      timeout: 20_000,
    });
    const number = (await page.locator(".ordno span").nth(1).innerText()).trim();
    expect(number).toMatch(/^AK-\d{6}-\d{6}$/);
    await expect(page.getByText(ck.okThanks("E2E Buyer"))).toBeVisible();
    await expect(page.getByRole("link", { name: ck.track })).toHaveAttribute(
      "href",
      p(`/track?order=${number}`),
    );

    const [order] = await ordersOf(testPhone(slot));
    expect(order?.order_number).toBe(number);
    expect(order?.status).toBe("pending");
    expect(order?.source).toBe("website");
    expect(order?.delivery_zone).toBe("in");
    expect(order?.subtotal).toBe(SLOT_PRICE * 2);
    expect(order?.total).toBe(SLOT_PRICE * 2 + f!.delivery_fee_in);
    const pay = await one<{ method: string }>(
      "select p.method from payments p join orders o on o.id = p.order_id where o.order_number = ?",
      [number],
    );
    expect(pay?.method).toBe("cod");
    // The basket is empty afterwards; a reload still shows the confirmation (same tab).
    await page.reload();
    await expect(page.locator(".ordno")).toContainText(number);
  });

  test("blocks the order when the size sells out between basket and submit", async ({
    page,
    p,
    t,
    lang,
    slot,
  }) => {
    const ck = t.checkout;
    // A size of its own, so no other test sees it at 0.
    const product = await one<{ id: number }>("select id from products where slug = ?", [E2E_SLUG]);
    const sku = `E2E-SOLD-${slot}`;
    await exec(
      `insert into product_variants (product_id, sku, label, price, stock, is_active, sort_order)
       values (?, ?, ?, ?, 5, 1, 90) on duplicate key update stock = 5, is_active = 1`,
      [product?.id, sku, `${slot}5 g`, SLOT_PRICE],
    );
    const v = await one<{ id: number }>("select id from product_variants where sku = ?", [sku]);
    try {
      await page.goto("/unavailable");
      await page.evaluate((id) => {
        localStorage.setItem(
          "acharkuthi-cart",
          JSON.stringify({
            state: {
              lines: [
                {
                  variantId: id,
                  productName: "E2E Test Pickle",
                  variantLabel: "x",
                  unitPrice: 30000,
                  quantity: 1,
                },
              ],
            },
            version: 0,
          }),
        );
      }, v!.id);
      await page.goto(p("/checkout"));
      await fillCheckout(page, t, lang, { phone: testPhone(slot) });
      await expect(page.locator(".ck dl.tot:visible .grand dd").first()).toBeVisible();

      const before = (await ordersOf(testPhone(slot))).length;
      await exec("update product_variants set stock = 0 where id = ?", [v!.id]);
      await placeButton(page).click();

      // Not placed: no confirmation, no order row.
      await expect(page.getByText(ck.goneTitle).first()).toBeAttached();
      await expect(page.getByRole("heading", { name: ck.okTitle })).toHaveCount(0);
      await page.waitForLoadState("networkidle");
      expect(await ordersOf(testPhone(slot))).toHaveLength(before);
      // And the shopper is told on screen.
      await expect(page.getByText(ck.goneTitle).locator("visible=true").first()).toBeVisible({
        timeout: 4000,
      });
    } finally {
      await exec("delete from product_variants where sku = ?", [sku]);
    }
  });

  test("prices come from the database, not the basket in localStorage", async ({
    page,
    p,
    t,
    lang,
    slot,
  }) => {
    const ck = t.checkout;
    const f = await fees();
    // Tampered basket: ৳1 instead of the real price.
    await basketWithSlot(page, slot, 1, 100);
    await page.goto(p("/checkout"));
    await fillCheckout(page, t, lang, { phone: testPhone(slot) });
    const sum = page.locator(".ck dl.tot:visible").first();
    await expect(sum.locator(".grand dd")).toHaveText(formatTaka(SLOT_PRICE + f!.delivery_fee_in));
    await expect(page.getByText(ck.priceTitle).first()).toBeAttached();
    await placeButton(page).click();
    await expect(page.getByRole("heading", { level: 1, name: ck.okTitle })).toBeVisible({
      timeout: 20_000,
    });
    const [order] = await ordersOf(testPhone(slot));
    expect(order?.subtotal).toBe(SLOT_PRICE);
    expect(order?.total).toBe(SLOT_PRICE + f!.delivery_fee_in);
  });
});

test.describe("checkout coupons", () => {
  test.describe.configure({ mode: "serial" });
  const now = Date.now();
  const codes = (slot: number) => ({
    ok: `E2EOK${slot}${now % 100000}`,
    fixed: `E2EFIX${slot}${now % 100000}`,
    min: `E2EMIN${slot}${now % 100000}`,
    old: `E2EOLD${slot}${now % 100000}`,
  });

  test.beforeAll(async ({}, info) => {
    const slot = SLOTS[info.project.name] ?? 1;
    const c = codes(slot);
    const ins = (code: string, type: string, value: number, min: number, ends: string | null) =>
      exec(
        `insert into coupons (code, type, value, min_order_amount, ends_at, is_active, per_person_limit)
         values (?, ?, ?, ?, ?, 1, null)`,
        [code, type, value, min, ends],
      );
    await ins(c.ok, "percent", 10, 0, null);
    await ins(c.fixed, "fixed", 5000, 0, null);
    await ins(c.min, "fixed", 5000, 10_000_000, null);
    await ins(c.old, "percent", 10, 0, "2020-01-01 00:00:00");
  });
  test.afterAll(async ({}, info) => {
    const slot = SLOTS[info.project.name] ?? 1;
    await exec("delete from coupons where code in (?, ?, ?, ?)", Object.values(codes(slot)));
  });

  async function tryCode(page: Page, t: Dict, code: string) {
    const ck = t.checkout;
    const box = page.locator(".cp:visible").first();
    const ask = box.getByRole("button", { name: ck.promoAsk });
    if (await ask.isVisible()) await ask.click();
    const input = box.getByPlaceholder(ck.promoPh);
    if (await input.isVisible()) {
      await input.fill(code);
      await box.getByRole("button", { name: ck.apply }).click();
    }
    return box;
  }

  test("valid, fixed, minimum-order, expired and unknown codes", async ({ page, p, t, slot }) => {
    const ck = t.checkout;
    const c = codes(slot);
    await basketWithSlot(page, slot, 1);
    await page.goto(p("/checkout"));

    // Unknown code.
    let box = await tryCode(page, t, "E2E-NO-SUCH");
    await expect(box.getByRole("alert")).toHaveText(ck.coupon.invalid);
    // Expired.
    box = await tryCode(page, t, c.old);
    await expect(box.getByRole("alert")).toHaveText(ck.coupon.expired);
    // Minimum order not reached: refused, saying how much more to add (owner, 2026-11-19).
    box = await tryCode(page, t, c.min);
    await expect(box.getByRole("alert")).toContainText(
      (ck.coupon.min.split("{amount}")[0] ?? "").trim(),
    );
    // Valid percent coupon: 10% off.
    box = await tryCode(page, t, c.ok);
    await expect(box.locator(".cp-ok")).toContainText(c.ok);
    const sum = page.locator(".ck dl.tot:visible").first();
    await expect(sum.locator(".disc dd")).toHaveText(`−${formatTaka(SLOT_PRICE / 10)}`);
    await box.getByRole("button", { name: ck.remove }).click();
    await expect(sum.locator(".disc")).toHaveCount(0);
    // Fixed ৳50.
    await tryCode(page, t, c.fixed);
    await expect(sum.locator(".disc dd")).toHaveText(`−${formatTaka(5000)}`);
  });
});
