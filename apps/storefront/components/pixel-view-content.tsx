"use client";

import { useEffect, useRef } from "react";
import { pixelValue, trackPixel } from "@/lib/meta-pixel";

/** Meta Pixel ViewContent for a product page (price is the default size's, in paisa). */
export function PixelViewContent({
  variantId,
  name,
  price,
}: {
  variantId: number;
  name: string;
  price: number;
}) {
  // Once per product shown (dev Strict Mode runs effects twice; refs survive that).
  const sent = useRef<number | null>(null);
  useEffect(() => {
    if (sent.current === variantId) return;
    sent.current = variantId;
    trackPixel("ViewContent", {
      content_ids: [String(variantId)],
      content_name: name,
      content_type: "product",
      value: pixelValue(price),
      currency: "BDT",
    });
  }, [variantId, name, price]);
  return null;
}
