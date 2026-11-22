import "server-only";

import { count, db, desc, like, schema, type SQL } from "@repo/db";

export const SUBSCRIBER_PAGE_SIZE = 10;

const { newsletterSubscribers: s } = schema;

const where = (q: string): SQL | undefined => {
  const v = q.trim();
  return v ? like(s.email, `%${v.replace(/[\\%_]/g, (c) => `\\${c}`)}%`) : undefined;
};

export async function countSubscribers(q = ""): Promise<number> {
  const [row] = await db.select({ n: count() }).from(s).where(where(q));
  return row?.n ?? 0;
}

/** Newest first. Without a limit: everyone matching (CSV export). */
export function listSubscribers(
  q: string,
  page?: { offset: number; limit: number },
): Promise<{ id: number; email: string; createdAt: Date }[]> {
  const base = db
    .select({ id: s.id, email: s.email, createdAt: s.createdAt })
    .from(s)
    .where(where(q))
    .orderBy(desc(s.createdAt), desc(s.id));
  return page ? base.limit(page.limit).offset(page.offset) : base;
}
