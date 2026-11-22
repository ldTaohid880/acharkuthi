import { subscriberListQuery } from "@repo/validators";
import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { unreadCount } from "@/lib/messages";
import { requireAdmin } from "@/lib/require-admin";
import { countSubscribers, listSubscribers, SUBSCRIBER_PAGE_SIZE } from "@/lib/subscribers";
import { SubscribersView } from "./subscribers-view";

export const metadata: Metadata = { title: "Newsletter subscribers" };

/**
 * নিউজলেটার সাবস্ক্রাইবার: Subscribers-Desktop / -Tablet (table + pager) and -Phone (list, "আরও
 * দেখুন"). Footer sign-ups from the shop; CSV export of the current filter. Staff and owner.
 */
export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const raw = await searchParams;
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k][0] : raw[k]);
  const query = subscriberListQuery.parse(
    Object.fromEntries(["q", "page", "n"].map((k) => [k, one(k)])),
  );
  const [{ lang, t }, unread, all, total] = await Promise.all([
    getDict(),
    unreadCount(),
    countSubscribers(),
    countSubscribers(query.q),
  ]);
  const pages = Math.max(1, Math.ceil(total / SUBSCRIBER_PAGE_SIZE));
  const page = Math.min(query.page, pages);
  const [rows, phoneRows] = await Promise.all([
    listSubscribers(query.q, {
      offset: (page - 1) * SUBSCRIBER_PAGE_SIZE,
      limit: SUBSCRIBER_PAGE_SIZE,
    }),
    listSubscribers(query.q, { offset: 0, limit: query.n }),
  ]);
  return (
    <SubscribersView
      lang={lang}
      t={t.subs}
      mt={t.messages}
      query={{ ...query, page }}
      unread={unread}
      all={all}
      total={total}
      pages={pages}
      pageSize={SUBSCRIBER_PAGE_SIZE}
      rows={rows}
      phoneRows={phoneRows}
    />
  );
}
