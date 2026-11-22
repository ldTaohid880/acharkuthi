import { randomBytes } from "node:crypto";
import { request, test as setup } from "@playwright/test";
import { ADMIN_URL, closeDb, exec, saveCreds, stateFile, testEnv, type Who } from "./support/env";

/**
 * Admin E2E accounts (all …@example.test, removed by teardown):
 * - owner: from .env.test (ADMIN_OWNER_EMAIL / ADMIN_OWNER_PASSWORD) when filled in, else a
 *   temporary e2e owner;
 * - staff and a plain customer, always temporary.
 * Each is signed in once through the admin's own Better Auth (port 3001) and saved as a
 * storage state. The suite's admin UI language is English (adminLang = en) for e2e users.
 */
setup("create admin e2e accounts", async () => {
  setup.setTimeout(120_000);
  const run = Date.now().toString(36);
  const password = `E2e${randomBytes(9).toString("base64url")}7b`;
  const realOwner = !!(testEnv.ADMIN_OWNER_EMAIL && testEnv.ADMIN_OWNER_PASSWORD);
  const emails: Record<Who, string> = {
    owner: realOwner ? (testEnv.ADMIN_OWNER_EMAIL ?? "") : `e2e-admin-owner-${run}@example.test`,
    staff: `e2e-admin-staff-${run}@example.test`,
    customer: `e2e-admin-customer-${run}@example.test`,
  };
  const ctx = await request.newContext({ baseURL: ADMIN_URL });
  const post = async (url: string, data: object) => {
    for (let attempt = 0; ; attempt++) {
      const res = await ctx.post(url, { data, headers: { origin: ADMIN_URL } });
      if (res.ok()) return;
      if (res.status() === 429 && attempt < 6) {
        await new Promise((r) => setTimeout(r, 11_000));
        continue;
      }
      throw new Error(`${url} failed: ${res.status()}`);
    }
  };
  for (const who of ["owner", "staff", "customer"] as Who[]) {
    if (who === "owner" && realOwner) continue;
    await post("/api/auth/sign-up/email", { name: `E2E Admin ${who}`, email: emails[who], password });
    await exec("update user set role = ?, admin_lang = 'en' where email = ?", [
      who === "customer" ? "user" : who,
      emails[who],
    ]);
  }
  saveCreds({ run, password, emails, realOwner });
  // Fresh sessions after the role change.
  for (const who of ["owner", "staff", "customer"] as Who[]) {
    const c = await request.newContext({ baseURL: ADMIN_URL });
    const res = await c.post("/api/auth/sign-in/email", {
      data: {
        email: emails[who],
        password: who === "owner" && realOwner ? testEnv.ADMIN_OWNER_PASSWORD : password,
      },
      headers: { origin: ADMIN_URL },
    });
    if (!res.ok()) throw new Error(`sign-in for ${who} failed: ${res.status()}`);
    await c.storageState({ path: stateFile(who) });
    await c.dispose();
  }
  await ctx.dispose();
  await closeDb();
});
