import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { lowStockLimit } from "@/lib/nav-counts";
import { requireAdmin } from "@/lib/require-admin";
import { listStock } from "@/lib/stock";
import { StockView } from "./stock-view";

export const metadata: Metadata = { title: "Stock" };

/** স্টক: Stock-Desktop (≥1024), Stock-Tablet (768–1023), Stock-Phone (<768). Staff and owner. */
export default async function StockPage() {
  const { role } = await requireAdmin();
  const [{ lang, t }, rows, limit] = await Promise.all([getDict(), listStock(), lowStockLimit()]);
  return (
    <StockView
      rows={rows}
      t={t.stock}
      lang={lang}
      staff={role === "staff"}
      limit={limit}
    />
  );
}
