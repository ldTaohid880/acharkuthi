/**
 * Runs once when the admin server starts. On a fresh production database there is no one who
 * can sign in, so when BOOTSTRAP_OWNER_EMAIL and BOOTSTRAP_OWNER_PASSWORD are set and no owner
 * exists yet, that account is created (or an existing account with that email is promoted) as
 * the owner. Remove the two variables after the first sign-in.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { env } = await import("./env");
  const email = env.BOOTSTRAP_OWNER_EMAIL?.toLowerCase();
  const password = env.BOOTSTRAP_OWNER_PASSWORD;
  if (!email || !password) return;
  try {
    const { db, eq, schema } = await import("@repo/db");
    const owner = await db.query.user.findFirst({
      where: eq(schema.user.role, "owner"),
      columns: { id: true },
    });
    if (owner) return;
    const existing = await db.query.user.findFirst({
      where: eq(schema.user.email, email),
      columns: { id: true },
    });
    if (!existing) {
      const { auth } = await import("@repo/auth");
      await auth.api.signUpEmail({
        body: { email, password, name: env.BOOTSTRAP_OWNER_NAME ?? "Owner" },
      });
    }
    await db
      .update(schema.user)
      .set({ role: "owner", emailVerified: true })
      .where(eq(schema.user.email, email));
    console.log(`bootstrap: ${email} is now the owner`);
  } catch (err) {
    console.error("bootstrap owner failed", err);
  }
}
