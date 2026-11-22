import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";
import { EMPTY_PRODUCT, getEditContext } from "@/lib/product-edit";
import { requireRole } from "@/lib/require-admin";
import { Crumb } from "@/components/shell/shell-context";
import { ProductForm } from "../[id]/product-form";

export const metadata: Metadata = { title: "New product" };

/** "নতুন পণ্য": the product edit form, empty. Saving opens the new product's edit page. */
export default async function NewProductPage() {
  await requireRole("owner");
  const [{ lang, t }, ctx] = await Promise.all([getDict(), getEditContext()]);
  return (
    <>
      <Crumb value={t.pedit.newTitle} />
      <ProductForm initial={EMPTY_PRODUCT} ctx={ctx} t={t.pedit} lang={lang} savedNow={false} />
    </>
  );
}
