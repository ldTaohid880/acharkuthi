import type { Metadata } from "next";
import { getAccount } from "@/lib/account";
import { getDict } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/require-admin";
import { AccountView } from "./account-view";

export const metadata: Metadata = { title: "My account" };

/**
 * আমার অ্যাকাউন্ট: Account-Desktop (two columns, a save per card), -Tablet (one column, the
 * profile saved from the bottom bar) and -Phone (profile, language, password, sign out).
 * Owner and staff; every action works on the signed-in user only.
 */
export default async function AccountPage() {
  const { session, role } = await requireAdmin();
  const [{ lang, t }, data] = await Promise.all([
    getDict(),
    getAccount(session.user.id, session.session.id),
  ]);
  return (
    <AccountView
      data={data}
      role={role}
      lang={lang}
      t={t.account}
      roles={t.roles}
      signOut={t.nav.signOut}
    />
  );
}
