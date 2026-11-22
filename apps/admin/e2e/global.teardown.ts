import { test as teardown } from "@playwright/test";
import { closeDb, exec, q } from "./support/env";

/** Removes the admin suite's own data (all marked e2e / …@example.test). */
teardown("clean up admin e2e data", async () => {
  // Orders the suite created: cancelled with stock put back, as an admin cancel does.
  const orders = await q<{ id: number; status: string }>(
    "select id, status from orders where customer_name like 'E2E %' and status <> 'cancelled'",
  );
  for (const o of orders) {
    const items = await q<{ variant_id: number | null; quantity: number }>(
      "select variant_id, quantity from order_items where order_id = ?",
      [o.id],
    );
    for (const i of items)
      if (i.variant_id)
        await exec("update product_variants set stock = stock + ? where id = ?", [i.quantity, i.variant_id]);
    await exec("update orders set status = 'cancelled', cancel_reason = 'other', cancel_note = 'e2e cleanup' where id = ?", [o.id]);
  }
  await exec("delete from coupons where code like 'E2E%'");
  await exec("delete from categories where slug like 'e2e-%'");
  await exec("delete from products where slug like 'e2e-admin-%'");
  await exec("delete from contact_messages where email like 'e2e-%@example.test'");
  await exec("delete from reviews where name like 'E2E %'");
  await exec("delete from restock_requests where contact like 'e2e-%@example.test'");
  await exec("delete from user where email like 'e2e-admin-%@example.test'");
  await closeDb();
});
