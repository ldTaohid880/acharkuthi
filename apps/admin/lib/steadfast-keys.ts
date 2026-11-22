import "server-only";

import { db, eq, schema } from "@repo/db";
import { open } from "@/lib/secret-box";

/** The saved Steadfast keys, decrypted; null when not connected (Settings). */
export async function steadfastKeys(): Promise<{ apiKey: string; secretKey: string } | null> {
  const [row] = await db
    .select({ a: schema.shopSettings.steadfastApiKey, s: schema.shopSettings.steadfastSecretKey })
    .from(schema.shopSettings)
    .where(eq(schema.shopSettings.id, 1));
  const apiKey = open(row?.a);
  const secretKey = open(row?.s);
  return apiKey && secretKey ? { apiKey, secretKey } : null;
}
