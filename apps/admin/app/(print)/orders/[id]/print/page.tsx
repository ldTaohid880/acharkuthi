import { orderPrintIds } from "@repo/validators";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderPrint } from "../../../render";

export const metadata: Metadata = { title: "Print" };

/** প্যাকিং স্লিপ / লেবেল for one order (OrderPrint-Desktop). */
export default async function OrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const parsed = orderPrintIds.safeParse((await params).id);
  if (!parsed.success || parsed.data.length !== 1) notFound();
  return renderPrint(parsed.data, true);
}
