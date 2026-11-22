import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { requireRole } from "@/lib/require-admin";
import { getSettings } from "@/lib/settings";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Settings" };

/**
 * সেটিংস: Settings-Desktop (section nav + cards, a save per card), -Tablet (one save bar) and
 * -Phone (stacked cards). Shop details, delivery charges, Steadfast courier + webhook and the COD
 * switch (owner decisions, 2026-11-14). Owner only.
 */
export default async function SettingsPage() {
  await requireRole("owner");
  const [{ lang, t }, data] = await Promise.all([getDict(), getSettings()]);
  return <SettingsView data={data} t={t.settings} lang={lang} />;
}
