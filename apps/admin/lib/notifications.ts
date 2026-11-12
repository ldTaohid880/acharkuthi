import "server-only";

import type { AdminRole } from "@repo/auth";
import { and, count, db, desc, eq, inArray, isNull, schema } from "@repo/db";
import type { NotificationData } from "@repo/db/schema";
import { formatTaka } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import type { Dict } from "@/lib/i18n/dict";
import { digits, relativeTime } from "@/lib/format";

export type NotificationKind = NotificationData["kind"];

export interface NotificationView {
  id: number;
  kind: NotificationKind;
  href: string;
  title: string;
  sub: string;
  when: string;
  unread: boolean;
}

const { adminNotifications: n, adminNotificationReads: r } = schema;

function kindsFor(role: AdminRole) {
  return role === "owner" ? null : [...schema.STAFF_NOTIFICATION_KINDS];
}

function readJoin(userId: string) {
  return and(eq(r.notificationId, n.id), eq(r.userId, userId));
}

/** Unread count for the bell badge. */
export async function unreadCount(userId: string, role: AdminRole): Promise<number> {
  const kinds = kindsFor(role);
  const [row] = await db
    .select({ c: count() })
    .from(n)
    .leftJoin(r, readJoin(userId))
    .where(and(isNull(r.userId), kinds ? inArray(n.kind, kinds) : undefined));
  return row?.c ?? 0;
}

/** Newest first, at most 50 (the panel scrolls). */
export async function listNotifications(
  userId: string,
  role: AdminRole,
  filter: "all" | "unread",
  lang: AdminLang,
  t: Dict,
): Promise<NotificationView[]> {
  const kinds = kindsFor(role);
  const rows = await db
    .select({
      id: n.id,
      kind: n.kind,
      href: n.href,
      data: n.data,
      createdAt: n.createdAt,
      readBy: r.userId,
    })
    .from(n)
    .leftJoin(r, readJoin(userId))
    .where(
      and(
        kinds ? inArray(n.kind, kinds) : undefined,
        filter === "unread" ? isNull(r.userId) : undefined,
      ),
    )
    .orderBy(desc(n.createdAt), desc(n.id))
    .limit(50);
  const now = new Date();
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    href: row.href,
    ...text(row.data, lang, t),
    when: relativeTime(row.createdAt, lang, now),
    unread: row.readBy === null,
  }));
}

/** Title and second line in the viewer's language (Notifications-*.dc.html copy). */
function text(d: NotificationData, lang: AdminLang, t: Dict): { title: string; sub: string } {
  const tn = t.notif;
  const product = (p: { bn: string; en: string }) => (lang === "bn" ? p.bn : p.en);
  switch (d.kind) {
    case "order":
      return {
        title: `${tn.newOrder} ${d.orderNumber}`,
        sub: `${d.name} · ${formatTaka(d.total)} · ${digits(d.items, lang)}${tn.items}`,
      };
    case "review":
      return {
        title: tn.reviewWaiting,
        sub: [`★ ${d.rating}`, d.name, d.product ? product(d.product) : tn.shopReview].join(" · "),
      };
    case "message":
      return {
        title: `${tn.newMessage}: ${tn.subjects[d.subject] ?? d.subject}`,
        sub: `${d.name} · "${d.excerpt}"`,
      };
    case "courier":
      return {
        title: `${tn.courierIssue}: ${d.orderNumber}`,
        sub: `Steadfast: ${d.courierStatus} · ${d.note}`,
      };
    case "restock":
      return {
        title: `${tn.restockReq}: ${product(d.product)} · ${d.size}`,
        sub: `${digits(d.waiting, lang)}${tn.waiting}`,
      };
    case "stock":
      return {
        title: `${tn.soldOut}: ${product(d.product)} · ${d.size}`,
        sub: `${digits(d.requests, lang)}${tn.restockRequests}`,
      };
  }
}

/** Marks notifications read for this user. Only ids the role may see. */
export async function markRead(userId: string, role: AdminRole, ids: number[] | "all") {
  const kinds = kindsFor(role);
  const unread = await db
    .select({ id: n.id })
    .from(n)
    .leftJoin(r, readJoin(userId))
    .where(
      and(
        isNull(r.userId),
        kinds ? inArray(n.kind, kinds) : undefined,
        ids === "all" ? undefined : inArray(n.id, ids),
      ),
    );
  if (unread.length === 0) return;
  await db
    .insert(r)
    .values(unread.map((u) => ({ notificationId: u.id, userId })))
    .onDuplicateKeyUpdate({ set: { readAt: new Date() } });
}
