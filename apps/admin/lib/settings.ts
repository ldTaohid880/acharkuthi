import "server-only";

import { db, desc, eq, schema } from "@repo/db";
import { env } from "@/env";
import { last4, open } from "@/lib/secret-box";

export interface SteadfastEventRow {
  id: number;
  at: Date;
  consignment: string | null;
  type: string | null;
  status: string | null;
  result: "accepted" | "no_order" | "ignored";
}

export interface SettingsData {
  shop: { phone: string; email: string; pickupAddress: string };
  fees: { in: number; out: number };
  codEnabled: boolean;
  steadfast: {
    connected: boolean;
    apiKey: string | null;
    secretKey: string | null;
    balance: number | null;
    checkedAt: Date | null;
    syncedAt: Date | null;
    /** Full token (owner-only page) for "কপি", plus its masked form. */
    token: string | null;
    tokenMasked: string | null;
    callbackUrl: string;
    events: SteadfastEventRow[];
  };
}

/** Everything on Settings-*.dc.html. Row id 1 may not exist yet: defaults then. */
export async function getSettings(): Promise<SettingsData> {
  const [row] = await db.select().from(schema.shopSettings).where(eq(schema.shopSettings.id, 1));
  const events = await db
    .select({
      id: schema.steadfastEvents.id,
      at: schema.steadfastEvents.receivedAt,
      consignment: schema.steadfastEvents.consignmentId,
      type: schema.steadfastEvents.notificationType,
      status: schema.steadfastEvents.status,
      result: schema.steadfastEvents.result,
    })
    .from(schema.steadfastEvents)
    .orderBy(desc(schema.steadfastEvents.receivedAt), desc(schema.steadfastEvents.id))
    .limit(20);
  const apiKey = open(row?.steadfastApiKey);
  const secretKey = open(row?.steadfastSecretKey);
  const token = open(row?.steadfastWebhookToken);
  return {
    shop: {
      phone: row?.phone ?? "",
      email: row?.email ?? "",
      pickupAddress: row?.pickupAddress ?? "",
    },
    fees: { in: row?.deliveryFeeIn ?? 6000, out: row?.deliveryFeeOut ?? 12000 },
    codEnabled: row?.codEnabled ?? true,
    steadfast: {
      connected: apiKey !== null && secretKey !== null,
      apiKey: last4(apiKey),
      secretKey: last4(secretKey),
      balance: row?.steadfastBalance ?? null,
      checkedAt: row?.steadfastCheckedAt ?? null,
      syncedAt: row?.steadfastSyncedAt ?? null,
      token,
      tokenMasked: token ? `••••••••${token.slice(-4)}` : null,
      callbackUrl: new URL("/api/webhooks/steadfast", env.BETTER_AUTH_URL).toString(),
      events,
    },
  };
}
