import "server-only";

import { and, count, db, desc, eq, inArray, like, max, or, schema, sql, type SQL } from "@repo/db";
import type { CustomerListQuery } from "@repo/validators";

export const CUSTOMER_PAGE_SIZE = 10;

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  /** "google" when the account was made with Google, else "email". */
  via: "google" | "email";
  phone: string | null;
  /** "মিরপুর ১০, ঢাকা": the default (or first) saved address's area and district. */
  area: string | null;
  createdAt: Date;
  orders: number;
  /** Paisa: delivered orders only. */
  spent: number;
  returns: number;
  lastOrder: Date | null;
  banned: boolean;
}

export interface CustomerPreview extends CustomerRow {
  image: string | null;
  banReason: string | null;
  banExpires: Date | null;
  orderList: { id: number; number: string; createdAt: Date; status: OrderStatus; total: number }[];
  reviews: {
    key: string;
    rating: number;
    /** Product name, or null for a review of the shop itself. */
    product: string | null;
    text: string;
    approved: boolean;
  }[];
  addresses: {
    id: number;
    label: string;
    fullName: string;
    phone: string;
    lines: string;
    line1: string;
    area: string | null;
    city: string;
    district: string | null;
    division: string | null;
    postalCode: string | null;
    isDefault: boolean;
  }[];
  notes: { id: number; body: string; at: Date; by: string | null }[];
}

type OrderStatus = (typeof schema.orders.$inferSelect)["status"];

const { user, orders: o, account, addresses: a } = schema;

/** Per-customer order numbers, as a subquery joined onto `user`. */
const stats = db
  .select({
    userId: o.userId,
    orders: count().as("orders"),
    spent:
      sql<string>`coalesce(sum(case when ${o.status} = 'delivered' then ${o.total} else 0 end), 0)`.as(
        "spent",
      ),
    returns: sql<string>`coalesce(sum(case when ${o.status} = 'returned' then 1 else 0 end), 0)`.as(
      "returns",
    ),
    last: max(o.createdAt).as("last"),
  })
  .from(o)
  .groupBy(o.userId)
  .as("stats");

/** A ban counts while it has no end date or the end date is still ahead. */
const isBanned = (u: { banned: boolean | null; banExpires: Date | null }) =>
  Boolean(u.banned) && (!u.banExpires || u.banExpires.getTime() > Date.now());

function where(q: string): SQL | undefined {
  const customers = or(eq(user.role, "user"), sql`${user.role} is null`);
  const s = q.trim();
  if (!s) return customers;
  const pat = `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return and(customers, or(like(user.name, pat), like(user.email, pat), like(user.phone, pat)));
}

function orderBy(sort: CustomerListQuery["sort"]): SQL[] {
  switch (sort) {
    case "spent":
      return [sql`${stats.spent} desc`, desc(user.createdAt)];
    case "orders":
      return [sql`coalesce(${stats.orders}, 0) desc`, desc(user.createdAt)];
    case "new":
      return [desc(user.createdAt)];
    default:
      return [sql`${stats.last} is null`, sql`${stats.last} desc`, desc(user.createdAt)];
  }
}

export async function countCustomers(q: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(user).where(where(q));
  return row?.n ?? 0;
}

export async function listCustomers(
  query: Pick<CustomerListQuery, "q" | "sort">,
  { offset, limit }: { offset: number; limit: number },
): Promise<CustomerRow[]> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      verified: user.emailVerified,
      phone: user.phone,
      createdAt: user.createdAt,
      banned: user.banned,
      banExpires: user.banExpires,
      orders: stats.orders,
      spent: stats.spent,
      returns: stats.returns,
      last: stats.last,
    })
    .from(user)
    .leftJoin(stats, eq(stats.userId, user.id))
    .where(where(query.q))
    .orderBy(...orderBy(query.sort))
    .limit(limit)
    .offset(offset);
  return withExtras(rows);
}

async function withExtras(
  rows: {
    id: string;
    name: string;
    email: string;
    verified: boolean;
    phone: string | null;
    createdAt: Date;
    banned: boolean | null;
    banExpires: Date | null;
    orders: number | null;
    spent: string | null;
    returns: string | null;
    last: Date | string | null;
  }[],
): Promise<CustomerRow[]> {
  const ids = rows.map((r) => r.id);
  if (!ids.length) return [];
  const [google, addr] = await Promise.all([
    db
      .select({ userId: account.userId })
      .from(account)
      .where(and(inArray(account.userId, ids), eq(account.providerId, "google"))),
    db
      .select({
        userId: a.userId,
        area: a.area,
        city: a.city,
        district: a.district,
        phone: a.phone,
        isDefault: a.isDefault,
      })
      .from(a)
      .where(inArray(a.userId, ids))
      .orderBy(desc(a.isDefault), a.id),
  ]);
  const viaGoogle = new Set(google.map((g) => g.userId));
  const firstAddr = new Map<string, (typeof addr)[number]>();
  for (const x of addr) if (!firstAddr.has(x.userId)) firstAddr.set(x.userId, x);
  return rows.map((r) => {
    const ad = firstAddr.get(r.id);
    const area = ad ? [ad.area || ad.city, ad.district].filter(Boolean).join(", ") : null;
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      verified: r.verified,
      via: viaGoogle.has(r.id) ? "google" : "email",
      phone: r.phone ?? ad?.phone ?? null,
      area: area || null,
      createdAt: r.createdAt,
      orders: Number(r.orders ?? 0),
      spent: Number(r.spent ?? 0),
      returns: Number(r.returns ?? 0),
      lastOrder: r.last ? new Date(r.last) : null,
      banned: isBanned(r),
    };
  });
}

/** Everything the 1194 split-view preview shows (Customers-Tablet1194.dc.html, right pane). */
export async function getCustomerPreview(id: string): Promise<CustomerPreview | null> {
  const [u] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      verified: user.emailVerified,
      phone: user.phone,
      image: user.image,
      createdAt: user.createdAt,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      orders: stats.orders,
      spent: stats.spent,
      returns: stats.returns,
      last: stats.last,
    })
    .from(user)
    .leftJoin(stats, eq(stats.userId, user.id))
    .where(and(eq(user.id, id), where("")));
  if (!u) return null;
  const [row] = await withExtras([u]);
  if (!row) return null;

  const { reviews: rv, siteReviews: sr, products: p } = schema;
  const { customerNotes: cn } = schema;
  const [orderList, productReviews, shopReviews, addr, notes] = await Promise.all([
    db
      .select({
        id: o.id,
        number: o.orderNumber,
        createdAt: o.createdAt,
        status: o.status,
        total: o.total,
      })
      .from(o)
      .where(eq(o.userId, id))
      .orderBy(desc(o.createdAt))
      .limit(50),
    db
      .select({
        id: rv.id,
        rating: rv.rating,
        title: rv.title,
        comment: rv.comment,
        approved: rv.isApproved,
        name: p.name,
        nameBn: p.nameBn,
        createdAt: rv.createdAt,
      })
      .from(rv)
      .innerJoin(p, eq(p.id, rv.productId))
      .where(eq(rv.userId, id))
      .orderBy(desc(rv.createdAt)),
    db
      .select({
        id: sr.id,
        rating: sr.rating,
        body: sr.body,
        approved: sr.isApproved,
        createdAt: sr.createdAt,
      })
      .from(sr)
      .where(eq(sr.userId, id))
      .orderBy(desc(sr.createdAt)),
    db.select().from(a).where(eq(a.userId, id)).orderBy(desc(a.isDefault), a.id),
    db
      .select({ id: cn.id, body: cn.body, at: cn.createdAt, by: user.name })
      .from(cn)
      .leftJoin(user, eq(user.id, cn.authorId))
      .where(eq(cn.customerId, id))
      .orderBy(desc(cn.createdAt), desc(cn.id)),
  ]);

  const reviews = [
    ...productReviews.map((r) => ({
      key: `p${r.id}`,
      at: r.createdAt,
      rating: r.rating,
      product: r.nameBn ?? r.name,
      text: r.comment ?? r.title ?? "",
      approved: r.approved,
    })),
    ...shopReviews.map((r) => ({
      key: `s${r.id}`,
      at: r.createdAt,
      rating: r.rating,
      product: null,
      text: r.body,
      approved: r.approved,
    })),
  ]
    .sort((x, y) => y.at.getTime() - x.at.getTime())
    .map(({ at: _at, ...r }) => r);

  return {
    ...row,
    image: u.image,
    banReason: u.banReason,
    banExpires: u.banExpires,
    orderList,
    reviews,
    addresses: addr.map((x) => ({
      id: x.id,
      label: x.label,
      fullName: x.fullName,
      phone: x.phone,
      lines: [
        x.line1,
        x.area,
        x.city,
        x.district,
        [x.division, x.postalCode].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", "),
      line1: x.line1,
      area: x.area,
      city: x.city,
      district: x.district,
      division: x.division,
      postalCode: x.postalCode,
      isDefault: x.isDefault,
    })),
    notes,
  };
}
