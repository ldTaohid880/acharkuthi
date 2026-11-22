/**
 * Pixel size of a JPEG, PNG or WebP from its bytes (the formats admin accepts, `IMAGE_TYPES`).
 * Saved with each product photo so the storefront knows the gallery fit before the photo loads
 * (owner, 2026-11-15). Returns null for anything it can't read; callers then store no size.
 */
export interface ImageSize {
  width: number;
  height: number;
}

const ok = (width: number, height: number): ImageSize | null =>
  width > 0 && height > 0 ? { width, height } : null;

function png(b: Uint8Array, v: DataView): ImageSize | null {
  // Signature, then the IHDR chunk: width and height are the first 8 bytes of its data.
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 24 || sig.some((x, i) => b[i] !== x)) return null;
  return ok(v.getUint32(16), v.getUint32(20));
}

function webp(b: Uint8Array, v: DataView): ImageSize | null {
  const tag = (at: number) => String.fromCharCode(...b.subarray(at, at + 4));
  if (b.length < 30 || tag(0) !== "RIFF" || tag(8) !== "WEBP") return null;
  const chunk = tag(12);
  if (chunk === "VP8X") {
    // 24-bit canvas width - 1 and height - 1.
    const w = 1 + ((b[24] ?? 0) | ((b[25] ?? 0) << 8) | ((b[26] ?? 0) << 16));
    const h = 1 + ((b[27] ?? 0) | ((b[28] ?? 0) << 8) | ((b[29] ?? 0) << 16));
    return ok(w, h);
  }
  if (chunk === "VP8 ") {
    // Lossy: frame tag (3 bytes), start code 9d 01 2a, then 14-bit width and height.
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return ok(v.getUint16(26, true) & 0x3fff, v.getUint16(28, true) & 0x3fff);
  }
  if (chunk === "VP8L") {
    // Lossless: signature 0x2f, then 14-bit width - 1 and height - 1.
    if (b[20] !== 0x2f) return null;
    const bits = v.getUint32(21, true);
    return ok((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  return null;
}

function jpeg(b: Uint8Array, v: DataView): ImageSize | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let at = 2;
  while (at + 9 < b.length) {
    if (b[at] !== 0xff) return null;
    const marker = b[at + 1] ?? 0;
    // Fill bytes and stand-alone markers carry no length.
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }
    const len = v.getUint16(at + 2);
    // Start-of-frame markers (C0–CF except DHT C4, JPG C8, DAC CC): height, then width.
    const sof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (sof) return ok(v.getUint16(at + 7), v.getUint16(at + 5));
    if (marker === 0xda || len < 2) return null; // image data reached without a frame header
    at += 2 + len;
  }
  return null;
}

export function readImageSize(bytes: ArrayBuffer | Uint8Array): ImageSize | null {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  try {
    return png(b, v) ?? webp(b, v) ?? jpeg(b, v);
  } catch {
    // A truncated header reads past the end: treat as unknown.
    return null;
  }
}
