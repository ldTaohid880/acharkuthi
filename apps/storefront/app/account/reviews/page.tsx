import { ReviewsView } from "@/components/account/reviews-view";
import { getAccountReviews, requireUser } from "@/lib/account";

/** My reviews (Account.dc.html, view "reviews"; AccountStates.dc.html F). */
export default async function AccountReviewsPage() {
  const user = await requireUser("/account/reviews");
  const { product, overall } = await getAccountReviews(user.id);
  return <ReviewsView product={product} overall={overall} />;
}
