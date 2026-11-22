import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

/**
 * E2E settings. Values are read into a local object (never into process.env, and never printed).
 * - apps/storefront/.env: DATABASE_URL (local MySQL only).
 * - e2e/.auth/ (untracked): generated passwords, storage states and the server log.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
export const E2E_DIR = path.resolve(here, "..");
export const APP_DIR = path.resolve(E2E_DIR, "..");
export const AUTH_DIR = path.join(E2E_DIR, ".auth");
export const SERVER_LOG = path.join(AUTH_DIR, "storefront.log");
export const BASE_URL = "http://localhost:3000";

const readEnv = (file: string): Record<string, string> =>
  existsSync(file) ? parse(readFileSync(file)) : {};

export const appEnv = readEnv(path.join(APP_DIR, ".env"));

/** Refuses anything but the local database. */
export function localDatabaseUrl(): string {
  const url = appEnv.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing in apps/storefront/.env");
  const host = new URL(url).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(host))
    throw new Error("E2E tests only run against a local database");
  return url;
}

export interface Creds {
  run: string;
  password: string;
  /** One signed-in shopper per project (email). */
  shoppers: Record<string, string>;
}

const CREDS = path.join(AUTH_DIR, "creds.json");
export function saveCreds(c: Creds) {
  mkdirSync(AUTH_DIR, { recursive: true });
  writeFileSync(CREDS, JSON.stringify(c, null, 2));
}
export function loadCreds(): Creds {
  return JSON.parse(readFileSync(CREDS, "utf8")) as Creds;
}
export const stateFile = (project: string) => path.join(AUTH_DIR, `shopper-${project}.json`);
