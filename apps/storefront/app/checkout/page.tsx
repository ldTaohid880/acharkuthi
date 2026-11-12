import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@repo/auth";
import { CheckoutView } from "@/components/checkout-view";

export const metadata: Metadata = { title: "চেকআউট", robots: { index: false } };

/** Checkout (Checkout.dc.html, CheckoutMobile.dc.html). Guests can order; a signed-in customer's name and email are prefilled. */
export default async function CheckoutPage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  return (
    <CheckoutView prefill={{ name: session?.user.name ?? "", email: session?.user.email ?? "" }} />
  );
}
