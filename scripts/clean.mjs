#!/usr/bin/env node
/**
 * Removes build and test output: .next, .turbo, test results, Playwright reports and deploy
 * bundles. Source files, .env files, node_modules and uploads are left alone.
 *   pnpm clean
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roots = [
  root,
  ...["apps", "packages"].flatMap((d) =>
    fs.readdirSync(path.join(root, d)).map((n) => path.join(root, d, n)),
  ),
];
const targets = [
  ".next",
  ".turbo",
  "test-results",
  "playwright-report",
  "coverage",
  "tsconfig.tsbuildinfo",
];
const extra = [".deploy", "e2e-report"].map((p) => path.join(root, p));

for (const p of [...roots.flatMap((r) => targets.map((t) => path.join(r, t))), ...extra]) {
  if (!fs.existsSync(p)) continue;
  fs.rmSync(p, { recursive: true, force: true });
  console.log("removed", path.relative(root, p));
}
