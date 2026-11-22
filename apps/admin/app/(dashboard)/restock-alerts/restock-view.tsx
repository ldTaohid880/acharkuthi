"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import { Bell, ChevronLeft, Info } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { markRestockNotified, notifyRestockAll } from "@/app/actions/restock";
import { btn } from "@/components/btn";
import { NeedsStorage } from "@/components/needs-storage";
import { useBreakpoint } from "@/components/shell/shell-context";
import { useToast } from "@/components/toast";
import { digits, fill, orderDate } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import type { RestockRequestRow, RestockVariant } from "@/lib/restock";

type RT = Dict["restock"];

const badgeCls =
  "inline-flex h-[22px] flex-none items-center rounded-sm border border-transparent px-2 text-xs leading-4 font-medium whitespace-nowrap";
const kindCls =
  "border-border inline-flex h-[18px] items-center rounded-sm border bg-white px-2 text-[11px] font-medium whitespace-nowrap";

/**
 * রিস্টক অ্যালার্ট (Restock-Desktop / -Tablet / -Phone). "সবাইকে এখন জানান" emails everyone who left
 * an email address; phone numbers are told by the owner, who presses "জানানো হয়েছে" on each.
 * Owner decision: the email is a short "it's back" note, so no restock time is kept or shown.
 */
export function RestockView({
  variants,
  total,
  mail,
  selected,
  requests,
  t,
  lang,
}: {
  variants: RestockVariant[];
  total: number;
  mail: boolean;
  selected: number | null;
  requests: RestockRequestRow[];
  t: RT;
  lang: AdminLang;
}) {
  const bp = useBreakpoint();
  const toast = useToast();
  const [pending, start] = useTransition();
  const sel = variants.find((v) => v.id === selected) ?? null;
  const n = (x: number) => digits(x, lang);
  const href = (v: RestockVariant) => ({ pathname: "/restock-alerts", query: { v: v.id } });

  function notifyAll(v: RestockVariant) {
    start(async () => {
      try {
        const res = await notifyRestockAll({ variantId: v.id });
        if (!res.ok) {
          toast({ tone: "err", title: res.reason === "mail" ? t.mailNeeds : t.notReady });
          return;
        }
        const phones = res.phones ? fill(t.sentPhones, { n: n(res.phones) }) : undefined;
        if (res.failed) {
          toast({ tone: "err", title: fill(t.sentFailed, { n: n(res.failed) }), sub: phones });
        } else {
          toast({
            tone: "ok",
            title: res.emailed ? fill(t.sent, { n: n(res.emailed) }) : t.nothingToEmail,
            sub: phones,
          });
        }
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  function mark(r: RestockRequestRow) {
    start(async () => {
      try {
        await markRestockNotified({ id: r.id });
        toast({ tone: "ok", title: t.marked });
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  const badge = (v: RestockVariant) => (
    <span
      className={cn(
        badgeCls,
        v.stock > 0 ? "bg-badge-ok-bg text-badge-ok-fg" : "bg-badge-danger-bg text-badge-danger-fg",
      )}
    >
      {v.stock > 0 ? t.inStock : t.out}
    </span>
  );

  /** The notify button, or the disabled "স্টক এলে জানানো যাবে" when the size is still out. */
  const notifyBtn = (v: RestockVariant, size: "default" | "lg", block: boolean, icon = true) =>
    v.stock > 0 ? (
      <button
        type="button"
        disabled={pending || !mail}
        onClick={() => notifyAll(v)}
        className={btn({ size, block })}
      >
        {icon ? <Bell aria-hidden /> : null}
        {fill(t.notifyAll, { n: n(v.open) })}
      </button>
    ) : (
      <button type="button" disabled className={btn({ variant: "outline", size, block })}>
        {t.notReady}
      </button>
    );

  const mailNote = mail ? null : <NeedsStorage label={t.mailNeeds} />;

  const kind = (r: RestockRequestRow) => (r.kind === "email" ? t.email : t.phone);
  const user = (r: RestockRequestRow) => r.name ?? t.guest;

  const note = (text: string, className?: string) => (
    <div
      className={cn(
        "border-border flex items-start gap-3 rounded-[10px] border bg-[#fafafa] px-4 py-3",
        className,
      )}
    >
      <Info className="text-muted-foreground mt-0.5 size-4 flex-none" aria-hidden />
      <p className="text-muted-foreground text-xs leading-4">{text}</p>
    </div>
  );

  const th =
    "text-muted-foreground border-border h-10 border-b px-3 text-left text-[13px] font-medium whitespace-nowrap";

  const table = (large: boolean) => (
    <table className="w-full border-collapse">
      <thead className="sticky top-0 z-[1] bg-white">
        <tr>
          <th className={th}>{t.colContact}</th>
          <th className={th}>{t.colAccount}</th>
          <th className={th}>{t.colRequested}</th>
          <th className={th}>{t.colNotified}</th>
          <th className={cn(th, "w-[1%]")} />
        </tr>
      </thead>
      <tbody>
        {requests.map((r) => (
          <tr
            key={r.id}
            className={cn(
              "border-border [&>td]:border-b [&>td]:align-middle",
              large ? "h-14 [&>td]:p-3" : "[&>td]:px-3 [&>td]:py-2.5",
            )}
          >
            <td>
              <div className="font-mono text-[13px] whitespace-nowrap tabular-nums">
                {r.contact}
              </div>
              <span className={kindCls}>{kind(r)}</span>
            </td>
            <td className="text-xs leading-4">{user(r)}</td>
            <td className="text-xs leading-4 whitespace-nowrap">
              {orderDate(r.createdAt, lang, false)}
            </td>
            <td className="text-xs leading-4">
              {r.notifiedAt ? (
                <span className={cn(badgeCls, "bg-badge-ok-bg text-badge-ok-fg")}>
                  {orderDate(r.notifiedAt, lang)}
                </span>
              ) : (
                <span className="text-muted-foreground">{t.pending}</span>
              )}
            </td>
            <td className="w-[1%]">
              {r.notifiedAt ? null : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => mark(r)}
                  className={btn({ variant: "outline", size: large ? "lg" : "xs" })}
                >
                  {t.markDone}
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const header = (sub: string) => (
    <div className="flex-none">
      <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
      <p className="text-muted-foreground text-[13px] leading-4">{sub}</p>
    </div>
  );

  const empty = (
    <div className="border-border rounded-xl border bg-white p-8 text-center shadow-xs">
      <p className="font-medium">{t.empty}</p>
      <p className="text-muted-foreground mt-1 text-xs leading-4">{t.emptySub}</p>
    </div>
  );

  /* ───── Phone (<768): Restock-Phone ───── */
  if (bp === "phone") {
    const rest = variants.filter((v) => v.id !== sel?.id);
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
              {fill(t.phoneSub, { n: n(total) })}
            </span>
          </div>
        </header>
        <ScrollArea key={sel?.id ?? 0} className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            {sel ? null : empty}
            {sel ? (
              <article className="border-primary flex flex-col gap-2.5 rounded-xl border bg-white px-4 py-3.5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {sel.bn} · {sel.size}
                    </div>
                    <div className="text-muted-foreground text-xs leading-4">
                      {sel.en} · {fill(t.stockN, { n: sel.stock })}
                    </div>
                  </div>
                  {badge(sel)}
                </div>
                {notifyBtn(sel, "lg", true, false)}
                <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px] leading-[14px]">
                  {t.howHelpPhone}
                  {mailNote}
                </span>
                <ul className="flex flex-col">
                  {requests.map((r) => (
                    <li
                      key={r.id}
                      className="border-border flex items-center gap-2.5 border-t py-2.5"
                    >
                      <span className="flex min-w-0 flex-auto flex-col gap-0.5">
                        <span className="truncate font-mono text-[13px] tabular-nums">
                          {r.contact}
                        </span>
                        <span className="text-muted-foreground text-[11px] leading-[14px]">
                          {kind(r)} · {user(r)} ·{" "}
                          {fill(t.requestedOn, { d: orderDate(r.createdAt, lang, false) })}
                        </span>
                        {r.notifiedAt ? (
                          <span className="text-[11px] leading-[14px] text-[#166534]">
                            {fill(t.doneAt, { d: orderDate(r.notifiedAt, lang) })}
                          </span>
                        ) : null}
                      </span>
                      {r.notifiedAt ? null : (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => mark(r)}
                          className={btn({
                            variant: "outline",
                            size: "lg",
                            className: "px-2.5 text-[13px]",
                          })}
                        >
                          {t.markDone}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}
            {rest.map((v) => (
              <article
                key={v.id}
                className="border-border flex flex-col gap-2.5 rounded-xl border bg-white px-4 py-3.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {v.bn} · {v.size}
                    </div>
                    <div className="text-muted-foreground text-xs leading-4">{v.en}</div>
                  </div>
                  {badge(v)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs leading-4">
                    <span className="text-lg font-medium tabular-nums">{n(v.open)}</span>{" "}
                    {t.waiting} <span className="tabular-nums">{v.stock}</span>
                  </span>
                  <Link
                    href={href(v)}
                    scroll={false}
                    className="text-primary text-xs leading-4 font-medium"
                  >
                    {t.list}
                  </Link>
                </div>
                {notifyBtn(v, "lg", true)}
              </article>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  /* ───── Tablet 834 (768–1023): Restock-Tablet. Header stays; the rest scrolls. ───── */
  if (bp === "tab") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex-none px-6 pt-5 pb-4">
          {header(
            fill(t.subCount, { v: n(variants.length), n: n(total) }) +
              (mail ? "" : ` · ${t.mailNeeds}`),
          )}
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 px-6 pb-8">
            {sel ? null : empty}
            <div className="grid grid-cols-2 gap-3">
              {variants.map((v) => (
                <article
                  key={v.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-xs",
                    v.id === sel?.id ? "border-primary" : "border-border",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {v.bn} · {v.size}
                      </div>
                      <div className="text-muted-foreground text-xs leading-4">{v.en}</div>
                    </div>
                    {badge(v)}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      <span className="text-xl font-semibold tabular-nums">{n(v.open)}</span>{" "}
                      <span className="text-muted-foreground text-xs leading-4">
                        {t.waiting} <span className="tabular-nums">{v.stock}</span>
                      </span>
                    </span>
                    <Link
                      href={href(v)}
                      scroll={false}
                      aria-current={v.id === sel?.id ? "true" : undefined}
                      className={btn({ variant: "ghost", size: "lg" })}
                    >
                      {t.list}
                    </Link>
                  </div>
                  {notifyBtn(v, "lg", true)}
                </article>
              ))}
            </div>
            {sel ? (
              <section className="border-border rounded-xl border bg-white shadow-xs">
                <div className="px-6 pt-5">
                  <h2 className="text-base leading-6 font-semibold">
                    {sel.bn} · {sel.size}
                  </h2>
                  <p className="text-muted-foreground text-[13px] leading-5">
                    {fill(t.nowStock, { n: sel.stock })} · {t.howHelpTab}
                  </p>
                </div>
                <div className="px-6 pt-2 pb-6">{table(true)}</div>
              </section>
            ) : null}
            {variants.length ? note(t.noteTab) : null}
          </div>
        </ScrollArea>
      </div>
    );
  }

  /* ───── Desktop (≥1024): Restock-Desktop. Each pane scrolls on its own. ───── */
  return (
    <div className="wide:px-8 wide:pt-6 wide:pb-6 flex h-full min-h-0 flex-col gap-4 px-6 pt-5 pb-5">
      {header(t.sub)}
      {sel ? (
        <div className="border-border flex min-h-0 flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
          <div className="border-border flex max-w-[380px] min-w-0 flex-[1_1_320px] flex-col border-r">
            <div className="border-border text-muted-foreground flex-none border-b px-3.5 py-2.5 text-xs leading-4 font-medium">
              {fill(t.bySize, { v: n(variants.length), n: n(total) })}
            </div>
            <ScrollArea className="min-h-0 flex-1">
              {variants.map((v) => {
                const on = v.id === sel.id;
                return (
                  <Link
                    key={v.id}
                    href={href(v)}
                    scroll={false}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "border-border flex w-full items-center gap-2.5 border-b px-3.5 py-3 text-left",
                      on ? "bg-primary-soft shadow-[inset_3px_0_0_var(--primary)]" : "bg-white",
                    )}
                  >
                    <span className="flex min-w-0 flex-auto flex-col gap-1">
                      <span className="truncate font-medium">
                        {v.bn} · {v.size}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {badge(v)}
                        <span className="text-muted-foreground text-xs leading-4 tabular-nums">
                          {fill(t.stockN, { n: v.stock })}
                        </span>
                      </span>
                    </span>
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-5 flex-none items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                        on ? "bg-primary text-white" : "bg-muted text-foreground",
                      )}
                    >
                      {n(v.open)}
                    </span>
                  </Link>
                );
              })}
            </ScrollArea>
          </div>
          <div className="flex min-w-0 flex-[999_1_460px] flex-col">
            <div className="border-border flex flex-none flex-wrap items-start justify-between gap-4 border-b px-5 py-4">
              <div>
                <h2 className="text-base leading-6 font-semibold">
                  {sel.bn} · {sel.size}
                </h2>
                <p className="text-muted-foreground text-xs leading-4">
                  {sel.en} · {fill(t.nowStock, { n: sel.stock })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {notifyBtn(sel, "default", false)}
                <span className="text-muted-foreground flex flex-wrap items-center justify-end gap-1.5 text-right text-[11px] leading-[14px]">
                  {t.howHelp}
                  {mailNote}
                </span>
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              {table(false)}
              {note(t.note, "mx-5 my-4")}
            </ScrollArea>
          </div>
        </div>
      ) : (
        empty
      )}
    </div>
  );
}
