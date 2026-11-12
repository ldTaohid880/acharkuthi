"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import type { AdminLang, OrderListQuery } from "@repo/validators";
import { Calendar, Check, ChevronLeft, ChevronRight, Ellipsis, PlusCircle } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useState, useTransition } from "react";
import { cancelOrder } from "@/app/actions/orders";
import { btn } from "@/components/btn";
import { DateRangeCalendar } from "@/components/date-range-calendar";
import { useToast } from "@/components/toast";
import { digits, fill, orderDate } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import type { OrderRow } from "@/lib/orders";

export type OT = Dict["orders"];
export type DatePreset = "today" | "yesterday" | "7d" | "month";
export const PRESETS: DatePreset[] = ["today", "yesterday", "7d", "month"];
export const CANCELLABLE = new Set<OrderRow["status"]>(["pending", "confirmed", "processing"]);

/** admin.css .cb: 16px checkbox (22px .cb-lg), on / mixed. */
export function Check16({ state, large }: { state: "on" | "off" | "mixed"; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex flex-none items-center justify-center border shadow-xs",
        large ? "size-[22px] rounded-md" : "size-4 rounded-[4px]",
        state === "off" ? "border-[#a3a3a3] bg-white" : "border-primary bg-primary text-white",
      )}
    >
      {state === "on" ? <Check className="size-3" strokeWidth={3} /> : null}
      {state === "mixed" ? <span className="h-0.5 w-2 rounded-[1px] bg-white" /> : null}
    </span>
  );
}

/** "১১ নভেম্বর – ১৫ নভেম্বর" etc. for the date button. */
export function dateLabel(q: OrderListQuery, t: OT, lang: AdminLang): string | null {
  if (q.date && q.date !== "range") return t.datePresets[q.date];
  if (q.date === "range" && (q.from || q.to)) {
    const f = (d?: string) => (d ? orderDate(new Date(`${d}T12:00:00+06:00`), lang, false) : "…");
    return `${f(q.from)} – ${f(q.to)}`;
  }
  return null;
}

type Patch = Partial<Record<"date" | "from" | "to" | "zone", string | undefined>>;

/** Desktop / split view: dashed "তারিখ" button with presets and a from–to range. */
export function DatePopover({
  q,
  t,
  lang,
  apply,
  large,
}: {
  q: OrderListQuery;
  t: OT;
  lang: AdminLang;
  apply: (p: Patch) => void;
  large?: boolean;
}) {
  const label = dateLabel(q, t, lang);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<string | undefined>(q.date === "range" ? q.from : undefined);
  const [to, setTo] = useState<string | undefined>(q.date === "range" ? q.to : undefined);
  const done = (p: Patch) => {
    setOpen(false);
    apply(p);
  };
  const picked = from ? dateLabel({ ...q, date: "range", from, to }, t, lang) : null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={btn({
          variant: "outline",
          size: large ? "lg" : "sm",
          className: cn("border-dashed", large && "flex-1 basis-0 px-2.5"),
        })}
      >
        <Calendar aria-hidden />
        {large ? (label ?? t.date) : label ? fill(t.dateIs, { v: label }) : t.date}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto rounded-lg p-0 shadow-md">
        <div className="flex">
          {/* Quick ranges on the left, one tap applies. */}
          <div className="border-border flex w-32 flex-none flex-col gap-0.5 border-r p-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={q.date === p}
                onClick={() => done({ date: p, from: undefined, to: undefined })}
                className={cn(
                  "flex h-8 items-center justify-between rounded-sm px-2 text-left text-sm",
                  q.date === p ? "bg-accent font-medium" : "hover:bg-accent",
                )}
              >
                {t.datePresets[p]}
                {q.date === p ? <Check className="text-primary size-4" aria-hidden /> : null}
              </button>
            ))}
          </div>
          <DateRangeCalendar
            from={from}
            to={to}
            lang={lang}
            onChange={(f, tt) => {
              setFrom(f);
              setTo(tt);
            }}
          />
        </div>
        <div className="border-border flex items-center justify-between gap-3 border-t px-3 py-2.5">
          <span className="text-muted-foreground text-xs leading-4">{picked ?? t.pickRange}</span>
          <span className="flex gap-2">
            <button
              type="button"
              className={btn({ variant: "ghost", size: "sm" })}
              onClick={() => {
                setFrom(undefined);
                setTo(undefined);
                done({ date: undefined, from: undefined, to: undefined });
              }}
            >
              {t.reset}
            </button>
            <button
              type="button"
              className={btn({ size: "sm" })}
              disabled={!from}
              onClick={() => done({ date: "range", from, to: to ?? from })}
            >
              {t.apply}
            </button>
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const inputCls =
  "border-input h-9 w-full min-w-0 rounded-md border bg-white px-2.5 text-sm shadow-xs outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--ring)]";

/** admin.css .chip (pill) used for presets and tabs on phones and in the split view. */
export function chip(on: boolean, h = "h-9") {
  return cn(
    "inline-flex flex-none items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap",
    h,
    on ? "bg-foreground border-foreground text-white" : "border-border bg-white",
  );
}

/** Desktop / split view: dashed "এলাকা" button with the zone options. */
export function AreaPopover({
  q,
  t,
  apply,
  large,
}: {
  q: OrderListQuery;
  t: OT;
  apply: (p: Patch) => void;
  large?: boolean;
}) {
  const opts: { v: "in" | "out" | undefined; l: string }[] = [
    { v: undefined, l: t.areaAll },
    { v: "in", l: t.zone.in },
    { v: "out", l: t.zone.out },
  ];
  return (
    <Popover>
      <PopoverTrigger
        className={btn({
          variant: "outline",
          size: large ? "lg" : "sm",
          className: cn("border-dashed", large && "flex-1 basis-0 px-2.5"),
        })}
      >
        <PlusCircle aria-hidden />
        {q.zone ? t.zone[q.zone] : t.area}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 rounded-lg p-1 shadow-md">
        {opts.map((o) => (
          <button
            key={o.l}
            type="button"
            onClick={() => apply({ zone: o.v })}
            className="hover:bg-accent flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm"
          >
            <Radio on={q.zone === o.v} />
            {o.l}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function Radio({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-4 flex-none items-center justify-center rounded-full border bg-white",
        on ? "border-primary" : "border-[#a3a3a3]",
      )}
    >
      {on ? <span className="bg-primary size-2 rounded-full" /> : null}
    </span>
  );
}

/** "…" row menu: details, call, copy phone, cancel (owner decision). */
export function RowMenu({
  row,
  t,
  onCancel,
  large,
}: {
  row: OrderRow;
  t: OT;
  onCancel: () => void;
  large?: boolean;
}) {
  const toast = useToast();
  const item = "h-8 gap-2 rounded-sm px-2 text-sm focus:bg-accent";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.more}
        className={btn({ variant: "ghost", size: large ? "iconLg" : "iconSm" })}
      >
        <Ellipsis aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-lg p-1 shadow-md">
        <DropdownMenuItem asChild className={item}>
          <Link href={`/orders/${row.id}` as Route}>{t.details}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={item}>
          <a href={`tel:${row.phone}`}>{t.call}</a>
        </DropdownMenuItem>
        <DropdownMenuItem
          className={item}
          onSelect={() => {
            void navigator.clipboard
              .writeText(row.phone)
              .then(() => toast({ tone: "ok", title: t.copied, sub: row.phone }));
          }}
        >
          {t.copyPhone}
        </DropdownMenuItem>
        {CANCELLABLE.has(row.status) ? (
          <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className={cn(item, "text-danger-text focus:text-danger-text")}
              onSelect={onCancel}
            >
              {t.cancel}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const REASONS = ["no_answer", "customer_cancelled", "duplicate", "other"] as const;

/** States.dc.html / States-Tablet "অর্ডার বাতিল" confirm dialog with preset reasons and a note. */
export function CancelDialog({
  order,
  t,
  onClose,
}: {
  order: { id: number; number: string } | null;
  t: OT;
  onClose: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState<(typeof REASONS)[number]>("no_answer");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog.Root open={!!order} onOpenChange={(v) => (v ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          role="alertdialog"
          aria-describedby={undefined}
          className="border-border wide:w-[440px] wide:gap-4 wide:p-6 fixed top-1/2 left-1/2 z-50 flex w-[340px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl border bg-white p-5 shadow-lg"
        >
          <div>
            <Dialog.Title className="text-base leading-6 font-semibold">
              {order ? fill(t.cancelTitle, { id: order.number }) : ""}
            </Dialog.Title>
            <p className="text-muted-foreground text-[13px] leading-5">{t.cancelBody}</p>
          </div>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-1 text-sm font-medium">{t.reason}</legend>
            {REASONS.map((r) => (
              <label
                key={r}
                className="wide:min-h-0 wide:gap-2.5 wide:py-1.5 flex min-h-11 cursor-pointer items-center gap-3"
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="sr-only"
                />
                <Radio on={reason === r} />
                {t.reasons[r]}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-2 text-sm font-medium">
            <span>
              {t.note} <span className="text-muted-foreground font-normal">{t.optional}</span>
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePh}
              maxLength={300}
              className={cn(inputCls, "font-normal")}
            />
          </label>
          <div className="wide:justify-end flex gap-2">
            <Dialog.Close
              className={btn({
                variant: "outline",
                size: "lg",
                className: "wide:h-9 wide:flex-none wide:px-4 wide:text-sm flex-1 basis-0",
              })}
            >
              {t.keep}
            </Dialog.Close>
            <button
              type="button"
              disabled={pending}
              className={btn({
                variant: "destructive",
                size: "lg",
                className: "wide:h-9 wide:flex-none wide:px-4 wide:text-sm flex-1 basis-0",
              })}
              onClick={() =>
                order &&
                start(async () => {
                  try {
                    const r = await cancelOrder({ id: order.id, reason, note: note || undefined });
                    toast(
                      r.ok
                        ? { tone: "ok", title: fill(t.toastCancelled, { id: order.number }) }
                        : { tone: "err", title: t.saveFailed, sub: t.saveFailedSub },
                    );
                    onClose();
                  } catch {
                    toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
                  }
                })
              }
            >
              {t.doCancel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Numbered pager: আগে 1 2 3 … 5 পরে (admin.css .pg). */
export function Pager({
  page,
  pages,
  href,
  t,
  large,
}: {
  page: number;
  pages: number;
  href: (p: number) => string;
  t: OT;
  large?: boolean;
}) {
  if (pages <= 1) return null;
  const nums = new Set(
    [1, 2, 3, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages),
  );
  const list = [...nums].sort((a, b) => a - b);
  const size = large ? "lg" : "sm";
  const cell = (p: number) =>
    btn({
      variant: "ghost",
      size,
      className: cn("min-w-9 px-2.5 tabular", p === page && "border-border bg-white shadow-xs"),
    });
  return (
    <nav aria-label={t.pages} className="flex items-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1) as Route} className={btn({ variant: "ghost", size })}>
          {large ? null : <ChevronLeft aria-hidden />}
          {t.prev}
        </Link>
      ) : null}
      {list.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && p - (list[i - 1] ?? p) > 1 ? (
            <span className="text-muted-foreground px-1.5">…</span>
          ) : null}
          <Link
            href={href(p) as Route}
            aria-current={p === page ? "page" : undefined}
            className={cell(p)}
          >
            {digits(p, "en")}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={href(page + 1) as Route} className={btn({ variant: "ghost", size })}>
          {t.next}
          {large ? null : <ChevronRight aria-hidden />}
        </Link>
      ) : null}
    </nav>
  );
}
