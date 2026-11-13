import { orderPrintIds } from "@repo/validators";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderPrint } from "../../render";

export const metadata: Metadata = { title: "Print" };

/** Slips and labels for the orders picked on the list ("লেবেল প্রিন্ট"): /orders/print?ids=1,2 */
export default async function BulkPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = (await searchParams).ids;
  const parsed = orderPrintIds.safeParse(Array.isArray(raw) ? raw[0] : (raw ?? ""));
  if (!parsed.success) notFound();
  return renderPrint(parsed.data, false);
}
