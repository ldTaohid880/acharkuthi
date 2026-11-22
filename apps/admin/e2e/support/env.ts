import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";
import mysql from "mysql2/promise";

/**
 * Admin E2E settings, read into local objects (never process.env, never printed):
 * - apps/admin/.env: DATABASE_URL (local MySQL only).
 * - apps/admin/.env.test (untracked): ADMIN_OWNER_EMAIL / ADMIN_OWNER_PASSWORD.
 * - e2e/.auth/ (untracked): generated passwords and storage states.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
export const APP_DIR = path.resolve(here, "../..");
export const AUTH_DIR = path.resolve(here, "../.auth");
export const ADMIN_URL = "http://localhost:3001";
export const STOREFRONT_URL = "http://localhost:3000";

const readEnv = (f: string): Record<string, string> => (existsSync(f) ? parse(readFileSync(f)) : {});
const appEnv = readEnv(path.join(APP_DIR, ".env"));
export const testEnv = readEnv(path.join(APP_DIR, ".env.test"));

let pool: mysql.Pool | undefined;
export function db(): mysql.Pool {
  const url = appEnv.DATABASE_URL ?? "";
  if (!["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname))
    throw new Error("E2E tests only run against a local database");
  pool ??= mysql.createPool({ uri: url, connectionLimit: 4 });
  return pool;
}
type Row = Record<string, unknown>;
export async function q<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await db().query(sql, params);
  return rows as T[];
}
export const one = async <T extends Row = Row>(sql: string, params: unknown[] = []) =>
  (await q<T>(sql, params))[0];
export async function exec(sql: string, params: unknown[] = []) {
  const [res] = await db().query(sql, params);
  return res as mysql.ResultSetHeader;
}
export async function closeDb() {
  await pool?.end();
  pool = undefined;
}

export type Who = "owner" | "staff" | "customer";
export interface Creds {
  run: string;
  password: string;
  emails: Record<Who, string>;
  /** True when the owner came from .env.test (not created by the suite). */
  realOwner: boolean;
}
const CREDS = path.join(AUTH_DIR, "creds.json");
export function saveCreds(c: Creds) {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(CREDS, JSON.stringify(c, null, 2));
}
export const loadCreds = (): Creds => JSON.parse(readFileSync(CREDS, "utf8")) as Creds;
/** Password for a user: the .env.test owner's, or the generated one. */
export const passwordOf = (who: Who) =>
  who === "owner" && loadCreds().realOwner ? (testEnv.ADMIN_OWNER_PASSWORD ?? "") : loadCreds().password;
export const stateFile = (who: Who) => path.join(AUTH_DIR, `${who}.json`);
