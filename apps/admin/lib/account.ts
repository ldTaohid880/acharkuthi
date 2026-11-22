import "server-only";

import { and, db, desc, eq, gt, schema } from "@repo/db";
import { deviceName } from "@/lib/device";
import { uploadsEnabled } from "@/lib/r2";

export interface AccountDevice {
  id: string;
  browser: string;
  os: string;
  current: boolean;
  lastActive: Date;
}

/** Everything "আমার অ্যাকাউন্ট" shows: the user row, sign-in methods and signed-in devices. */
export interface AccountData {
  name: string;
  phone: string;
  email: string;
  image: string | null;
  /** Email + password sign-in exists (a credential account with a password). */
  hasPassword: boolean;
  /** Linked Google account, with the address from its ID token when we have it. */
  google: { email: string | null } | null;
  devices: AccountDevice[];
  uploads: boolean;
}

/** The email inside a Google ID token (display only; the token was verified at sign-in). */
function idTokenEmail(idToken: string | null): string | null {
  const part = idToken?.split(".")[1];
  if (!part) return null;
  try {
    const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as {
      email?: unknown;
    };
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}

export async function getAccount(userId: string, currentSessionId: string): Promise<AccountData> {
  const [user, accounts, sessions] = await Promise.all([
    db.query.user.findFirst({ where: eq(schema.user.id, userId) }),
    db
      .select({
        providerId: schema.account.providerId,
        password: schema.account.password,
        idToken: schema.account.idToken,
      })
      .from(schema.account)
      .where(eq(schema.account.userId, userId)),
    db
      .select({
        id: schema.session.id,
        userAgent: schema.session.userAgent,
        updatedAt: schema.session.updatedAt,
      })
      .from(schema.session)
      .where(and(eq(schema.session.userId, userId), gt(schema.session.expiresAt, new Date())))
      .orderBy(desc(schema.session.updatedAt)),
  ]);
  if (!user) throw new Error("Signed-in user not found");
  const google = accounts.find((a) => a.providerId === "google");

  const devices = sessions.map((s) => ({
    id: s.id,
    ...deviceName(s.userAgent),
    current: s.id === currentSessionId,
    lastActive: s.updatedAt,
  }));
  // This device first, then the most recent.
  devices.sort((a, b) => Number(b.current) - Number(a.current));

  return {
    name: user.name,
    phone: user.phone ?? "",
    email: user.email,
    image: user.image ?? null,
    hasPassword: accounts.some((a) => a.providerId === "credential" && !!a.password),
    google: google ? { email: idTokenEmail(google.idToken) } : null,
    devices,
    uploads: uploadsEnabled(),
  };
}
