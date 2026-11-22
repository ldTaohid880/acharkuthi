"use client";

import { cn } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import { Archive, Inbox, Maximize2, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  archiveMessage,
  markMessageRead,
  markMessageUnread,
  replyToMessage,
  unarchiveMessage,
} from "@/app/actions/messages";
import { btn } from "@/components/btn";
import { NeedsStorage } from "@/components/needs-storage";
import { useToast } from "@/components/toast";
import { orderDate, fill } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import type { MessageThread } from "@/lib/messages";

export type MT = Dict["messages"];

/** Opening a message marks it read, once (not on prefetch: this runs in the browser). */
export function useMarkRead(id: number, unread: boolean) {
  // Once per opened message, so "না-পড়া করুন" afterwards isn't undone straight away.
  const done = useRef<number | null>(null);
  useEffect(() => {
    if (!unread || done.current === id) return;
    done.current = id;
    void markMessageRead({ id }).catch(() => undefined);
  }, [id, unread]);
}

/** না-পড়া করুন / আর্কাইভ (or ইনবক্সে ফেরান), shared by every layout. */
export function MessageActions({
  m,
  t,
  large,
  onDone,
}: {
  m: MessageThread;
  t: MT;
  large?: boolean | undefined;
  /** After archiving (the message leaves this list). */
  onDone?: () => void;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>, ok: string, after?: () => void) =>
    start(async () => {
      try {
        await fn();
        toast({ tone: "ok", title: ok });
        after?.();
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  const size = large ? "lg" : "sm";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => markMessageUnread({ id: m.id }), t.markedUnread)}
        className={btn({ variant: "ghost", size })}
      >
        {t.markUnread}
      </button>
      {m.archived ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => unarchiveMessage({ id: m.id }), t.unarchived, onDone)}
          className={btn({ variant: "outline", size })}
        >
          {large ? null : <Inbox aria-hidden />}
          {t.unarchiveBtn}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => archiveMessage({ id: m.id }), t.archived, onDone)}
          className={btn({ variant: "outline", size })}
        >
          {large ? null : <Archive aria-hidden />}
          {t.archiveBtn}
        </button>
      )}
    </div>
  );
}

/** Name + subject badge, then email · phone · time. */
export function MessageHead({
  m,
  t,
  lang,
  as: Tag = "h2",
  className,
}: {
  m: MessageThread;
  t: MT;
  lang: AdminLang;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Tag className="text-base leading-6 font-semibold">{m.name}</Tag>
        <span className="bg-muted inline-flex h-[22px] items-center rounded-sm px-2 text-xs leading-4 font-medium">
          {fill(t.subjectLabel, { s: t.subjects[m.subject] })}
        </span>
      </div>
      <p className="text-muted-foreground text-xs leading-4">
        {m.email}
        {m.phone ? (
          <>
            {" · "}
            <a href={`tel:${m.phone}`} className="font-mono tabular-nums">
              {m.phone}
            </a>
          </>
        ) : null}
        {" · "}
        {orderDate(m.createdAt, lang)}
      </p>
    </div>
  );
}

/** The customer's message and the thread (email replies and phone notes, oldest first). */
export function MessageBody({ m, t, lang }: { m: MessageThread; t: MT; lang: AdminLang }) {
  return (
    <>
      <p className="max-w-[640px] whitespace-pre-line">{m.message}</p>
      {m.replies.map((r) => (
        <div
          key={r.id}
          className={cn(
            "border-border rounded-[10px] border px-3 py-3",
            r.kind === "note" ? "bg-[#fafafa]" : "bg-primary-soft",
          )}
        >
          <div className="text-xs leading-4">
            <span className="font-medium">{r.by ?? "—"}</span>{" "}
            <span className="text-muted-foreground">
              · {r.kind === "note" ? t.noteKind : t.emailKind} · {orderDate(r.at, lang)}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-4 whitespace-pre-line">{r.body}</p>
        </div>
      ))}
    </>
  );
}

/** "ইমেইলে উত্তর" / "ফোন নোট" tabs, the text box and the send button. */
export function Composer({
  m,
  t,
  mail,
  large,
}: {
  m: MessageThread;
  t: MT;
  mail: boolean;
  large?: boolean | undefined;
}) {
  const toast = useToast();
  const [kind, setKind] = useState<"email" | "note">("email");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const email = kind === "email";
  const send = () =>
    start(async () => {
      try {
        const res = await replyToMessage({ id: m.id, kind, body });
        if (!res.ok) {
          toast(
            res.reason === "mail"
              ? { tone: "err", title: t.mailOff, sub: t.mailOffSub }
              : { tone: "err", title: t.saveFailed, sub: t.saveFailedSub },
          );
          return;
        }
        setBody("");
        toast({ tone: "ok", title: email ? t.sent : t.noteSaved });
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  return (
    <div className="flex flex-col gap-2.5">
      <div
        role="tablist"
        className={cn(
          "bg-muted inline-flex items-center gap-0.5 self-start rounded-[10px] p-[3px]",
          large ? "h-[46px]" : "h-[38px]",
        )}
      >
        {(["email", "note"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "inline-flex items-center rounded-[7px] px-3 text-sm font-medium whitespace-nowrap",
              large ? "h-10" : "h-8",
              kind === k ? "text-foreground bg-white shadow-xs" : "text-muted-foreground",
            )}
          >
            {k === "email" ? t.emailReply : t.phoneNote}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor={`reply-${m.id}`}>
        {t.replyLabel}
      </label>
      <textarea
        id={`reply-${m.id}`}
        value={body}
        maxLength={5000}
        onChange={(e) => setBody(e.target.value)}
        placeholder={email ? t.replyPh : t.notePh}
        className={cn(
          "border-input focus:border-primary placeholder:text-muted-foreground w-full resize-y rounded-md border bg-white px-3 py-2 leading-5 shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)]",
          large ? "min-h-[104px] text-[15px]" : "min-h-24 text-sm",
        )}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs leading-4">
          {email ? fill(t.goesTo, { email: m.email }) : t.noteHelp}
          {email && !mail ? <NeedsStorage label={t.mailNeeds} /> : null}
        </span>
        <button
          type="button"
          disabled={pending || !body.trim() || (email && !mail)}
          onClick={send}
          className={btn({ size: large ? "lg" : "sm" })}
        >
          {email ? t.send : t.saveNote}
        </button>
      </div>
    </div>
  );
}

/** Split-view (desktop and 1194) right pane. */
export function MessagePane({
  m,
  t,
  lang,
  mail,
  large,
  picked,
  onClose,
}: {
  m: MessageThread;
  t: MT;
  lang: AdminLang;
  mail: boolean;
  large?: boolean | undefined;
  /** Only a message someone picked counts as read, not the one shown first by default. */
  picked: boolean;
  onClose?: () => void;
}) {
  useMarkRead(m.id, m.unread && picked);
  return (
    <article className="flex min-h-full min-w-0 flex-col">
      {onClose ? (
        /* Owner request (2026-11-13): open full page + close, on a slim row. */
        <div className="flex justify-end gap-1 px-4 pt-2">
          <Link
            href={`/messages/${m.id}` as Route}
            className={btn({ variant: "ghost", size: "sm" })}
          >
            <Maximize2 aria-hidden />
            {t.openFull}
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
      ) : null}
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-3",
          large ? "px-6 pt-3" : "border-border border-b px-5 py-4",
        )}
      >
        <MessageHead m={m} t={t} lang={lang} />
        <MessageActions m={m} t={t} large={large} />
      </div>
      <div className={cn("flex flex-auto flex-col gap-4", large ? "px-6 py-4" : "p-5")}>
        <MessageBody m={m} t={t} lang={lang} />
      </div>
      <div
        className={cn(
          large ? "border-border mx-6 border-t pt-3.5 pb-8" : "border-border border-t px-5 py-4",
        )}
      >
        <Composer m={m} t={t} mail={mail} large={large} />
      </div>
    </article>
  );
}
