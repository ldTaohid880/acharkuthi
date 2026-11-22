import { ReviewsView } from "@/components/account/reviews-view";
import { getAccountReviews, requireUser } from "@/lib/account";
import { langOf } from "@/lib/seo";

/** My reviews (Account.dc.html, view "reviews"; AccountStates.dc.html F). */
export default async function AccountReviewsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const lang = await langOf(params);
  const user = await requireUser("/account/reviews", lang);
  const { product, overall } = await getAccountReviews(user.id, lang);
  return <ReviewsView product={product} overall={overall} />;
}
