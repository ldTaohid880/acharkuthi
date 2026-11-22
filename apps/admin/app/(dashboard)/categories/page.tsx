import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { listCategories } from "@/lib/categories";
import { requireRole } from "@/lib/require-admin";
import { CategoriesView } from "./categories-view";

export const metadata: Metadata = { title: "Categories" };

/**
 * ক্যাটাগরি: Categories-Desktop / -Tablet (list + editor), Categories-Phone (list, reorder mode)
 * and CategoryEdit-Phone (?edit=<id|new>). Owner only.
 */
export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("owner");
  const [{ lang, t }, { rows, uploads }, sp] = await Promise.all([
    getDict(),
    listCategories(),
    searchParams,
  ]);
  const raw = Array.isArray(sp.edit) ? sp.edit[0] : sp.edit;
  const edit: number | "new" | null =
    raw === "new" ? "new" : raw && rows.some((r) => r.id === Number(raw)) ? Number(raw) : null;
  return <CategoriesView rows={rows} uploads={uploads} edit={edit} t={t.cats} lang={lang} />;
}
