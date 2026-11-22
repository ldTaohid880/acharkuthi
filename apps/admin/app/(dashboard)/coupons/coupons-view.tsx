"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@repo/ui/components/sheet";
import { cn, formatTaka } from "@repo/ui/lib/utils";
import { takaToPaisa, type AdminLang } from "@repo/validators";
import { CalendarDays, ChevronDown, ChevronLeft, Lock, Plus, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useState, useTransition } from "react";
import { deleteCoupon, saveCoupon } from "@/app/actions/coupons";
import { btn } from "@/components/btn";
import { DateCalendar } from "@/components/date-range-calendar";
import { Crumb, useBreakpoint } from "@/components/shell/shell-context";
import { useToast } from "@/components/toast";
import type { CouponRow, CouponUse } from "@/lib/coupons";
import { digits, fill } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";

type CT = Dict["coupons"];

const BADGE = {
  on: "bg-badge-ok-bg text-badge-ok-fg border-transparent",
  ended: "bg-muted text-foreground border-transparent",
  off: "border-border text-foreground bg-white",
} as const;

/** "১ নভেম্বর" for a "YYYY-MM-DD" day. */
function dayLabel(iso: string, lang: AdminLang, month = true): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "UTC", ...o }).format(
      date,
    );
  return month ? `${f({ day: "numeric" })} ${f({ month: "long" })}` : f({ day: "numeric" });
}

/** "১ – ৩০ নভেম্বর" · "১ জানুয়ারি থেকে" · "৩০ নভেম্বর পর্যন্ত" (Coupons boards). */
function datesLabel(c: CouponRow, t: CT, lang: AdminLang, tight = false): string {
  const dash = tight ? "–" : " – ";
  if (c.startsOn && c.endsOn) {
    const sameMonth = c.startsOn.slice(0, 7) === c.endsOn.slice(0, 7);
    return `${dayLabel(c.startsOn, lang, !sameMonth)}${dash}${dayLabel(c.endsOn, lang)}`;
  }
  if (c.startsOn) return fill(t.from, { d: dayLabel(c.startsOn, lang) });
  if (c.endsOn) return fill(t.until, { d: dayLabel(c.endsOn, lang) });
  return t.always;
}

const offLabel = (c: CouponRow) => (c.type === "percent" ? `${c.value}%` : formatTaka(c.value));

function StateBadge({ c, t }: { c: CouponRow; t: CT }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] flex-none items-center rounded-sm border px-2 text-xs leading-4 font-medium whitespace-nowrap",
        BADGE[c.state],
      )}
    >
      {t.state[c.state]}
    </span>
  );
}

function CodeBadge({ code, large }: { code: string; large?: boolean }) {
  return (
    <span
      className={cn(
        "border-border inline-flex items-center rounded-sm border bg-white px-2 font-mono font-medium",
        large ? "h-[26px] text-[13px]" : "h-[22px] text-xs",
      )}
    >
      {code}
    </span>
  );
}

export function CouponsView({
  rows,
  edit,
  uses,
  t,
  lang,
}: {
  rows: CouponRow[];
  edit: number | "new" | null;
  /** "কে ব্যবহার করেছেন" for the coupon being edited. */
  uses: CouponUse[];
  t: CT;
  lang: AdminLang;
}) {
  const bp = useBreakpoint();
  const router = useRouter();
  const editing = edit === "new" ? null : (rows.find((r) => r.id === edit) ?? null);
  const close = () => router.replace("/coupons" as Route, { scroll: false });
  const editHref = (id: number | "new") => `/coupons?edit=${id}` as Route;
  const used = (c: CouponRow, short = false) =>
    c.maxUses !== null
      ? `${c.used} / ${c.maxUses}`
      : short
        ? String(c.used)
        : `${c.used} / ${t.noLimit}`;
  const empty = <p className="text-muted-foreground p-6 text-center text-sm">{t.empty}</p>;
  const th = "text-muted-foreground h-10 px-3 text-left text-[13px] font-medium whitespace-nowrap";

  // Below 1024 px the editor is its own page (CouponEdit-Tablet / -Phone).
  if (edit !== null && bp !== "desk")
    return (
      <>
        <Crumb value={editing ? editing.code : t.newTitle} />
        <CouponForm
          key={String(edit)}
          coupon={editing}
          uses={uses}
          variant={bp}
          t={t}
          lang={lang}
          onDone={close}
        />
      </>
    );

  const header = (large: boolean) => (
    <div className="flex flex-none flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
        <p className="text-muted-foreground text-[13px] leading-4">{t.sub}</p>
      </div>
      <Link
        href={editHref("new")}
        scroll={false}
        className={btn({ size: large ? "lg" : "default" })}
      >
        <Plus aria-hidden />
        {t.add}
      </Link>
    </div>
  );

  if (bp === "phone")
    return (
      <div className="flex h-full flex-col">
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
            <span className="text-muted-foreground text-xs leading-4">
              {fill(t.phoneSub, { n: digits(rows.length, lang) })}
            </span>
          </div>
          <Link href={editHref("new")} className={btn({ size: "lg", className: "px-3.5" })}>
            <Plus aria-hidden />
            {t.addShort}
          </Link>
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            {rows.length === 0 ? empty : null}
            {rows.map((c) => (
              <Link
                key={c.id}
                href={editHref(c.id)}
                className="border-border flex flex-col gap-2 rounded-xl border bg-white px-4 py-3.5 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <CodeBadge code={c.code} large />
                  <StateBadge c={c} t={t} />
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold tabular-nums">
                      {fill(t.offN, { v: offLabel(c) })}
                    </div>
                    <div className="text-muted-foreground text-xs leading-4">
                      {fill(t.minN, { v: formatTaka(c.minOrder) })} · {datesLabel(c, t, lang, true)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs leading-4 font-medium tabular-nums">
                      {used(c, true)}
                    </div>
                    <div className="text-muted-foreground text-[11px] leading-[14px]">
                      {t.usedLabel}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
    );

  if (bp === "tab")
    return (
      <div className="flex h-full min-h-0 flex-col gap-4 px-6 pt-5 pb-6">
        {header(true)}
        <ScrollArea className="border-border !min-h-0 !flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-[1] bg-white shadow-[inset_0_-1px_0_var(--border)]">
              <tr>
                <th className={th}>{t.col.code}</th>
                <th className={th}>{t.col.off}</th>
                <th className={th}>{t.col.dates}</th>
                <th className={cn(th, "text-right")}>{t.col.used}</th>
                <th className={th}>{t.col.state}</th>
                <th className={cn(th, "w-[1%]")} />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-border h-[68px] border-b last:border-b-0 [&>td]:px-3"
                >
                  <td>
                    <CodeBadge code={c.code} />
                  </td>
                  <td>
                    <div className="font-medium tabular-nums">{offLabel(c)}</div>
                    <div className="text-muted-foreground text-xs leading-4">
                      {fill(t.minN, { v: formatTaka(c.minOrder) })}
                    </div>
                  </td>
                  <td>{datesLabel(c, t, lang)}</td>
                  <td className="text-right tabular-nums">{used(c)}</td>
                  <td>
                    <StateBadge c={c} t={t} />
                  </td>
                  <td className="w-[1%]">
                    <Link href={editHref(c.id)} className={btn({ variant: "outline", size: "lg" })}>
                      {t.edit}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? empty : null}
        </ScrollArea>
      </div>
    );

  return (
    <div className="wide:px-8 wide:pt-6 flex h-full min-h-0 flex-col gap-4 px-6 pt-5 pb-6">
      {header(false)}
      <ScrollArea className="border-border !min-h-0 !flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-[1] bg-white shadow-[inset_0_-1px_0_var(--border)]">
            <tr>
              <th className={th}>{t.col.code}</th>
              <th className={th}>{t.col.off}</th>
              <th className={cn(th, "text-right")}>{t.col.min}</th>
              <th className={th}>{t.col.dates}</th>
              <th className={cn(th, "text-right")}>{t.col.used}</th>
              <th className={th}>{t.col.state}</th>
              <th className={cn(th, "w-[1%]")} />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                className={cn(
                  "border-border hover:bg-subtle border-b last:border-b-0 [&>td]:px-3 [&>td]:py-2.5",
                  edit === c.id && "bg-primary-soft hover:bg-primary-soft",
                )}
              >
                <td>
                  <CodeBadge code={c.code} />
                </td>
                <td className="font-medium tabular-nums">{offLabel(c)}</td>
                <td className="text-right tabular-nums">{formatTaka(c.minOrder)}</td>
                <td>{datesLabel(c, t, lang)}</td>
                <td className="text-right tabular-nums">{used(c)}</td>
                <td>
                  <StateBadge c={c} t={t} />
                </td>
                <td className="w-[1%]">
                  <Link
                    href={editHref(c.id)}
                    scroll={false}
                    className={btn({ variant: "ghost", size: "xs" })}
                  >
                    {t.edit}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? empty : null}
      </ScrollArea>

      {/* Coupons-Desktop: the editor opens as a 440px drawer over the list. */}
      <Sheet open={edit !== null} onOpenChange={(o) => (o ? undefined : close())}>
        <SheetContent
          side="right"
          showCloseButton={false}
          aria-describedby={undefined}
          className="w-[440px] gap-0 p-0 sm:max-w-[440px]"
        >
          {edit !== null ? (
            <CouponForm
              key={String(edit)}
              coupon={editing}
              uses={uses}
              variant="drawer"
              t={t}
              lang={lang}
              onDone={close}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

type Variant = "drawer" | "tab" | "phone";

function CouponForm({
  coupon: c,
  uses,
  variant,
  t,
  lang,
  onDone,
}: {
  coupon: CouponRow | null;
  uses: CouponUse[];
  variant: Variant;
  t: CT;
  lang: AdminLang;
  onDone: () => void;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [code, setCode] = useState(c?.code ?? "");
  const [type, setType] = useState<"percent" | "fixed">(c?.type ?? "fixed");
  const [value, setValue] = useState(
    c ? (c.type === "percent" ? String(c.value) : String(c.value / 100)) : "",
  );
  const [min, setMin] = useState(c ? String(c.minOrder / 100) : "");
  const [startsOn, setStartsOn] = useState<string | undefined>(c?.startsOn ?? undefined);
  const [endsOn, setEndsOn] = useState<string | undefined>(c?.endsOn ?? undefined);
  const [limit, setLimit] = useState(c?.maxUses ? String(c.maxUses) : "");
  const [active, setActive] = useState(c?.isActive ?? true);
  // New coupons start at one use per person (owner decision, 2026-11-15).
  const [perPerson, setPerPerson] = useState(
    c ? (c.perPersonLimit !== null ? String(c.perPersonLimit) : "") : "1",
  );
  const [cap, setCap] = useState(c?.maxDiscount ? String(c.maxDiscount / 100) : "");
  const [firstOnly, setFirstOnly] = useState(c?.firstOrderOnly ?? false);
  const [errors, setErrors] = useState<
    Partial<Record<"code" | "value" | "min" | "end" | "limit" | "per" | "cap", string>>
  >({});
  const [confirmDel, setConfirmDel] = useState(false);
  const large = variant !== "drawer";

  function save() {
    const e: typeof errors = {};
    const codeV = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(codeV)) e.code = t.badValue;
    const pv =
      type === "percent"
        ? Number(value.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))))
        : takaToPaisa(value);
    if (pv === null || !Number.isInteger(pv) || pv < 1) e.value = t.badValue;
    else if (type === "percent" && pv > 100) e.value = t.badPercent;
    const mv = min.trim() ? takaToPaisa(min) : 0;
    if (mv === null) e.min = t.badValue;
    if (startsOn && endsOn && endsOn < startsOn) e.end = t.badEnd;
    const lv = limit.trim() ? Number(limit.trim()) : undefined;
    if (lv !== undefined && (!Number.isInteger(lv) || lv < 1)) e.limit = t.badLimit;
    const ppv = perPerson.trim() ? Number(perPerson.trim()) : undefined;
    if (ppv !== undefined && (!Number.isInteger(ppv) || ppv < 1)) e.per = t.badLimit;
    const cv = type === "percent" && cap.trim() ? takaToPaisa(cap) : undefined;
    if (cv === null || (cv !== undefined && cv < 1)) e.cap = t.badValue;
    setErrors(e);
    if (Object.keys(e).length) return;
    start(async () => {
      try {
        const res = await saveCoupon({
          ...(c ? { id: c.id } : {}),
          code: codeV,
          type,
          value: pv,
          minOrder: mv,
          ...(startsOn ? { startsOn } : {}),
          ...(endsOn ? { endsOn } : {}),
          ...(lv !== undefined ? { maxUses: lv } : {}),
          ...(ppv !== undefined ? { perPersonLimit: ppv } : {}),
          ...(cv ? { maxDiscount: cv } : {}),
          firstOrderOnly: firstOnly,
          isActive: active,
        });
        if (!res.ok) {
          if (res.reason === "code") setErrors({ code: t.codeTaken });
          else toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
          return;
        }
        toast({ tone: "ok", title: t.saved });
        onDone();
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  function remove() {
    if (!c) return;
    start(async () => {
      try {
        const res = await deleteCoupon({ id: c.id });
        setConfirmDel(false);
        if (!res.ok) {
          toast({ tone: "err", title: t.deleteUsed });
          return;
        }
        toast({ tone: "ok", title: t.deleted });
        onDone();
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  const input = cn(
    "border-input focus-within:border-primary focus:border-primary placeholder:text-muted-foreground flex w-full min-w-0 items-center gap-2 rounded-md border bg-white px-3 shadow-xs outline-none focus-within:shadow-[0_0_0_3px_var(--ring)] focus:shadow-[0_0_0_3px_var(--ring)]",
    large ? "h-11 text-[15px]" : "h-9 text-sm",
  );
  const bare = "min-w-0 flex-auto bg-transparent tabular-nums outline-none";
  const label = "text-sm leading-5 font-medium";
  const help = "text-muted-foreground text-xs leading-4";
  const err = (k: keyof typeof errors) =>
    errors[k] ? <span className="text-destructive text-xs leading-4">{errors[k]}</span> : null;
  const field = "flex min-w-0 flex-col gap-2";

  const dateField = (
    id: string,
    lbl: string,
    val: string | undefined,
    set: (v: string | undefined) => void,
  ) => (
    <div className={field}>
      <span className={label} id={id}>
        {lbl}
      </span>
      <div className="flex gap-1.5">
        <Popover>
          <PopoverTrigger aria-labelledby={id} className={cn(input, "justify-between text-left")}>
            <span className={cn(!val && "text-muted-foreground")}>
              {val ? dayLabel(val, lang) : t.pickDate}
            </span>
            <CalendarDays className="text-muted-foreground size-4 flex-none" aria-hidden />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto rounded-lg p-0 shadow-md">
            <DateCalendar value={val} onChange={set} lang={lang} />
          </PopoverContent>
        </Popover>
        {val ? (
          <button
            type="button"
            aria-label={t.clearDate}
            title={t.clearDate}
            onClick={() => set(undefined)}
            className={btn({ variant: "ghost", size: large ? "iconLg" : "icon" })}
          >
            <X aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );

  const seg = (
    <div className={field}>
      <span className={label}>{t.type}</span>
      <div
        role="radiogroup"
        aria-label={t.type}
        className={cn(
          "bg-muted grid grid-cols-2 rounded-[10px] p-[3px]",
          variant === "tab" && "max-w-[420px]",
        )}
      >
        {(["percent", "fixed"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={type === k}
            onClick={() => setType(k)}
            className={cn(
              "font-medium",
              large ? "h-10 rounded-lg text-[15px]" : "h-8 rounded-[7px] text-sm",
              type === k ? "text-foreground bg-white shadow-xs" : "text-muted-foreground",
            )}
          >
            {k === "percent" ? t.percent : variant === "phone" ? t.fixedShort : t.fixed}
          </button>
        ))}
      </div>
    </div>
  );

  const codeField = (
    <div className={field}>
      <label className={label} htmlFor={`cp-code-${variant}`}>
        {t.code}
      </label>
      <input
        id={`cp-code-${variant}`}
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={40}
        className={cn(input, "font-mono uppercase")}
      />
      {variant !== "phone" ? <span className={help}>{t.codeHelp}</span> : null}
      {err("code")}
    </div>
  );
  const valueField = (
    <div className={field}>
      <label className={label} htmlFor={`cp-v-${variant}`}>
        {t.value}
      </label>
      <div className={input}>
        {type === "fixed" ? <span className="text-muted-foreground">৳</span> : null}
        <input
          id={`cp-v-${variant}`}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={bare}
        />
        {type === "percent" ? <span className="text-muted-foreground">%</span> : null}
      </div>
      {err("value")}
    </div>
  );
  const minField = (
    <div className={field}>
      <label className={label} htmlFor={`cp-min-${variant}`}>
        {t.minOrder}
      </label>
      <div className={input}>
        <span className="text-muted-foreground">৳</span>
        <input
          id={`cp-min-${variant}`}
          inputMode="decimal"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          className={bare}
        />
      </div>
      {err("min")}
    </div>
  );
  const dates = (
    <div className={cn("grid grid-cols-2", variant === "phone" ? "gap-2.5" : "gap-3")}>
      {dateField(`cp-s-${variant}`, t.start, startsOn, setStartsOn)}
      <div className="flex min-w-0 flex-col gap-1">
        {dateField(`cp-e-${variant}`, t.end, endsOn, setEndsOn)}
        {err("end")}
      </div>
    </div>
  );
  const limitField = (
    <div className={field}>
      <label className={label} htmlFor={`cp-lim-${variant}`}>
        {t.limit}
      </label>
      <input
        id={`cp-lim-${variant}`}
        inputMode="numeric"
        value={limit}
        onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))}
        className={cn(input, "tabular-nums")}
      />
      <span className={help}>{t.limitHelp}</span>
      {err("limit")}
    </div>
  );
  const usedField = (
    <div className={field}>
      <label className={label} htmlFor={`cp-used-${variant}`}>
        {t.used} <span className="text-muted-foreground font-normal">{t.usedAuto}</span>
      </label>
      <div className={cn(input, "bg-[#fafafa]")}>
        <Lock className="text-muted-foreground size-4 flex-none" aria-hidden />
        <input id={`cp-used-${variant}`} readOnly value={c?.used ?? 0} className={bare} />
        <span className="text-muted-foreground text-xs">{t.times}</span>
      </div>
    </div>
  );
  const switchRow = (on: boolean, set: (v: boolean) => void, title: string, help: string) => (
    <div
      className={cn(
        "border-border flex items-center justify-between gap-3 rounded-[10px] border",
        large ? "p-3.5" : "p-3",
      )}
    >
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-muted-foreground text-xs leading-4">{help}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        onClick={() => set(!on)}
        className={cn(
          "inline-flex flex-none items-center rounded-full p-0.5",
          large ? "h-[26px] w-11" : "h-5 w-9",
          on ? "bg-primary justify-end" : "justify-start bg-[#e5e5e5]",
        )}
      >
        <span
          className={cn(
            "rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)]",
            large ? "size-[22px]" : "size-4",
          )}
        />
      </button>
    </div>
  );
  const perPersonField = (
    <div className={field}>
      <label className={label} htmlFor={`cp-pp-${variant}`}>
        {t.perPerson}
      </label>
      <input
        id={`cp-pp-${variant}`}
        inputMode="numeric"
        value={perPerson}
        onChange={(e) => setPerPerson(e.target.value.replace(/\D/g, ""))}
        className={cn(input, "tabular-nums")}
      />
      <span className={help}>{t.perPersonHelp}</span>
      {err("per")}
    </div>
  );
  const capField =
    type === "percent" ? (
      <div className={field}>
        <label className={label} htmlFor={`cp-cap-${variant}`}>
          {t.maxDiscount}
        </label>
        <div className={input}>
          <span className="text-muted-foreground">৳</span>
          <input
            id={`cp-cap-${variant}`}
            inputMode="decimal"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            className={bare}
          />
        </div>
        <span className={help}>{t.maxDiscountHelp}</span>
        {err("cap")}
      </div>
    ) : null;
  const firstRow = switchRow(firstOnly, setFirstOnly, t.firstOnly, t.firstOnlyHelp);
  const detail = (k: string, v: string | null) =>
    v ? (
      <>
        <dt className="text-muted-foreground">{k}</dt>
        <dd className="m-0 font-mono break-all">{v}</dd>
      </>
    ) : null;
  const usesList = c ? (
    <div className="flex flex-col gap-2">
      <div className={label}>{t.usesTitle}</div>
      {uses.length === 0 ? <p className={help}>{t.usesNone}</p> : null}
      {uses.length ? (
        <ul className="border-border m-0 list-none overflow-hidden rounded-[10px] border p-0">
          {uses.map((u) => (
            <li key={u.id} className="border-border border-b text-xs leading-4 last:border-b-0">
              <details className="group">
                <summary className="hover:bg-subtle flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-mono tabular-nums">{u.phone}</span>
                    <span className="text-muted-foreground truncate">
                      {[
                        u.name,
                        dayLabel(u.at.toISOString().slice(0, 10), lang),
                        u.source === "admin" ? t.usesAdmin : u.ip,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="flex flex-none items-center gap-1.5">
                    {u.sameDevice ? (
                      <span className="bg-badge-warn-bg text-badge-warn-fg inline-flex h-[18px] items-center rounded-sm px-1.5 text-[11px] font-medium">
                        {t.usesSameDevice}
                      </span>
                    ) : null}
                    {u.orderId ? (
                      <Link
                        href={`/orders/${u.orderId}` as Route}
                        className="text-foreground font-mono font-medium underline-offset-2 hover:underline"
                      >
                        {u.orderNumber}
                      </Link>
                    ) : null}
                    <ChevronDown
                      className="text-muted-foreground size-3.5 transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </span>
                </summary>
                <dl className="bg-subtle m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 px-3 py-2.5">
                  {detail(t.useName, u.name)}
                  {detail(t.usePhone, u.phone)}
                  {detail(t.useAccount, u.account)}
                  {detail(
                    t.useTime,
                    u.at.toLocaleString(lang === "bn" ? "bn-BD" : "en-GB", {
                      timeZone: "Asia/Dhaka",
                    }),
                  )}
                  {detail(t.useIp, u.ip)}
                  {detail(t.useDevice, u.deviceId)}
                  {detail(t.useFingerprint, u.fingerprint)}
                  {detail(t.useBrowser, u.userAgent)}
                </dl>
              </details>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  ) : null;
  const activeRow = (
    <div
      className={cn(
        "border-border flex items-center justify-between gap-3 rounded-[10px] border",
        large ? "p-3.5" : "p-3",
      )}
    >
      <div>
        <div className="font-medium">{t.active}</div>
        <div className="text-muted-foreground text-xs leading-4">
          {variant === "phone" ? t.activeHelpShort : t.activeHelp}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={t.active}
        onClick={() => setActive((v) => !v)}
        className={cn(
          "inline-flex flex-none items-center rounded-full p-0.5",
          large ? "h-[26px] w-11" : "h-5 w-9",
          active ? "bg-primary justify-end" : "justify-start bg-[#e5e5e5]",
        )}
      >
        <span
          className={cn(
            "rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)]",
            large ? "size-[22px]" : "size-4",
          )}
        />
      </button>
    </div>
  );
  const delBtn = c ? (
    <button
      type="button"
      disabled={pending || c.used > 0}
      title={c.used > 0 ? t.deleteUsed : undefined}
      onClick={() => setConfirmDel(true)}
      className={btn({ variant: "ghost", size: "lg", className: "self-start text-[#b91c1c]" })}
    >
      {t.delete}
    </button>
  ) : null;
  const delHint = c && c.used > 0 ? <span className={help}>{t.deleteUsed}</span> : null;
  const title = c ? t.editTitle : t.newTitle;
  const subtitle = c ? fill(t.editSub, { code: c.code }) : t.newSub;

  const dialog = (
    <Dialog.Root open={confirmDel} onOpenChange={setConfirmDel}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50" />
        <Dialog.Content
          role="alertdialog"
          aria-describedby={undefined}
          className="border-border fixed top-1/2 left-1/2 z-[60] flex w-[340px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border bg-white p-5 shadow-lg"
        >
          <div>
            <Dialog.Title className="text-base leading-6 font-semibold">
              {c ? fill(t.delTitle, { code: c.code }) : ""}
            </Dialog.Title>
            <p className="text-muted-foreground text-[13px] leading-5">{t.delBody}</p>
          </div>
          <div className="flex gap-2">
            <Dialog.Close
              className={btn({ variant: "outline", size: "lg", className: "flex-1 basis-0" })}
            >
              {t.keep}
            </Dialog.Close>
            <button
              type="button"
              disabled={pending}
              onClick={remove}
              className={btn({ variant: "destructive", size: "lg", className: "flex-1 basis-0" })}
            >
              {t.delConfirm}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  /* ───── Desktop drawer (Coupons-Desktop) ───── */
  if (variant === "drawer")
    return (
      <>
        <div className="flex flex-none items-start justify-between px-6 pt-5 pb-3">
          <div>
            <SheetTitle className="text-base leading-6 font-semibold">{title}</SheetTitle>
            <p className="text-muted-foreground text-[13px] leading-5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onDone}
            aria-label={t.close}
            className={btn({ variant: "ghost", size: "iconSm" })}
          >
            <X aria-hidden />
          </button>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 px-6 pt-2 pb-4">
            {codeField}
            {seg}
            <div className="grid grid-cols-2 gap-3">
              {valueField}
              {minField}
            </div>
            {dates}
            {capField}
            {limitField}
            {perPersonField}
            {usedField}
            {activeRow}
            {firstRow}
            {usesList}
          </div>
        </ScrollArea>
        <div className="flex flex-none justify-end gap-2 px-6 pt-3 pb-6">
          <button type="button" onClick={onDone} className={btn({ variant: "outline" })}>
            {t.cancel}
          </button>
          <button type="button" disabled={pending} onClick={save} className={btn()}>
            {t.save}
          </button>
        </div>
        {dialog}
      </>
    );

  /* ───── Phone (CouponEdit-Phone): X, form, fixed save bar ───── */
  if (variant === "phone")
    return (
      <div className="flex h-full flex-col bg-white">
        <header className="border-border flex h-14 flex-none items-center gap-2 border-b bg-white pr-2 pl-1">
          <button
            type="button"
            onClick={onDone}
            aria-label={t.close}
            className={btn({ variant: "ghost", size: "iconLg", className: "[&_svg]:size-5" })}
          >
            <X aria-hidden />
          </button>
          <div className="flex min-w-0 flex-auto flex-col leading-[1.1]">
            <b className="text-lg leading-6 font-semibold">{title}</b>
            <span className="text-muted-foreground truncate text-xs leading-4">
              {c?.code ?? t.newSub}
            </span>
          </div>
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-[18px] px-4 pt-5 pb-6">
            {codeField}
            {seg}
            {valueField}
            {minField}
            {dates}
            {capField}
            {limitField}
            {perPersonField}
            {usedField}
            {activeRow}
            {firstRow}
            {usesList}
            {delBtn}
            {delHint}
          </div>
        </ScrollArea>
        <div className="border-border flex-none border-t bg-white px-4 pt-3 pb-6">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className={btn({ size: "lg", block: true })}
          >
            {t.save}
          </button>
        </div>
        {dialog}
      </div>
    );

  /* ───── Tablet 834 (CouponEdit-Tablet): two cards, fixed save bar ───── */
  const card = "border-border rounded-xl border bg-white shadow-xs";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex max-w-[760px] flex-col gap-4 px-6 pt-5 pb-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onDone}
              aria-label={t.back}
              className={btn({ variant: "outline", size: "iconLg", className: "[&_svg]:size-5" })}
            >
              <ChevronLeft aria-hidden />
            </button>
            <div className="min-w-0 flex-auto">
              <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{title}</h1>
              <p className="text-muted-foreground text-[13px] leading-4">{subtitle}</p>
            </div>
          </div>
          <section className={card}>
            <h2 className="px-6 pt-5 text-base leading-6 font-semibold">{t.secCode}</h2>
            <div className="flex flex-col gap-4 px-6 pt-4 pb-6">
              {codeField}
              {seg}
              <div className="grid grid-cols-2 gap-3">
                {valueField}
                {minField}
              </div>
              {capField}
            </div>
          </section>
          <section className={card}>
            <h2 className="px-6 pt-5 text-base leading-6 font-semibold">{t.secDates}</h2>
            <div className="flex flex-col gap-4 px-6 pt-4 pb-6">
              {dates}
              {limitField}
              {perPersonField}
              {usedField}
              {activeRow}
              {firstRow}
            </div>
          </section>
          {usesList ? <section className={cn(card, "px-6 py-5")}>{usesList}</section> : null}
          {delBtn}
          {delHint}
        </div>
      </ScrollArea>
      <div className="border-border flex flex-none items-center justify-end gap-2 border-t bg-white px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,.05)]">
        <button type="button" onClick={onDone} className={btn({ variant: "outline", size: "lg" })}>
          {t.cancel}
        </button>
        <button type="button" disabled={pending} onClick={save} className={btn({ size: "lg" })}>
          {t.save}
        </button>
      </div>
      {dialog}
    </div>
  );
}
