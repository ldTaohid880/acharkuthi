#!/usr/bin/env node
/**
 * Builds the Hostinger deploy bundles: .deploy/<app>.tar.gz for each app.
 *
 *   node scripts/deploy/prepare.mjs [storefront|admin|all] [--skip-checks] [--in-place]
 *
 * By default the working tree (tracked files plus new files that aren't git-ignored, so .env
 * files are never included) is copied to .deploy/src and installed there with a hoisted
 * node_modules (nodeLinker: hoisted), which Next.js standalone output needs to produce plain
 * folders instead of pnpm symlinks. --in-place builds the current checkout instead; CI uses it after setting
 * nodeLinker: hoisted itself.
 *
 * Each bundle is a tiny npm project that Hostinger "builds" without installing anything:
 *   package.json   build = node app/migrate.cjs (storefront) or a no-op, start = node start.cjs
 *   start.cjs      starts app/<app dir>/server.js
 *   app/           .next/standalone with .next/static and public copied in
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APPS, pickApps } from "./config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const apps = pickApps(args);
const inPlace = args.includes("--in-place");
const skipChecks = args.includes("--skip-checks");
const deployDir = path.join(root, ".deploy");

const run = (cmd, cmdArgs, cwd, env = {}) => {
  console.log(`\n$ ${cmd} ${cmdArgs.join(" ")}`);
  execFileSync(cmd, cmdArgs, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...env },
  });
};

/** Deletes everything under dir except node_modules folders (kept so reinstalls are quick). */
function wipeKeepingNodeModules(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.name === ".next") {
      fs.rmSync(p, { recursive: true, force: true });
      continue;
    }
    if (entry.name === "node_modules") continue;
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      wipeKeepingNodeModules(p);
      if (fs.readdirSync(p).length === 0) fs.rmdirSync(p);
    } else fs.rmSync(p, { force: true });
  }
}

/** Copies the working tree without node_modules, build output or ignored files. */
function copySource(dest) {
  wipeKeepingNodeModules(dest);
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  )
    .split("\0")
    .filter(Boolean);
  let n = 0;
  for (const f of files) {
    const from = path.join(root, f);
    if (!fs.existsSync(from)) continue; // deleted but not yet staged
    const to = path.join(dest, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    n++;
  }
  // Hoisted node_modules: Next.js standalone output then holds plain folders, not pnpm links.
  const ws = path.join(dest, "pnpm-workspace.yaml");
  fs.appendFileSync(ws, "\nnodeLinker: hoisted\n");
  console.log(`Copied ${n} files to ${path.relative(root, dest)}`);
}

const copyDir = (from, to) =>
  fs.cpSync(from, to, {
    recursive: true,
    dereference: true,
    filter: (src) => !src.split(path.sep).includes(".turbo"),
  });

function packageApp(src, name) {
  const app = APPS[name];
  const appSrc = path.join(src, app.dir);
  const standalone = path.join(appSrc, ".next", "standalone");
  if (!fs.existsSync(path.join(standalone, app.dir, "server.js")))
    throw new Error(
      `${name}: no standalone build at ${standalone} (was NEXT_OUTPUT=standalone set?)`,
    );

  const out = path.join(deployDir, "out", name);
  const bundleApp = path.join(out, "app");
  fs.rmSync(out, { recursive: true, force: true });
  copyDir(standalone, bundleApp);
  // Standalone output leaves these two out on purpose; server.js serves them when present.
  copyDir(path.join(appSrc, ".next", "static"), path.join(bundleApp, app.dir, ".next", "static"));
  if (fs.existsSync(path.join(appSrc, "public")))
    fs.cpSync(path.join(appSrc, "public"), path.join(bundleApp, app.dir, "public"), {
      recursive: true,
      dereference: true,
      filter: (p) => !p.includes(`${path.sep}uploads`),
    });
  // Never ship a local .env that standalone copied from the app folder.
  for (const f of fs.readdirSync(path.join(bundleApp, app.dir)))
    if (f.startsWith(".env")) fs.rmSync(path.join(bundleApp, app.dir, f));

  const runtime = path.join(root, "scripts", "deploy", "runtime");
  fs.writeFileSync(
    path.join(out, "start.cjs"),
    fs.readFileSync(path.join(runtime, "start.cjs"), "utf8").replace("__APP_DIR__", app.dir),
  );
  let build = `node -e "console.log('prebuilt ${name} bundle')"`;
  if (app.migrate) {
    copyDir(path.join(src, "packages", "db", "drizzle"), path.join(bundleApp, "migrations"));
    fs.copyFileSync(path.join(runtime, "migrate.cjs"), path.join(bundleApp, "migrate.cjs"));
    // Standalone only traces the drizzle-orm files the app imports; the migrator needs more.
    copyDir(
      path.join(src, "node_modules", "drizzle-orm"),
      path.join(bundleApp, "node_modules", "drizzle-orm"),
    );
    build = "node app/migrate.cjs";
  }
  const commit = (() => {
    try {
      return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim();
    } catch {
      return "unknown";
    }
  })();
  fs.writeFileSync(
    path.join(out, "package.json"),
    JSON.stringify(
      {
        name: `acharkuthi-${name}-bundle`,
        version: "1.0.0",
        private: true,
        description: `Prebuilt ${name} (commit ${commit}, ${new Date().toISOString()})`,
        engines: { node: ">=22" },
        scripts: { build, start: "node start.cjs" },
      },
      null,
      2,
    ) + "\n",
  );

  const archive = path.join(deployDir, `${name}.tar.gz`);
  fs.rmSync(archive, { force: true });
  // Relative paths: Windows tar reads "C:" in an absolute path as a remote host.
  execFileSync("tar", ["-czf", `${name}.tar.gz`, "-C", path.join("out", name), "."], {
    cwd: deployDir,
    stdio: "inherit",
  });
  const mb = fs.statSync(archive).size / 1024 / 1024;
  console.log(`\n${name}: .deploy/${name}.tar.gz (${mb.toFixed(1)} MB)`);
  if (mb > 50) throw new Error(`${name}: bundle is over Hostinger's 50 MB archive limit`);
}

const src = inPlace ? root : path.join(deployDir, "src");
fs.mkdirSync(deployDir, { recursive: true });
if (!inPlace) {
  copySource(src);
  run("pnpm", ["install", "--frozen-lockfile"], src, { CI: "1" });
}
const filters = apps.flatMap((a) => ["--filter", APPS[a].pkg]);
// Placeholders so modules that read env at import time load during the build. Nothing here is
// inlined into the bundle (no NEXT_PUBLIC_ vars); the real values come from Hostinger at runtime.
// They also override any local .env file during the build.
const buildEnv = {
  SKIP_ENV_VALIDATION: "1",
  NEXT_OUTPUT: "standalone",
  NEXT_TELEMETRY_DISABLED: "1",
  DATABASE_URL: "mysql://build:build@127.0.0.1:3306/build",
  BETTER_AUTH_SECRET: "build-time-placeholder-build-time-placeholder",
  BETTER_AUTH_URL: "http://localhost:3000",
  STOREFRONT_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "build",
  GOOGLE_CLIENT_SECRET: "build",
};
if (!skipChecks)
  run("pnpm", ["turbo", "run", "lint", "check-types", "test", ...filters], src, buildEnv);
run("pnpm", ["turbo", "run", "build", ...filters], src, buildEnv);
for (const a of apps) packageApp(src, a);
console.log("\nReady. Upload with: pnpm deploy:push " + apps.join(" "));
