"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components/resizable";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import { CONTACT_SUBJECTS, type AdminLang, type MessageListQuery } from "@repo/validators";
import { Archive, Check, ChevronDown, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { archiveMessage, markMessageRead, markMessageUnread } from "@/app/actions/messages";
import { btn } from "@/components/btn";
import { useToast } from "@/components/toast";
import { digits, fill, relativeTime } from "@/lib/format";
import type { MessageRow, MessageThread } from "@/lib/messages";
import { chip } from "../orders/orders-parts";
import { MessagePane, type MT } from "./message-detail";
import { MessageTabs } from "./message-tabs";

type Patch = Partial<Record<keyof MessageListQuery, string | number | undefined>>;

interface Props {
  lang: AdminLang;
  t: MT;
  query: MessageListQuery;
  unread: number;
  total: number;
  rows: MessageRow[];
  selected: MessageThread | null;
  mail: boolean;
}

export function MessagesView(p: Props) {
  const { lang, t, query: q, rows, selected } = p;
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [, start] = useTransition();
  const [search, setSearch] = useState(q.q);
  const [phoneSearch, setPhoneSearch] = useState(Boolean(q.q));
  const [previewOpen, setPreviewOpen] = useState(true);

  function urlWith(patch: Patch): string {
    const cur: Patch = {
      box: q.box === "inbox" ? undefined : q.box,
      q: q.q || undefined,
      subject: q.subject,
      sel: q.sel,
    };
    const next: Patch = { ...cur, n: undefined, ...patch };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next))
      if (v !== undefined && v !== "") sp.set(k, String(v));
    const s = sp.toString();
    return s ? `${pathname}?${s}` : pathname;
  }
  const go = (patch: Patch) => router.replace(urlWith(patch) as Route, { scroll: false });

  // Search box: update the URL 300ms after typing stops.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => go({ q: search.trim() || undefined, sel: undefined }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text should trigger this
  }, [search]);

  const pick = (m: MessageRow) => {
    setPreviewOpen(true);
    go({ sel: m.id, n: q.n === 30 ? undefined : q.n });
  };
  const n = (x: number) => digits(x, lang);
  const on = (m: MessageRow) => previewOpen && selected?.id === m.id;
  const boxHref = (box: "inbox" | "archive") =>
    urlWith({ box: box === "inbox" ? undefined : box, sel: undefined, q: undefined });

  const run = (fn: () => Promise<void>, ok: string) =>
    start(async () => {
      try {
        await fn();
        toast({ tone: "ok", title: ok });
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  const archive = (m: MessageRow) => run(() => archiveMessage({ id: m.id }), t.archived);
  const toggleRead = (m: MessageRow) =>
    m.unread
      ? run(() => markMessageRead({ id: m.id }), t.markedRead)
      : run(() => markMessageUnread({ id: m.id }), t.markedUnread);

  const utabs = (tall: boolean, short: boolean, className?: string) => (
    <MessageTabs
      t={t}
      active={q.box}
      unread={p.unread}
      inboxHref={boxHref("inbox")}
      archiveHref={boxHref("archive")}
      tall={tall}
      short={short}
      className={className}
    />
  );

  const searchBox = (large: boolean, className?: string) => (
    <label
      className={cn(
        "border-input focus-within:border-primary flex min-w-0 items-center gap-2 rounded-md border bg-white px-3 shadow-xs focus-within:shadow-[0_0_0_3px_var(--ring)]",
        large ? "h-11 text-[15px]" : "h-8 text-[13px]",
        className,
      )}
    >
      <Search className="text-muted-foreground size-4 flex-none" aria-hidden />
      <input
        type="search"
        aria-label={t.searchAria}
        placeholder={t.searchPh}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="placeholder:text-muted-foreground min-w-0 flex-auto bg-transparent outline-none"
      />
    </label>
  );

  const subjectMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger className="border-input flex h-8 w-[140px] flex-none items-center justify-between gap-2 rounded-md border bg-white px-2.5 text-left text-[13px] shadow-xs">
        <span className="truncate">{q.subject ? t.subjects[q.subject] : t.allSubjects}</span>
        <ChevronDown className="text-muted-foreground size-4 flex-none" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px] rounded-lg p-1 shadow-md">
        {[undefined, ...CONTACT_SUBJECTS].map((s) => (
          <DropdownMenuItem
            key={s ?? "all"}
            onSelect={() => go({ subject: s, sel: undefined })}
            className="focus:bg-accent h-8 gap-2 rounded-sm px-2 text-sm"
          >
            <Check className={cn("size-4", q.subject === s ? "" : "invisible")} aria-hidden />
            {s ? t.subjects[s] : t.allSubjects}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  /** One message in a list: unread dot, name (bold when unread), time, subject, preview. */
  const rowInner = (m: MessageRow) => (
    <>
      <span
        aria-hidden
        className={cn(
          "bg-primary mt-[7px] size-2 flex-none rounded-full",
          !m.unread && "opacity-0",
        )}
      />
      <span className="flex min-w-0 flex-auto flex-col gap-0.5">
        <span className="flex items-center justify-between gap-2">
          <span className={cn("truncate", m.unread ? "font-semibold" : "font-normal")}>
            {m.name}
            {m.unread ? <span className="sr-only"> · {t.unread}</span> : null}
          </span>
          <span className="text-muted-foreground flex-none text-[11px] leading-[14px]">
            {relativeTime(m.createdAt, lang)}
          </span>
        </span>
        <span className="bg-muted inline-flex h-5 items-center self-start rounded-sm px-2 text-[11px] font-medium">
          {t.subjects[m.subject]}
        </span>
        <span className="text-muted-foreground truncate text-xs leading-4">{m.preview}</span>
      </span>
    </>
  );

  const empty = (
    <div className="p-8 text-center">
      <p className="font-medium">{t.empty[q.box]}</p>
      {q.q ? <p className="text-muted-foreground mt-1 text-xs leading-4">{t.emptySub}</p> : null}
    </div>
  );
  const more =
    rows.length < p.total ? (
      <div className="p-3">
        <Link
          href={urlWith({ n: q.n + 30 }) as Route}
          scroll={false}
          className={btn({ variant: "outline", size: "lg", block: true })}
        >
          {t.loadMore}
        </Link>
      </div>
    ) : null;

  const header = (
    <div className="flex-none">
      <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
      <p className="text-muted-foreground text-[13px] leading-4">{t.sub}</p>
    </div>
  );

  return (
    <>
      {/* ───── Phone (<768): Messages-Phone. Header and tabs stay; the list scrolls. ───── */}
      <div className="tab:hidden flex h-full flex-col">
        <header className="border-border flex h-14 flex-none items-center gap-2 border-b bg-white pr-2 pl-4">
          <div className="flex min-w-0 flex-auto flex-col leading-[1.1]">
            <b className="text-lg leading-6 font-semibold">{t.title}</b>
            <span className="text-muted-foreground text-xs leading-4">
              {p.unread ? fill(t.phoneSub, { n: n(p.unread) }) : t.phoneSubNone}
            </span>
          </div>
          <button
            type="button"
            aria-label={t.searchAria}
            aria-pressed={phoneSearch}
            onClick={() => setPhoneSearch((v) => !v)}
            className={btn({ variant: "ghost", size: "iconLg", className: "[&_svg]:size-5" })}
          >
            <Search aria-hidden />
          </button>
        </header>
        <div className="flex-none bg-white">
          {utabs(true, true, "px-2")}
          {phoneSearch ? (
            <div className="border-border border-b px-4 py-2.5">{searchBox(true)}</div>
          ) : null}
        </div>
        <ScrollArea className="min-h-0 flex-1">
          {rows.length === 0 ? empty : null}
          {rows.map((m) => (
            <SwipeRow
              key={m.id}
              href={`/messages/${m.id}`}
              onLeft={q.box === "inbox" ? () => archive(m) : undefined}
              onRight={() => toggleRead(m)}
            >
              {rowInner(m)}
            </SwipeRow>
          ))}
          {more}
          {rows.length ? (
            <p className="text-muted-foreground p-4 text-center text-xs leading-4">{t.swipeHelp}</p>
          ) : null}
        </ScrollArea>
      </div>

      {/* ───── Tablet 834 (768–1023): Messages-Tablet. Header, tabs and search stay. ───── */}
      <div className="tab:flex desk:hidden hidden h-full min-h-0 flex-col gap-4 px-6 pt-5 pb-5">
        {header}
        {utabs(true, false, "flex-none")}
        {searchBox(true, "flex-none")}
        <ScrollArea className="border-border !min-h-0 !flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
          {rows.length === 0 ? empty : null}
          {rows.map((m) => (
            <div
              key={m.id}
              className="border-border flex min-h-[76px] items-start gap-3 border-b px-4 py-3.5 last:border-b-0"
            >
              <Link href={`/messages/${m.id}` as Route} className="flex min-w-0 flex-auto gap-3">
                {rowInner(m)}
              </Link>
              {q.box === "inbox" ? (
                <button
                  type="button"
                  aria-label={t.archiveBtn}
                  title={t.archiveBtn}
                  onClick={() => archive(m)}
                  className={btn({ variant: "ghost", size: "iconLg" })}
                >
                  <Archive aria-hidden />
                </button>
              ) : null}
            </div>
          ))}
          {more}
        </ScrollArea>
      </div>

      {/* ───── Split view (1024–1439): Messages-Tablet1194 ───── */}
      <div className="desk:max-wide:flex hidden h-full min-h-0">
        <ResizablePanelGroup orientation="horizontal" id="messages-split">
          <ResizablePanel id="list" defaultSize={380} minSize={300} maxSize="65">
            <div className="flex h-full min-w-0 flex-col bg-white">
              <div className="border-border flex flex-none flex-col gap-2 border-b p-3">
                <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto">
                  <Link
                    href={boxHref("inbox") as Route}
                    aria-current={q.box === "inbox" ? "page" : undefined}
                    className={chip(q.box === "inbox", "h-11")}
                  >
                    {t.inbox}
                    {p.unread ? (
                      <span
                        className={cn(
                          "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                          q.box === "inbox" ? "text-foreground bg-white" : "bg-[#f0f0f0]",
                        )}
                      >
                        {p.unread}
                      </span>
                    ) : null}
                  </Link>
                  <Link
                    href={boxHref("archive") as Route}
                    aria-current={q.box === "archive" ? "page" : undefined}
                    className={chip(q.box === "archive", "h-11")}
                  >
                    {t.archive}
                  </Link>
                  <Link href={"/messages/subscribers" as Route} className={chip(false, "h-11")}>
                    {t.subscribersShort}
                  </Link>
                </div>
                {searchBox(true)}
              </div>
              <ScrollArea className="min-h-0 flex-auto">
                {rows.length === 0 ? empty : null}
                {rows.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-current={on(m) || undefined}
                    onClick={() => pick(m)}
                    className={cn(
                      "border-border flex min-h-[72px] w-full gap-3 border-b bg-white px-4 py-3.5 text-left",
                      on(m) && "bg-primary-soft shadow-[inset_3px_0_0_var(--primary)]",
                    )}
                  >
                    {rowInner(m)}
                  </button>
                ))}
                {more}
              </ScrollArea>
            </div>
          </ResizablePanel>
          {previewOpen ? (
            <>
              <ResizableHandle withHandle className="bg-border w-px" />
              <ResizablePanel id="preview" minSize={420}>
                <ScrollArea className="h-full bg-white">
                  {selected ? (
                    <MessagePane
                      key={selected.id}
                      m={selected}
                      t={t}
                      lang={lang}
                      mail={p.mail}
                      picked={q.sel === selected.id}
                      large
                      onClose={() => setPreviewOpen(false)}
                    />
                  ) : (
                    <p className="text-muted-foreground p-6 text-sm">{t.pickOne}</p>
                  )}
                </ScrollArea>
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
      </div>

      {/* ───── Desktop (≥1440): Messages-Desktop. Header and tabs stay; each pane scrolls. ───── */}
      <div className="wide:flex hidden h-full min-h-0 flex-col gap-4 px-8 pt-6 pb-6">
        {header}
        {utabs(false, false, "flex-none")}
        <div className="border-border flex min-h-0 flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
          <div className="border-border flex max-w-[400px] min-w-0 flex-[1_1_340px] flex-col border-r">
            <div className="border-border flex flex-none gap-2 border-b p-2.5">
              {searchBox(false, "flex-auto")}
              {subjectMenu}
            </div>
            <ScrollArea className="min-h-0 flex-1">
              {rows.length === 0 ? empty : null}
              {rows.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-current={selected?.id === m.id || undefined}
                  onClick={() => pick(m)}
                  className={cn(
                    "border-border flex w-full gap-2.5 border-b bg-white px-3.5 py-3 text-left",
                    selected?.id === m.id && "bg-primary-soft",
                  )}
                >
                  {rowInner(m)}
                </button>
              ))}
              {more}
            </ScrollArea>
          </div>
          <ScrollArea className="min-h-0 min-w-0 flex-[999_1_420px]">
            {selected ? (
              <MessagePane
                key={selected.id}
                m={selected}
                t={t}
                lang={lang}
                mail={p.mail}
                picked={q.sel === selected.id}
              />
            ) : (
              <p className="text-muted-foreground p-6 text-sm">{t.pickOne}</p>
            )}
          </ScrollArea>
        </div>
      </div>
    </>
  );
}

/**
 * Phone inbox row: tap opens the message; swipe left archives, swipe right toggles read/unread
 * (Messages-Phone help text; kept on purpose by the owner, 2026-11-11).
 */
function SwipeRow({
  href,
  onLeft,
  onRight,
  children,
}: {
  href: string;
  onLeft: (() => void) | undefined;
  onRight: () => void;
  children: React.ReactNode;
}) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const LIMIT = 80;
  return (
    <div className="border-border relative overflow-hidden border-b bg-[#f0f0f0]">
      <Link
        href={href as Route}
        draggable={false}
        onClick={(e) => {
          if (moved.current) e.preventDefault();
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          start.current = { x: e.clientX, y: e.clientY };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const x = e.clientX - start.current.x;
          const y = e.clientY - start.current.y;
          if (!moved.current && Math.abs(x) < 10) return;
          if (!moved.current && Math.abs(y) > Math.abs(x)) {
            start.current = null;
            return;
          }
          moved.current = true;
          setDx(Math.max(onLeft ? -120 : 0, Math.min(120, x)));
        }}
        onPointerUp={() => {
          if (dx <= -LIMIT) onLeft?.();
          else if (dx >= LIMIT) onRight();
          start.current = null;
          setDx(0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDx(0);
        }}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, touchAction: "pan-y" }}
        className={cn(
          "relative flex min-h-[76px] gap-3 bg-white px-4 py-3.5",
          !dx && "transition-transform",
        )}
      >
        {children}
      </Link>
    </div>
  );
}
