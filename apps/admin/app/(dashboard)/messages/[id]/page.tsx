import { ScrollArea } from "@repo/ui/components/scroll-area";
import { fill } from "@/lib/format";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { btn } from "@/components/btn";
import { Crumb } from "@/components/shell/shell-context";
import { getDict } from "@/lib/i18n/server";
import { getThread, mailEnabled } from "@/lib/messages";
import { requireAdmin } from "@/lib/require-admin";
import { MessageFull } from "./message-full";

export const metadata: Metadata = { title: "Message" };

/**
 * One message on its own page (owner decision, 2026-11-14): where phones and the 834 tablet open
 * a message, built from the Messages-Tablet1194 board's right pane. The header stays; the body
 * and reply box scroll. Staff and owner.
 */
export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const [m, { lang, t: dict }] = await Promise.all([getThread(id), getDict()]);
  if (!m) notFound();
  const t = dict.messages;
  const back = m.archived ? "/messages?box=archive" : "/messages";

  return (
    <div className="flex h-full flex-col">
      <Crumb value={m.name} />
      {/* Phone header (.p-head) */}
      <header className="border-border tab:hidden flex h-14 flex-none items-center gap-2 border-b bg-white pr-2 pl-1">
        <Link
          href={back}
          aria-label={t.back}
          className={btn({ variant: "ghost", size: "iconLg", className: "[&_svg]:size-5" })}
        >
          <ChevronLeft aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-auto flex-col leading-[1.1]">
          <b className="truncate text-lg leading-6 font-semibold">{m.name}</b>
          <span className="text-muted-foreground truncate text-xs leading-4">
            {fill(t.subjectLabel, { s: t.subjects[m.subject] })}
          </span>
        </div>
      </header>
      {/* Tablet / desktop: back button above the message */}
      <div className="tab:flex wide:px-8 hidden flex-none items-center gap-3 px-6 pt-5 pb-2">
        <Link
          href={back}
          aria-label={t.back}
          className={btn({ variant: "outline", size: "iconLg", className: "[&_svg]:size-5" })}
        >
          <ChevronLeft aria-hidden />
        </Link>
        <span className="text-muted-foreground text-sm">{t.back}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <MessageFull m={m} t={t} lang={lang} mail={mailEnabled()} />
      </ScrollArea>
    </div>
  );
}
