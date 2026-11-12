import { redirect } from "next/navigation";

/** The dashboard moved to "/" (canvas site map). Keep old links working. */
export default function OldDashboard() {
  redirect("/");
}
