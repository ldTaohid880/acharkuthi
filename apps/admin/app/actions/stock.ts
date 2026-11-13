"use server";

import { and, db, eq, inArray, notifyAdmins, schema } from "@repo/db";
import { stockSaveInput } from "@repo/validators";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { openRequests } from "@/lib/stock";

export interface StockSaveResult {
  saved: number;
  /** Sizes whose stock changed elsewhere while editing; their new values were not written. */
  stale: number[];
}

/**
 * Stock page save (staff and owner). Each size is written only if it still has the count the
 * page showed, so a sale during editing is never overwritten. Sizes that come back in stock with
 * open requests notify the owner (who tells those customers); sizes set to 0 notify "sold out".
 */
export async function saveStock(input: unknown): Promise<StockSaveResult> {
  await requireAdmin();
  const { changes } = stockSaveInput.parse(input);
  const v = schema.productVariants;
  const saved: typeof changes = [];
  const stale: number[] = [];
  await db.transaction(async (tx) => {
    for (const c of changes) {
      if (c.from === c.to) continue;
      const [res] = await tx
        .update(v)
        .set({ stock: c.to })
        .where(and(eq(v.id, c.variantId), eq(v.stock, c.from)));
      if (res.affectedRows === 1) saved.push(c);
      else stale.push(c.variantId);
    }
  });

  const moved = saved.filter((c) => (c.from === 0) !== (c.to === 0));
  if (moved.length) {
    const info = await db
      .select({
        id: v.id,
        size: v.label,
        name: schema.products.name,
        nameBn: schema.products.nameBn,
      })
      .from(v)
      .innerJoin(schema.products, eq(schema.products.id, v.productId))
      .where(
        inArray(
          v.id,
          moved.map((c) => c.variantId),
        ),
      );
    for (const c of moved) {
      const row = info.find((i) => i.id === c.variantId);
      if (!row) continue;
      const product = { bn: row.nameBn ?? row.name, en: row.name };
      const n = await openRequests(c.variantId);
      if (c.from === 0) {
        if (n > 0) await notifyAdmins({ kind: "restock", product, size: row.size, waiting: n });
      } else {
        await notifyAdmins({ kind: "stock", product, size: row.size, requests: n });
      }
    }
  }
  revalidatePath("/", "layout");
  return { saved: saved.length, stale };
}
