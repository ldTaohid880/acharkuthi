import "server-only";

import {
  and,
  asc,
  count,
  db,
  desc,
  eq,
  isNotNull,
  isNull,
  like,
  or,
  schema,
  type SQL,
} from "@repo/db";
import type { MessageListQuery } from "@repo/validators";
import { mailEnabled } from "@/lib/mailer";

type Subject = (typeof schema.contactMessages.$inferSelect)["subject"];

export interface MessageRow {
  id: number;
  name: string;
  email: string;
  subject: Subject;
  /** The start of the message, for the list. */
  preview: string;
  createdAt: Date;
  unread: boolean;
}

export interface MessageThread extends MessageRow {
  phone: string | null;
  message: string;
  archived: boolean;
  replies: { id: number; kind: "email" | "note"; body: string; at: Date; by: string | null }[];
}

const { contactMessages: m, messageReplies: r, user } = schema;

function where(q: MessageListQuery): SQL | undefined {
  const s = q.q.trim();
  const pat = `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return and(
    q.box === "archive" ? isNotNull(m.archivedAt) : isNull(m.archivedAt),
    q.subject ? eq(m.subject, q.subject) : undefined,
    s ? or(like(m.name, pat), like(m.email, pat), like(m.message, pat)) : undefined,
  );
}

const one = async (rows: Promise<{ n: number }[]>) => (await rows)[0]?.n ?? 0;

/** Unread messages still in the inbox (menu badge, dashboard, inbox tab). */
export function unreadCount(): Promise<number> {
  return one(
    db
      .select({ n: count() })
      .from(m)
      .where(and(isNull(m.archivedAt), isNull(m.readAt))),
  );
}

export async function countMessages(q: MessageListQuery): Promise<number> {
  return one(db.select({ n: count() }).from(m).where(where(q)));
}

export function listMessages(q: MessageListQuery, limit: number): Promise<MessageRow[]> {
  return select(where(q), limit);
}

/** Newest unread in the inbox (Dashboard "মেসেজ" card). */
export function latestUnread(limit: number): Promise<MessageRow[]> {
  return select(and(isNull(m.archivedAt), isNull(m.readAt)), limit);
}

async function select(cond: SQL | undefined, limit: number): Promise<MessageRow[]> {
  const rows = await db
    .select({
      id: m.id,
      name: m.name,
      email: m.email,
      subject: m.subject,
      message: m.message,
      createdAt: m.createdAt,
      readAt: m.readAt,
    })
    .from(m)
    .where(cond)
    .orderBy(desc(m.createdAt), desc(m.id))
    .limit(limit);
  return rows.map((x) => ({
    id: x.id,
    name: x.name,
    email: x.email,
    subject: x.subject,
    preview: x.message.replace(/\s+/g, " ").slice(0, 140),
    createdAt: x.createdAt,
    unread: x.readAt === null,
  }));
}

export async function getThread(id: number): Promise<MessageThread | null> {
  const [x] = await db.select().from(m).where(eq(m.id, id));
  if (!x) return null;
  const replies = await db
    .select({ id: r.id, kind: r.kind, body: r.body, at: r.createdAt, by: user.name })
    .from(r)
    .leftJoin(user, eq(user.id, r.authorId))
    .where(eq(r.messageId, id))
    .orderBy(asc(r.createdAt), asc(r.id));
  return {
    id: x.id,
    name: x.name,
    email: x.email,
    phone: x.phone,
    subject: x.subject,
    preview: x.message.slice(0, 140),
    message: x.message,
    createdAt: x.createdAt,
    unread: x.readAt === null,
    archived: x.archivedAt !== null,
    replies,
  };
}

export { mailEnabled };
