import { reviewListQuery } from "@repo/validators";
import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { requireRole } from "@/lib/require-admin";
import { getReview, listReviews, reviewCounts, reviewedProducts } from "@/lib/reviews";
import { ReviewsView } from "./reviews-view";

export const metadata: Metadata = { title: "Reviews" };

/**
 * রিভিউ: Reviews-Desktop (≥1440, list + detail), Reviews-Tablet1194 split view (1024–1439),
 * Reviews-Tablet (768–1023, the chosen card opens in place) and Reviews-Phone (<768). Product and
 * shop reviews in one list; filters live in the URL. Owner only.
 */
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("owner");
  const raw = await searchParams;
  const one = (k: string) => (Array.isArray(raw[k]) ? raw[k][0] : raw[k]);
  const query = reviewListQuery.parse(
    Object.fromEntries(["status", "kind", "product", "rating", "n", "sel"].map((k) => [k, one(k)])),
  );
  const [{ lang, t }, counts, rows, products] = await Promise.all([
    getDict(),
    reviewCounts(query),
    listReviews(query, query.n),
    reviewedProducts(),
  ]);
  // The chosen review may sit beyond the loaded rows; once approved or hidden it belongs to the
  // other tab, so fall back to the first row then.
  const picked = query.sel
    ? (rows.find((r) => r.key === query.sel) ?? (await getReview(query.sel)))
    : null;
  const selected =
    picked && picked.approved === (query.status === "approved") ? picked : (rows[0] ?? null);
  return (
    <ReviewsView
      lang={lang}
      t={t.reviews}
      query={query}
      counts={counts}
      rows={rows}
      selected={selected}
      products={products}
    />
  );
}
