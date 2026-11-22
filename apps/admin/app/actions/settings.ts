"use server";

import { randomBytes } from "node:crypto";
import { db, schema } from "@repo/db";
import {
  codSwitchInput,
  lowStockLimitInput,
  deliveryFeesInput,
  shopInfoInput,
  steadfastKeysInput,
} from "@repo/validators";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/require-admin";
import { open, seal } from "@/lib/secret-box";
import { getSteadfastBalance } from "@/lib/steadfast";

type Patch = Partial<typeof schema.shopSettings.$inferInsert>;

/** shop_settings is a single row (id 1), created on first save. */
async function upsert(set: Patch) {
  await db
    .insert(schema.shopSettings)
    .values({ id: 1, ...set })
    .onDuplicateKeyUpdate({ set });
  revalidatePath("/settings");
}

/** "দোকানের তথ্য": printed on packing slips and labels. */
export async function saveShopInfo(input: unknown): Promise<void> {
  await requireRole("owner");
  const v = shopInfoInput.parse(input);
  await upsert({
    phone: v.phone || null,
    email: v.email || null,
    pickupAddress: v.pickupAddress || null,
  });
}

/** "ডেলিভারি চার্জ" (paisa). Checkout and the admin order screens read these from now on. */
export async function saveDeliveryFees(input: unknown): Promise<void> {
  await requireRole("owner");
  const v = deliveryFeesInput.parse(input);
  await upsert({ deliveryFeeIn: v.in, deliveryFeeOut: v.out });
}

/** "ক্যাশ অন ডেলিভারি চালু": off stops checkout from taking orders. */
export async function setCod(input: unknown): Promise<void> {
  await requireRole("owner");
  const { enabled } = codSwitchInput.parse(input);
  await upsert({ codEnabled: enabled });
}

export type SteadfastResult =
  { ok: true; balance: number } | { ok: false; reason: "auth" | "network" | "missing" };

/** New API + Secret keys: checked against Steadfast first, then saved encrypted. */
export async function saveSteadfastKeys(input: unknown): Promise<SteadfastResult> {
  await requireRole("owner");
  const { apiKey, secretKey } = steadfastKeysInput.parse(input);
  const res = await getSteadfastBalance(apiKey, secretKey);
  if (!res.ok) return res;
  const [row] = await db
    .select({ t: schema.shopSettings.steadfastWebhookToken })
    .from(schema.shopSettings);
  await upsert({
    steadfastApiKey: seal(apiKey),
    steadfastSecretKey: seal(secretKey),
    steadfastBalance: res.balance,
    steadfastCheckedAt: new Date(),
    // First connection: make a webhook token too.
    ...(row?.t ? {} : { steadfastWebhookToken: seal(randomBytes(24).toString("hex")) }),
  });
  return res;
}

/** "সংযোগ পরীক্ষা": fetches the balance with the saved keys. */
export async function testSteadfast(): Promise<SteadfastResult> {
  await requireRole("owner");
  const [row] = await db.select().from(schema.shopSettings);
  const apiKey = open(row?.steadfastApiKey);
  const secretKey = open(row?.steadfastSecretKey);
  if (!apiKey || !secretKey) return { ok: false, reason: "missing" };
  const res = await getSteadfastBalance(apiKey, secretKey);
  if (res.ok) await upsert({ steadfastBalance: res.balance, steadfastCheckedAt: new Date() });
  return res;
}

/** "নতুন টোকেন": the old token stops working at once (Steadfast must get the new one). */
export async function newWebhookToken(): Promise<void> {
  await requireRole("owner");
  await upsert({ steadfastWebhookToken: seal(randomBytes(24).toString("hex")) });
}

/** "সংযোগ বিচ্ছিন্ন করুন": forgets the keys and the webhook token. */
export async function disconnectSteadfast(): Promise<void> {
  await requireRole("owner");
  await upsert({
    steadfastApiKey: null,
    steadfastSecretKey: null,
    steadfastWebhookToken: null,
    steadfastBalance: null,
    steadfastCheckedAt: null,
  });
}

/** Stock "সীমা": sizes below this count as low everywhere (Stock, Dashboard, menu badge). */
export async function saveLowStockLimit(input: unknown): Promise<void> {
  await requireRole("owner");
  const { limit } = lowStockLimitInput.parse(input);
  await upsert({ lowStockLimit: limit });
  revalidatePath("/", "layout");
}
