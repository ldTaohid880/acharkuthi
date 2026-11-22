import type { Metadata } from "next";
import { couponUses, listCoupons } from "@/lib/coupons";
import { getDict } from "@/lib/i18n/server";
import { requireRole } from "@/lib/require-admin";
import { CouponsView } from "./coupons-view";

export const metadata: Metadata = { title: "Coupons" };

/**
 * কুপন: Coupons-Desktop (table + editor drawer), Coupons-Tablet / -Phone (list) and
 * CouponEdit-Tablet / -Phone (`?edit=<id|new>` as a full page below 1024 px). Owner only.
 */
export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("owner");
  const [{ lang, t }, rows, sp] = await Promise.all([getDict(), listCoupons(), searchParams]);
  const raw = Array.isArray(sp.edit) ? sp.edit[0] : sp.edit;
  const edit: number | "new" | null =
    raw === "new" ? "new" : raw && rows.some((r) => r.id === Number(raw)) ? Number(raw) : null;
  const uses = typeof edit === "number" ? await couponUses(edit) : [];
  return <CouponsView rows={rows} edit={edit} uses={uses} t={t.coupons} lang={lang} />;
}
