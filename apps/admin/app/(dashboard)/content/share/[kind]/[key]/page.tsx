import { shareStudioParams } from "@repo/validators";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crumb } from "@/components/shell/shell-context";
import { getDict } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/require-admin";
import { getShareEditor } from "@/lib/share-studio";
import { ShareEditor } from "./share-editor";

export const metadata: Metadata = { title: "Share preview" };

/**
 * One link in Share Studio: docs/design/share-studio/2-editor-desktop.png, 4-…-advanced,
 * 5-editor-tablet-834.png, 7-editor-phone.png. Owner and staff.
 */
export default async function ShareEditorPage({
  params,
}: {
  params: Promise<{ kind: string; key: string }>;
}) {
  await requireAdmin();
  const p = shareStudioParams.safeParse(await params);
  if (!p.success) notFound();
  const [{ lang, t }, data] = await Promise.all([
    getDict(),
    getShareEditor(p.data.kind, p.data.key),
  ]);
  if (!data) notFound();
  return (
    <>
      <Crumb value={data.name} />
      {/* Remounts with the saved values after a save (router.refresh). */}
      <ShareEditor key={JSON.stringify(data.langs)} data={data} t={t.shareStudio} lang={lang} />
    </>
  );
}
