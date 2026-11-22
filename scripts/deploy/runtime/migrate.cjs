/**
 * Runs on the Hostinger server as the storefront's build step ("npm run build"), before the new
 * version starts. It applies packages/db/drizzle (copied next to this file as ./migrations) to
 * DATABASE_URL, which on Hostinger points at 127.0.0.1. A failure fails the build, so the running
 * version stays live. MIGRATE_ARCHIVE_EXISTING=<db name> hands a database over from another app
 * once, by renaming its tables to old_<name>.
 *
 * Same bookkeeping as `drizzle-kit migrate` (__drizzle_migrations), so either can be used.
 */
const path = require("node:path");
const mysql = require("mysql2/promise");
const { drizzle } = require("drizzle-orm/mysql2");
const { readMigrationFiles } = require("drizzle-orm/migrator");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set in the Hostinger environment variables");

  const conn = await mysql.createConnection({ uri: url, multipleStatements: true });
  try {
    const [tables] = await conn.query(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()",
    );
    let names = tables.map((t) => t.name);
    const tracked = names.includes("__drizzle_migrations");
    const [[{ db, version }]] = await conn.query("SELECT DATABASE() AS db, VERSION() AS version");
    console.log(`Database ${db} on MySQL ${version}, ${names.length} tables: ${names.join(", ")}`);
    // A first run that failed half-way (MySQL can't roll back CREATE TABLE) leaves some of our
    // tables and an empty __drizzle_migrations. Nothing was recorded, so no data was ever written
    // through the app: drop those leftovers and start again.
    if (tracked) {
      const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM __drizzle_migrations");
      const ours = new Set(
        readMigrationFiles({ migrationsFolder: path.join(__dirname, "migrations") }).flatMap((m) =>
          m.sql.flatMap((s) => [...s.matchAll(/CREATE TABLE `([^`]+)`/g)].map((x) => x[1])),
        ),
      );
      const leftovers = names.filter((t) => t !== "__drizzle_migrations" && !t.startsWith("old_"));
      if (Number(n) === 0 && leftovers.every((t) => ours.has(t))) {
        await conn.query("SET FOREIGN_KEY_CHECKS = 0");
        for (const t of leftovers) {
          await conn.query("DROP TABLE ??", [t]);
          console.log(`Dropped ${t} (left by a failed first migration)`);
        }
        await conn.query("SET FOREIGN_KEY_CHECKS = 1");
        names = names.filter((t) => !leftovers.includes(t));
      }
    }
    const foreign = names.filter((n) => !n.startsWith("old_") && n !== "__drizzle_migrations");
    if (!tracked && foreign.length > 0 && process.env.MIGRATE_ARCHIVE_EXISTING === db) {
      // One-time hand-over from another app (owner, 2026-11-22): keep its data as old_<table>
      // instead of dropping it. Only ever runs on a database these migrations never touched.
      await conn.query("SET FOREIGN_KEY_CHECKS = 0");
      for (const n of foreign) {
        const to = `old_${n}`.slice(0, 64);
        await conn.query("RENAME TABLE ?? TO ??", [n, to]);
        console.log(`Archived ${n} → ${to}`);
      }
      await conn.query("SET FOREIGN_KEY_CHECKS = 1");
      names = names.map((n) => (foreign.includes(n) ? `old_${n}`.slice(0, 64) : n));
    } else if (!tracked && foreign.length > 0 && process.env.MIGRATE_ALLOW_EXISTING !== "1") {
      throw new Error(
        `The database already has ${foreign.length} tables but no __drizzle_migrations table ` +
          `(${foreign.slice(0, 8).join(", ")}${foreign.length > 8 ? ", …" : ""}). It belongs to ` +
          "something else. To keep its data as old_<table> and continue, set " +
          `MIGRATE_ARCHIVE_EXISTING=${db} for one deploy. ` +
          "Set MIGRATE_ALLOW_EXISTING=1 only if these tables were created by these migrations.",
      );
    }
    let before = 0;
    if (tracked) {
      const [rows] = await conn.query("SELECT COUNT(*) AS n FROM __drizzle_migrations");
      before = Number(rows[0].n);
    }
    // Hostinger runs MariaDB, which rejects drizzle-kit's `serial AUTO_INCREMENT` (MySQL accepts
    // the repeated keyword; serial already means AUTO_INCREMENT). Fix the statements as they run;
    // the files and their recorded hashes stay unchanged. Same steps as drizzle's migrate().
    const migrationsFolder = path.join(__dirname, "migrations");
    const migrations = readMigrationFiles({ migrationsFolder }).map((m) => ({
      ...m,
      sql: m.sql.map((s) => s.replace(/\bserial AUTO_INCREMENT\b/gi, "serial")),
    }));
    const orm = drizzle(conn);
    await orm.dialect.migrate(migrations, orm.session, { migrationsFolder });
    const [rows] = await conn.query("SELECT COUNT(*) AS n FROM __drizzle_migrations");
    const after = Number(rows[0].n);
    console.log(`Migrations: ${after - before} applied, ${after} total.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err && err.message ? err.message : err);
  // Drizzle wraps the driver error; the database's own message is in the cause.
  for (let c = err && err.cause; c; c = c.cause)
    console.error("Cause:", c.code ?? "", c.sqlMessage ?? c.message ?? c);
  process.exit(1);
});
