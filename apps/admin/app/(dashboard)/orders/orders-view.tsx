"use client";

import type { AdminRole } from "@repo/auth";
import { formatTaka, cn } from "@repo/ui/lib/utils";
import type { AdminLang, OrderListQuery, OrderTab } from "@repo/validators";
import {
  CalendarDays,
  Maximize2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { advanceOrders, countFilteredOrders, undoAdvance } from "@/app/actions/orders";
import { btn } from "@/components/btn";
import { NeedsStorage } from "@/components/needs-storage";
import { StatusChip } from "@/components/status-chip";
import { useToast } from "@/components/toast";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components/resizable";
import { DateRangeCalendar } from "@/components/date-range-calendar";
import { PhoneHeader } from "@/components/shell/page";
import { digits, fill, orderDate } from "@/lib/format";
import type { OrderPreview, OrderRow } from "@/lib/orders";
import { statusLabel, statusTone } from "@/lib/order-status";
import {
  AreaPopover,
  CANCELLABLE,
  CancelDialog,
  dateLabel,
  Check16,
  chip,
  DatePopover,
  inputCls,
  Pager,
  PRESETS,
  Radio,
  RowMenu,
  type OT,
} from "./orders-parts";
import { AttentionBoard, StatusMenu } from "./attention";

const SHEET_STATUSES: OrderTab[] = ["new", "confirmed", "packed", "booked", "transit", "delivered"];

type Step = "confirm" | "pack";
const STEP_OF: Partial<Record<OrderRow["status"], Step | "book">> = {
  pending: "confirm",
  confirmed: "pack",
  processing: "book",
};

interface Props {
  lang: AdminLang;
  t: OT;
  role: AdminRole;
  query: OrderListQuery;
  counts: Record<OrderTab, number>;
  /** Counts across all orders, for the attention board. */
  attention: Record<OrderTab, number>;
  total: number;
  pages: number;
  rows: OrderRow[];
  splitRows: OrderRow[];
  phoneRows: OrderRow[];
  preview: OrderPreview | null;
}

export function OrdersView(p: Props) {
  const { lang, t, role, query: q, counts, total, preview, attention } = p;
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [, start] = useTransition();
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [cancelling, setCancelling] = useState<{ id: number; number: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [sheet, setSheet] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [search, setSearch] = useState(q.q);

  /** Builds this page's URL with some query values changed (page resets unless given). */
  function urlWith(patch: Record<string, string | number | undefined>): string {
    const cur: Record<string, string | number | undefined> = {
      status: q.status === "all" ? undefined : q.status,
      multi: q.multi?.length ? q.multi.join(",") : undefined,
      q: q.q || undefined,
      date: q.date,
      from: q.from,
      to: q.to,
      zone: q.zone,
      sel: q.sel,
    };
    const next = { ...cur, page: undefined, n: undefined, ...patch };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next))
      if (v !== undefined && v !== "" && v !== 1) sp.set(k, String(v));
    const s = sp.toString();
    return s ? `${pathname}?${s}` : pathname;
  }
  const go = (patch: Record<string, string | number | undefined>) => {
    setSel(new Set());
    router.replace(urlWith(patch) as Route, { scroll: false });
  };

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

  const filtersOn = Boolean(q.q || q.date || q.zone || q.multi?.length);
  const filterCount = (q.date ? 1 : 0) + (q.zone ? 1 : 0) + (q.multi?.length ? 1 : 0);
  const resetFilters = () => {
    setSearch("");
    go({
      q: undefined,
      date: undefined,
      from: undefined,
      to: undefined,
      zone: undefined,
      multi: undefined,
    });
  };
  const applyPatch = (patch: Record<string, string | undefined>) => go(patch);

  function advance(ids: number[], step: Step, numbers: string[]) {
    start(async () => {
      try {
        const { moved } = await advanceOrders({ ids, step });
        setSel(new Set());
        if (!moved.length) return;
        const label = statusLabel(step === "confirm" ? "conf" : "pack", lang);
        const one = moved.length === 1;
        toast({
          tone: "ok",
          title: one
            ? step === "confirm"
              ? t.toastConfirmed
              : t.toastPacked
            : fill(step === "confirm" ? t.toastConfirmedN : t.toastPackedN, {
                n: digits(moved.length, lang),
              }),
          ...(one
            ? { sub: fill(t.toastNow, { id: numbers[ids.indexOf(moved[0] ?? 0)] ?? "", v: label }) }
            : {}),
          action: {
            label: t.undo,
            onClick: () => start(async () => void (await undoAdvance({ ids: moved, step }))),
          },
        });
      } catch {
        toast({
          tone: "err",
          title: t.saveFailed,
          sub: t.saveFailedSub,
          action: { label: t.again, onClick: () => advance(ids, step, numbers) },
        });
      }
    });
  }

  const rowAction = (o: OrderRow) => STEP_OF[o.status];
  const runRow = (o: OrderRow) => {
    const s = rowAction(o);
    if (s === "confirm" || s === "pack") advance([o.id], s, [o.number]);
  };

  const pageIds = p.rows.map((r) => r.id);
  const allOn = pageIds.length > 0 && pageIds.every((id) => sel.has(id));
  const someOn = pageIds.some((id) => sel.has(id));
  const toggle = (id: number) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = () => setSel(allOn ? new Set() : new Set(pageIds));
  const selRows = p.rows.filter((r) => sel.has(r.id));
  const selPending = selRows.filter((r) => r.status === "pending");

  const tabLabel = (tab: OrderTab, short = false) =>
    short && (tab === "booked" || tab === "problem") ? t.tabsShort[tab] : t.tabs[tab];
  const rangeText = fill(t.range, {
    t: digits(total, lang),
    a: digits(total ? (q.page - 1) * 10 + 1 : 0, lang),
    b: digits(Math.min(q.page * 10, total), lang),
  });
  const empty = (
    <EmptyState q={q} t={t} tab={tabLabel(q.status)} filtersOn={filtersOn} onClear={resetFilters} />
  );

  const current: OrderTab | null = q.multi?.length ? null : q.status;
  const statusHref = (tab: OrderTab, extra: Record<string, undefined> = {}) =>
    urlWith({ status: tab === "all" ? undefined : tab, multi: undefined, ...extra });
  const board = (compact?: boolean) => (
    <AttentionBoard
      counts={attention}
      current={current}
      t={t}
      href={(tab) => statusHref(tab, { q: undefined, sel: undefined })}
      {...(compact ? { compact } : {})}
    />
  );

  return (
    <>
      <PhoneHeader
        title={t.title}
        sub={fill(t.phoneSub, { n: digits(total, lang) })}
        end={
          <Link
            href={"/orders/new" as Route}
            aria-label={t.create.button}
            className={btn({ size: "iconLg", className: "[&_svg]:size-5" })}
          >
            <Plus aria-hidden />
          </Link>
        }
      />

      {/* ───── Phone (<768): Orders-Phone ───── */}
      <div className="tab:hidden">
        {attention.new + attention.confirmed + attention.packed + attention.problem > 0 ? (
          <div className="px-4 pt-4">{board(true)}</div>
        ) : null}
        <div className="border-border flex flex-col gap-2.5 border-b bg-white px-4 py-3">
          <div className="flex gap-2">
            <SearchBox value={search} onChange={setSearch} t={t} short large />
            <FilterButton t={t} n={filterCount} lang={lang} onClick={() => setSheet(true)} />
          </div>
          <StatusMenu
            counts={counts}
            current={current}
            t={t}
            href={(tab) => statusHref(tab)}
            large
            block
          />
        </div>
        <div className="flex flex-col gap-3 p-4">
          {p.phoneRows.length === 0 ? empty : null}
          {p.phoneRows.map((o) => (
            <PhoneCard key={o.id} o={o} t={t} lang={lang} onAction={() => runRow(o)} />
          ))}
          {p.phoneRows.length < total ? (
            <Link
              href={urlWith({ n: q.n + 10, page: undefined }) as Route}
              scroll={false}
              className={btn({ variant: "outline", size: "lg", block: true })}
            >
              {t.loadMore}
            </Link>
          ) : null}
        </div>
      </div>

      {/* ───── Split view (1024–1439): Orders-Tablet1194 ───── */}
      {/* Owner request (2026-11-13): resizable list/preview with a divider; the preview can be closed. */}
      <div className="desk:max-wide:flex hidden h-full min-h-0">
        <ResizablePanelGroup orientation="horizontal" id="orders-split">
          <ResizablePanel id="list" defaultSize={380} minSize={300} maxSize="65">
            {/* Owner request: board and filters stay fixed; only the order list scrolls. */}
            <div className="flex h-full min-w-0 flex-col bg-white">
              <div className="flex-none">
                {attention.new + attention.confirmed + attention.packed + attention.problem > 0 ? (
                  <div className="p-3 pb-0">{board(true)}</div>
                ) : null}
                <div className="border-border flex flex-col gap-2.5 border-b bg-white p-3">
                  <div className="flex gap-2">
                    <SearchBox value={search} onChange={setSearch} t={t} short large />
                    <Link
                      href={"/orders/new" as Route}
                      aria-label={t.create.button}
                      className={btn({ size: "iconLg", className: "[&_svg]:size-5" })}
                    >
                      <Plus aria-hidden />
                    </Link>
                  </div>
                  <StatusMenu
                    counts={counts}
                    current={current}
                    t={t}
                    href={(tab) => statusHref(tab, { sel: undefined })}
                    large
                    block
                  />
                  <div className="flex gap-2">
                    <DatePopover q={q} t={t} lang={lang} apply={applyPatch} large />
                    <AreaPopover q={q} t={t} apply={applyPatch} large />
                  </div>
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-auto">
                {p.splitRows.length === 0 ? <div className="p-3">{empty}</div> : null}
                {p.splitRows.map((o) => {
                  const on = previewOpen && p.preview?.id === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      aria-current={on || undefined}
                      onClick={() => {
                        setPreviewOpen(true);
                        router.replace(urlWith({ sel: o.id }) as Route, { scroll: false });
                      }}
                      className={cn(
                        "border-border flex min-h-[72px] w-full gap-3 border-b bg-white px-4 py-3.5 text-left",
                        on && "bg-primary-soft shadow-[inset_3px_0_0_var(--primary)]",
                      )}
                    >
                      <span className="flex min-w-0 flex-auto flex-col gap-[3px]">
                        <span className="flex items-center justify-between gap-2">
                          <span className="tabular font-mono text-[13px] font-medium">
                            {o.number}
                          </span>
                          <span className="tabular font-medium">{formatTaka(o.total)}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate">{o.name}</span>
                          <StatusChip
                            tone={statusTone(o.status)}
                            label={statusLabel(statusTone(o.status), lang)}
                          />
                        </span>
                        <span className="text-muted-foreground truncate text-xs leading-4">
                          {o.area} · {orderDate(o.createdAt, lang, false)}
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
                        o={preview}
                        t={t}
                        lang={lang}
                        onStep={(s) => advance([preview.id], s, [preview.number])}
                        onCancel={() => setCancelling({ id: preview.id, number: preview.number })}
                        onClose={() => setPreviewOpen(false)}
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

      {/* ───── Tablet (768–1023) and desktop (≥1440): Orders-Tablet / Orders-Desktop ───── */}
      {/* Owner request: board, header, filters and pager stay fixed; only the table scrolls. */}
      <div className="max-tab:hidden desk:max-wide:hidden tab:gap-3.5 tab:px-6 tab:pt-5 tab:pb-5 wide:gap-4 wide:px-8 wide:pt-6 wide:pb-6 flex h-full min-h-0 flex-col [&>*]:flex-none">
        {board()}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
            <p className="text-muted-foreground text-[13px] leading-4">
              {fill(t.sub, { n: digits(total, lang) })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NeedsStorage />
            <button
              type="button"
              disabled
              className={btn({
                variant: "outline",
                size: "lg",
                className: "wide:h-8 wide:gap-1.5 wide:px-3 wide:text-[13px]",
              })}
            >
              <RefreshCw aria-hidden />
              {t.courierSync}
            </button>
            {role === "owner" ? (
              <button
                type="button"
                disabled
                className={btn({
                  variant: "outline",
                  size: "lg",
                  className: "wide:h-8 wide:gap-1.5 wide:px-3 wide:text-[13px]",
                })}
              >
                <Check aria-hidden />
                {t.settleCod}
              </button>
            ) : null}
            <Link
              href={"/orders/new" as Route}
              className={btn({
                size: "lg",
                className: "wide:h-8 wide:gap-1.5 wide:px-3 wide:text-[13px]",
              })}
            >
              <Plus aria-hidden />
              {t.create.button}
            </Link>
          </div>
        </div>

        {/* Toolbar: tablet = search + filter sheet; desktop = search + dashed filters + reset + range */}
        <div className="wide:hidden flex gap-2">
          <SearchBox value={search} onChange={setSearch} t={t} large />
          <StatusMenu
            counts={counts}
            current={current}
            t={t}
            href={(tab) => statusHref(tab)}
            large
          />
          <FilterButton t={t} n={filterCount} lang={lang} onClick={() => setSheet(true)} />
        </div>
        <div className="wide:flex hidden flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-80">
              <SearchBox value={search} onChange={setSearch} t={t} />
            </div>
            <StatusMenu counts={counts} current={current} t={t} href={(tab) => statusHref(tab)} />
            <DatePopover q={q} t={t} lang={lang} apply={applyPatch} />
            <AreaPopover q={q} t={t} apply={applyPatch} />
            <button
              type="button"
              onClick={resetFilters}
              className={btn({ variant: "ghost", size: "sm" })}
            >
              {t.reset}
            </button>
          </div>
          <span className="text-muted-foreground text-xs leading-4">{rangeText}</span>
        </div>

        {sel.size > 0 ? (
          <div
            role="region"
            aria-label={t.selectionBar}
            className="bg-foreground wide:px-3 wide:py-2 flex flex-wrap items-center gap-3 rounded-lg py-1.5 pr-2 pl-3.5 text-white"
          >
            <span className="font-medium">{fill(t.selected, { n: digits(sel.size, lang) })}</span>
            <span className="wide:block hidden h-4 w-px bg-white/25" />
            <span className="wide:hidden flex-auto" />
            <button
              type="button"
              disabled={selPending.length === 0}
              onClick={() =>
                advance(
                  selPending.map((r) => r.id),
                  "confirm",
                  selPending.map((r) => r.number),
                )
              }
              className={barBtn("dim")}
            >
              <Check aria-hidden className="wide:block hidden" />
              {t.confirm}
            </button>
            <button type="button" disabled title="needs storage" className={barBtn("light")}>
              <Truck aria-hidden className="wide:block hidden" />
              {fill(t.bookN, { n: digits(sel.size, lang) })}
            </button>
            <button type="button" disabled title="A5" className={barBtn("dim")}>
              <Printer aria-hidden className="wide:block hidden" />
              {t.printLabels}
            </button>
            <span className="wide:block hidden flex-auto" />
            <button
              type="button"
              onClick={() => setSel(new Set())}
              aria-label={t.clearSel}
              className="wide:h-7 wide:w-auto wide:px-2.5 wide:text-xs inline-flex size-11 items-center justify-center rounded-md font-medium text-[#d4d4d4]"
            >
              <X aria-hidden className="wide:hidden size-4" />
              <span className="wide:inline hidden">{t.clearSel}</span>
            </button>
          </div>
        ) : null}

        {p.rows.length === 0 ? (
          empty
        ) : (
          <ScrollArea className="border-border !min-h-0 !flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
            <table className="wide:min-w-[880px] w-full border-collapse">
              <thead className="sticky top-0 z-[1] bg-white shadow-[inset_0_-1px_0_var(--border)]">
                <tr className="text-muted-foreground text-left text-[13px]">
                  <th className="tab:px-2.5 wide:px-3 h-10 w-[1%]">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={allOn ? true : someOn ? "mixed" : false}
                      aria-label={t.selectAll}
                      onClick={toggleAll}
                      className="tab:size-11 wide:size-auto inline-flex items-center justify-center"
                    >
                      <Check16 state={allOn ? "on" : someOn ? "mixed" : "off"} />
                    </button>
                  </th>
                  <Th>{t.col.order}</Th>
                  <Th>{t.col.customer}</Th>
                  <Th className="wide:table-cell hidden">{t.col.area}</Th>
                  <Th className="wide:hidden text-right">{t.col.total}</Th>
                  <Th>{t.col.status}</Th>
                  <Th className="wide:table-cell hidden">{t.col.courier}</Th>
                  <Th className="wide:table-cell hidden text-right">{t.col.cod}</Th>
                  <th className="w-[1%]" />
                </tr>
              </thead>
              <tbody>
                {p.rows.map((o) => {
                  const on = sel.has(o.id);
                  const open = expanded.has(o.id);
                  const act = rowAction(o);
                  const tone = statusTone(o.status);
                  return (
                    <RowGroup key={o.id}>
                      <tr
                        className={cn(
                          "border-border tab:h-16 wide:h-auto border-b last:border-b-0",
                          on ? "bg-primary-soft" : "hover:bg-subtle",
                        )}
                      >
                        <Td className="w-[1%]">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            aria-label={fill(t.selectOne, { id: o.number })}
                            onClick={() => toggle(o.id)}
                            className="tab:size-11 wide:size-auto inline-flex items-center justify-center"
                          >
                            <Check16 state={on ? "on" : "off"} />
                          </button>
                        </Td>
                        <Td>
                          <Link
                            href={`/orders/${o.id}` as Route}
                            className="tabular text-foreground font-mono text-[13px] font-medium"
                          >
                            {o.number}
                          </Link>
                          <div className="text-muted-foreground text-xs leading-4">
                            {orderDate(o.createdAt, lang)}
                          </div>
                        </Td>
                        <Td>
                          <div className="font-medium">{o.name}</div>
                          <div className="tabular text-muted-foreground font-mono text-xs">
                            {o.phone}
                          </div>
                        </Td>
                        <Td className="wide:table-cell hidden">
                          <div>{o.area}</div>
                          {o.zone ? (
                            <div className="text-muted-foreground text-xs leading-4">
                              {t.zone[o.zone]}
                            </div>
                          ) : null}
                        </Td>
                        <Td className="wide:hidden text-right">
                          <div className="tabular font-medium">{formatTaka(o.total)}</div>
                        </Td>
                        <Td>
                          <StatusChip tone={tone} label={statusLabel(tone, lang)} />
                        </Td>
                        <Td className="wide:table-cell hidden">
                          {o.tracking ? (
                            <>
                              <div className="tabular font-mono text-xs">{o.tracking}</div>
                              {o.courier ? (
                                <div className="text-muted-foreground text-xs leading-4">
                                  {o.courier}
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </Td>
                        <Td className="wide:table-cell hidden text-right">
                          <div className="tabular font-medium">{formatTaka(o.total)}</div>
                          <div className="text-muted-foreground text-xs leading-4">
                            {fill(t.items, { n: digits(o.items, lang) })}
                          </div>
                        </Td>
                        <Td className="w-[1%]">
                          <div className="flex items-center justify-end gap-1">
                            {act ? (
                              <button
                                type="button"
                                disabled={act === "book"}
                                title={act === "book" ? "needs storage" : undefined}
                                onClick={() => runRow(o)}
                                className={btn({
                                  variant: "outline",
                                  size: "lg",
                                  className:
                                    "wide:h-7 wide:rounded-sm wide:px-2.5 wide:text-xs px-3.5",
                                })}
                              >
                                {t.act[act]}
                              </button>
                            ) : null}
                            <span className="wide:contents hidden">
                              <RowMenu
                                row={o}
                                t={t}
                                onCancel={() => setCancelling({ id: o.id, number: o.number })}
                              />
                            </span>
                            <button
                              type="button"
                              aria-expanded={open}
                              aria-label={open ? t.collapse : t.expand}
                              onClick={() =>
                                setExpanded((s) => {
                                  const n = new Set(s);
                                  if (n.has(o.id)) n.delete(o.id);
                                  else n.add(o.id);
                                  return n;
                                })
                              }
                              className={btn({
                                variant: "ghost",
                                size: "iconLg",
                                className: "wide:hidden",
                              })}
                            >
                              {open ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
                            </button>
                          </div>
                        </Td>
                      </tr>
                      {open ? (
                        <tr className="bg-subtle border-border wide:hidden border-b">
                          <td />
                          <td colSpan={5} className="px-2.5 pt-1 pb-4">
                            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                              <div>
                                <div className="text-muted-foreground text-[11px] leading-[14px]">
                                  {t.col.area}
                                </div>
                                <div>{o.area}</div>
                                {o.zone ? (
                                  <div className="text-muted-foreground text-xs leading-4">
                                    {t.zone[o.zone]}
                                  </div>
                                ) : null}
                              </div>
                              <div>
                                <div className="text-muted-foreground text-[11px] leading-[14px]">
                                  {t.col.courier}
                                </div>
                                <div className="tabular font-mono">{o.tracking ?? "—"}</div>
                                {o.courier ? (
                                  <div className="text-muted-foreground text-xs leading-4">
                                    {o.courier}
                                  </div>
                                ) : null}
                              </div>
                              <div>
                                <div className="text-muted-foreground text-[11px] leading-[14px]">
                                  {t.itemsTitle}
                                </div>
                                <div>{fill(t.items, { n: digits(o.items, lang) })}</div>
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Link
                                href={`/orders/${o.id}` as Route}
                                className={btn({ variant: "outline", size: "lg" })}
                              >
                                {t.details}
                              </Link>
                              <a
                                href={`tel:${o.phone}`}
                                className={btn({ variant: "ghost", size: "lg" })}
                              >
                                {t.call}
                              </a>
                              {CANCELLABLE.has(o.status) ? (
                                <button
                                  type="button"
                                  onClick={() => setCancelling({ id: o.id, number: o.number })}
                                  className={btn({
                                    variant: "ghost",
                                    size: "lg",
                                    className: "text-danger-text",
                                  })}
                                >
                                  {t.cancel}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </RowGroup>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-muted-foreground text-xs leading-4">
            <span className="wide:inline hidden">{t.perPage}</span>
            <span className="wide:hidden">{rangeText}</span>
          </span>
          <span className="wide:contents hidden">
            <Pager page={q.page} pages={p.pages} href={(n) => urlWith({ page: n })} t={t} />
          </span>
          <span className="wide:hidden contents">
            <Pager page={q.page} pages={p.pages} href={(n) => urlWith({ page: n })} t={t} large />
          </span>
        </div>
      </div>

      <FilterSheet
        open={sheet}
        onOpenChange={setSheet}
        q={q}
        t={t}
        lang={lang}
        counts={counts}
        apply={(patch) => {
          setSheet(false);
          go(patch);
        }}
      />
      <CancelDialog order={cancelling} t={t} onClose={() => setCancelling(null)} />
    </>
  );
}

function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("wide:px-3 h-10 px-2.5 font-medium whitespace-nowrap", className)}>
      {children}
    </th>
  );
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("wide:px-3 wide:py-2.5 px-2.5 py-2 align-middle", className)}>{children}</td>
  );
}

function barBtn(kind: "dim" | "light") {
  return cn(
    "inline-flex h-11 items-center gap-1.5 rounded-md px-3.5 text-[15px] font-medium disabled:opacity-50 wide:h-7 wide:rounded-sm wide:px-2.5 wide:text-xs [&_svg]:size-4",
    kind === "dim" ? "bg-white/12 text-white" : "text-foreground bg-white",
  );
}

function SearchBox({
  value,
  onChange,
  t,
  short,
  large,
}: {
  value: string;
  onChange: (v: string) => void;
  t: OT;
  short?: boolean;
  large?: boolean;
}) {
  return (
    <label
      className={cn(
        "border-input focus-within:border-primary flex min-w-0 flex-auto items-center gap-2 rounded-md border bg-white px-3 shadow-xs focus-within:shadow-[0_0_0_3px_var(--ring)]",
        large ? "h-11 text-[15px]" : "h-9 text-sm",
      )}
    >
      <Search className="text-muted-foreground size-4 flex-none" aria-hidden />
      <input
        type="search"
        aria-label={t.searchAria}
        placeholder={short ? t.searchPhShort : t.searchPh}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="placeholder:text-muted-foreground min-w-0 flex-auto bg-transparent outline-none"
      />
    </label>
  );
}

function FilterButton({
  t,
  n,
  lang,
  onClick,
}: {
  t: OT;
  n: number;
  lang: AdminLang;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={n ? fill(t.filterAria, { n: digits(n, lang) }) : t.filter}
      className={btn({ variant: "outline", size: "lg", className: "px-3.5" })}
    >
      <SlidersHorizontal aria-hidden />
      {t.filter}
      {n ? (
        <span className="bg-primary tabular inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white">
          {n}
        </span>
      ) : null}
    </button>
  );
}

function PhoneCard({
  o,
  t,
  lang,
  onAction,
}: {
  o: OrderRow;
  t: OT;
  lang: AdminLang;
  onAction: () => void;
}) {
  const tone = statusTone(o.status);
  const act = STEP_OF[o.status];
  return (
    <article className="border-border flex flex-col gap-2.5 rounded-xl border bg-white px-4 py-3.5 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/orders/${o.id}` as Route}
            className="tabular text-foreground font-mono text-[13px] font-medium"
          >
            {o.number}
          </Link>
          <div className="text-muted-foreground text-xs leading-4">
            {orderDate(o.createdAt, lang)}
          </div>
        </div>
        <StatusChip tone={tone} label={statusLabel(tone, lang)} />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{o.name}</div>
          <div className="text-muted-foreground truncate text-xs leading-4">
            {o.area} · {fill(t.items, { n: digits(o.items, lang) })}
          </div>
        </div>
        <div className="flex-none text-right">
          <div className="tabular text-[17px] font-semibold">{formatTaka(o.total)}</div>
          <div className="text-muted-foreground text-xs leading-4">COD</div>
        </div>
      </div>
      {act ? (
        <div className="flex gap-2">
          <a
            href={`tel:${o.phone}`}
            className={btn({ variant: "outline", size: "lg", className: "flex-1 basis-0 px-3" })}
          >
            <Phone aria-hidden />
            {t.call}
          </a>
          <button
            type="button"
            disabled={act === "book"}
            title={act === "book" ? "needs storage" : undefined}
            onClick={onAction}
            className={btn({ size: "lg", className: "flex-[2] basis-0" })}
          >
            {t.actPhone[act]}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function EmptyState({
  q,
  t,
  tab,
  filtersOn,
  onClear,
}: {
  q: OrderListQuery;
  t: OT;
  tab: string;
  filtersOn: boolean;
  onClear: () => void;
}) {
  return (
    <div className="border-border flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-xl border bg-white p-6 text-center shadow-xs">
      <span className="bg-muted inline-flex size-11 items-center justify-center rounded-lg text-[#525252]">
        <Search className="size-5" aria-hidden />
      </span>
      <div className="text-base leading-6 font-semibold">{t.empty}</div>
      {q.q ? (
        <p className="text-muted-foreground max-w-[280px] text-xs leading-4">
          {(() => {
            const [a, b] = t.emptyQ.split("{q}");
            return (
              <>
                {a}
                <span className="tabular font-mono">{q.q}</span>
                {(b ?? "").replace("{tab}", tab)}
              </>
            );
          })()}
        </p>
      ) : filtersOn ? (
        <p className="text-muted-foreground max-w-[280px] text-xs leading-4">{t.emptyFiltered}</p>
      ) : null}
      {filtersOn ? (
        <button type="button" onClick={onClear} className={btn({ variant: "outline", size: "sm" })}>
          {t.clearAll}
        </button>
      ) : null}
    </div>
  );
}

/** 1194 split view: the selected order (Orders-Tablet1194, right side). */
function Preview({
  o,
  t,
  lang,
  onStep,
  onCancel,
  onClose,
}: {
  o: OrderPreview;
  t: OT;
  lang: AdminLang;
  onStep: (s: Step) => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const tone = statusTone(o.status);
  const act = STEP_OF[o.status];
  const method = o.payment ? t.methods[o.payment.method] : t.methods.cod;
  const sec = "border-border flex flex-col gap-3 rounded-xl border bg-white p-4";
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="tabular truncate font-mono text-lg leading-7 font-semibold whitespace-nowrap">
              {o.number}
            </h1>
            <StatusChip tone={tone} label={statusLabel(tone, lang)} />
          </div>
          <p className="text-muted-foreground truncate text-xs leading-4">
            {orderDate(o.createdAt, lang)} · {t.fromWeb} · {method}
          </p>
        </div>
        <span className="flex flex-none items-center gap-1">
          <Link
            href={`/orders/${o.id}` as Route}
            className={btn({ variant: "ghost", size: "lg", className: "px-3" })}
          >
            <Maximize2 aria-hidden />
            {/* Narrow preview (dragged small): icon only. */}
            <span className="@max-[34rem]:sr-only">{t.openFull}</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closePreview}
            title={t.closePreview}
            className={btn({ variant: "ghost", size: "iconLg" })}
          >
            <X aria-hidden />
          </button>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {act ? (
          <button
            type="button"
            disabled={act === "book"}
            title={act === "book" ? "needs storage" : undefined}
            onClick={() => act !== "book" && onStep(act)}
            className={btn({ size: "lg" })}
          >
            {act === "book" ? <Truck aria-hidden /> : <Check aria-hidden />}
            {t.actPhone[act]}
          </button>
        ) : null}
        <button
          type="button"
          disabled
          title="A5"
          className={btn({ variant: "outline", size: "lg" })}
        >
          {t.slip}
        </button>
        {CANCELLABLE.has(o.status) ? (
          <button
            type="button"
            onClick={onCancel}
            className={btn({ variant: "outline", size: "lg", className: "text-danger-text" })}
          >
            {t.cancel}
          </button>
        ) : null}
      </div>

      <div className={sec}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[15px] font-medium">{o.name}</div>
            <div className="tabular text-muted-foreground font-mono text-[13px]">{o.phone}</div>
            {o.email ? (
              <div className="text-muted-foreground text-xs leading-4">{o.email}</div>
            ) : null}
          </div>
          <span className="flex gap-1.5">
            <a href={`tel:${o.phone}`} className={btn({ variant: "outline", size: "lg" })}>
              {t.call}
            </a>
            <button
              type="button"
              aria-label={t.copyPhoneAria}
              onClick={() =>
                void navigator.clipboard
                  .writeText(o.phone)
                  .then(() => toast({ tone: "ok", title: t.copied, sub: o.phone }))
              }
              className={btn({ variant: "outline", size: "iconLg" })}
            >
              <Copy aria-hidden />
            </button>
          </span>
        </div>
        <p className="text-xs leading-4 whitespace-pre-line">{`${o.name}, ${o.phone}\n${o.address}`}</p>
        {o.note ? (
          <p className="text-muted-foreground text-xs leading-4">
            {t.customerNote}: {o.note}
          </p>
        ) : null}
      </div>

      <div className={sec}>
        <div className="text-[15px] font-semibold">
          {t.itemsTitle}{" "}
          <span className="text-muted-foreground text-xs leading-4 font-normal">{t.itemsSub}</span>
        </div>
        {o.items.map((i) => (
          <div key={i.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-auto">
              <div className="font-medium">{i.name}</div>
              <div className="text-muted-foreground text-xs leading-4">
                {i.size} · {formatTaka(i.unit)} × {i.qty}
              </div>
            </div>
            <span className="tabular font-medium">{formatTaka(i.unit * i.qty)}</span>
          </div>
        ))}
        <dl className="border-border tabular grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-t pt-2.5 text-sm">
          <dt className="text-muted-foreground">{t.subtotal}</dt>
          <dd className="text-right">{formatTaka(o.subtotal)}</dd>
          {o.discount ? (
            <>
              <dt className="text-muted-foreground">
                {t.discount}
                {o.couponCode ? ` · ${o.couponCode}` : ""}
              </dt>
              <dd className="text-right text-[#15803d]">−{formatTaka(o.discount)}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">{t.delivery}</dt>
          <dd className="text-right">{formatTaka(o.shippingFee)}</dd>
          <dt className="text-foreground font-medium">{t.total}</dt>
          <dd className="text-right font-semibold">{formatTaka(o.total)}</dd>
        </dl>
        <div className="border-border flex items-center justify-between border-t pt-2.5 text-xs leading-4">
          <span>
            {t.payment}: {method} · {formatTaka(o.payment?.amount ?? o.total)}
          </span>
          {o.payment ? (
            <span
              className={cn(
                "inline-flex h-[22px] items-center rounded-sm px-2 text-xs font-medium",
                o.payment.status === "paid"
                  ? "bg-badge-ok-bg text-badge-ok-fg"
                  : o.payment.status === "pending"
                    ? "bg-badge-warn-bg text-badge-warn-fg"
                    : "bg-badge-danger-bg text-badge-danger-fg",
              )}
            >
              {t.payStatus[o.payment.status]}
            </span>
          ) : null}
        </div>
      </div>

      <div className={cn(sec, "border-[#c7d2fe]")}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[15px] font-semibold">{t.courierTitle}</div>
          <span className="flex items-center gap-1.5">
            <NeedsStorage />
            <span className="text-muted-foreground text-xs leading-4">{t.notBooked}</span>
          </span>
        </div>
        <p className="text-muted-foreground text-xs leading-4">{t.courierHelp}</p>
        <label className="flex flex-col gap-2 text-sm font-medium">
          {t.courierNote}
          <textarea disabled className={cn(inputCls, "h-auto min-h-16 py-2 font-normal")} />
        </label>
        <button type="button" disabled className={btn({ size: "lg", block: true })}>
          {t.bookSf}
        </button>
      </div>
    </>
  );
}

/** Tablet: sheet from the right (States-Tablet). Phone: bottom sheet (OrdersFilter-Phone). */
function FilterSheet({
  open,
  onOpenChange,
  q,
  t,
  lang,
  counts,
  apply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  q: OrderListQuery;
  t: OT;
  lang: AdminLang;
  counts: Record<OrderTab, number>;
  apply: (patch: Record<string, string | undefined>) => void;
}) {
  const [date, setDate] = useState(q.date);
  const [from, setFrom] = useState(q.from ?? "");
  const [to, setTo] = useState(q.to ?? "");
  const [zone, setZone] = useState(q.zone);
  const [multi, setMulti] = useState<OrderTab[]>(q.multi ?? []);
  const [n, setN] = useState<number | null>(null);
  const [calOpen, setCalOpen] = useState(false);

  const draft = useMemo(
    () => ({
      status: q.status,
      q: q.q,
      date,
      from: date === "range" ? from || undefined : undefined,
      to: date === "range" ? to || undefined : undefined,
      zone,
      multi: multi.length ? multi : undefined,
    }),
    [q.status, q.q, date, from, to, zone, multi],
  );

  // Live count for the apply button ("৩২টি অর্ডার দেখুন").
  useEffect(() => {
    if (!open) return;
    let live = true;
    countFilteredOrders({ ...draft, multi: draft.multi?.join(",") })
      .then((c) => live && setN(c))
      .catch(() => live && setN(null));
    return () => {
      live = false;
    };
  }, [open, draft]);

  const reset = () => {
    setDate(undefined);
    setFrom("");
    setTo("");
    setZone(undefined);
    setMulti([]);
  };
  const submit = () =>
    apply({
      date,
      from: draft.from,
      to: draft.to,
      zone,
      multi: multi.length ? multi.join(",") : undefined,
    });
  const label = (k: string) => fill(k, { n: n === null ? "…" : digits(n, lang) });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="max-tab:inset-x-0 max-tab:bottom-0 max-tab:max-h-[90dvh] max-tab:rounded-t-2xl tab:inset-y-0 tab:right-0 tab:w-[290px] fixed z-50 flex flex-col bg-white shadow-lg outline-none"
        >
          <span
            className="tab:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-[#d4d4d4]"
            aria-hidden
          />
          <div className="border-border tab:border-b tab:pl-4 flex items-center justify-between py-2 pr-2 pl-5">
            <Dialog.Title className="text-base leading-6 font-semibold">
              {t.filtersTitle}{" "}
              {t.filtersSub ? (
                <span className="tab:hidden text-muted-foreground text-xs leading-4 font-normal">
                  {t.filtersSub}
                </span>
              ) : null}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t.close}
              className={btn({ variant: "ghost", size: "iconLg" })}
            >
              <X className="!size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <ScrollArea className="min-h-0 flex-auto">
            <div className="tab:px-4 tab:py-3 tab:gap-2.5 flex flex-col gap-5 px-5 pb-4">
              <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
                <legend className="mb-2.5 text-sm font-medium">{t.date}</legend>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      aria-pressed={date === pr}
                      onClick={() => setDate(date === pr ? undefined : pr)}
                      className={chip(date === pr, "tab:h-11 h-10")}
                    >
                      {t.datePresets[pr]}
                    </button>
                  ))}
                </div>
                {/* Phone: custom range in an inline calendar (owner request: no browser date inputs). */}
                <div className="tab:hidden flex flex-col gap-2">
                  <button
                    type="button"
                    aria-expanded={calOpen}
                    onClick={() => setCalOpen((v) => !v)}
                    className={cn(
                      inputCls,
                      "flex h-11 items-center justify-between gap-2 text-left",
                      date === "range" && from && "border-primary",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <CalendarDays className="text-muted-foreground size-4" aria-hidden />
                      {date === "range" && from
                        ? dateLabel({ ...q, date: "range", from, to: to || undefined }, t, lang)
                        : t.pickDates}
                    </span>
                    <ChevronDown
                      className={cn(
                        "text-muted-foreground size-4 transition-transform",
                        calOpen && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  {calOpen ? (
                    <div className="border-border flex justify-center rounded-lg border">
                      <DateRangeCalendar
                        from={from || undefined}
                        to={to || undefined}
                        lang={lang}
                        onChange={(f, tt) => {
                          setFrom(f ?? "");
                          setTo(tt ?? "");
                          setDate(f ? "range" : undefined);
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </fieldset>

              <fieldset className="tab:hidden m-0 border-0 p-0">
                <legend className="mb-1 text-sm font-medium">{t.status}</legend>
                {SHEET_STATUSES.map((s) => {
                  const on = multi.includes(s);
                  const tone =
                    s === "new"
                      ? "new"
                      : s === "confirmed"
                        ? "conf"
                        : s === "packed"
                          ? "pack"
                          : s === "booked"
                            ? "book"
                            : s === "transit"
                              ? "transit"
                              : "deliv";
                  return (
                    <button
                      key={s}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => setMulti((m) => (on ? m.filter((x) => x !== s) : [...m, s]))}
                      className="border-border flex min-h-12 w-full items-center gap-3 border-b px-1 text-left last:border-b-0"
                    >
                      <Check16 state={on ? "on" : "off"} large />
                      <StatusChip tone={tone} label={t.tabs[s]} />
                      <span className="flex-auto" />
                      <span className="tabular text-muted-foreground text-xs">{counts[s]}</span>
                    </button>
                  );
                })}
              </fieldset>

              <fieldset className="m-0 border-0 p-0">
                <legend className="mb-1 text-sm font-medium">{t.area}</legend>
                {([undefined, "in", "out"] as const).map((z) => (
                  <label
                    key={z ?? "all"}
                    className="tab:border-b-0 tab:min-h-11 border-border flex min-h-12 cursor-pointer items-center gap-3 border-b px-1 last:border-b-0"
                  >
                    <input
                      type="radio"
                      name="zone"
                      checked={zone === z}
                      onChange={() => setZone(z)}
                      className="sr-only"
                    />
                    <Radio on={zone === z} />
                    {z ? t.zone[z] : t.areaAll}
                  </label>
                ))}
              </fieldset>
            </div>
          </ScrollArea>
          <div className="border-border tab:px-4 tab:pb-3 flex gap-2 border-t px-5 pt-3 pb-7">
            <button
              type="button"
              onClick={reset}
              className={btn({ variant: "outline", size: "lg", className: "flex-1 basis-0" })}
            >
              {t.reset}
            </button>
            <button
              type="button"
              onClick={submit}
              className={btn({ size: "lg", className: "flex-[2] basis-0" })}
            >
              <span className="tab:hidden">{label(t.showN)}</span>
              <span className="max-tab:hidden">{label(t.showNShort)}</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
