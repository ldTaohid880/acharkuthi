import "server-only";

import { asc, db, eq, inArray, isNull, schema } from "@repo/db";
import { env } from "@/env";
import { mailEnabled } from "@/lib/mailer";

export interface RestockVariant {
  id: number;
  bn: string;
  en: string;
  size: string;
  stock: number;
  open: number;
  shopUrl: string;
}

export interface RestockRequestRow {
  id: number;
  contact: string;
  kind: "phone" | "email";
  name: string | null;
  createdAt: Date;
  notifiedAt: Date | null;
}

/** Restock-* boards: sizes with open "স্টকে এলে জানান" requests, in stock first. */
export async function listRestock(): Promise<{
  variants: RestockVariant[];
  total: number;
  mail: boolean;
}> {
  const { restockRequests: r, productVariants: v, products: p } = schema;
  const open = await db.select({ variantId: r.variantId }).from(r).where(isNull(r.notifiedAt));
  const counts = new Map<number, number>();
  for (const o of open) counts.set(o.variantId, (counts.get(o.variantId) ?? 0) + 1);
  const ids = [...counts.keys()];
  const rows = ids.length
    ? await db
        .select({
          id: v.id,
          size: v.label,
          stock: v.stock,
          name: p.name,
          nameBn: p.nameBn,
          slug: p.slug,
        })
        .from(v)
        .innerJoin(p, eq(p.id, v.productId))
        .where(inArray(v.id, ids))
    : [];
  const variants = rows
    .map((x) => ({
      id: x.id,
      bn: x.nameBn ?? x.name,
      en: x.name,
      size: x.size,
      stock: x.stock,
      open: counts.get(x.id) ?? 0,
      shopUrl: new URL(`/pickles/${x.slug}`, env.STOREFRONT_URL).toString(),
    }))
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || b.open - a.open);
  return { variants, total: open.length, mail: mailEnabled() };
}

/** Every request (open and told) for one size, oldest first. */
export async function restockRequestsFor(variantId: number): Promise<RestockRequestRow[]> {
  const { restockRequests: r, user } = schema;
  return db
    .select({
      id: r.id,
      contact: r.contact,
      kind: r.contactKind,
      name: user.name,
      createdAt: r.createdAt,
      notifiedAt: r.notifiedAt,
    })
    .from(r)
    .leftJoin(user, eq(user.id, r.userId))
    .where(eq(r.variantId, variantId))
    .orderBy(asc(r.notifiedAt), asc(r.createdAt));
}
