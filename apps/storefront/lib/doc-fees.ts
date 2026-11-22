import "server-only";

import { getShopRules } from "@repo/db";
import { formatTaka } from "@repo/ui/lib/utils";

/**
 * Fills {{FEE_IN}} / {{FEE_OUT}} in policy copy with the live delivery charges from admin
 * Settings, so the shipping policy and FAQ always say what checkout charges.
 */
export async function withDeliveryFees(html: string): Promise<string> {
  const { fees } = await getShopRules();
  return html
    .replaceAll("{{FEE_IN}}", formatTaka(fees.in))
    .replaceAll("{{FEE_OUT}}", formatTaka(fees.out));
}
