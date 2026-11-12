import { asc, db, desc, schema, sql } from "@repo/db";
import { Button } from "@repo/ui/components/button";
import type { Metadata } from "next";
import { requireRole } from "@/lib/require-admin";
import { markRestockNotified } from "./actions";

export const metadata: Metadata = { title: "Restock requests" };

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** "স্টকে এলে জানান" requests from the storefront: open ones first, oldest first. */
export default async function RestockRequestsPage() {
  await requireRole("owner");
  const rows = await db.query.restockRequests.findMany({
    with: { variant: { with: { product: { columns: { name: true } } } } },
    orderBy: [
      sql`${schema.restockRequests.notifiedAt} is not null`,
      asc(schema.restockRequests.createdAt),
      desc(schema.restockRequests.id),
    ],
    limit: 500,
  });
  const open = rows.filter((r) => !r.notifiedAt).length;

  return (
    <div className="tab:px-6 tab:pt-5 desk:px-8 desk:pt-6 space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Restock requests</h1>
        <p className="text-muted-foreground text-sm">
          {open} waiting · customers who asked to hear when a size is back in stock.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No requests yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 font-medium">Stock</th>
                <th className="px-3 py-2 font-medium">Contact</th>
                <th className="px-3 py-2 font-medium">Requested</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.variant.product.name}</td>
                  <td className="px-3 py-2">{r.variant.label}</td>
                  <td className="px-3 py-2 tabular-nums">{r.variant.stock}</td>
                  <td className="px-3 py-2">
                    <a
                      className="underline underline-offset-2"
                      href={r.contactKind === "phone" ? `tel:${r.contact}` : `mailto:${r.contact}`}
                    >
                      {r.contact}
                    </a>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{dateFmt.format(r.createdAt)}</td>
                  <td className="px-3 py-2">
                    {r.notifiedAt ? (
                      <span className="text-muted-foreground">
                        Notified {dateFmt.format(r.notifiedAt)}
                      </span>
                    ) : (
                      <form action={markRestockNotified}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button type="submit" size="sm" variant="outline">
                          Mark notified
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
