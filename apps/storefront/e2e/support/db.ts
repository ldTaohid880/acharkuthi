import mysql from "mysql2/promise";
import { localDatabaseUrl } from "./env";

/** Direct access to the local test database, for setup, assertions and cleanup. */
let pool: mysql.Pool | undefined;
export function db(): mysql.Pool {
  pool ??= mysql.createPool({ uri: localDatabaseUrl(), connectionLimit: 4 });
  return pool;
}

type Row = object;

export async function q<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await db().query(sql, params);
  return rows as T[];
}
export async function one<T extends Row = Row>(sql: string, params: unknown[] = []) {
  return (await q<T>(sql, params))[0];
}
export async function exec(sql: string, params: unknown[] = []) {
  const [res] = await db().execute(sql, params as (string | number | null)[]);
  return res as mysql.ResultSetHeader;
}
export async function closeDb() {
  await pool?.end();
  pool = undefined;
}

/** Marker in every name, slug and SKU the suite creates, so teardown can find them. */
export const E2E_SLUG = "e2e-test-pickle";
export const E2E_NAME = "E2E Test Pickle";
export const E2E_NAME_BN = "ই২ই পরীক্ষার আচার";
/** One size of the test pickle per project, so parallel projects never share stock. */
export const SLOTS: Record<string, number> = {
  "bn-desktop": 1,
  "bn-mobile": 2,
  "en-desktop": 3,
  "en-mobile": 4,
};
export const slotSku = (slot: number) => `E2E-SLOT-${slot}`;
export const slotLabel = (slot: number) => `${slot * 100} g`;
export const SLOT_PRICE = 30000;
export const SLOT_STOCK = 50;

export async function variantBySku(sku: string) {
  return one<{ id: number; price: number; stock: number; label: string }>(
    "select id, price, stock, label from product_variants where sku = ?",
    [sku],
  );
}

/** A test phone number per project (valid BD mobile format, 019 prefix, all test data). */
export const testPhone = (slot: number) => `0190000000${slot}`;

/** Cancels the order and puts its jars back on the shelf (what an admin cancel does). */
export async function cancelOrder(orderNumber: string) {
  const o = await one<{ id: number; status: string }>(
    "select id, status from orders where order_number = ?",
    [orderNumber],
  );
  if (!o || o.status === "cancelled") return;
  const items = await q<{ variant_id: number | null; quantity: number }>(
    "select variant_id, quantity from order_items where order_id = ?",
    [o.id],
  );
  for (const i of items)
    if (i.variant_id)
      await exec("update product_variants set stock = stock + ? where id = ?", [
        i.quantity,
        i.variant_id,
      ]);
  await exec(
    "update orders set status = 'cancelled', cancel_reason = 'other', cancel_note = 'e2e cleanup' where id = ?",
    [o.id],
  );
}
