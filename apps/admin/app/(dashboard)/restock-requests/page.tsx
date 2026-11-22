import { redirect } from "next/navigation";

/** Old address of the restock list; the page is now রিস্টক অ্যালার্ট. */
export default function RestockRequestsPage() {
  redirect("/restock-alerts");
}
