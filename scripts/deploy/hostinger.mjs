#!/usr/bin/env node
/**
 * Talks to the Hostinger API (https://developers.hostinger.com) for the two Node.js websites.
 * Needs HOSTINGER_API_TOKEN (hPanel → Account → API), from the environment or .env.deploy.
 *
 *   node scripts/deploy/hostinger.mjs push [storefront|admin|all]   upload .deploy/<app>.tar.gz and build
 *   node scripts/deploy/hostinger.mjs env <app> <file> [--yes]      replace the app's env vars from a dotenv file
 *   node scripts/deploy/hostinger.mjs status [app]                  latest build and stored env keys
 *
 * push uploads the bundle from prepare.mjs, starts a Hostinger build of it (which, for the
 * storefront, runs the database migrations), waits for it and checks that the site answers.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APPS, HOSTINGER_USERNAME, pickApps } from "./config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const envDeploy = path.join(root, ".env.deploy");
if (fs.existsSync(envDeploy)) process.loadEnvFile(envDeploy);

const API = process.env.HOSTINGER_API_URL ?? "https://developers.hostinger.com";
const TOKEN = process.env.HOSTINGER_API_TOKEN;
const user = HOSTINGER_USERNAME;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, route, body) {
  if (!TOKEN) throw new Error("HOSTINGER_API_TOKEN is not set (environment or .env.deploy)");
  const res = await fetch(`${API}${route}`, {
    method,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      accept: "application/json",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok)
    throw new Error(
      `${method} ${route} → ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`,
    );
  return data;
}

const site = (domain) => `/api/hosting/v1/accounts/${user}/websites/${domain}`;

/** TUS 1.0 upload into the website's public_html, in 10 MB chunks. */
async function upload(domain, file, dest) {
  const { url, auth_key, rest_auth_key } = await api("POST", "/api/hosting/v1/files/upload-urls", {
    username: user,
    domain,
  });
  const target = `${url.replace(/\/$/, "")}/${encodeURIComponent(dest)}?override=true`;
  const bytes = fs.readFileSync(file);
  const auth = { "X-Auth": auth_key, "X-Auth-Rest": rest_auth_key, "Tus-Resumable": "1.0.0" };
  const created = await fetch(target, {
    method: "POST",
    headers: { ...auth, "Upload-Length": String(bytes.length), "Upload-Offset": "0" },
  });
  if (created.status !== 201)
    throw new Error(`Upload create → ${created.status}: ${await created.text()}`);
  const CHUNK = 10 * 1024 * 1024;
  for (let offset = 0; offset < bytes.length;) {
    const part = bytes.subarray(offset, offset + CHUNK);
    let res;
    for (let attempt = 1; ; attempt++) {
      res = await fetch(target, {
        method: "PATCH",
        headers: {
          ...auth,
          "Content-Type": "application/offset+octet-stream",
          "Upload-Offset": String(offset),
        },
        body: part,
      });
      if (res.status === 204 || attempt >= 4) break;
      await sleep(2000 * attempt);
    }
    if (res.status !== 204)
      throw new Error(`Upload chunk at ${offset} → ${res.status}: ${await res.text()}`);
    offset = Number(res.headers.get("upload-offset") ?? offset + part.length);
    process.stdout.write(`  uploaded ${Math.round((offset / bytes.length) * 100)}%\r`);
  }
  console.log(`  uploaded ${(bytes.length / 1024 / 1024).toFixed(1)} MB as ${dest}`);
}

async function waitForBuild(domain, uuid) {
  let lines = 0;
  for (let wait = 5000; ; wait = Math.min(wait * 1.5, 20000)) {
    await sleep(wait);
    const build = await api("GET", `${site(domain)}/nodejs/builds/${uuid}`);
    const log = await api(
      "GET",
      `${site(domain)}/nodejs/builds/${uuid}/logs?from_line=${lines}`,
    ).catch(() => null);
    if (log?.logs) process.stdout.write(String(log.logs).replace(/\u001b\[[0-9;]*m/g, ""));
    if (typeof log?.lines === "number") lines = log.lines;
    if (build.state === "completed") return;
    if (build.state === "failed") {
      const why = await api("GET", `${site(domain)}/nodejs/builds/${uuid}/analysis`).catch(
        () => null,
      );
      if (why) console.error("\nFailure analysis:", JSON.stringify(why, null, 2));
      throw new Error(`Hostinger build ${uuid} for ${domain} failed`);
    }
  }
}

async function smoke(domain) {
  for (let i = 0; i < 12; i++) {
    try {
      const res = await fetch(`https://${domain}/`, { redirect: "manual", cache: "no-store" });
      // The admin answers / with a redirect to /login; both are a running app.
      if (res.status < 400 && res.headers.get("x-powered-by") !== "PHP") {
        console.log(`  https://${domain}/ → ${res.status}`);
        return;
      }
      console.log(`  https://${domain}/ → ${res.status}, retrying`);
    } catch (e) {
      console.log(`  https://${domain}/ unreachable (${e.message}), retrying`);
    }
    await sleep(10000);
  }
  throw new Error(`${domain} did not come up after the build`);
}

async function push(name) {
  const app = APPS[name];
  const file = path.join(root, ".deploy", `${name}.tar.gz`);
  if (!fs.existsSync(file))
    throw new Error(`No bundle at ${file}: run pnpm deploy:prepare ${name} first`);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);
  const dest = `${name}_${stamp}.tar.gz`;
  console.log(`\n▶ ${name} → ${app.domain}`);
  await upload(app.domain, file, dest);
  const message =
    process.env.DEPLOY_MESSAGE ??
    (process.env.GITHUB_SHA
      ? `CI ${process.env.GITHUB_SHA.slice(0, 7)}`
      : `Manual deploy ${stamp}`);
  const build = await api("POST", `${site(app.domain)}/nodejs/builds`, {
    node_version: 22,
    app_type: "express",
    root_directory: ".",
    output_directory: ".",
    build_script: "build",
    entry_file: "start.cjs",
    package_manager: "npm",
    source_type: "archive",
    source_options: { archive_path: dest, message },
  });
  console.log(`  build ${build.uuid} started`);
  await waitForBuild(app.domain, build.uuid);
  console.log(`\n  build completed`);
  await smoke(app.domain);
}

function parseDotenv(file) {
  const out = [];
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) throw new Error(`Bad line in ${file}: ${line}`);
    let value = m[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    if (value !== "") out.push({ key: m[1], value });
  }
  return out;
}

async function setEnv(name, file, yes) {
  const app = APPS[name];
  if (!app) throw new Error(`Unknown app ${name}`);
  const vars = parseDotenv(file);
  const current = await api("GET", `${site(app.domain)}/nodejs/builds/settings/env`).catch(
    () => [],
  );
  const keys = new Set(vars.map((v) => v.key));
  const dropped = (current ?? []).map((v) => v.key).filter((k) => !keys.has(k));
  console.log(`${app.domain}: set ${[...keys].join(", ")}`);
  if (dropped.length) console.log(`  removes: ${dropped.join(", ")}`);
  if (!yes) {
    console.log("Dry run. Add --yes to replace the variables (the app restarts).");
    return;
  }
  await api("PUT", `${site(app.domain)}/nodejs/builds/settings/env`, { env_vars: vars });
  console.log("  saved; the app restarts with them");
}

async function status(names) {
  for (const name of names) {
    const { domain } = APPS[name];
    const builds = await api("GET", `${site(domain)}/nodejs/builds?per_page=1`);
    const last = (builds?.data ?? builds ?? [])[0];
    const env = await api("GET", `${site(domain)}/nodejs/builds/settings/env`).catch(() => []);
    console.log(`${name} (${domain})`);
    console.log(`  last build: ${last ? `${last.state} ${last.created_at} ${last.uuid}` : "none"}`);
    console.log(`  env keys:   ${(env ?? []).map((v) => v.key).join(", ") || "none"}`);
  }
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === "push") for (const a of pickApps(rest)) await push(a);
  else if (cmd === "env") await setEnv(rest[0], rest[1], rest.includes("--yes"));
  else if (cmd === "status") await status(pickApps(rest));
  else {
    console.log("Usage: hostinger.mjs push [app|all] | env <app> <file> [--yes] | status [app]");
    process.exit(cmd ? 1 : 0);
  }
} catch (e) {
  console.error(`\n✖ ${e.message}`);
  process.exit(1);
}
