"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import { CalendarDays, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { addCustomerNote, banCustomer, unbanCustomer } from "@/app/actions/customers";
import { btn } from "@/components/btn";
import { DateCalendar } from "@/components/date-range-calendar";
import { useToast } from "@/components/toast";
import type { Dict } from "@/lib/i18n/dict";

type CT = Dict["customers"];

const inputCls =
  "border-input focus:border-primary placeholder:text-muted-foreground w-full rounded-md border bg-white px-3 shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)]";

/** "৩১ ডিসেম্বর ২০২৬" / "31 December 2026" for a "YYYY-MM-DD" day. */
function longDay(iso: string, lang: AdminLang): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { timeZone: "UTC", ...o }).format(
      date,
    );
  // Board: "৩১ ডিসেম্বর ২০২৬" (no comma).
  return `${fmt({ day: "numeric" })} ${fmt({ month: "long" })} ${fmt({ year: "numeric" })}`;
}

/**
 * "অ্যাকাউন্ট নিষিদ্ধ" (CustomerDetail-*). The switch shows reason + end date; "সংরক্ষণ" bans
 * (owner decision, 2026-11-14: a save button at every width). Switching a saved ban off lifts it
 * at once. `?ban=1` (from the list's split view) opens with the switch on and the card in view.
 */
export function BanCard({
  userId,
  banned,
  reason: savedReason,
  until: savedUntil,
  openOnLoad,
  t,
  lang,
}: {
  userId: string;
  banned: boolean;
  reason: string;
  until: string | undefined;
  openOnLoad: boolean;
  t: CT;
  lang: AdminLang;
}) {
  const d = t.detail;
  const toast = useToast();
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(banned || openOnLoad);
  const [reason, setReason] = useState(savedReason);
  const [until, setUntil] = useState(savedUntil);
  const [dateOpen, setDateOpen] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (openOnLoad) ref.current?.scrollIntoView({ block: "center" });
  }, [openOnLoad]);

  function toggle() {
    if (!on) return setOn(true);
    if (!banned) return setOn(false);
    start(async () => {
      try {
        await unbanCustomer({ userId });
        setOn(false);
        toast({ tone: "ok", title: t.unbanned });
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  function save() {
    start(async () => {
      try {
        const res = await banCustomer({ userId, reason, until });
        toast(res.ok ? { tone: "ok", title: d.bannedToast } : { tone: "err", title: d.pastDate });
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  const red = on;
  return (
    <section
      ref={ref}
      className={cn(
        "max-tab:gap-3 max-tab:p-4 tab:order-none flex flex-col rounded-xl border bg-white shadow-xs",
        red ? "border-[#fecaca]" : "border-border",
      )}
    >
      <div className="tab:px-6 tab:pt-5 flex items-start justify-between gap-3">
        <div>
          <h2
            className={cn(
              "max-tab:text-[15px] text-base leading-6 font-semibold",
              red && "text-[#991b1b]",
            )}
          >
            {t.banTitle}
          </h2>
          <p className="text-muted-foreground max-tab:text-xs max-tab:leading-4 text-[13px] leading-5">
            <span className="max-tab:hidden">{d.banSub}</span>
            <span className="tab:hidden">{d.banSubPhone}</span>
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={t.banTitle}
          disabled={pending}
          onClick={toggle}
          className={cn(
            "desk:h-5 desk:w-9 inline-flex h-[26px] w-11 flex-none items-center rounded-full p-0.5 disabled:opacity-50",
            on ? "bg-primary justify-end" : "justify-start bg-[#e5e5e5]",
          )}
        >
          <span className="desk:size-4 size-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)]" />
        </button>
      </div>
      {on ? (
        <div className="tab:px-6 tab:pt-4 tab:pb-6 flex flex-col gap-3">
          <div className="desk:flex desk:flex-col tab:grid tab:grid-cols-[minmax(0,1fr)_240px] flex flex-col items-start gap-3">
            <div className="flex w-full min-w-0 flex-col gap-2">
              <label className="text-sm leading-5 font-medium" htmlFor="ban-reason">
                {d.reason}
              </label>
              <textarea
                id="ban-reason"
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                className={cn(
                  inputCls,
                  "desk:text-sm max-tab:min-h-[60px] min-h-14 resize-y py-2 text-[15px] leading-5",
                )}
              />
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2">
              <span className="text-sm leading-5 font-medium" id="ban-until">
                {d.until}
              </span>
              <div className="flex gap-2">
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger
                    aria-labelledby="ban-until"
                    className={cn(
                      inputCls,
                      "desk:h-9 desk:text-sm flex h-11 min-w-0 flex-auto items-center justify-between gap-2 text-left text-[15px]",
                    )}
                  >
                    <span className={cn(!until && "text-muted-foreground")}>
                      {until ? longDay(until, lang) : d.pickDate}
                    </span>
                    <CalendarDays className="text-muted-foreground size-4 flex-none" aria-hidden />
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto rounded-lg p-0 shadow-md">
                    <DateCalendar
                      value={until}
                      lang={lang}
                      fromToday
                      onChange={(v) => {
                        setUntil(v);
                        setDateOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {until ? (
                  <button
                    type="button"
                    aria-label={d.clearDate}
                    title={d.clearDate}
                    onClick={() => setUntil(undefined)}
                    className={btn({
                      variant: "ghost",
                      size: "iconLg",
                      className: "desk:size-9",
                    })}
                  >
                    <X aria-hidden />
                  </button>
                ) : null}
              </div>
              <span className="text-muted-foreground text-xs leading-4">{d.untilHelp}</span>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className={btn({
                variant: "outline",
                size: "lg",
                className: "desk:h-8 desk:gap-1.5 desk:px-3 desk:text-[13px] max-tab:w-full",
              })}
            >
              {d.save}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** "নতুন নোট" + "নোট যোগ করুন" (customer notes, owner only). */
export function CustomerNoteForm({
  userId,
  t,
  compact,
}: {
  userId: string;
  t: CT;
  /** 1194 split-view preview: one-line input + button, as on the Customers-Tablet1194 board. */
  compact?: boolean;
}) {
  const d = t.detail;
  const toast = useToast();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    start(async () => {
      try {
        await addCustomerNote({ userId, body: text });
        setBody("");
        toast({ tone: "ok", title: d.noteAdded });
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  };
  if (compact)
    return (
      <form className="flex gap-2" onSubmit={submit}>
        <input
          value={body}
          maxLength={1000}
          onChange={(e) => setBody(e.target.value)}
          aria-label={t.noteAria}
          placeholder={t.notePh}
          className={cn(inputCls, "h-11 min-w-0 flex-auto text-[15px]")}
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className={btn({ variant: "outline", size: "lg" })}
        >
          {t.noteAdd}
        </button>
      </form>
    );
  return (
    <form className="contents" onSubmit={submit}>
      <label className="text-sm leading-5 font-medium" htmlFor="cn-note">
        {d.newNote}
      </label>
      <textarea
        id="cn-note"
        value={body}
        maxLength={1000}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t.notePh}
        className={cn(
          inputCls,
          "desk:min-h-16 desk:text-sm min-h-[72px] resize-y py-2 text-[15px] leading-5",
        )}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className={btn({
            variant: "outline",
            size: "lg",
            className: "desk:h-8 desk:gap-1.5 desk:px-3 desk:text-[13px] max-tab:w-full",
          })}
        >
          {d.addNote}
        </button>
      </div>
    </form>
  );
}
