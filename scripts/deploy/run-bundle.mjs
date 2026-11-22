#!/usr/bin/env node
/**
 * Runs an unpacked deploy bundle (.deploy/out/<app>) locally, the way Hostinger starts it, to
 * check it before pushing:  node --env-file=apps/storefront/.env scripts/deploy/run-bundle.mjs storefront 3007
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [app = "storefront", port = "3007"] = process.argv.slice(2);
const dir = path.join(root, ".deploy", "out", app);
const child = spawn(process.execPath, ["start.cjs"], {
  cwd: dir,
  stdio: "inherit",
  env: { ...process.env, PORT: port },
});
child.on("exit", (code) => process.exit(code ?? 0));
