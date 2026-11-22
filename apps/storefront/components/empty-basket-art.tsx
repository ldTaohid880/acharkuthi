import { useId } from "react";
import { EMPTY_JAR } from "@/lib/cart-store";

/** The picture's blob: lumpy and uneven, like a hand-cut paper shape (unit box, may spill past it). */
const BLOB =
  "M.47.04C.6 0 .7.08.79.06.9.04.98.15.96.29.94.4.99.48.97.6.95.75.86.9.71.95.58.99.5.92.38.96.24 1 .1.92.06.78.02.66.07.57.04.45.01.31.06.17.18.1.28.04.37.06.47.04Z";

/**
 * Empty basket art for the drawer and the basket page (owner, 2026-11-22): the watercolour of an
 * empty jar, its lid, a raw mango and two chillies, kept whole on its paper and clipped to an SVG
 * blob (never cut out). Decorative.
 */
export function EmptyBasketArt() {
  const id = `ak-empty-blob-${useId().replace(/:/g, "")}`;
  return (
    <div className="art art-blob" aria-hidden="true">
      <svg className="blob-art" viewBox="0 0 1 1" focusable="false">
        <defs>
          <clipPath id={id} clipPathUnits="objectBoundingBox">
            <path d={BLOB} />
          </clipPath>
        </defs>
        <g className="blob-front">
          <image href={EMPTY_JAR} width="1" height="1" clipPath={`url(#${id})`} />
        </g>
      </svg>
    </div>
  );
}
