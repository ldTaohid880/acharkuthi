import { exec, one } from "./env";

let seq = 0;
/** A test order straight in the database (no stock involved: the line has no size). */
export async function makeOrder(
  status = "pending",
  o: { zone?: "in" | "out"; name?: string } = {},
) {
  const number = `AK-261116-9${String((Date.now() + seq++) % 100000).padStart(5, "0")}`;
  const zone = o.zone ?? "in";
  const fee = zone === "in" ? 7000 : 12000;
  await exec(
    `insert into orders (order_number, status, customer_name, customer_phone, customer_email, shipping_address,
       ship_upazila, ship_district, delivery_zone, source, subtotal, shipping_fee, total)
     values (?, ?, ?, '01900000099', 'e2e-admin-buyer@example.test', 'বাড়ি ৯, রোড ৩, ধানমন্ডি, ঢাকা',
       'ধানমন্ডি', 'ঢাকা', ?, 'website', 30000, ?, ?)`,
    [number, status, o.name ?? "E2E Admin Order", zone, fee, 30000 + fee],
  );
  const row = await one<{ id: number }>("select id from orders where order_number = ?", [number]);
  await exec(
    `insert into order_items (order_id, product_name, variant_label, unit_price, quantity)
     values (?, 'E2E Admin Pickle', '300 g', 30000, 1)`,
    [row?.id],
  );
  await exec("insert into payments (order_id, method, amount) values (?, 'cod', ?)", [
    row?.id,
    30000 + fee,
  ]);
  return { id: Number(row?.id), number };
}

export const orderStatus = async (id: number) =>
  (await one<{ status: string }>("select status from orders where id = ?", [id]))?.status;

export const settings = () =>
  one<{ delivery_fee_in: number; delivery_fee_out: number; cod_enabled: number }>(
    "select delivery_fee_in, delivery_fee_out, cod_enabled from shop_settings where id = 1",
  );
