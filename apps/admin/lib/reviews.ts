import "server-only";

import { and, count, db, desc, eq, schema, type SQL } from "@repo/db";
import type { ReviewListQuery } from "@repo/validators";
import { env } from "@/env";

export interface ReviewRow {
  /** "p12" (product review) or "s3" (shop review). */
  key: string;
  kind: "product" | "site";
  name: string;
  rating: number;
  createdAt: Date;
  /** Bangla product name (English when there is none); null for a shop review. */
  product: { id: number; name: string; url: string } | null;
  /** Written while signed in (has an account), or as a guest. */
  signedIn: boolean;
  title: string | null;
  text: string;
  spice: "low" | "ok" | "high" | null;
  /** Absolute storefront URL of the customer's photo. */
  photo: string | null;
  approved: boolean;
  reply: string | null;
}

export interface ReviewCounts {
  pending: number;
  approved: number;
  product: number;
  site: number;
}

const { reviews: rv, siteReviews: sr, products: p, user } = schema;
const shopUrl = (path: string) => new URL(path, env.STOREFRONT_URL).toString();

function productWhere(q: ReviewListQuery, approved: boolean): SQL | undefined {
  return and(
    eq(rv.isApproved, approved),
    q.product ? eq(rv.productId, q.product) : undefined,
    q.rating ? eq(rv.rating, q.rating) : undefined,
  );
}
function siteWhere(q: ReviewListQuery, approved: boolean): SQL | undefined {
  return and(eq(sr.isApproved, approved), q.rating ? eq(sr.rating, q.rating) : undefined);
}
/** A product filter leaves shop reviews out. */
const wantsProduct = (q: ReviewListQuery) => q.kind !== "site";
const wantsSite = (q: ReviewListQuery) => q.kind !== "product" && !q.product;

const one = async (rows: Promise<{ n: number }[]>) => (await rows)[0]?.n ?? 0;

/** Tab counts: status counts follow the kind and filters; kind counts follow the status. */
export async function reviewCounts(q: ReviewListQuery): Promise<ReviewCounts> {
  const [pPending, pApproved, sPending, sApproved] = await Promise.all([
    one(db.select({ n: count() }).from(rv).where(productWhere(q, false))),
    one(db.select({ n: count() }).from(rv).where(productWhere(q, true))),
    q.product ? 0 : one(db.select({ n: count() }).from(sr).where(siteWhere(q, false))),
    q.product ? 0 : one(db.select({ n: count() }).from(sr).where(siteWhere(q, true))),
  ]);
  const byKind = (pc: number, sc: number) => (wantsProduct(q) ? pc : 0) + (wantsSite(q) ? sc : 0);
  const approved = q.status === "approved";
  return {
    pending: byKind(pPending, sPending),
    approved: byKind(pApproved, sApproved),
    product: approved ? pApproved : pPending,
    site: approved ? sApproved : sPending,
  };
}

function productQuery(where: SQL | undefined) {
  return db
    .select({
      id: rv.id,
      name: rv.name,
      userId: rv.userId,
      userName: user.name,
      rating: rv.rating,
      createdAt: rv.createdAt,
      title: rv.title,
      comment: rv.comment,
      spice: rv.spice,
      photoUrl: rv.photoUrl,
      approved: rv.isApproved,
      reply: rv.reply,
      productId: p.id,
      productName: p.name,
      productBn: p.nameBn,
      slug: p.slug,
    })
    .from(rv)
    .innerJoin(p, eq(p.id, rv.productId))
    .leftJoin(user, eq(user.id, rv.userId))
    .where(where)
    .orderBy(desc(rv.createdAt), desc(rv.id));
}

function fromProduct(r: Awaited<ReturnType<typeof productQuery>>[number]): ReviewRow {
  return {
    key: `p${r.id}`,
    kind: "product",
    name: r.name || r.userName || "",
    rating: r.rating,
    createdAt: r.createdAt,
    product: {
      id: r.productId,
      name: r.productBn ?? r.productName,
      url: shopUrl(`/pickles/${r.slug}`),
    },
    signedIn: r.userId !== null,
    title: r.title,
    text: r.comment ?? "",
    spice: r.spice,
    photo: r.photoUrl ? shopUrl(r.photoUrl) : null,
    approved: r.approved,
    reply: r.reply,
  };
}

function fromSite(r: typeof sr.$inferSelect): ReviewRow {
  return {
    key: `s${r.id}`,
    kind: "site",
    name: r.name,
    rating: r.rating,
    createdAt: r.createdAt,
    product: null,
    signedIn: r.userId !== null,
    title: null,
    text: r.body,
    spice: null,
    photo: null,
    approved: r.isApproved,
    reply: r.reply,
  };
}

/** Newest first, both kinds merged; the first `limit`. */
export async function listReviews(q: ReviewListQuery, limit: number): Promise<ReviewRow[]> {
  const approved = q.status === "approved";
  const [prod, site] = await Promise.all([
    wantsProduct(q) ? productQuery(productWhere(q, approved)).limit(limit) : [],
    wantsSite(q)
      ? db
          .select()
          .from(sr)
          .where(siteWhere(q, approved))
          .orderBy(desc(sr.createdAt), desc(sr.id))
          .limit(limit)
      : [],
  ]);
  return [...prod.map(fromProduct), ...site.map(fromSite)]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/** One review by key (the selected one may sit beyond the loaded list). */
export async function getReview(key: string): Promise<ReviewRow | null> {
  const id = Number(key.slice(1));
  if (key.startsWith("p")) {
    const [r] = await productQuery(eq(rv.id, id));
    return r ? fromProduct(r) : null;
  }
  const [r] = await db.select().from(sr).where(eq(sr.id, id));
  return r ? fromSite(r) : null;
}

/** "সব পণ্য" menu: products that have at least one review, by name. */
export async function reviewedProducts(): Promise<{ id: number; name: string }[]> {
  const rows = await db
    .selectDistinct({ id: p.id, name: p.name, nameBn: p.nameBn })
    .from(p)
    .innerJoin(rv, eq(rv.productId, p.id));
  return rows
    .map((r) => ({ id: r.id, name: r.nameBn ?? r.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "bn"));
}
