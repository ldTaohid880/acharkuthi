import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@repo/auth";
import { asc, db, desc, eq, getShopRules, schema } from "@repo/db";
import { CheckoutView, type CheckoutValues } from "@/components/checkout-view";
import { isKnownLocation } from "@/lib/bd-locations";
import { getDict } from "@/lib/i18n/dict";
import { langOf } from "@/lib/seo";

interface Params {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: getDict(await langOf(params)).checkout.metaTitle, robots: { index: false } };
}

/**
 * The signed-in customer's default saved address (else their newest), as checkout fields. Only an
 * address the location pickers know is used, so the delivery zone and fee can be worked out.
 */
async function savedAddress(userId: string): Promise<Partial<CheckoutValues>> {
  const [a] = await db
    .select()
    .from(schema.addresses)
    .where(eq(schema.addresses.userId, userId))
    .orderBy(
      desc(schema.addresses.isDefault),
      desc(schema.addresses.updatedAt),
      asc(schema.addresses.id),
    )
    .limit(1);
  if (!a?.division || !a.district || !isKnownLocation(a.division, a.district, a.city)) return {};
  return {
    name: a.fullName,
    phone: a.phone,
    division: a.division,
    district: a.district,
    upazila: a.city,
    area: a.area ?? "",
    address: a.line1,
    postal: a.postalCode ?? "",
  };
}

/** Checkout (Checkout.dc.html, CheckoutMobile.dc.html). Guests can order; a signed-in customer's name, email and default saved address are prefilled. */
export default async function CheckoutPage() {
  const [session, rules] = await Promise.all([
    auth.api.getSession({ headers: await headers() }).catch(() => null),
    getShopRules(),
  ]);
  const saved = session ? await savedAddress(session.user.id).catch(() => ({})) : {};
  return (
    <CheckoutView
      prefill={{ name: session?.user.name ?? "", email: session?.user.email ?? "", ...saved }}
      fees={rules.fees}
      codEnabled={rules.codEnabled}
    />
  );
}
