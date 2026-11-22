/**
 * Meta (Facebook) Pixel calls for the browser. components/meta-pixel.tsx loads fbevents.js and
 * calls `initPixel` when META_PIXEL_ID is set; without it nothing here ever reaches Meta.
 *
 * Events can fire before the pixel is initialised (a page's effects run before the layout's), so
 * they wait in `pending` and go out right after `init`. On the server, or with no pixel, every
 * call is a no-op apart from that small capped queue.
 */

type FbqArgs = unknown[];
interface Fbq {
  (...args: FbqArgs): void;
  callMethod?: (...args: FbqArgs) => void;
  queue: FbqArgs[];
  push: Fbq;
  loaded: boolean;
  version: string;
}

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let ready = false;
const pending: FbqArgs[] = [];

/** Meta's base-code stub: queues calls until fbevents.js loads and takes them over. */
function ensureStub(): Fbq {
  if (window.fbq) return window.fbq;
  const n = function (...args: FbqArgs) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue.push(args);
  } as Fbq;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  window.fbq = n;
  window._fbq ??= n;
  return n;
}

/** Creates the stub as soon as the loader module runs, before fbevents.js can arrive. */
export function preparePixel() {
  if (typeof window !== "undefined") ensureStub();
}

export function initPixel(pixelId: string) {
  if (ready || typeof window === "undefined") return;
  const fbq = ensureStub();
  fbq("init", pixelId);
  ready = true;
  for (const args of pending.splice(0)) fbq(...args);
}

export type PixelEvent = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

export interface PixelParams {
  value?: number;
  currency?: "BDT";
  content_ids?: string[];
  content_name?: string;
  content_type?: "product";
  contents?: { id: string; quantity: number; item_price?: number }[];
  num_items?: number;
}

/** Meta wants money as a decimal in the currency unit: integer paisa → taka. */
export const pixelValue = (paisa: number) => Math.round(paisa) / 100;

/**
 * Sends a standard event. `eventId` becomes Meta's eventID (dedup against a later Conversions
 * API copy of the same event; Purchase uses the order number).
 */
export function trackPixel(event: PixelEvent, params?: PixelParams, eventId?: string) {
  if (typeof window === "undefined") return;
  const args: FbqArgs = ["track", event];
  if (params || eventId) args.push(params ?? {});
  if (eventId) args.push({ eventID: eventId });
  if (ready && window.fbq) window.fbq(...args);
  else if (pending.length < 20) pending.push(args);
}
