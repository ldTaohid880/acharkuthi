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
import { cn, formatTaka } from "@repo/ui/lib/utils";
import {
  CUSTOMER_SORTS,
  type AdminLang,
  type CustomerListQuery,
  type CustomerSort,
} from "@repo/validators";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ListFilter,
  Maximize2,
  Search,
  User,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { unbanCustomer } from "@/app/actions/customers";
import { btn } from "@/components/btn";
import { CustomerNoteForm } from "./[id]/customer-client";
import { StatusChip } from "@/components/status-chip";
import { useToast } from "@/components/toast";
import type { CustomerPreview, CustomerRow } from "@/lib/customers";
import { digits, fill, orderDate } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import { statusLabel, statusTone } from "@/lib/order-status";
import { Pager } from "../orders/orders-parts";

type CT = Dict["customers"];

interface Props {
  lang: AdminLang;
  t: CT;
  query: CustomerListQuery;
  total: number;
  pages: number;
  pageSize: number;
  rows: CustomerRow[];
  phoneRows: CustomerRow[];
  splitRows: CustomerRow[];
  preview: CustomerPreview | null;
}

const BADGE = {
  ok: "bg-badge-ok-bg text-badge-ok-fg",
  warn: "bg-badge-warn-bg text-badge-warn-fg",
  danger: "bg-badge-danger-bg text-badge-danger-fg",
  outline: "border-border text-foreground bg-white",
} as const;

function Badge({
  tone,
  small,
  className,
  children,
}: {
  tone: keyof typeof BADGE;
  small?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center gap-1.5 rounded-sm border border-transparent px-2 font-medium whitespace-nowrap",
        small ? "h-[18px] text-[11px] leading-[14px]" : "h-[22px] text-xs leading-4",
        BADGE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The first letter as people read it ("রা" for রাফিয়া), from a grapheme, not a code unit. */
function initial(name: string): string {
  const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const first = seg.segment(name.trim())[Symbol.iterator]().next().value?.segment ?? "?";
  return first.toUpperCase();
}

function Avatar({ c, large }: { c: { name: string }; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full bg-[#e5e5e5] font-semibold text-[#404040]",
        large ? "size-10 text-sm" : "size-8 text-xs",
      )}
    >
      {initial(c.name)}
    </span>
  );
}

/** ফেরত: "নেই" outline, 1 warn, 2+ danger (Customers boards). */
const returnTone = (n: number) => (n === 0 ? "outline" : n >= 2 ? "danger" : "warn");

export function CustomersView(p: Props) {
  const { lang, t, query: q, total, preview } = p;
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [previewOpen, setPreviewOpen] = useState(true);
  const [search, setSearch] = useState(q.q);

  function urlWith(patch: Record<string, string | number | undefined>): string {
    const cur: Record<string, string | number | undefined> = {
      q: q.q || undefined,
      sort: q.sort === "last" ? undefined : q.sort,
      sel: q.sel,
    };
    const next = { ...cur, page: undefined, n: undefined, ...patch };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next))
      if (v !== undefined && v !== "" && v !== 1) sp.set(k, String(v));
    const s = sp.toString();
    return s ? `${pathname}?${s}` : pathname;
  }
  const go = (patch: Record<string, string | number | undefined>) =>
    router.replace(urlWith(patch) as Route, { scroll: false });

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

  const n = (x: number) => digits(x, lang);
  const sub = fill(t.sub, { n: n(total) });
  const detailHref = (id: string) => `/customers/${id}` as Route;
  const lastLine = (c: CustomerRow) =>
    c.lastOrder
      ? fill(t.ordersLine, { n: n(c.orders), d: orderDate(c.lastOrder, lang, false) })
      : fill(t.ordersOnly, { n: n(c.orders) });
  const from = total ? (q.page - 1) * p.pageSize + 1 : 0;
  const rangeText = fill(t.range, {
    total: n(total),
    a: n(from),
    b: n(Math.min(total, from + p.rows.length - 1)),
  });

  const searchBox = (large: boolean, short: boolean, className?: string) => (
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
        placeholder={short ? t.searchPhShort : t.searchPh}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="placeholder:text-muted-foreground min-w-0 flex-auto bg-transparent outline-none"
      />
    </label>
  );

  const sortMenu = (large: boolean) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          large
            ? btn({ variant: "outline", size: "lg" })
            : "border-input flex h-9 w-[200px] items-center justify-between gap-2 rounded-md border bg-white px-3 text-left text-sm shadow-xs"
        }
      >
        {large ? <ListFilter aria-hidden /> : null}
        <span>{fill(t.sortLabel, { s: t.sorts[q.sort] })}</span>
        {large ? null : <ChevronDown className="text-muted-foreground size-4" aria-hidden />}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={large ? "end" : "start"}
        className="w-[200px] rounded-lg p-1 shadow-md"
      >
        {CUSTOMER_SORTS.map((s: CustomerSort) => (
          <DropdownMenuItem
            key={s}
            onSelect={() => go({ sort: s === "last" ? undefined : s, sel: undefined })}
            className={cn(
              "focus:bg-accent gap-2 rounded-sm px-2",
              large ? "h-11 text-[15px]" : "h-8 text-sm",
            )}
          >
            <Check className={cn("size-4", s === q.sort ? "" : "invisible")} aria-hidden />
            {t.sorts[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const header = (
    <div className="flex-none">
      <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
      <p className="text-muted-foreground text-[13px] leading-4">{sub}</p>
    </div>
  );

  const empty = (
    <div className="p-8 text-center">
      <p className="font-medium">{t.empty}</p>
      {q.q ? <p className="text-muted-foreground mt-1 text-xs leading-4">{t.emptySub}</p> : null}
    </div>
  );

  const th = "text-muted-foreground h-10 px-3 text-left text-[13px] font-medium whitespace-nowrap";

  const pagerRow = (large: boolean) => (
    <div className="flex flex-none flex-wrap items-center justify-between gap-4">
      <span className="text-muted-foreground text-xs leading-4">{rangeText}</span>
      <Pager page={q.page} pages={p.pages} href={(x) => urlWith({ page: x })} t={t} large={large} />
    </div>
  );

  return (
    <>
      {/* ───── Phone (<768): Customers-Phone. Header and search stay; the list scrolls. ───── */}
      <div className="tab:hidden flex h-full flex-col">
        <header className="border-border flex h-14 flex-none items-center gap-2 border-b bg-white pr-2 pl-1">
          <Link
            href="/more"
            aria-label={t.backMore}
            className={btn({ variant: "ghost", size: "iconLg", className: "[&_svg]:size-5" })}
          >
            <ChevronLeft aria-hidden />
          </Link>
          <div className="flex min-w-0 flex-auto flex-col leading-[1.1]">
            <b className="text-lg leading-6 font-semibold">{t.title}</b>
            <span className="text-muted-foreground text-xs leading-4">{sub}</span>
          </div>
        </header>
        <div className="border-border flex-none border-b bg-white px-4 py-3">
          {searchBox(true, false)}
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            <div className="border-border overflow-hidden rounded-xl border bg-white">
              {p.phoneRows.length === 0 ? empty : null}
              {p.phoneRows.map((c) => (
                <Link
                  key={c.id}
                  href={detailHref(c.id)}
                  className="border-border flex min-h-[72px] items-center gap-3 border-b px-4 py-3 last:border-b-0"
                >
                  <Avatar c={c} large />
                  <span className="flex min-w-0 flex-auto flex-col gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{c.name}</span>
                      {c.returns ? (
                        <Badge tone={returnTone(c.returns)} className="h-5">
                          {fill(t.returnBadge, { n: n(c.returns) })}
                        </Badge>
                      ) : null}
                      {c.banned ? (
                        <Badge tone="danger" className="h-5">
                          {t.banned}
                        </Badge>
                      ) : null}
                    </span>
                    {c.phone ? (
                      <span className="text-muted-foreground font-mono text-xs tabular-nums">
                        {c.phone}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground truncate text-xs leading-4">
                      {c.email} · {t.via[c.via]}
                    </span>
                    <span className="text-muted-foreground text-xs leading-4">{lastLine(c)}</span>
                  </span>
                  <span className="flex-none font-medium tabular-nums">{formatTaka(c.spent)}</span>
                </Link>
              ))}
            </div>
            {p.phoneRows.length < total ? (
              <Link
                href={urlWith({ n: q.n + 20 }) as Route}
                scroll={false}
                className={btn({ variant: "outline", size: "lg", block: true })}
              >
                {t.loadMore}
              </Link>
            ) : null}
          </div>
        </ScrollArea>
      </div>

      {/* ───── Tablet 834 (768–1023): Customers-Tablet. Header, search and pager stay. ───── */}
      <div className="tab:flex desk:hidden hidden h-full min-h-0 flex-col gap-4 px-6 pt-5 pb-5">
        {header}
        <div className="flex flex-none gap-2">
          {searchBox(true, true, "flex-auto")}
          {sortMenu(true)}
        </div>
        <ScrollArea className="border-border !min-h-0 !flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-[1] bg-white shadow-[inset_0_-1px_0_var(--border)]">
              <tr>
                <th className={th}>{t.col.nameEmail}</th>
                <th className={th}>{t.col.phone}</th>
                <th className={cn(th, "text-right")}>{t.col.orders}</th>
                <th className={cn(th, "text-right")}>{t.col.spent}</th>
                <th className={th}>{t.col.returns}</th>
                <th className={th}>{t.col.state}</th>
                <th className={cn(th, "w-[1%]")} />
              </tr>
            </thead>
            <tbody>
              {p.rows.map((c) => (
                <tr key={c.id} className="border-border h-16 border-b last:border-b-0 [&>td]:p-3">
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar c={c} />
                      <div className="min-w-0">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-muted-foreground text-xs leading-4">
                          {c.email} · {t.via[c.via]}
                        </div>
                        <Badge small tone={c.verified ? "outline" : "warn"}>
                          {c.verified ? t.verified : t.unverified}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs whitespace-nowrap tabular-nums">
                    {c.phone ?? "—"}
                  </td>
                  <td className="text-right tabular-nums">{c.orders}</td>
                  <td className="text-right font-medium whitespace-nowrap tabular-nums">
                    {formatTaka(c.spent)}
                  </td>
                  <td>
                    <Badge tone={returnTone(c.returns)}>
                      {c.returns ? fill(t.returnsN, { n: n(c.returns) }) : t.noReturns}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={c.banned ? "danger" : "ok"}>
                      {c.banned ? t.banned : t.active}
                    </Badge>
                  </td>
                  <td className="w-[1%]">
                    <Link
                      href={detailHref(c.id)}
                      aria-label={fill(t.openAria, { name: c.name })}
                      className={btn({ variant: "ghost", size: "iconLg" })}
                    >
                      <ChevronRight aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {p.rows.length === 0 ? empty : null}
        </ScrollArea>
        {pagerRow(true)}
      </div>

      {/* ───── Split view (1024–1439): Customers-Tablet1194 ───── */}
      {/* Owner request (2026-11-13): resizable list/preview; the preview can be closed. */}
      <div className="desk:max-wide:flex hidden h-full min-h-0">
        <ResizablePanelGroup orientation="horizontal" id="customers-split">
          <ResizablePanel id="list" defaultSize={380} minSize={300} maxSize="65">
            <div className="flex h-full min-w-0 flex-col bg-white">
              <div className="border-border flex flex-none flex-col gap-2 border-b bg-white p-3">
                {searchBox(true, true)}
                <span className="text-muted-foreground text-xs leading-4">
                  {fill(t.sorted, { n: n(total), s: t.sorts[q.sort] })}
                </span>
              </div>
              <ScrollArea className="min-h-0 flex-auto">
                {p.splitRows.length === 0 ? empty : null}
                {p.splitRows.map((c) => {
                  const on = previewOpen && preview?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-current={on || undefined}
                      onClick={() => {
                        setPreviewOpen(true);
                        go({ sel: c.id });
                      }}
                      className={cn(
                        "border-border flex min-h-[72px] w-full gap-3 border-b bg-white px-4 py-3.5 text-left",
                        on && "bg-primary-soft shadow-[inset_3px_0_0_var(--primary)]",
                      )}
                    >
                      <Avatar c={c} />
                      <span className="flex min-w-0 flex-auto flex-col gap-0.5">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{c.name}</span>
                          <span className="font-medium tabular-nums">{formatTaka(c.spent)}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground font-mono text-xs tabular-nums">
                            {c.phone ?? ""}
                          </span>
                          {c.returns ? (
                            <Badge tone={returnTone(c.returns)}>
                              {fill(t.returnBadge, { n: n(c.returns) })}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground text-xs leading-4">
                          {lastLine(c)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Badge small tone="outline">
                            {t.via[c.via]}
                          </Badge>
                          {c.banned ? (
                            <Badge small tone="danger">
                              {t.banned}
                            </Badge>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </ScrollArea>
            </div>
          </ResizablePanel>
          {previewOpen ? (
            <>
              <ResizableHandle withHandle className="bg-border w-px" />
              <ResizablePanel id="preview" minSize={420}>
                <ScrollArea className="bg-subtle h-full">
                  <div className="@container flex min-w-0 flex-col gap-4 px-6 pt-5 pb-8">
                    {preview ? (
                      <Preview
                        c={preview}
                        t={t}
                        lang={lang}
                        pending={pending}
                        onClose={() => setPreviewOpen(false)}
                        onCopied={() => toast({ tone: "ok", title: t.copied })}
                        onUnban={() =>
                          start(async () => {
                            try {
                              await unbanCustomer({ userId: preview.id });
                              toast({ tone: "ok", title: t.unbanned });
                            } catch {
                              toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
                            }
                          })
                        }
                        onBan={() => router.push(`/customers/${preview.id}?ban=1` as Route)}
                      />
                    ) : (
                      <p className="text-muted-foreground text-sm">{t.pickOne}</p>
                    )}
                  </div>
                </ScrollArea>
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
      </div>

      {/* ───── Desktop (≥1440): Customers-Desktop. Header, toolbar and pager stay. ───── */}
      <div className="wide:flex hidden h-full min-h-0 flex-col gap-4 px-8 pt-6 pb-6">
        {header}
        <div className="flex flex-none flex-wrap items-center gap-2">
          {searchBox(false, false, "w-[320px]")}
          {sortMenu(false)}
        </div>
        <ScrollArea className="border-border !min-h-0 !flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead className="sticky top-0 z-[1] bg-white shadow-[inset_0_-1px_0_var(--border)]">
              <tr>
                <th className={th}>{t.col.name}</th>
                <th className={th}>{t.col.email}</th>
                <th className={th}>{t.col.phone}</th>
                <th className={th}>{t.col.signup}</th>
                <th className={cn(th, "text-right")}>{t.col.orders}</th>
                <th className={cn(th, "text-right")}>{t.col.spent}</th>
                <th className={th}>{t.col.last}</th>
                <th className={th}>{t.col.returns}</th>
                <th className={th}>{t.col.state}</th>
                <th className={cn(th, "w-[1%]")} />
              </tr>
            </thead>
            <tbody>
              {p.rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-border hover:bg-subtle border-b last:border-b-0 [&>td]:px-3 [&>td]:py-2.5"
                >
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span role="img" aria-label={t.photo}>
                        <Avatar c={c} />
                      </span>
                      <div className="min-w-0">
                        <Link href={detailHref(c.id)} className="text-foreground font-medium">
                          {c.name}
                        </Link>
                        {c.area ? (
                          <div className="text-muted-foreground text-xs leading-4">{c.area}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-xs leading-4">{c.email}</div>
                    <span
                      className={cn(
                        "text-[11px] leading-[14px]",
                        c.verified && "text-muted-foreground",
                      )}
                    >
                      {c.verified ? t.verified : t.unverified}
                    </span>
                  </td>
                  <td className="font-mono text-xs whitespace-nowrap tabular-nums">
                    {c.phone ?? "—"}
                  </td>
                  <td>
                    <Badge tone="outline">{t.via[c.via]}</Badge>
                  </td>
                  <td className="text-right tabular-nums">{c.orders}</td>
                  <td className="text-right font-medium whitespace-nowrap tabular-nums">
                    {formatTaka(c.spent)}
                  </td>
                  <td className="whitespace-nowrap">
                    {c.lastOrder ? orderDate(c.lastOrder, lang, false) : "—"}
                  </td>
                  <td>
                    <Badge tone={returnTone(c.returns)}>
                      {c.returns ? fill(t.returnsN, { n: n(c.returns) }) : t.noReturns}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={c.banned ? "danger" : "ok"}>
                      {c.banned ? t.banned : t.active}
                    </Badge>
                  </td>
                  <td className="w-[1%]">
                    <Link href={detailHref(c.id)} className={btn({ variant: "ghost", size: "xs" })}>
                      {t.view}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {p.rows.length === 0 ? empty : null}
        </ScrollArea>
        {pagerRow(false)}
      </div>
    </>
  );
}

/** Customers-Tablet1194 right pane: the chosen customer, from the database. */
function Preview({
  c,
  t,
  lang,
  pending,
  onClose,
  onCopied,
  onUnban,
  onBan,
}: {
  c: CustomerPreview;
  t: CT;
  lang: AdminLang;
  pending: boolean;
  onClose: () => void;
  onCopied: () => void;
  onUnban: () => void;
  onBan: () => void;
}) {
  const n = (x: number) => digits(x, lang);
  const sec = "border-border flex flex-col gap-2.5 rounded-xl border bg-white p-4";
  const secT = "text-[15px] font-semibold";
  const kcard =
    "border-border flex min-w-0 flex-col gap-1.5 rounded-xl border bg-white p-4 shadow-xs";
  return (
    <>
      {/* Owner request (2026-11-13): open full page + close; kept off the board's header row. */}
      <div className="-mt-2 -mb-2 flex justify-end gap-1">
        <Link
          href={`/customers/${c.id}` as Route}
          className={btn({ variant: "ghost", size: "sm" })}
        >
          <Maximize2 aria-hidden />
          <span className="@max-[34rem]:sr-only">{t.openFull}</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.closePreview}
          title={t.closePreview}
          className={btn({ variant: "ghost", size: "iconSm" })}
        >
          <X aria-hidden />
        </button>
      </div>
      <div className="flex items-center gap-3">
        {c.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- account photos come from any host
          <img
            src={c.image}
            alt={t.customerPhoto}
            className="size-12 flex-none rounded-full object-cover"
          />
        ) : (
          <span
            role="img"
            aria-label={t.customerPhoto}
            className="flex size-12 flex-none items-center justify-center rounded-full bg-[repeating-linear-gradient(135deg,#f5f5f5_0_8px,#efefef_8px_16px)] text-[#8a8a8a]"
          >
            <User className="size-4" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-auto">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg leading-7 font-semibold">{c.name}</h1>
            {c.banned ? <Badge tone="danger">{t.banned}</Badge> : null}
          </div>
          <p className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs leading-4">
            <span>{c.email}</span>·
            <Badge small tone={c.verified ? "ok" : "warn"}>
              {c.verified ? t.verified : t.unverified}
            </Badge>
            · <span>{t.via[c.via]}</span>
            {c.phone ? (
              <>
                · <span className="font-mono tabular-nums">{c.phone}</span>
              </>
            ) : null}
          </p>
        </div>
        {c.phone ? (
          <>
            <a href={`tel:${c.phone}`} className={btn({ size: "lg" })}>
              {t.call}
            </a>
            <button
              type="button"
              aria-label={t.copyPhone}
              title={t.copyPhone}
              onClick={() => {
                void navigator.clipboard.writeText(c.phone ?? "").then(onCopied);
              }}
              className={btn({ variant: "outline", size: "iconLg" })}
            >
              <Copy aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      {c.returns >= 2 ? (
        <div className="flex items-start gap-3 rounded-[10px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[#78350f]">
          <AlertTriangle className="mt-0.5 size-4 flex-none" aria-hidden />
          <div>
            <div className="font-medium">{t.highReturn}</div>
            <div className="text-xs leading-4">
              {fill(t.highReturnSub, { n: n(c.orders), r: n(c.returns) })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2.5">
        <div className={kcard}>
          <span className="text-muted-foreground text-xs leading-4">{t.kOrders}</span>
          <span className="text-xl font-semibold tabular-nums">{c.orders}</span>
        </div>
        <div className={kcard}>
          <span className="text-muted-foreground text-xs leading-4">{t.kSpent}</span>
          <span className="text-xl font-semibold tabular-nums">{formatTaka(c.spent)}</span>
        </div>
        <div className={cn(kcard, c.returns > 0 && "border-[#fecaca]")}>
          <span
            className={cn(
              "text-xs leading-4",
              c.returns > 0 ? "text-[#991b1b]" : "text-muted-foreground",
            )}
          >
            {t.kReturns}
          </span>
          <span
            className={cn("text-xl font-semibold tabular-nums", c.returns > 0 && "text-[#991b1b]")}
          >
            {c.returns}
          </span>
        </div>
      </div>

      <div className="border-border overflow-hidden rounded-xl border bg-white">
        <div className={cn(secT, "px-4 pt-3.5 pb-2")}>{t.ordersTitle}</div>
        {c.orderList.length === 0 ? (
          <p className="text-muted-foreground border-border border-t px-4 py-3 text-xs leading-4">
            {t.noOrders}
          </p>
        ) : null}
        {c.orderList.map((o) => {
          const tone = statusTone(o.status);
          return (
            <Link
              key={o.id}
              href={`/orders/${o.id}` as Route}
              className="border-border hover:bg-subtle flex min-h-14 items-center gap-3 border-t px-4 py-3"
            >
              <span className="min-w-[84px] flex-none font-mono text-xs font-medium whitespace-nowrap tabular-nums">
                {o.number}
              </span>
              <span className="text-muted-foreground min-w-0 flex-auto text-xs leading-4">
                {orderDate(o.createdAt, lang, false)}
              </span>
              <StatusChip tone={tone} label={statusLabel(tone, lang)} />
              <span className="w-[70px] flex-none text-right font-medium tabular-nums">
                {formatTaka(o.total)}
              </span>
            </Link>
          );
        })}
      </div>

      <div className={cn(sec, c.banned && "border-[#fecaca]")}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className={cn(secT, c.banned && "text-[#991b1b]")}>{t.banTitle}</div>
            {c.banned && (c.banExpires || c.banReason) ? (
              <div className="text-muted-foreground text-xs leading-4">
                {[
                  c.banExpires ? fill(t.banUntil, { d: orderDate(c.banExpires, lang, false) }) : "",
                  c.banReason ?? "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={c.banned}
            aria-label={t.banTitle}
            disabled={pending}
            onClick={c.banned ? onUnban : onBan}
            className={cn(
              "inline-flex h-[26px] w-11 flex-none items-center rounded-full p-0.5 disabled:opacity-50",
              c.banned ? "bg-primary justify-end" : "justify-start bg-[#e5e5e5]",
            )}
          >
            <span className="size-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)]" />
          </button>
        </div>
        {c.banned ? (
          <Link
            href={`/customers/${c.id}?ban=1` as Route}
            className={btn({ variant: "outline", size: "lg", className: "self-start" })}
          >
            {t.banEdit}
          </Link>
        ) : null}
      </div>

      <div className={sec}>
        <div className={secT}>
          {t.reviewsTitle}{" "}
          {c.reviews.length ? (
            <span className="text-muted-foreground text-xs font-normal">
              {fill(t.reviewsN, { n: n(c.reviews.length) })}
            </span>
          ) : null}
        </div>
        {c.reviews.length === 0 ? (
          <p className="text-muted-foreground text-xs leading-4">{t.noReviews}</p>
        ) : null}
        {c.reviews.map((r) => (
          <p key={r.key} className="text-xs leading-5">
            <span className="font-medium">
              ★ {r.rating} · {r.product ?? t.site}:
            </span>{" "}
            {r.text}{" "}
            <Badge tone={r.approved ? "ok" : "warn"}>
              {r.approved ? t.approved : t.pendingReview}
            </Badge>
          </p>
        ))}
      </div>

      <div className={sec}>
        <div className={secT}>{t.addrTitle}</div>
        {c.addresses.length === 0 ? (
          <p className="text-muted-foreground text-xs leading-4">{t.noAddr}</p>
        ) : null}
        {c.addresses.map((a) => (
          <p key={a.id} className="text-xs leading-5">
            {a.label || a.isDefault ? (
              <>
                {a.label ? <span className="font-medium">{a.label}</span> : null}{" "}
                {a.isDefault ? (
                  <Badge tone="outline" className="bg-primary border-transparent text-white">
                    {t.defaultAddr}
                  </Badge>
                ) : null}
                <br />
              </>
            ) : null}
            {a.fullName} · <span className="font-mono tabular-nums">{a.phone}</span>
            <br />
            {a.lines}
          </p>
        ))}
      </div>

      <div className={sec}>
        <div className={secT}>{t.notes}</div>
        {c.notes.map((x) => (
          <div key={x.id} className="border-border rounded-[10px] border bg-[#fafafa] px-3 py-2.5">
            <div className="text-xs leading-4">
              <span className="font-medium">{x.by ?? "—"}</span>{" "}
              <span className="text-muted-foreground">· {orderDate(x.at, lang, false)}</span>
            </div>
            <p className="text-sm leading-5 whitespace-pre-wrap">{x.body}</p>
          </div>
        ))}
        <CustomerNoteForm userId={c.id} t={t} compact />
      </div>
    </>
  );
}
