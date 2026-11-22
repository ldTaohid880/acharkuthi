import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n/server";
import { getEditContext, getProductForEdit } from "@/lib/product-edit";
import { requireRole } from "@/lib/require-admin";
import { Crumb } from "@/components/shell/shell-context";
import { ProductForm } from "./product-form";

export const metadata: Metadata = { title: "Edit product" };

/** পণ্য এডিট: ProductEdit-Desktop / -Tablet / -Phone. Owner only. */
export default async function ProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("owner");
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const [{ lang, t }, product, ctx, sp] = await Promise.all([
    getDict(),
    getProductForEdit(id),
    getEditContext(),
    searchParams,
  ]);
  if (!product) notFound();
  return (
    <>
      <Crumb value={product.nameBn || product.name} />
      {/* Remounts with fresh values after a save (router.refresh). */}
      <ProductForm
        key={JSON.stringify(product)}
        initial={product}
        ctx={ctx}
        t={t.pedit}
        lang={lang}
        savedNow={sp.saved === "1"}
      />
    </>
  );
}
