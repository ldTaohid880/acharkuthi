import { rm } from "node:fs/promises";
import path from "node:path";
import { test as teardown } from "@playwright/test";
import { E2E_SLUG, cancelOrder, closeDb, exec, q } from "./support/db";
import { APP_DIR } from "./support/env";

/**
 * Removes what the suite created. Orders are kept but cancelled (stock put back), as an admin
 * would; everything else marked e2e / @example.test is deleted.
 */
teardown("clean up e2e data", async () => {
  const orders = await q<{ order_number: string }>(
    `select order_number from orders
      where customer_email like 'e2e-%@example.test' or customer_name like 'E2E %'
         or customer_phone in ('01900000001', '01900000002', '01900000003', '01900000004')`,
  );
  for (const o of orders) await cancelOrder(o.order_number);

  await exec("delete from restock_requests where contact like 'e2e-%@example.test'");
  await exec("delete from contact_messages where email like 'e2e-%@example.test'");
  await exec("delete from newsletter_subscribers where email like 'e2e-%@example.test'");
  await exec("delete from site_reviews where name like 'E2E %'");
  // Review photos uploaded by the review-form test (dev storage under public/uploads).
  const photos = await q<{ photo_url: string }>(
    "select photo_url from reviews where (name like 'E2E %' or user_id in (select id from user where email like 'e2e-%@example.test')) and photo_url like '/uploads/%'",
  );
  for (const ph of photos)
    await rm(path.join(APP_DIR, "public", ph.photo_url), { force: true }).catch(() => undefined);
  await exec(
    "delete from reviews where name like 'E2E %' or user_id in (select id from user where email like 'e2e-%@example.test')",
  );
  await exec("delete from coupons where code like 'E2E%'");
  // Accounts (sessions, addresses and sign-ins go with them).
  await exec("delete from user where email like 'e2e-%@example.test'");
  // The test pickle: its sizes go with it; cancelled order lines keep their snapshot text.
  await exec("delete from products where slug = ?", [E2E_SLUG]);
  await closeDb();
});
