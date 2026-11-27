import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/require-admin";
import { listShareLinks } from "@/lib/share-studio";
import { ShareListView } from "./share-list-view";

export const metadata: Metadata = { title: "Share previews" };

/**
 * শেয়ার প্রিভিউ (Share Studio list): docs/design/share-studio/1-list-desktop.png and
 * 6-list-phone.png. Owner and staff (owner, 2026-11-26).
 */
export default async function ShareListPage() {
  await requireAdmin();
  const [{ lang, t }, rows] = await Promise.all([getDict(), listShareLinks()]);
  return <ShareListView rows={rows} t={t.shareStudio} lang={lang} />;
}
