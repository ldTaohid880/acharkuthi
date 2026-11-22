import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { requireRole } from "@/lib/require-admin";
import { listRestock, restockRequestsFor } from "@/lib/restock";
import { RestockView } from "./restock-view";

export const metadata: Metadata = { title: "Restock alerts" };

/**
 * রিস্টক অ্যালার্ট: Restock-Desktop (list + requests), Restock-Tablet (size cards + requests) and
 * Restock-Phone (cards, the chosen one opened). `?v=<variantId>` picks the size. Owner only.
 */
export default async function RestockAlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("owner");
  const [{ lang, t }, { variants, total, mail }, sp] = await Promise.all([
    getDict(),
    listRestock(),
    searchParams,
  ]);
  const raw = Array.isArray(sp.v) ? sp.v[0] : sp.v;
  const selected = variants.find((v) => v.id === Number(raw)) ?? variants[0] ?? null;
  const requests = selected ? await restockRequestsFor(selected.id) : [];
  return (
    <RestockView
      variants={variants}
      total={total}
      mail={mail}
      selected={selected?.id ?? null}
      requests={requests}
      t={t.restock}
      lang={lang}
    />
  );
}
