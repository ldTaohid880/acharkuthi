import "server-only";

import { adminRoleOf, type AdminRole, type Session } from "@repo/auth";
import { forbidden, redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export interface AdminSession {
  session: Session;
  role: AdminRole;
}

async function getAdminSession(): Promise<AdminSession | null> {
  const session = await getSession();
  const role = adminRoleOf(session);
  return session && role ? { session, role } : null;
}

/**
 * Call at the top of every admin page, layout and server action.
 * Signed out, customers and deactivated staff go to /login.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getAdminSession();
  if (!admin) redirect("/login");
  return admin;
}

/**
 * Like requireAdmin(), but also checks the role. Staff opening an owner-only page get the
 * "no access" page (app/forbidden.tsx) instead of a redirect.
 */
export async function requireRole(role: AdminRole): Promise<AdminSession> {
  const admin = await requireAdmin();
  if (role === "owner" && admin.role !== "owner") forbidden();
  return admin;
}
