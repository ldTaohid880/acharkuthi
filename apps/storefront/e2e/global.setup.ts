import { randomBytes } from "node:crypto";
import { request, test as setup } from "@playwright/test";
import {
  E2E_NAME,
  E2E_NAME_BN,
  E2E_SLUG,
  SLOT_PRICE,
  SLOT_STOCK,
  SLOTS,
  closeDb,
  exec,
  one,
  slotLabel,
  slotSku,
} from "./support/db";
import { BASE_URL, saveCreds, stateFile } from "./support/env";

/**
 * Creates the suite's own data (all marked "e2e"):
 * - "E2E Test Pickle" on the mango shelf, with one size per project so parallel projects never
 *   share stock.
 * - One signed-in shopper per project (…@example.test), saved as a storage state.
 * Teardown (global.teardown.ts) removes all of it.
 */
setup("create e2e data and shoppers", async () => {
  setup.setTimeout(120_000);
  const mango = await one<{ id: number }>("select id from categories where slug = 'mango'");
  let product = await one<{ id: number }>("select id from products where slug = ?", [E2E_SLUG]);
  if (!product) {
    await exec(
      `insert into products (category_id, name, name_bn, slug, description, description_bn, spice_level,
         is_active, search_terms, flavor, flavor_en, storage)
       values (?, ?, ?, ?, ?, ?, 2, 1, 'e2e testachar', 'ই২ই স্বাদের বর্ণনা', 'E2E flavour text', 'ই২ই সংরক্ষণ')`,
      [
        mango?.id ?? null,
        E2E_NAME,
        E2E_NAME_BN,
        E2E_SLUG,
        "E2E English description.",
        "ই২ই বাংলা বিবরণ।",
      ],
    );
    product = await one<{ id: number }>("select id from products where slug = ?", [E2E_SLUG]);
  }
  for (const slot of Object.values(SLOTS)) {
    await exec(
      `insert into product_variants (product_id, sku, label, weight_grams, price, stock, is_active, sort_order)
       values (?, ?, ?, ?, ?, ?, 1, ?)
       on duplicate key update price = values(price), stock = values(stock), is_active = 1`,
      [product?.id, slotSku(slot), slotLabel(slot), slot * 100, SLOT_PRICE, SLOT_STOCK, slot],
    );
  }

  // Approved reviews on the test pickle: filter, sort, photo filter and the shop's reply.
  await exec("delete from reviews where product_id = ?", [product?.id]);
  for (const [rating, name, title, photo, reply, daysAgo] of [
    [5, "E2E Reviewer Five", "E2E great jar", "/jar.svg", null, 3],
    [3, "E2E Reviewer Three", "E2E just fine", null, "E2E thank you for the note", 2],
    [4, "E2E Reviewer Four", "E2E tasty", null, null, 1],
  ] as const) {
    await exec(
      `insert into reviews (product_id, name, rating, title, comment, photo_url, is_approved, reply, reply_at, created_at)
       values (?, ?, ?, ?, 'E2E review body text.', ?, 1, ?, ?, now() - interval ? day)`,
      [product?.id, name, rating, title, photo, reply, reply ? new Date() : null, daysAgo],
    );
  }

  const run = Date.now().toString(36);
  // Generated, written only to the untracked e2e/.auth folder, never printed.
  const password = `E2e${randomBytes(9).toString("base64url")}9a`;
  const shoppers: Record<string, string> = {};
  for (const project of Object.keys(SLOTS)) {
    const email = `e2e-${project}-${run}@example.test`;
    const ctx = await request.newContext({ baseURL: BASE_URL });
    for (let attempt = 0; ; attempt++) {
      const res = await ctx.post("/api/auth/sign-up/email", {
        data: { name: `E2E ${project}`, email, password },
        headers: { origin: BASE_URL },
      });
      if (res.ok()) break;
      if (res.status() === 429 && attempt < 6) {
        await new Promise((r) => setTimeout(r, 11_000));
        continue;
      }
      throw new Error(`sign-up for ${project} failed: ${res.status()}`);
    }
    await ctx.storageState({ path: stateFile(project) });
    await ctx.dispose();
    shoppers[project] = email;
  }
  saveCreds({ run, password, shoppers });
  await closeDb();
});
