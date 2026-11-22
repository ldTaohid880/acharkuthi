import type { ReactNode } from "react";
import { requireRole } from "@/lib/require-admin";

/**
 * Products are owner-only. The check also sits here, above the `loading.tsx` boundaries of
 * /products/new and /products/[id]: forbidden() thrown inside a streamed page arrives after the
 * 200 status is sent, so staff got the no-access card with HTTP 200 instead of 403.
 */
export default async function ProductsLayout({ children }: { children: ReactNode }) {
  await requireRole("owner");
  return children;
}
