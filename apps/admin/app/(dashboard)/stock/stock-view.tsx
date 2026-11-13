"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import { Minus, Plus, Search } from "lucide-react";
import { useState, useTransition } from "react";
import { saveStock } from "@/app/actions/stock";
import { btn } from "@/components/btn";
import { NeedsStorage } from "@/components/needs-storage";
import { PhoneHeader } from "@/components/shell/page";
import { useToast } from "@/components/toast";
import { digits, fill } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import type { StockRow } from "@/lib/stock";

type ST = Dict["stock"];
type Tab = "all" | "low" | "out" | "requested";
type PhoneTab = "all" | "lowOut" | "requested";
const TABS: Tab[] = ["all", "low", "out", "requested"];

const BADGE = {
  ok: "bg-badge-ok-bg text-badge-ok-fg",
  low: "bg-badge-warn-bg text-badge-warn-fg",
  out: "bg-badge-danger-bg text-badge-danger-fg",
  hidden: "bg-muted text-foreground",
} as const;

/**
 * স্টক (Stock-Desktop / Stock-Tablet / Stock-Phone). Counts are edited in place and saved together
 * from the save bar. Filters use the saved counts, so a row doesn't jump away while being edited.
 */
export function StockView({
  rows,
  t,
  lang,
  staff,
  limit,
}: {
  rows: StockRow[];
  t: ST;
  lang: AdminLang;
  staff: boolean;
  limit: number;
}) {
  const toast = useToast();
  const [edits, setEdits] = useState<Record<number, number>>({});
  const [tab, setTab] = useState<Tab>("all");
  const [phoneTab, setPhoneTab] = useState<PhoneTab>("all");
  const [q, setQ] = useState("");
  const [phoneSearch, setPhoneSearch] = useState(false);
  const [pending, start] = useTransition();

  const isLow = (n: number) => n > 0 && n < limit;
  const counts = {
    all: rows.length,
    low: rows.filter((r) => isLow(r.stock)).length,
    out: rows.filter((r) => r.stock === 0).length,
    requested: rows.filter((r) => r.requests > 0).length,
  };
  const match = (r: StockRow) => {
    const s = q.trim().toLowerCase();
    return !s || `${r.bn} ${r.en} ${r.size}`.toLowerCase().includes(s);
  };
  const shown = rows.filter(
    (r) =>
      match(r) &&
      (tab === "all" ||
        (tab === "low" && isLow(r.stock)) ||
        (tab === "out" && r.stock === 0) ||
        (tab === "requested" && r.requests > 0)),
  );
  const phoneShown = rows.filter(
    (r) =>
      match(r) &&
      (phoneTab === "all" ||
        (phoneTab === "lowOut" && r.stock < limit) ||
        (phoneTab === "requested" && r.requests > 0)),
  );

  const valueOf = (r: StockRow) => edits[r.id] ?? r.stock;
  const changed = rows.filter((r) => edits[r.id] !== undefined && edits[r.id] !== r.stock);
  const notify = changed.find((r) => r.stock === 0 && valueOf(r) > 0 && r.requests > 0);
  const notifyText = notify
    ? fill(t.canNotify, { name: notify.bn, size: notify.size, n: digits(notify.requests, lang) })
    : "";

  function set(r: StockRow, n: number) {
    const v = Math.max(0, Math.min(100000, Math.floor(n) || 0));
    setEdits((e) => ({ ...e, [r.id]: v }));
  }

  function save() {
    const changes = changed.map((r) => ({ variantId: r.id, from: r.stock, to: valueOf(r) }));
    if (!changes.length) return;
    start(async () => {
      try {
        const res = await saveStock({ changes });
        setEdits({});
        toast(
          res.stale.length
            ? {
                tone: "err",
                title: fill(t.stale, { n: digits(res.stale.length, lang) }),
                sub: t.staleSub,
              }
            : { tone: "ok", title: t.saved },
        );
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  const state = (r: StockRow): keyof typeof BADGE => {
    if (r.hidden) return "hidden";
    const n = valueOf(r);
    return n === 0 ? "out" : n < limit ? "low" : "ok";
  };
  const badge = (r: StockRow) => {
    const s = state(r);
    return (
      <span
        className={cn(
          "inline-flex h-[22px] flex-none items-center rounded-sm px-2 text-xs leading-4 font-medium whitespace-nowrap",
          BADGE[s],
        )}
      >
        {t.state[s]}
      </span>
    );
  };

  const stepper = (r: StockRow, large: boolean) => {
    const dirty = edits[r.id] !== undefined && edits[r.id] !== r.stock;
    return (
      <span
        className={cn(
          "border-input inline-flex flex-none items-center overflow-hidden border bg-white",
          large ? "rounded-[10px]" : "rounded-md shadow-xs",
          dirty && "border-primary shadow-[0_0_0_3px_var(--ring)]",
        )}
      >
        <button
          type="button"
          aria-label={t.less}
          disabled={valueOf(r) === 0}
          onClick={() => set(r, valueOf(r) - 1)}
          className={cn(
            "bg-subtle inline-flex items-center justify-center text-[#404040] disabled:opacity-40",
            large ? "size-11 [&_svg]:size-4" : "h-8 w-[30px] [&_svg]:size-3.5",
          )}
        >
          <Minus aria-hidden />
        </button>
        <input
          aria-label={fill(t.stockOf, { name: r.bn, size: r.size })}
          inputMode="numeric"
          value={String(valueOf(r))}
          onChange={(e) => set(r, Number(e.target.value.replace(/\D/g, "")))}
          onFocus={(e) => e.target.select()}
          className={cn(
            "border-input border-x text-center font-semibold tabular-nums outline-none",
            large ? "max-tab:w-[52px] h-11 w-[60px] text-base" : "h-8 w-14",
          )}
        />
        <button
          type="button"
          aria-label={t.more}
          onClick={() => set(r, valueOf(r) + 1)}
          className={cn(
            "bg-subtle inline-flex items-center justify-center text-[#404040]",
            large ? "size-11 [&_svg]:size-4" : "h-8 w-[30px] [&_svg]:size-3.5",
          )}
        >
          <Plus aria-hidden />
        </button>
      </span>
    );
  };

  // Always takes the same width, so the stepper never moves when "আগে …" appears.
  const was = (r: StockRow) => (
    <span className="text-muted-foreground w-14 flex-none text-[11px] leading-[14px] tabular-nums">
      {edits[r.id] !== undefined && edits[r.id] !== r.stock ? fill(t.was, { n: r.stock }) : null}
    </span>
  );

  const requests = (r: StockRow) =>
    r.requests ? (
      <>
        <span className="font-medium">{r.requests}</span>{" "}
        <span className="text-muted-foreground text-xs">{t.people}</span>
      </>
    ) : (
      <span className="text-muted-foreground">—</span>
    );

  const sub = [fill(t.sub, { n: digits(rows.length, lang) }), staff ? t.staffView : ""]
    .filter(Boolean)
    .join(" · ");

  const searchBox = (large: boolean, className?: string) => (
    <div
      className={cn(
        "border-input focus-within:border-primary flex min-w-0 items-center gap-2 rounded-md border bg-white px-3 shadow-xs focus-within:shadow-[0_0_0_3px_var(--ring)]",
        large ? "h-11 text-[15px]" : "h-9 text-sm",
        className,
      )}
    >
      <Search className="text-muted-foreground size-4 flex-none" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label={t.searchAria}
        placeholder={t.searchPh}
        className="placeholder:text-muted-foreground min-w-0 flex-auto bg-transparent outline-none"
      />
    </div>
  );

  const tabs = (large: boolean) => (
    <div
      role="tablist"
      className={cn(
        "bg-muted inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[10px] p-[3px]",
        large ? "h-[46px]" : "h-[38px]",
      )}
    >
      {TABS.map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={tab === k}
          onClick={() => setTab(k)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[7px] px-3 text-sm font-medium whitespace-nowrap",
            large ? "h-10" : "h-8",
            tab === k ? "text-foreground bg-white shadow-xs" : "text-muted-foreground",
          )}
        >
          {t.tabs[k]}
          <span
            className={cn(
              "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
              tab === k ? "bg-primary text-white" : "bg-[#e5e5e5]",
            )}
          >
            {counts[k]}
          </span>
        </button>
      ))}
    </div>
  );

  const limitBox = (large: boolean) => (
    <div className="flex items-center gap-2">
      <label className="text-muted-foreground text-xs leading-4" htmlFor={large ? "thr-t" : "thr"}>
        {t.limit}
      </label>
      <div
        className={cn(
          "border-input flex items-center gap-1 rounded-md border bg-white px-2.5 shadow-xs",
          large ? "h-11 w-[120px] text-[15px]" : "h-8 w-24 text-[13px]",
        )}
      >
        <input
          id={large ? "thr-t" : "thr"}
          value={limit}
          readOnly
          className="w-full min-w-0 bg-transparent tabular-nums outline-none"
        />
        <span className="text-muted-foreground text-[11px] whitespace-nowrap">{t.limitUnit}</span>
      </div>
      <NeedsStorage />
    </div>
  );

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
        <p className="text-muted-foreground text-[13px] leading-4">{sub}</p>
      </div>
      <div className="desk:block hidden">{limitBox(false)}</div>
      <div className="desk:hidden">{limitBox(true)}</div>
    </div>
  );

  const empty = <p className="text-muted-foreground p-6 text-center text-sm">{t.empty}</p>;
  const th = "text-muted-foreground h-10 px-3 text-left text-[13px] font-medium whitespace-nowrap";

  return (
    <>
      {/* ───── Phone (<768): Stock-Phone ─────
          Owner rule: header, chips and the save bar stay put; only the list of sizes scrolls. */}
      <div className="tab:hidden flex h-full flex-col">
        <PhoneHeader
          title={t.title}
          sub={`${t.phoneSub} · needs storage`}
          end={
            <button
              type="button"
              aria-label={t.searchAria}
              aria-pressed={phoneSearch}
              onClick={() => setPhoneSearch((v) => !v)}
              className={btn({ variant: "ghost", size: "iconLg", className: "[&_svg]:size-5" })}
            >
              <Search aria-hidden />
            </button>
          }
        />

        <div className="border-border flex flex-none flex-col gap-2.5 border-b bg-white px-4 py-2.5">
          {phoneSearch ? searchBox(true) : null}
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {(["all", "lowOut", "requested"] as PhoneTab[]).map((k) => {
              const on = phoneTab === k;
              const n =
                k === "all"
                  ? counts.all
                  : k === "lowOut"
                    ? counts.low + counts.out
                    : counts.requested;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPhoneTab(k)}
                  className={cn(
                    "inline-flex h-9 flex-none items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap",
                    on ? "bg-foreground border-foreground text-white" : "border-border bg-white",
                  )}
                >
                  {k === "lowOut" ? t.lowOut : t.tabs[k]}
                  <span
                    className={cn(
                      "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                      on ? "text-foreground bg-white" : "bg-[#f0f0f0]",
                    )}
                  >
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            {phoneShown.length === 0 ? empty : null}
            {phoneShown.map((r) => (
              <div
                key={r.id}
                className="border-border flex flex-col gap-2.5 rounded-xl border bg-white px-3.5 py-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {r.bn} · {r.size}
                    </div>
                    <div className="text-muted-foreground truncate text-xs leading-4">{r.en}</div>
                  </div>
                  {badge(r)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs leading-4">
                    {r.requests ? fill(t.reqText, { n: digits(r.requests, lang) }) : t.noReq}
                  </span>
                  {stepper(r, true)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        {changed.length ? (
          <div className="border-border flex flex-none items-center gap-2.5 border-t bg-white px-4 py-2.5">
            <span className="min-w-0 flex-auto text-xs leading-4 font-medium">
              {fill(t.changedShort, { n: digits(changed.length, lang) })}
            </span>
            <button
              type="button"
              onClick={() => setEdits({})}
              className={btn({ variant: "ghost", size: "lg", className: "px-3" })}
            >
              {t.discard}
            </button>
            <button type="button" disabled={pending} onClick={save} className={btn({ size: "lg" })}>
              {t.saveShort}
            </button>
          </div>
        ) : null}
      </div>

      {/* ───── Tablet 834 (768–1023): Stock-Tablet ───── */}
      <div className="tab:flex desk:hidden hidden h-full min-h-0 flex-col">
        <div className="flex flex-none flex-col gap-4 px-6 pt-5 pb-4">
          {header}
          <div className="flex flex-wrap gap-2">
            {searchBox(true, "flex-[1_1_260px]")}
            {tabs(true)}
          </div>
        </div>
        <div className="flex min-h-0 flex-auto flex-col px-6 pb-6">
          <ScrollArea className="border-border !min-h-0 !flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-[1] bg-white shadow-[inset_0_-1px_0_var(--border)]">
                <tr>
                  <th className={th}>{t.colProductSize}</th>
                  <th className={th}>{t.colStock}</th>
                  <th className={cn(th, "text-right")}>{t.colRequests}</th>
                  <th className={th}>{t.colState}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-border border-b last:border-b-0 [&>td]:p-3",
                      edits[r.id] !== undefined && edits[r.id] !== r.stock && "bg-primary-soft",
                    )}
                  >
                    <td>
                      <div className="font-medium">
                        {r.bn} <span className="text-muted-foreground font-normal">· {r.size}</span>
                      </div>
                      <div className="text-muted-foreground text-xs leading-4">{r.en}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {stepper(r, true)}
                        {was(r)}
                      </div>
                    </td>
                    <td className="text-right tabular-nums">{requests(r)}</td>
                    <td>{badge(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 ? empty : null}
          </ScrollArea>
        </div>
        {changed.length ? (
          <div className="border-border flex flex-none items-center justify-between gap-3 border-t bg-white px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,.05)]">
            <span className="text-xs leading-4">
              <span className="font-medium">
                {fill(t.changed, { n: digits(changed.length, lang) })}
              </span>
              {notifyText ? <span className="text-muted-foreground"> · {notifyText}</span> : null}
            </span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEdits({})}
                className={btn({ variant: "outline", size: "lg" })}
              >
                {t.discard}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={save}
                className={btn({ size: "lg" })}
              >
                {t.save}
              </button>
            </span>
          </div>
        ) : null}
      </div>

      {/* ───── Desktop (≥1024): Stock-Desktop ───── */}
      <div className="desk:flex wide:px-8 wide:pt-6 wide:pb-6 hidden h-full min-h-0 flex-col gap-4 px-6 pt-5 pb-5">
        <div className="flex flex-none flex-col gap-4">
          {header}
          <div className="flex flex-wrap items-center gap-2">
            {searchBox(false, "w-[300px]")}
            {tabs(false)}
          </div>
        </div>
        <ScrollArea className="border-border !min-h-0 !flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-[1] bg-white shadow-[inset_0_-1px_0_var(--border)]">
              <tr>
                <th className={th}>{t.colProduct}</th>
                <th className={th}>{t.colSize}</th>
                <th className={th}>{t.colStock}</th>
                <th className={cn(th, "text-right")}>{t.colRequests}</th>
                <th className={th}>{t.colState}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr
                  key={r.id}
                  className={cn(
                    "border-border hover:bg-subtle border-b last:border-b-0 [&>td]:px-3 [&>td]:py-2.5",
                    edits[r.id] !== undefined &&
                      edits[r.id] !== r.stock &&
                      "bg-primary-soft hover:bg-primary-soft",
                  )}
                >
                  <td>
                    <div className="font-medium">{r.bn}</div>
                    <div className="text-muted-foreground text-xs leading-4">{r.en}</div>
                  </td>
                  <td>{r.size}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {stepper(r, false)}
                      {was(r)}
                    </div>
                  </td>
                  <td className="text-right tabular-nums">{requests(r)}</td>
                  <td>{badge(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 ? empty : null}
        </ScrollArea>
        {changed.length ? (
          <div className="bg-foreground flex flex-none flex-wrap items-center gap-3 rounded-[10px] px-3 py-2 text-white shadow-lg">
            <span className="font-medium">
              {fill(t.changed, { n: digits(changed.length, lang) })}
            </span>
            {notifyText ? (
              <span className="text-xs leading-4 text-[#d4d4d4]">{notifyText}</span>
            ) : null}
            <span className="flex-auto" />
            <button
              type="button"
              onClick={() => setEdits({})}
              className={btn({
                variant: "ghost",
                size: "xs",
                className: "text-[#d4d4d4] hover:bg-white/10",
              })}
            >
              {t.discard}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className={btn({
                variant: "outline",
                size: "xs",
                className: "text-foreground border-white bg-white",
              })}
            >
              {t.save}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
