"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";
import { initPixel, preparePixel, trackPixel } from "@/lib/meta-pixel";

preparePixel();

/**
 * Meta Pixel loader (Meta's base code, split up for the App Router). Rendered by the root layout
 * only when META_PIXEL_ID is set. Sends PageView on the first load and on every client-side route
 * change; the other events come from lib/meta-pixel.ts callers.
 */
export function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    initPixel(pixelId);
  }, [pixelId]);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    trackPixel("PageView");
  }, [pathname]);

  return (
    <>
      <Script
        id="meta-pixel"
        src="https://connect.facebook.net/en_US/fbevents.js"
        strategy="afterInteractive"
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Meta's no-JS PageView beacon */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
