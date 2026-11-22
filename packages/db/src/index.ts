import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: mysql.Pool };

function createPool(): mysql.Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // Every connection works in UTC. Drizzle writes and reads TIMESTAMP columns as UTC strings, but
  // MySQL's NOW() / DEFAULT CURRENT_TIMESTAMP use the session time zone. On a server set to Dhaka
  // time that made every database-stamped time (order dates, "today" on the dashboard, message
  // ages) read 6 hours ahead, and every date written from code 6 hours behind.
  const pool = mysql.createPool({ uri: url, connectionLimit: 10, timezone: "Z" });
  pool.pool.on("connection", (conn) => {
    // Queued before any other command on this connection, so no query sees the old zone.
    conn.query("SET time_zone = '+00:00'");
  });
  return pool;
}

// Reuse the pool across hot reloads in development.
const pool = globalForDb.pool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

// "planetscale" builds relational queries (db.query.*) with correlated subqueries instead of
// LATERAL joins. Production is Hostinger MariaDB, which has no LATERAL; MySQL runs both.
export const db = drizzle(pool, { schema, mode: "planetscale" });
export type Db = typeof db;
export { schema };

/**
 * Sort for rows with sort_order (variants, images). Ordered to-many relations are sorted in code:
 * an orderBy inside a relational `with` needs a derived table that MariaDB (Hostinger) rejects.
 */
export const bySortOrder = (
  a: { sortOrder: number; id: number },
  b: { sortOrder: number; id: number },
) => a.sortOrder - b.sortOrder || a.id - b.id;
export * from "drizzle-orm";
export { notifyAdmins } from "./notify";
export { DEFAULT_SHOP_RULES, getShopRules, type ShopRules } from "./settings";
export {
  COUPON_LIVE_CHECKS,
  COUPON_TRIES,
  couponUsesBy,
  hasEarlierOrder,
  recordRedemption,
  recordWrongCoupon,
  tooManyCouponTries,
  type CouponPerson,
} from "./coupons";
