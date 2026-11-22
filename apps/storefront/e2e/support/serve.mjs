// Starts the built storefront for E2E (port 3000) and copies its output into e2e/.auth/storefront.log,
// so tests can read server-side lines such as "[dev] password reset link for …".
import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, "../..");
const dir = path.resolve(here, "../.auth");
mkdirSync(dir, { recursive: true });
const log = createWriteStream(path.join(dir, "storefront.log"), { flags: "a" });

const child = spawn("pnpm", ["exec", "next", "start", "--port", "3000"], {
  cwd: app,
  shell: true,
  stdio: ["ignore", "pipe", "pipe"],
});
for (const s of [child.stdout, child.stderr]) {
  s.on("data", (b) => {
    log.write(b);
    process.stdout.write(b);
  });
}
const stop = () => child.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
