import { db, schema } from "@repo/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: {
    google: {
      // Presence is enforced by each app's env.js at startup.
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },
  account: {
    // A Google sign-in with the same verified email joins the existing account.
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  user: {
    additionalFields: {
      // Admin UI language (bn | en). Set only by the admin app, never from sign-up input.
      adminLang: { type: "string", defaultValue: "bn", input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  plugins: [
    // Owner manages users (staff accounts); staff and customers get no user-management rights.
    admin({
      defaultRole: "user",
      adminRoles: ["owner"],
      roles: { owner: adminAc, staff: userAc, user: userAc },
    }),
    nextCookies(), // must be last
  ],
});

export type Session = typeof auth.$Infer.Session;

/** Roles allowed into the admin app. "owner" sees everything; "staff" sees orders, stock and messages. */
export const ADMIN_ROLES = ["owner", "staff"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** The admin-app role of this session, or null for customers, banned users and signed-out visitors. */
export function adminRoleOf(session: Session | null): AdminRole | null {
  if (!session || session.user.banned) return null;
  const role = session.user.role;
  return role === "owner" || role === "staff" ? role : null;
}

/** True when the session may use the admin app (owner or staff). Use in admin layouts AND server actions. */
export function isAdmin(session: Session | null): session is Session {
  return adminRoleOf(session) !== null;
}
