import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@repo/auth";
import { and, asc, db, desc, eq, schema } from "@repo/db";
import { formatBnDate } from "@/lib/track";

/** Account data for the signed-in customer (Account.dc.html). Server only. */

export const getSessionUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  return session?.user ?? null;
});

/** Every account page and action calls this. Signed-out visitors go to sign in. */
/** `next` is the page to come back to after signing in. */
export async function requireUser(next?: string) {
  const user = await getSessionUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export type OrderChip = "p" | "s" | "d";

/** DB status → the design's chip (owner decision: cancelled/returned get their own label, grey chip). */
const STATUS: Record<(typeof schema.ORDER_STATUSES)[number], { label: string; cls: OrderChip }> = {
  pending: { label: "প্রক্রিয়াধীন", cls: "p" },
  confirmed: { label: "প্রক্রিয়াধীন", cls: "p" },
  processing: { label: "প্রক্রিয়াধীন", cls: "p" },
  shipped: { label: "পথে আছে", cls: "s" },
  delivered: { label: "পৌঁছে গেছে", cls: "d" },
  cancelled: { label: "বাতিল", cls: "p" },
  returned: { label: "ফেরত", cls: "p" },
};

/** Dates as the tracking page shows them (Track.dc.html "1 নভেম্বর 2026"), in Dhaka time. */
const dateFmt = { format: formatBnDate };

export interface AccountOrder {
  number: string;
  date: string;
  /** Paisa. */
  total: number;
  status: string;
  cls: OrderChip;
  track: boolean;
  reorder: boolean;
}

export const getAccountOrders = cache(
  async (userId: string, limit?: number): Promise<AccountOrder[]> => {
    const rows = await db.query.orders.findMany({
      where: eq(schema.orders.userId, userId),
      columns: { orderNumber: true, createdAt: true, total: true, status: true },
      orderBy: [desc(schema.orders.createdAt), desc(schema.orders.id)],
      ...(limit ? { limit } : {}),
    });
    return rows.map((o) => {
      const st = STATUS[o.status];
      const open = o.status !== "delivered" && o.status !== "cancelled" && o.status !== "returned";
      return {
        number: o.orderNumber,
        date: dateFmt.format(o.createdAt),
        total: o.total,
        status: st.label,
        cls: st.cls,
        track: open,
        reorder: o.status === "delivered",
      };
    });
  },
);

export interface AccountAddress {
  id: number;
  label: string;
  name: string;
  phone: string;
  line: string;
  division: string;
  district: string;
  upazila: string;
  isDefault: boolean;
}

export const getAccountAddresses = cache(async (userId: string): Promise<AccountAddress[]> => {
  const rows = await db.query.addresses.findMany({
    where: eq(schema.addresses.userId, userId),
    orderBy: [desc(schema.addresses.isDefault), asc(schema.addresses.id)],
  });
  return rows.map((a) => ({
    id: a.id,
    label: a.label,
    name: a.fullName,
    phone: a.phone,
    line: a.line1,
    division: a.division ?? "",
    district: a.district ?? "",
    upazila: a.city,
    isDefault: a.isDefault,
  }));
});

export interface AccountReview {
  id: number;
  title: string;
  rating: number;
  text: string;
  date: string;
  approved: boolean;
}

export const getAccountReviews = cache(async (userId: string) => {
  const [prod, site] = await Promise.all([
    db.query.reviews.findMany({
      where: eq(schema.reviews.userId, userId),
      with: { product: { columns: { name: true } } },
      orderBy: [desc(schema.reviews.createdAt)],
    }),
    db.query.siteReviews.findMany({
      where: eq(schema.siteReviews.userId, userId),
      orderBy: [desc(schema.siteReviews.createdAt)],
    }),
  ]);
  const product: AccountReview[] = prod.map((r) => ({
    id: r.id,
    title: r.product.name,
    rating: r.rating,
    text: r.comment ?? r.title ?? "",
    date: dateFmt.format(r.createdAt),
    approved: r.isApproved,
  }));
  const overall: AccountReview[] = site.map((r) => ({
    id: r.id,
    title: "Acharkuthi নিয়ে আপনার অভিজ্ঞতা",
    rating: r.rating,
    text: r.body,
    date: dateFmt.format(r.createdAt),
    approved: r.isApproved,
  }));
  return { product, overall };
});

export const getAccountProfile = cache(async (userId: string) => {
  const [u, accounts] = await Promise.all([
    db.query.user.findFirst({
      where: eq(schema.user.id, userId),
      columns: { name: true, email: true, phone: true, image: true },
    }),
    db.query.account.findMany({
      where: eq(schema.account.userId, userId),
      columns: { providerId: true },
    }),
  ]);
  return {
    name: u?.name ?? "",
    email: u?.email ?? "",
    phone: u?.phone ?? "",
    /** Profile photo from Google, when the account has one. */
    image: u?.image ?? null,
    /** Has an email + password login. Google-only accounts get no password controls. */
    hasPassword: accounts.some((a) => a.providerId === "credential"),
  };
});

/** Items of the customer's own delivered order that are still on sale, with current DB prices. */
export async function reorderLines(userId: string, orderNumber: string) {
  const order = await db.query.orders.findFirst({
    where: and(eq(schema.orders.orderNumber, orderNumber), eq(schema.orders.userId, userId)),
    with: { items: true },
  });
  if (!order) return null;
  const lines = [];
  for (const it of order.items) {
    if (!it.variantId) continue;
    const v = await db.query.productVariants.findFirst({
      where: eq(schema.productVariants.id, it.variantId),
      with: { product: { columns: { name: true, slug: true, isActive: true } } },
    });
    if (!v || !v.isActive || !v.product.isActive || v.stock <= 0) continue;
    lines.push({
      variantId: v.id,
      slug: v.product.slug,
      productName: v.product.name,
      variantLabel: v.label,
      unitPrice: v.price,
      quantity: Math.min(it.quantity, v.stock),
      maxQty: v.stock,
    });
  }
  return lines;
}
