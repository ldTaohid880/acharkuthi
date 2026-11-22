import { messageListQuery } from "@repo/validators";
import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { countMessages, getThread, listMessages, mailEnabled, unreadCount } from "@/lib/messages";
import { requireAdmin } from "@/lib/require-admin";
import { MessagesView } from "./messages-view";

export const metadata: Metadata = { title: "Messages" };

/**
 * মেসেজ: Messages-Desktop (≥1440, list + message), Messages-Tablet1194 split view (1024–1439),
 * Messages-Tablet (768–1023) and Messages-Phone (<768), where a tap opens /messages/[id]
 * (owner decision, 2026-11-14). Search, subject and box live in the URL. Staff and owner.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const raw = await searchParams;
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k][0] : raw[k]);
  const query = messageListQuery.parse(
    Object.fromEntries(["box", "q", "subject", "n", "sel"].map((k) => [k, one(k)])),
  );
  const [{ lang, t }, unread, total, rows] = await Promise.all([
    getDict(),
    unreadCount(),
    countMessages(query),
    listMessages(query, query.n),
  ]);
  const selId = query.sel ?? rows[0]?.id;
  const picked = selId ? await getThread(selId) : null;
  // A message that moved to the other box no longer belongs to this list.
  const selected =
    picked && picked.archived === (query.box === "archive")
      ? picked
      : rows[0]
        ? await getThread(rows[0].id)
        : null;
  return (
    <MessagesView
      lang={lang}
      t={t.messages}
      query={query}
      unread={unread}
      total={total}
      rows={rows}
      selected={selected}
      mail={mailEnabled()}
    />
  );
}
