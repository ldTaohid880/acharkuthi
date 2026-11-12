"use client";

import { Bell, Search } from "lucide-react";
import { useShell } from "./shell-context";

/** Top-bar search field (Topbar.dc.html): opens the ⌘K palette. 36px desktop, 44px tablet. */
export function TopbarSearch() {
  const { t, openSearch } = useShell();
  return (
    <button
      type="button"
      onClick={openSearch}
      aria-label={t.topbar.searchLabel}
      className="border-input text-muted-foreground focus-visible:ring-ring bg-subtle wide:h-9 flex h-11 w-[320px] max-w-[32vw] min-w-0 flex-none cursor-pointer items-center gap-2 rounded-md border px-3 shadow-xs outline-none focus-visible:ring-[3px]"
    >
      <Search className="size-4 flex-none" aria-hidden />
      <span className="min-w-0 flex-auto truncate text-left text-sm">{t.topbar.search}</span>
      <span className="border-border bg-muted text-muted-foreground inline-flex h-5 flex-none items-center rounded-[4px] border px-1.5 font-mono text-[11px]">
        ⌘K
      </span>
    </button>
  );
}

/** Top-bar bell with the red unread count. */
export function TopbarBell() {
  const { t, unread, openNotifications } = useShell();
  return (
    <button
      type="button"
      onClick={openNotifications}
      aria-label={unread ? `${t.topbar.notif}, ${unread}` : t.topbar.notif}
      className="hover:bg-accent focus-visible:ring-ring wide:size-9 relative inline-flex size-11 flex-none items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
    >
      <Bell className="size-4" aria-hidden />
      {unread ? (
        <span className="bg-notify tabular absolute top-1 right-1 h-4 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 font-semibold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </button>
  );
}

/** Phone page header buttons (Dashboard-Phone.dc.html): search and bell, 44px. */
export function PhoneHeaderActions() {
  const { t, unread, openSearch, openNotifications } = useShell();
  const btn =
    "hover:bg-accent relative inline-flex size-11 flex-none items-center justify-center rounded-md";
  return (
    <>
      <button type="button" onClick={openSearch} aria-label={t.search.label} className={btn}>
        <Search className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={openNotifications}
        aria-label={unread ? `${t.topbar.notif}, ${unread}` : t.topbar.notif}
        className={btn}
      >
        <Bell className="size-5" aria-hidden />
        {unread ? (
          <span
            aria-hidden
            className="bg-notify absolute top-[9px] right-2.5 size-2 rounded-full border-2 border-white"
          />
        ) : null}
      </button>
    </>
  );
}
