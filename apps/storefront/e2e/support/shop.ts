import type { Page } from "@playwright/test";
import { placeName, upazilasOf } from "@repo/validators";
import type { Lang } from "../../lib/i18n/lang";
import { E2E_NAME, SLOT_PRICE, slotLabel, slotSku, variantBySku } from "./db";
import { expect, seedBasket, type Dict } from "./fixtures";

/** Chooses an option in the storefront's own dropdown (components/select.tsx). */
export async function pick(page: Page, combobox: string, option: string) {
  const box = page.getByRole("combobox", { name: combobox, exact: true }).first();
  await box.click();
  await page.getByRole("option", { name: option, exact: true }).first().click();
  await expect(box).toContainText(option);
}

export const DHAKA = { division: "ঢাকা", district: "ঢাকা" };
export const OUTSIDE = { division: "চট্টগ্রাম", district: "চট্টগ্রাম" };

/** Fills the checkout address with a known place (division / district shown in the page language). */
export async function fillCheckout(
  page: Page,
  t: Dict,
  lang: Lang,
  o: { name?: string; phone: string; place?: { division: string; district: string } },
) {
  const ck = t.checkout;
  const place = o.place ?? DHAKA;
  await page.getByPlaceholder(ck.namePh).fill(o.name ?? "E2E Shopper");
  await page.getByPlaceholder("01XXXXXXXXX", { exact: true }).fill(o.phone);
  await pick(page, ck.division, placeName(place.division, lang));
  await pick(page, ck.district, placeName(place.district, lang));
  const upazila = upazilasOf(place.division, place.district)[0] ?? "";
  await pick(page, ck.upazila, upazila);
  await page.getByPlaceholder(ck.addrPh).fill("বাড়ি ১২, রোড ৫, মসজিদের পাশে (E2E)");
  return { upazila };
}

/** The visible "Confirm order" button (desktop aside or the phone's bottom bar). */
export const placeButton = (page: Page) => page.locator("button.place:visible").first();

/** Puts `quantity` of this project's test-pickle size into the basket. */
export async function basketWithSlot(page: Page, slot: number, quantity = 1, unitPrice = SLOT_PRICE) {
  const v = await variantBySku(slotSku(slot));
  if (!v) throw new Error("test pickle size missing: run the setup project");
  await page.goto("/unavailable");
  await seedBasket(page, [
    {
      variantId: v.id,
      productName: E2E_NAME,
      variantLabel: slotLabel(slot),
      unitPrice,
      quantity,
      slug: "e2e-test-pickle",
    },
  ]);
  return v;
}
