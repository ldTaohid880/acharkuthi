import "server-only";

/**
 * Steadfast Courier API (merchant portal at packzy.com). Auth headers Api-Key / Secret-Key.
 * Only what Settings needs today: the balance, which doubles as the connection test.
 */
const BASE = "https://portal.packzy.com/api/v1";

export type BalanceResult =
  { ok: true; balance: number } | { ok: false; reason: "auth" | "network" };

/** Balance in paisa. */
export async function getSteadfastBalance(
  apiKey: string,
  secretKey: string,
): Promise<BalanceResult> {
  try {
    const res = await fetch(`${BASE}/get_balance`, {
      headers: { "Api-Key": apiKey, "Secret-Key": secretKey, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "auth" };
    if (!res.ok) return { ok: false, reason: "network" };
    const body = (await res.json()) as { status?: number; current_balance?: number | string };
    const taka = Number(body.current_balance);
    if (body.status !== 200 || !Number.isFinite(taka)) return { ok: false, reason: "auth" };
    return { ok: true, balance: Math.round(taka * 100) };
  } catch {
    return { ok: false, reason: "network" };
  }
}

const headersFor = (apiKey: string, secretKey: string) => ({
  "Api-Key": apiKey,
  "Secret-Key": secretKey,
  "Content-Type": "application/json",
});

export interface SteadfastParcel {
  /** Our order number (Steadfast's invoice; the webhook matches on it). */
  invoice: string;
  name: string;
  phone: string;
  address: string;
  /** Cash to collect, paisa (0 when already paid). */
  cod: number;
  note?: string | null | undefined;
}

export type BookResult =
  | { ok: true; consignmentId: string; trackingCode: string; status: string }
  | { ok: false; reason: "auth" | "network" | "rejected"; message?: string };

/** POST /create_order: books one parcel. */
export async function bookSteadfast(
  apiKey: string,
  secretKey: string,
  p: SteadfastParcel,
): Promise<BookResult> {
  try {
    const res = await fetch(`${BASE}/create_order`, {
      method: "POST",
      headers: headersFor(apiKey, secretKey),
      body: JSON.stringify({
        invoice: p.invoice,
        recipient_name: p.name.slice(0, 100),
        recipient_phone: p.phone.replace(/\D/g, "").replace(/^88/, ""),
        recipient_address: p.address.slice(0, 250),
        // Steadfast takes taka, not paisa.
        cod_amount: Math.round(p.cod) / 100,
        ...(p.note ? { note: p.note.slice(0, 500) } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "auth" };
    const body = (await res.json().catch(() => ({}))) as {
      status?: number;
      message?: string;
      consignment?: { consignment_id?: number | string; tracking_code?: string; status?: string };
    };
    const c = body.consignment;
    if (body.status !== 200 || !c?.consignment_id || !c.tracking_code)
      return { ok: false, reason: "rejected", ...(body.message ? { message: body.message } : {}) };
    return {
      ok: true,
      consignmentId: String(c.consignment_id),
      trackingCode: c.tracking_code,
      status: c.status ?? "pending",
    };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** GET /status_by_cid/{id}: the parcel's delivery_status, or null when it can't be read. */
export async function steadfastStatus(
  apiKey: string,
  secretKey: string,
  consignmentId: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/status_by_cid/${encodeURIComponent(consignmentId)}`, {
      headers: headersFor(apiKey, secretKey),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { status?: number; delivery_status?: string };
    return body.status === 200 && body.delivery_status ? body.delivery_status.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Steadfast status → our order status, for a shipped order only: delivered (also partly) →
 * delivered, cancelled → returned. Anything else (pending, hold, in_review, unknown, …) leaves it.
 */
export function orderStatusFor(courierStatus: string): "delivered" | "returned" | null {
  if (courierStatus === "delivered" || courierStatus === "partial_delivered") return "delivered";
  if (courierStatus === "cancelled") return "returned";
  return null;
}
