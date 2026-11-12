/**
 * Local development only: creates one owner and one staff account for trying the admin app.
 * Run: pnpm --filter @acharkuthi/admin exec tsx --env-file=.env scripts/dev-users.ts
 * Never run against a shared or production database.
 */
import { auth } from "@repo/auth";
import { db, eq, schema } from "@repo/db";

const DEV_PASSWORD = "dev-admin-1234";
const USERS = [
  { email: "owner@acharkuthi.test", name: "সাবরিনা চৌধুরী", role: "owner" },
  { email: "staff@acharkuthi.test", name: "রুবেল মিয়া", role: "staff" },
  // A shop customer: signing in to the admin shows "no access".
  { email: "customer@acharkuthi.test", name: "Test Customer", role: "user" },
] as const;

const url = process.env.DATABASE_URL ?? "";
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url))
  throw new Error("dev-users only runs on a local database");

for (const u of USERS) {
  const existing = await db.query.user.findFirst({ where: eq(schema.user.email, u.email) });
  if (!existing)
    await auth.api.signUpEmail({ body: { email: u.email, password: DEV_PASSWORD, name: u.name } });
  await db
    .update(schema.user)
    .set({ role: u.role, emailVerified: true })
    .where(eq(schema.user.email, u.email));
  console.log(`${u.role}: ${u.email}`);
}
process.exit(0);
