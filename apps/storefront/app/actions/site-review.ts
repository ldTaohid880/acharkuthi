"use server";

import { db, notifyAdmins, schema } from "@repo/db";
import { siteReviewInput } from "@repo/validators";
import { getSessionUser } from "@/lib/account";

export type ReviewField = "name" | "rating" | "body";

export interface SiteReviewState {
  status: "idle" | "ok" | "invalid" | "fail";
  errors: Partial<Record<ReviewField, string>>;
  values: { name: string; rating: string; body: string };
}

const text = (data: FormData, key: string) => {
  const v = data.get(key);
  return typeof v === "string" ? v : "";
};

/** Stores a review as unapproved; it shows on the home page only once someone approves it. */
export async function submitSiteReview(
  _prev: SiteReviewState,
  data: FormData,
): Promise<SiteReviewState> {
  const values = {
    name: text(data, "name"),
    rating: text(data, "rating"),
    body: text(data, "body"),
  };
  const empty = { name: "", rating: "", body: "" };

  if (text(data, "website")) return { status: "ok", errors: {}, values: empty }; // honeypot

  const parsed = siteReviewInput.safeParse(values);
  if (!parsed.success) {
    const errors: SiteReviewState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as ReviewField | undefined;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { status: "invalid", errors, values };
  }
  try {
    // Signed-in reviewers see their own reviews on the account page.
    const user = await getSessionUser().catch(() => null);
    await db.insert(schema.siteReviews).values({
      userId: user?.id ?? null,
      name: parsed.data.name,
      rating: parsed.data.rating,
      body: parsed.data.body,
    });
  } catch (err) {
    console.error("site review insert failed", err);
    return { status: "fail", errors: {}, values };
  }
  await notifyAdmins({
    kind: "review",
    rating: parsed.data.rating,
    name: parsed.data.name,
    product: null,
  });
  return { status: "ok", errors: {}, values: empty };
}
