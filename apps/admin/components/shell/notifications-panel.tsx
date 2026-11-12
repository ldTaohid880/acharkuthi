"use client";

import { Popover, PopoverAnchor, PopoverContent } from "@repo/ui/components/popover";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import {
  Bell,
  ChevronLeft,
  MessageSquare,
  Package,
  ShoppingBag,
  Star,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  loadNotifications,
  readAllNotifications,
  readNotification,
} from "@/app/actions/notifications";
import { digits } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import type { NotificationKind, NotificationView } from "@/lib/notifications";
import { useBreakpoint, useShell } from "./shell-context";

const ICONS: Record<NotificationKind, LucideIcon> = {
  order: ShoppingBag,
  review: Star,
  message: MessageSquare,
  courier: Truck,
  restock: Bell,
  stock: Package,
};

type Filter = "all" | "unread";

/**
 * Bell panel. Desktop: 400px popover under the top bar (Notifications-Desktop). Tablet: 420px
 * sheet from the right (Notifications-Tablet). Phone: full screen (Notifications-Phone).
 */
export function NotificationsPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, lang } = useShell();
  const bp = useBreakpoint();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<NotificationView[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [, start] = useTransition();

  const load = useCallback(async (f: Filter) => {
    const r = await loadNotifications({ filter: f });
    setItems(r.items);
    setUnread(r.unread);
  }, []);

  // The panel is mounted fresh each time it opens; reload when the tab changes.
  useEffect(() => {
    let live = true;
    loadNotifications({ filter })
      .then((r) => {
        if (!live) return;
        setItems(r.items);
        setUnread(r.unread);
      })
      .catch(() => {
        if (live) setItems([]);
      });
    return () => {
      live = false;
    };
  }, [filter]);

  function openItem(n: NotificationView) {
    onOpenChange(false);
    start(async () => {
      if (n.unread) await readNotification({ id: n.id });
      router.push(n.href as Route);
    });
  }

  function readAll() {
    start(async () => {
      await readAllNotifications();
      await load(filter);
    });
  }

  const body = (
    <Body
      t={t}
      bp={bp}
      items={items}
      unread={unread}
      filter={filter}
      setFilter={setFilter}
      openItem={openItem}
      readAll={readAll}
      close={() => onOpenChange(false)}
      unreadLabel={`${digits(unread, lang)}${t.notif.unreadCount}`}
    />
  );

  if (bp === "desk") {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        {/* Notifications-Desktop: panel top 52px, 64px from the right edge. */}
        <PopoverAnchor className="pointer-events-none fixed top-[52px] right-16 size-0" />
        <PopoverContent
          align="end"
          side="bottom"
          sideOffset={0}
          aria-label={t.notif.title}
          className="w-[400px] overflow-hidden rounded-lg p-0 shadow-lg"
        >
          {body}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {bp === "tab" ? <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" /> : null}
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-50 flex flex-col bg-white outline-none",
            bp === "tab" ? "inset-y-0 right-0 w-[420px] shadow-lg" : "inset-0",
          )}
        >
          <Dialog.Title className="sr-only">{t.notif.title}</Dialog.Title>
          {body}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Body({
  t,
  bp,
  items,
  unread,
  filter,
  setFilter,
  openItem,
  readAll,
  close,
  unreadLabel,
}: {
  t: Dict;
  bp: "phone" | "tab" | "desk";
  items: NotificationView[] | null;
  unread: number;
  filter: Filter;
  setFilter: (f: Filter) => void;
  openItem: (n: NotificationView) => void;
  readAll: () => void;
  close: () => void;
  unreadLabel: string;
}) {
  const phone = bp === "phone";
  const ghost =
    "hover:bg-accent inline-flex flex-none items-center justify-center rounded-md font-medium";

  return (
    <>
      {phone ? (
        <header className="border-border flex h-14 flex-none items-center gap-2 border-b bg-white pr-2 pl-1">
          <button
            type="button"
            onClick={close}
            aria-label={t.notif.back}
            className={cn(ghost, "size-11")}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <div className="flex min-w-0 flex-auto flex-col leading-[1.1]">
            <b className="text-lg leading-6 font-semibold">{t.notif.title}</b>
            <span className="text-muted-foreground text-xs leading-4">{unreadLabel}</span>
          </div>
          <button type="button" onClick={readAll} className={cn(ghost, "h-11 px-2.5 text-[15px]")}>
            {t.notif.markAllShort}
          </button>
        </header>
      ) : (
        <>
          {bp === "tab" ? (
            <div className="flex flex-none justify-end px-1.5 pt-1.5">
              <button
                type="button"
                onClick={close}
                aria-label={t.notif.close}
                className={cn(ghost, "size-11")}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
          ) : null}
          <div className="flex flex-none items-center justify-between px-4 pt-3 pb-2">
            <span className="text-base leading-6 font-semibold">{t.notif.title}</span>
            <button
              type="button"
              onClick={readAll}
              className={cn(ghost, bp === "tab" ? "h-11 px-5 text-[15px]" : "h-8 px-3 text-[13px]")}
            >
              {t.notif.markAll}
            </button>
          </div>
        </>
      )}

      <div
        className={cn("flex-none", phone ? "border-border border-b px-4 py-2.5" : "px-4 pb-2.5")}
      >
        {phone ? (
          <div className="flex gap-2">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "inline-flex h-9 flex-none items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap",
                  filter === f
                    ? "bg-foreground border-foreground text-white"
                    : "border-border bg-white",
                )}
              >
                {f === "all" ? t.notif.all : t.notif.unread}
                {f === "unread" ? (
                  <span
                    className={cn(
                      "tabular inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                      filter === f ? "text-foreground bg-white" : "bg-[#f0f0f0]",
                    )}
                  >
                    {unread}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : (
          <div
            role="tablist"
            className="bg-muted inline-flex h-[38px] items-center gap-0.5 rounded-lg p-[3px]"
          >
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-sm font-medium whitespace-nowrap",
                  filter === f ? "text-foreground bg-white shadow-xs" : "text-muted-foreground",
                )}
              >
                {f === "all" ? t.notif.all : t.notif.unread}
                {f === "unread" ? (
                  <span
                    className={cn(
                      "tabular inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                      filter === f ? "bg-primary text-white" : "text-foreground bg-[#e5e5e5]",
                    )}
                  >
                    {unread}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

      <ScrollArea
        className={cn("min-h-0", !phone && "border-border border-t", bp !== "desk" && "flex-auto")}
        viewportClassName={bp === "desk" ? "max-h-[520px]" : ""}
      >
        {items === null ? (
          <div aria-busy="true" className="flex flex-col gap-2 p-4">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-12 animate-pulse rounded-sm bg-[#ededed]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">{t.notif.empty}</p>
        ) : (
          items.map((n) => {
            const Icon = ICONS[n.kind];
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => openItem(n)}
                className={cn(
                  "border-border flex w-full items-start gap-3 border-b px-4 py-3 text-left",
                  bp !== "desk" && "min-h-[72px]",
                  n.unread && "bg-primary-soft",
                )}
              >
                <span className="bg-muted inline-flex size-8 flex-none items-center justify-center rounded-full text-[#404040]">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-auto flex-col gap-0.5">
                  <span className="font-medium">{n.title}</span>
                  <span className="text-muted-foreground text-xs leading-4">{n.sub}</span>
                  <span className="text-muted-foreground text-[11px] leading-[14px]">{n.when}</span>
                </span>
                {n.unread ? (
                  <span
                    role="img"
                    aria-label={t.notif.unread}
                    className="bg-primary mt-1.5 size-2 flex-none rounded-full"
                  />
                ) : null}
              </button>
            );
          })
        )}
        {phone ? <Foot t={t} /> : null}
      </ScrollArea>
      {!phone ? <Foot t={t} /> : null}
    </>
  );
}

function Foot({ t }: { t: Dict }) {
  return (
    <p className="border-border text-muted-foreground flex-none border-t px-4 py-2.5 text-[11px] leading-[14px]">
      {t.notif.foot}
    </p>
  );
}
