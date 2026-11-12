"use client";

import type { AdminRole } from "@repo/auth";
import { signOut } from "@repo/auth/client";
import { cn } from "@repo/ui/lib/utils";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@repo/ui/components/sheet";
import { ChevronLeft, LogOut, Menu, PanelLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Dict } from "@/lib/i18n/dict";
import type { AdminLang } from "@repo/validators";
import { ToastProvider } from "../toast";
import { TopbarBell, TopbarSearch } from "./header-actions";
import { LangSwitch } from "./lang-switch";
import { NotificationsPanel } from "./notifications-panel";
import { SearchPalette } from "./search-palette";
import { ShellContext, type ShellState } from "./shell-context";
import { NAV_ICONS } from "./nav-icon";
import { activeKey, bottomNavFor, hrefOf, navFor, type NavCounts, type NavKey } from "./nav-model";
import { UserMenu } from "./user-menu";

export interface ShellUser {
  name: string;
  email: string;
  initials: string;
}

interface Props {
  role: AdminRole;
  user: ShellUser;
  lang: AdminLang;
  t: Dict;
  counts: NavCounts;
  unread: number;
  initialCollapsed: boolean;
  children: React.ReactNode;
}

export const SIDEBAR_COOKIE = "ak_sidebar";

/**
 * Fixed app shell (admin.css .shell): sidebar + top bar stay put, only the page scrolls.
 * ≥1024 full sidebar (or the 56px collapsed one), 768–1023 the 64px icon rail that opens the
 * sidebar as a sheet, <768 no sidebar: page header + bottom nav (BottomNav.dc.html).
 */
export function AppShell({
  role,
  user,
  lang,
  t,
  counts,
  unread,
  initialCollapsed,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const shell = useMemo<ShellState>(
    () => ({
      role,
      lang,
      t,
      unread,
      openSearch: () => setSearchOpen(true),
      openNotifications: () => setNotifOpen(true),
    }),
    [role, lang, t, unread],
  );

  // ⌘K / Ctrl+K opens search; "G" then "S" / "O" jumps to Stock / Orders (Search-Desktop kbds).
  useEffect(() => {
    let g = 0;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }
      const el = e.target as HTMLElement | null;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        el?.closest("input, textarea, select, [contenteditable]")
      )
        return;
      const k = e.key.toLowerCase();
      if (k === "g") {
        g = Date.now();
        return;
      }
      if (Date.now() - g < 1000 && (k === "s" || k === "o")) {
        g = 0;
        router.push(k === "s" ? "/stock" : "/orders");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  const active = activeKey(pathname);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [sheetOpen, setSheetOpen] = useState(false);
  const groups = navFor(role);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  }

  const crumb = active && active !== "more" ? t.nav.items[active] : "";

  return (
    <ShellContext.Provider value={shell}>
      <ToastProvider>
        <div className="bg-background max-tab:block max-tab:h-auto max-tab:min-h-dvh max-tab:overflow-visible max-tab:bg-subtle flex h-dvh overflow-hidden">
          {/* 768–1023: icon rail */}
          <aside className="tab:flex desk:hidden hidden w-16 flex-none">
            <Rail
              groups={groups}
              active={active}
              counts={counts}
              t={t}
              onOpen={() => setSheetOpen(true)}
            />
          </aside>
          {/* ≥1024: full sidebar. Collapsing (top-bar toggle) only applies from 1440, where the
            toggle is shown (Dashboard-Tablet1194 has a full sidebar and no toggle). */}
          <aside className={cn("desk:flex hidden w-64 flex-none", collapsed && "wide:w-14")}>
            <div className={cn("contents", collapsed && "wide:hidden")}>
              <Expanded groups={groups} active={active} counts={counts} t={t} />
            </div>
            {collapsed ? (
              <div className="wide:contents hidden">
                <Collapsed groups={groups} active={active} counts={counts} t={t} />
              </div>
            ) : null}
          </aside>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent
              side="left"
              showCloseButton={false}
              className="w-64 gap-0 border-r-0 p-0 shadow-lg sm:max-w-64"
            >
              <SheetTitle className="sr-only">{t.nav.label}</SheetTitle>
              <Expanded
                groups={groups}
                active={active}
                counts={counts}
                t={t}
                onNavigate={() => setSheetOpen(false)}
              />
              <SheetClose
                className="border-border focus-visible:ring-ring hover:bg-accent absolute top-1.5 right-1.5 inline-flex size-11 items-center justify-center rounded-md border bg-white shadow-xs outline-none focus-visible:ring-[3px]"
                aria-label={t.nav.closeMenu}
              >
                <ChevronLeft className="size-5" aria-hidden />
              </SheetClose>
            </SheetContent>
          </Sheet>

          <div className="max-tab:h-auto max-tab:overflow-visible flex h-full min-w-0 flex-1 flex-col overflow-hidden">
            <header className="border-border tab:flex hidden h-14 flex-none items-center gap-3 border-b bg-white pr-4 pl-3">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={t.topbar.toggle}
                aria-pressed={!collapsed}
                className="hover:bg-accent focus-visible:ring-ring wide:inline-flex hidden size-8 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
              >
                <PanelLeft className="size-4" aria-hidden />
              </button>
              <span className="bg-border wide:block hidden h-4 w-px" aria-hidden />
              <nav
                aria-label={t.topbar.crumbs}
                className="flex min-w-0 items-center gap-1.5 text-sm"
              >
                <span className="text-muted-foreground truncate">{crumb}</span>
              </nav>
              <span className="flex-auto" />
              <TopbarSearch />
              <LangSwitch lang={lang} size="topbar" />
              <TopbarBell />
              <UserMenu role={role} user={user} t={t} />
            </header>

            {/* shadcn ScrollArea for the page (owner request). Phones keep normal page scrolling. */}
            <ScrollArea
              className="max-tab:contents min-h-0 flex-1"
              viewportClassName="max-tab:!overflow-visible max-tab:pb-[100px] [&>div]:h-full"
            >
              {children}
            </ScrollArea>
          </div>

          <BottomNav role={role} active={active} counts={counts} t={t} />
          {/* Mounted only while open, so each opening starts fresh. */}
          {searchOpen ? <SearchPalette open onOpenChange={setSearchOpen} /> : null}
          {notifOpen ? <NotificationsPanel open onOpenChange={setNotifOpen} /> : null}
        </div>
      </ToastProvider>
    </ShellContext.Provider>
  );
}

interface NavProps {
  groups: ReturnType<typeof navFor>;
  active: ReturnType<typeof activeKey>;
  counts: NavCounts;
  t: Dict;
}

function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-primary inline-flex size-8 flex-none items-center justify-center rounded-md font-[family-name:var(--font-anek)] text-lg leading-none font-bold text-white",
        className,
      )}
    >
      আ
    </span>
  );
}

function Count({ n, primary }: { n: number; primary: boolean }) {
  return (
    <span
      className={cn(
        "tabular ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
        primary ? "bg-primary text-white" : "bg-muted text-foreground",
      )}
    >
      {n}
    </span>
  );
}

function SignOutButton({ t, variant }: { t: Dict; variant: "expanded" | "collapsed" | "rail" }) {
  const router = useRouter();
  async function onClick() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }
  if (variant === "expanded") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="text-sidebar-foreground hover:bg-sidebar-hover flex h-[38px] w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm"
      >
        <LogOut className="size-4" aria-hidden />
        <span>{t.nav.signOut}</span>
      </button>
    );
  }
  const rail = variant === "rail";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t.nav.signOut}
      title={t.nav.signOut}
      className={cn(
        "text-sidebar-foreground hover:bg-sidebar-hover inline-flex items-center justify-center rounded-md",
        rail ? "size-11" : "size-9",
      )}
    >
      <LogOut className={rail ? "size-5" : "size-4"} aria-hidden />
    </button>
  );
}

function Expanded({
  groups,
  active,
  counts,
  t,
  onNavigate,
}: NavProps & { onNavigate?: () => void }) {
  return (
    <nav
      aria-label={t.nav.label}
      className="bg-sidebar border-border text-foreground flex h-full w-64 flex-col border-r"
    >
      <div className="flex h-14 flex-none items-center gap-2.5 px-4">
        <Logo />
        <div className="flex flex-col leading-[1.15]">
          <span className="text-[15px] font-semibold">{t.brand}</span>
          <span className="text-muted-foreground text-[11px]">{t.brandSub}</span>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-auto">
        <div className="flex flex-col gap-3.5 px-2 pt-2 pb-4">
          {groups.map((g) => (
            <div key={g.group} className="flex flex-col gap-0.5">
              {g.group !== "start" ? (
                <div className="text-muted-foreground px-2.5 pb-1 text-xs font-medium">
                  {t.nav.groups[g.group]}
                </div>
              ) : null}
              {g.items.map((it) => {
                const Icon = NAV_ICONS[it.key];
                const on = it.key === active;
                const n = counts[it.key];
                return (
                  <Link
                    key={it.key}
                    href={it.href as Route}
                    onClick={() => onNavigate?.()}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "focus-visible:ring-ring flex h-[34px] items-center gap-2.5 rounded-md px-2.5 text-sm outline-none focus-visible:ring-[3px]",
                      on
                        ? "bg-sidebar-active text-foreground [&>svg]:text-primary font-medium"
                        : "text-sidebar-foreground hover:bg-sidebar-hover",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    <span>{t.nav.items[it.key]}</span>
                    {n ? <Count n={n} primary={it.key === "orders"} /> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="border-border flex-none border-t p-2">
        <SignOutButton t={t} variant="expanded" />
      </div>
    </nav>
  );
}

function IconLink({
  k,
  href,
  on,
  n,
  label,
  size,
}: {
  k: NavKey;
  href: string;
  on: boolean;
  n: number | undefined;
  label: string;
  size: "collapsed" | "rail";
}) {
  const Icon = NAV_ICONS[k];
  const rail = size === "rail";
  return (
    <Link
      href={href as Route}
      aria-label={label}
      aria-current={on ? "page" : undefined}
      className={cn(
        "group focus-visible:ring-ring relative inline-flex flex-none items-center justify-center rounded-md outline-none focus-visible:ring-[3px]",
        rail ? "size-11" : "size-9",
        on
          ? "bg-sidebar-active text-foreground [&>svg]:text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-hover",
      )}
    >
      <Icon className={rail ? "size-5" : "size-4"} aria-hidden />
      {n ? (
        <span
          aria-hidden
          className={cn(
            "bg-primary absolute rounded-full",
            rail
              ? "top-[7px] right-[7px] size-2 border-2 border-[var(--sidebar)]"
              : "top-1.5 right-1.5 size-[7px]",
          )}
        />
      ) : null}
      {rail ? (
        <span
          role="tooltip"
          className="bg-foreground pointer-events-none absolute top-1/2 left-[54px] z-10 hidden -translate-y-1/2 rounded-sm px-2.5 py-1.5 text-xs leading-4 font-medium whitespace-nowrap text-white shadow-md group-hover:block group-focus-visible:block"
        >
          {label}
        </span>
      ) : null}
    </Link>
  );
}

function Collapsed({ groups, active, counts, t }: NavProps) {
  return (
    <nav
      aria-label={t.nav.label}
      className="bg-sidebar border-border flex h-full w-14 flex-col items-center border-r"
    >
      <div className="flex h-14 flex-none items-center">
        <Logo />
      </div>
      <ScrollArea className="min-h-0 w-full flex-auto">
        <div className="flex flex-col items-center gap-1 pt-2">
          {groups.flatMap((g) =>
            g.items.map((it) => (
              <IconLink
                key={it.key}
                k={it.key}
                href={it.href}
                on={it.key === active}
                n={counts[it.key]}
                label={t.nav.items[it.key]}
                size="collapsed"
              />
            )),
          )}
        </div>
      </ScrollArea>
      <div className="border-border flex w-full flex-none justify-center border-t py-2.5">
        <SignOutButton t={t} variant="collapsed" />
      </div>
    </nav>
  );
}

function Rail({ groups, active, counts, t, onOpen }: NavProps & { onOpen: () => void }) {
  return (
    <nav
      aria-label={t.nav.label}
      className="bg-sidebar border-border relative flex h-full w-16 flex-col items-center border-r"
    >
      <div className="flex h-14 flex-none items-center">
        <button
          type="button"
          onClick={onOpen}
          aria-label={t.nav.openMenu}
          title={t.nav.openMenu}
          className="hover:bg-accent focus-visible:ring-ring inline-flex size-11 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </div>
      <div className="flex min-h-0 flex-auto flex-col gap-1 pt-1">
        {groups.flatMap((g) =>
          g.items.map((it) => (
            <IconLink
              key={it.key}
              k={it.key}
              href={it.href}
              on={it.key === active}
              n={counts[it.key]}
              label={t.nav.items[it.key]}
              size="rail"
            />
          )),
        )}
      </div>
      <div className="border-border flex w-full flex-none justify-center border-t py-2">
        <SignOutButton t={t} variant="rail" />
      </div>
    </nav>
  );
}

function BottomNav({ role, active, counts, t }: { role: AdminRole } & Omit<NavProps, "groups">) {
  return (
    <nav
      aria-label={t.nav.phoneLabel}
      className="border-border tab:hidden fixed inset-x-0 bottom-0 z-40 flex h-[76px] items-start border-t bg-white px-1 pb-4"
    >
      {bottomNavFor(role).map((k) => {
        const Icon = NAV_ICONS[k];
        const on = k === active;
        const n = k === "more" ? undefined : counts[k];
        const label = k === "more" ? t.nav.more : t.nav.items[k];
        return (
          <Link
            key={k}
            href={(k === "more" ? "/more" : hrefOf(k)) as Route}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative flex h-[60px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-[3px] text-xs font-medium",
              on
                ? "text-primary before:bg-primary before:absolute before:top-0 before:right-[28%] before:left-[28%] before:h-0.5 before:rounded-b-[2px]"
                : "text-muted-foreground",
            )}
          >
            <Icon className="size-[22px]" aria-hidden />
            <span>{label}</span>
            {n && (k === "orders" || k === "messages") ? (
              <span className="bg-primary tabular absolute top-1.5 left-[52%] box-content h-[18px] min-w-[18px] rounded-full border-2 border-white px-[5px] text-center text-[11px] leading-[18px] font-semibold text-white">
                {n}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
