import { subscriberListQuery } from "@repo/validators";
import { requireAdmin } from "@/lib/require-admin";
import { listSubscribers } from "@/lib/subscribers";

/**
 * "CSV এক্সপোর্ট": everyone in the current filter ("এক্সপোর্টে বর্তমান ফিল্টারের সবাই থাকবে"),
 * email + sign-up time (ISO, UTC). Staff and owner.
 */
export async function GET(req: Request) {
  await requireAdmin();
  const url = new URL(req.url);
  const { q } = subscriberListQuery.parse({ q: url.searchParams.get("q") ?? undefined });
  const rows = await listSubscribers(q);
  // A leading = + - @ would run as a formula in a spreadsheet.
  const cell = (v: string) => {
    const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [
    "email,subscribed_at",
    ...rows.map((r) => `${cell(r.email)},${r.createdAt.toISOString()}`),
  ].join("\r\n");
  const day = new Date().toISOString().slice(0, 10);
  // BOM first, so Excel reads the file as UTF-8.
  return new Response(`${String.fromCharCode(0xfeff)}${csv}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="newsletter-subscribers-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
