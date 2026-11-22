"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import type { AdminLang, SubscriberListQuery } from "@repo/validators";
import { Download, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { btn } from "@/components/btn";
import { Crumb } from "@/components/shell/shell-context";
import { digits, fill, orderDate } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import { Pager } from "../../orders/orders-parts";
import { MessageTabs } from "../message-tabs";

interface Row {
  id: number;
  email: string;
  createdAt: Date;
}

export function SubscribersView({
  lang,
  t,
  mt,
  query: q,
  unread,
  all,
  total,
  pages,
  pageSize,
  rows,
  phoneRows,
}: {
  lang: AdminLang;
  t: Dict["subs"];
  mt: Dict["messages"];
  query: SubscriberListQuery;
  unread: number;
  /** Everyone (the tab count); `total` follows the search. */
  all: number;
  total: number;
  pages: number;
  pageSize: number;
  rows: Row[];
  phoneRows: Row[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(q.q);

  function urlWith(patch: Partial<Record<"q" | "page" | "n", string | number | undefined>>) {
    const next = { q: q.q || undefined, page: undefined, n: undefined, ...patch };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next))
      if (v !== undefined && v !== "" && v !== 1) sp.set(k, String(v));
    const s = sp.toString();
    return s ? `${pathname}?${s}` : pathname;
  }

  // Search box: update the URL 300ms after typing stops.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(
      () => router.replace(urlWith({ q: search.trim() || undefined }) as Route, { scroll: false }),
      300,
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text should trigger this
  }, [search]);

  const n = (x: number) => digits(x, lang);
  const exportHref = `/messages/subscribers/export${q.q ? `?q=${encodeURIComponent(q.q)}` : ""}`;
  const from = total ? (q.page - 1) * pageSize + 1 : 0;
  const range = fill(t.range, {
    total: n(total),
    a: n(from),
    b: n(Math.min(total, from + rows.length - 1)),
  });

  const searchBox = (large: boolean, className?: string) => (
    <label
      className={cn(
        "border-input focus-within:border-primary flex min-w-0 items-center gap-2 rounded-md border bg-white px-3 shadow-xs focus-within:shadow-[0_0_0_3px_var(--ring)]",
        large ? "h-11 text-[15px]" : "h-9 text-sm",
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
  const exportBtn = (large: boolean) => (
    // A plain link: the browser downloads the CSV from the route handler.
    <a
      href={exportHref}
      download
      className={btn({ variant: "outline", size: large ? "lg" : "default" })}
    >
      <Download aria-hidden />
      {t.export}
    </a>
  );
  const empty = (
    <p className="text-muted-foreground p-6 text-center text-sm">{q.q ? t.emptySearch : t.empty}</p>
  );
  const th = "text-muted-foreground h-10 px-3 text-left text-[13px] font-medium whitespace-nowrap";
  const table = (large: boolean) => (
    <ScrollArea className="border-border !min-h-0 !flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-[1] bg-white shadow-[inset_0_-1px_0_var(--border)]">
          <tr>
            <th className={th}>{t.colEmail}</th>
            <th className={th}>{t.colJoined}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={cn(
                "border-border border-b last:border-b-0",
                large ? "h-[52px] [&>td]:px-3" : "[&>td]:px-3 [&>td]:py-2.5",
              )}
            >
              <td className="font-mono text-[13px] tabular-nums">{r.email}</td>
              <td className="whitespace-nowrap">{orderDate(r.createdAt, lang, false)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? empty : null}
    </ScrollArea>
  );
  const header = (large: boolean) => (
    <div className="flex flex-none flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{mt.title}</h1>
        <p className="text-muted-foreground text-[13px] leading-4">{t.sub}</p>
      </div>
      {exportBtn(large)}
    </div>
  );
  const pagerRow = (large: boolean) => (
    <div className="flex flex-none flex-wrap items-center justify-between gap-4">
      <span className="text-muted-foreground text-xs leading-4">{range}</span>
      <Pager page={q.page} pages={pages} href={(x) => urlWith({ page: x })} t={t} large={large} />
    </div>
  );

  return (
    <>
      <Crumb value={t.crumb} />

      {/* ───── Phone (<768): Subscribers-Phone. Header, tabs and search stay; the list scrolls. ───── */}
      <div className="tab:hidden flex h-full flex-col">
        <header className="border-border flex h-14 flex-none items-center gap-2 border-b bg-white pr-2 pl-4">
          <div className="flex min-w-0 flex-auto flex-col leading-[1.1]">
            <b className="text-lg leading-6 font-semibold">{mt.title}</b>
            <span className="text-muted-foreground text-xs leading-4">
              {fill(t.phoneSub, { n: n(all) })}
            </span>
          </div>
          <a
            href={exportHref}
            download
            aria-label={t.export}
            className={btn({ variant: "outline", size: "lg", className: "px-3" })}
          >
            <Download aria-hidden />
            {t.exportShort}
          </a>
        </header>
        <MessageTabs
          t={mt}
          active="subscribers"
          unread={unread}
          tall
          short
          className="flex-none bg-white px-2"
        />
        <div className="flex-none px-4 pt-4">{searchBox(true)}</div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            <ul className="border-border m-0 list-none overflow-hidden rounded-xl border bg-white p-0">
              {phoneRows.length === 0 ? <li>{empty}</li> : null}
              {phoneRows.map((r) => (
                <li
                  key={r.id}
                  className="border-border flex min-h-14 items-center border-b px-4 py-3 last:border-b-0"
                >
                  <span className="flex min-w-0 flex-auto flex-col">
                    <span className="truncate font-mono text-[13px] tabular-nums">{r.email}</span>
                    <span className="text-muted-foreground text-[11px] leading-[14px]">
                      {fill(t.joined, { d: orderDate(r.createdAt, lang, false) })}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {phoneRows.length < total ? (
              <Link
                href={urlWith({ n: q.n + 30 }) as Route}
                scroll={false}
                className={btn({ variant: "outline", size: "lg", block: true })}
              >
                {t.loadMore}
              </Link>
            ) : null}
          </div>
        </ScrollArea>
      </div>

      {/* ───── Tablet 834 (768–1023): Subscribers-Tablet ───── */}
      <div className="tab:flex desk:hidden hidden h-full min-h-0 flex-col gap-4 px-6 pt-5 pb-5">
        {header(true)}
        <MessageTabs
          t={mt}
          active="subscribers"
          unread={unread}
          subscribers={all}
          tall
          className="flex-none"
        />
        {searchBox(true, "flex-none")}
        <span className="text-muted-foreground flex-none text-xs leading-4">{t.exportHelp}</span>
        {table(true)}
        {pagerRow(true)}
      </div>

      {/* ───── Desktop (≥1024): Subscribers-Desktop ───── */}
      <div className="desk:flex wide:px-8 wide:pt-6 hidden h-full min-h-0 flex-col gap-4 px-6 pt-5 pb-6">
        {header(false)}
        <MessageTabs
          t={mt}
          active="subscribers"
          unread={unread}
          subscribers={all}
          className="flex-none"
        />
        <div className="flex flex-none flex-wrap items-center justify-between gap-2">
          {searchBox(false, "w-[300px]")}
          <span className="text-muted-foreground text-xs leading-4">{t.exportHelp}</span>
        </div>
        {table(false)}
        {pagerRow(false)}
      </div>
    </>
  );
}
