import { cookies } from "next/headers";
import { AppShell, SIDEBAR_COOKIE } from "@/components/shell/app-shell";
import { getDict } from "@/lib/i18n/server";
import { initialsOf } from "@/lib/initials";
import { getNavCounts } from "@/lib/nav-counts";
import { unreadCount } from "@/lib/notifications";
import { requireAdmin } from "@/lib/require-admin";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, role } = await requireAdmin();
  const [{ lang, t }, counts, unread, jar] = await Promise.all([
    getDict(),
    getNavCounts(role),
    unreadCount(session.user.id, role),
    cookies(),
  ]);
  const { name, email } = session.user;

  return (
    <AppShell
      role={role}
      user={{ name, email, initials: initialsOf(name) }}
      lang={lang}
      t={t}
      counts={counts}
      unread={unread}
      initialCollapsed={jar.get(SIDEBAR_COOKIE)?.value === "collapsed"}
    >
      {children}
    </AppShell>
  );
}
