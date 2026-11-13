import { requireAdmin } from "@/lib/require-admin";

/** Print pages (OrderPrint-Desktop) have no app shell: just the print bar and the pages. */
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
