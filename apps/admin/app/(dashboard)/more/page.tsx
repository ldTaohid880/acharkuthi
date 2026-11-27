import { ChevronRight } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { btn } from "@/components/btn";
import { LangSwitch } from "@/components/shell/lang-switch";
import { NAV_ICONS } from "@/components/shell/nav-icon";
import { hrefOf, type NavKey } from "@/components/shell/nav-model";
import { Page, PhoneHeader } from "@/components/shell/page";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { Avatar } from "@/components/shell/user-menu";
import type { Dict } from "@/lib/i18n/dict";
import { getDict } from "@/lib/i18n/server";
import { initialsOf } from "@/lib/initials";
import { getNavCounts } from "@/lib/nav-counts";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "More" };

interface Entry {
  key: NavKey;
  label?: string;
}

/** Phone "আরও" page (More-Phone.dc.html): everything not in the bottom nav. */
export default async function MorePage() {
  const { session, role } = await requireAdmin();
  const [{ lang, t }, counts] = await Promise.all([getDict(), getNavCounts(role)]);
  const owner = role === "owner";
  const g = t.more.groups;

  const groups: { label: string; items: Entry[] }[] = owner
    ? [
        { label: g.money, items: [{ key: "reports", label: t.more.reports }] },
        {
          label: g.ordersProducts,
          items: [{ key: "coupons" }, { key: "categories" }, { key: "restock" }],
        },
        {
          label: g.customers,
          items: [{ key: "customers" }, { key: "reviews" }, { key: "messages" }],
        },
        {
          label: g.content,
          items: [
            { key: "recipes" },
            { key: "home" },
            { key: "legal" },
            { key: "faq" },
            { key: "story" },
            { key: "share" },
          ],
        },
        { label: g.settings, items: [{ key: "staff" }, { key: "settings" }] },
      ]
    : // Staff: account, language, newsletter, sign out (Main.dc.html phone navigation card).
      [
        { label: g.customers, items: [{ key: "subscribers" }] },
        { label: g.content, items: [{ key: "share" }] },
      ];

  return (
    <>
      <PhoneHeader title={t.more.title} sub={t.more.sub} />
      <Page>
        <Link
          href="/account"
          className="border-border flex items-center gap-3 rounded-xl border bg-white px-4 py-3.5 shadow-xs"
        >
          <Avatar
            initials={initialsOf(session.user.name)}
            image={session.user.image ?? null}
            owner={owner}
            size="lg"
          />
          <span className="flex min-w-0 flex-auto flex-col">
            <span className="font-medium">{session.user.name}</span>
            <span className="text-muted-foreground text-xs leading-4">
              {owner ? t.roles.ownerShort : t.roles.staffShort} · {t.more.accountSub}
            </span>
          </span>
          <ChevronRight className="text-muted-foreground size-4" aria-hidden />
        </Link>

        <div className="border-border flex min-h-14 items-center justify-between rounded-xl border bg-white px-4 py-2.5 shadow-xs">
          <span className="font-medium">{t.more.language}</span>
          <LangSwitch lang={lang} size="more" />
        </div>

        {groups.map((grp) => (
          <div key={grp.label}>
            <div className="text-muted-foreground px-1 pt-1 pb-1.5 text-xs leading-4 font-medium">
              {grp.label}
            </div>
            <div className="border-border overflow-hidden rounded-xl border bg-white">
              {grp.items.map((it) => (
                <Row key={it.key} entry={it} t={t} n={counts[it.key]} />
              ))}
            </div>
          </div>
        ))}

        <SignOutButton
          className={btn({
            variant: "outline",
            size: "lg",
            block: true,
            className: "text-danger-text",
          })}
        >
          {t.nav.signOut}
        </SignOutButton>
      </Page>
    </>
  );
}

function Row({ entry, t, n }: { entry: Entry; t: Dict; n: number | undefined }) {
  const Icon = NAV_ICONS[entry.key];
  return (
    <Link
      href={hrefOf(entry.key) as Route}
      className="border-border flex min-h-[52px] items-center gap-3 border-b px-4 py-3 last:border-b-0"
    >
      <Icon className="text-muted-foreground size-5" aria-hidden />
      <span className="min-w-0 flex-auto">{entry.label ?? t.nav.items[entry.key]}</span>
      {n ? (
        <span className="bg-muted text-foreground tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold">
          {n}
        </span>
      ) : null}
      <ChevronRight className="text-muted-foreground size-4" aria-hidden />
    </Link>
  );
}
