export type ImageFit = "cover" | "contain";

/** How far from 1:1 an image may be and still count as square. */
export const SQUARE_TOLERANCE = 0.05;

/** Square (or nearly) images fill their frame; any other shape is shown whole. */
export function fitFor(width: number, height: number): ImageFit {
  if (width <= 0 || height <= 0) return "contain";
  // Long side over short side, so portrait and landscape get the same tolerance; the epsilon
  // keeps an exact 5 % (e.g. 1050 × 1000) from failing on float rounding.
  const ratio = Math.max(width, height) / Math.min(width, height);
  return ratio <= 1 + SQUARE_TOLERANCE + 1e-9 ? "cover" : "contain";
}
