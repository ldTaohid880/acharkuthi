"use client";

import type { AdminLang } from "@repo/validators";
import { useRouter } from "next/navigation";
import type { MessageThread } from "@/lib/messages";
import {
  Composer,
  MessageActions,
  MessageBody,
  MessageHead,
  useMarkRead,
  type MT,
} from "../message-detail";

/** /messages/[id] body: the 1194 right pane, full width (phone and 834). */
export function MessageFull({
  m,
  t,
  lang,
  mail,
}: {
  m: MessageThread;
  t: MT;
  lang: AdminLang;
  mail: boolean;
}) {
  const router = useRouter();
  useMarkRead(m.id, m.unread);
  return (
    <div className="tab:px-6 tab:pb-8 wide:px-8 flex flex-col gap-4 p-4 pb-8">
      <section className="border-border tab:p-6 flex flex-col gap-4 rounded-xl border bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <MessageHead m={m} t={t} lang={lang} as="h1" />
          <MessageActions
            m={m}
            t={t}
            large
            onDone={() =>
              router.replace((m.archived ? "/messages?box=archive" : "/messages") as "/messages")
            }
          />
        </div>
        <MessageBody m={m} t={t} lang={lang} />
        <div className="border-border border-t pt-3.5">
          <Composer m={m} t={t} mail={mail} large />
        </div>
      </section>
    </div>
  );
}
