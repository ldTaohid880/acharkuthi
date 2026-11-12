"use server";

import { trackLookupInput } from "@repo/validators";
import { lastDigits, loadOrder, present, type LookupResult } from "@/lib/track-server";

/** Guest lookup: order number plus the email or mobile number given at checkout. */
export async function lookupOrder(input: unknown): Promise<LookupResult> {
  const parsed = trackLookupInput.safeParse(input);
  if (!parsed.success) {
    const errors: Partial<Record<"order" | "contact", string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if ((key === "order" || key === "contact") && !errors[key]) errors[key] = issue.message;
    }
    return { status: "invalid", errors };
  }
  const { order: number, contact } = parsed.data;
  try {
    const order = await loadOrder({ orderNumber: number });
    if (!order) return { status: "unverified" };
    const ok = contact.includes("@")
      ? !!order.customerEmail && order.customerEmail.trim().toLowerCase() === contact.toLowerCase()
      : lastDigits(order.customerPhone) === lastDigits(contact);
    if (!ok) return { status: "unverified" };
    return { status: "ok", order: await present(order) };
  } catch {
    return { status: "error" };
  }
}
