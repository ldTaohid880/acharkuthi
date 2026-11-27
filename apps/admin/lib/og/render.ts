/**
 * Draws a share card (docs/future/og-sharing.md phase 2) on a canvas and exports it as JPEG.
 * Browser only. The layout is the owner-approved mockup of 2026-11-26: linen ground, the photo in
 * a jar-shoulder frame, names in kacha green, the ছোট লাইন, a frosted discount pill on the photo,
 * and the leaf jar mark + "আচারকুঠি · acharkuthi.store" footer. Colours are the storefront tokens
 * (packages/ui/src/styles/acharkuthi.css): this image is storefront brand art, not admin UI.
 */
import type { CardSpec } from "@/lib/share-cards";

export type CardSize = "wide" | "square";
export const CARD_SIZES: Record<CardSize, { w: number; h: number }> = {
  wide: { w: 1200, h: 630 },
  square: { w: 1080, h: 1080 },
};

const C = {
  linen: "#e8e5d5",
  paleOlive: "#c4c3a5",
  moss: "#5e6848",
  forest: "#34392b",
  kacha: "#2b4103",
  leaf: "#556c1b",
  chili: "#a8432a",
};
const F = {
  bn: '"Anek Bangla"',
  en: '"Baloo 2"',
  serif: "Fraunces",
  ui: '"Instrument Sans"',
};
const MAX_BYTES = 300 * 1024;

/* ── fonts ──────────────────────────────────────────────────────────── */

const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@500;600;800&family=Baloo+2:wght@800&family=Fraunces:ital,opsz,wght@1,9..144,400&family=Instrument+Sans:wght@500;600;800&display=block";

let fontsReady: Promise<void> | null = null;
/**
 * Loads the brand fonts into this page (Google Fonts, as on the storefront) and waits until the
 * glyphs a card needs are in, Bangla subsets included.
 */
function loadFonts(): Promise<void> {
  fontsReady ??= new Promise<void>((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_CSS;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error("card fonts failed to load"));
    document.head.appendChild(link);
  }).then(async () => {
    const sample = "আচারকুঠি অআকখগ০১২ Acharkuthi 0123%";
    await Promise.all(
      [
        `800 40px ${F.bn}`,
        `600 40px ${F.bn}`,
        `500 40px ${F.bn}`,
        `800 40px ${F.en}`,
        `italic 400 40px ${F.serif}`,
        `500 40px ${F.ui}`,
        `600 40px ${F.ui}`,
        `800 40px ${F.ui}`,
      ].map((f) => document.fonts.load(f, sample)),
    );
  });
  fontsReady.catch(() => (fontsReady = null));
  return fontsReady;
}

/* ── images ─────────────────────────────────────────────────────────── */

async function loadBitmap(url: string): Promise<ImageBitmap> {
  // fetch + blob: same-origin bytes, so the canvas stays exportable.
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`photo ${res.status}`);
  return createImageBitmap(await res.blob());
}

let markTinted: Promise<HTMLCanvasElement> | null = null;
/** The jar mark in leaf green (the PNG is drawn as a mask). */
function leafMark(): Promise<HTMLCanvasElement> {
  markTinted ??= loadBitmap("/og/mark.png").then((bmp) => {
    const c = document.createElement("canvas");
    c.width = bmp.width;
    c.height = bmp.height;
    const x = c.getContext("2d");
    if (!x) throw new Error("no 2d context");
    x.drawImage(bmp, 0, 0);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = C.leaf;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  });
  markTinted.catch(() => (markTinted = null));
  return markTinted;
}

/* ── drawing helpers ────────────────────────────────────────────────── */

type Ctx = CanvasRenderingContext2D;
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** CSS `background-size: cover` with `background-position: fx fy`. */
function drawCover(
  ctx: Ctx,
  img: CanvasImageSource & { width: number; height: number },
  b: Box,
  fx: number,
  fy: number,
) {
  const s = Math.max(b.w / img.width, b.h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, b.x + (b.w - dw) * fx, b.y + (b.h - dh) * fy, dw, dh);
}

/** Jar-shoulder corners: --radius-shoulder (44) on top, --radius-soft (14) below. */
const frameRadii = [44, 44, 14, 14];

/** Splits text into words the language's way, then fills lines up to `max` wide. */
function wrap(ctx: Ctx, text: string, max: number, lang: "bn" | "en"): string[] {
  const seg = new Intl.Segmenter(lang, { granularity: "word" });
  const lines: string[] = [];
  let line = "";
  for (const { segment } of seg.segment(text)) {
    const next = line + segment;
    if (line && ctx.measureText(next.trimEnd()).width > max) {
      lines.push(line.trimEnd());
      line = segment.trimStart();
    } else line = next;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

/** Largest size ≤ `size` (down to `min`) at which `text` fits on one line. */
function fitSize(
  ctx: Ctx,
  font: (px: number) => string,
  text: string,
  max: number,
  size: number,
  min: number,
) {
  for (let px = size; px > min; px -= 2) {
    ctx.font = font(px);
    if (ctx.measureText(text).width <= max) return px;
  }
  ctx.font = font(min);
  return min;
}

/** One line in `font`, cut with "…" when it is wider than `max`. */
function oneLine(ctx: Ctx, font: string, text: string, max: number): string {
  ctx.font = font;
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Up to two lines; a second line that still overflows is cut with "…". */
function twoLines(ctx: Ctx, text: string, max: number, lang: "bn" | "en"): string[] {
  const lines = wrap(ctx, text, max, lang);
  if (lines.length <= 2) return lines;
  let last = lines.slice(1).join(" ");
  while (last.length > 1 && ctx.measureText(`${last}…`).width > max) last = last.slice(0, -1);
  return [lines[0] ?? "", `${last.trimEnd()}…`];
}

/* ── the card ───────────────────────────────────────────────────────── */

interface Block {
  /** Height including its top margin. */
  h: number;
  draw: (top: number) => void;
}

export async function renderCard(
  spec: CardSpec,
  size: CardSize,
  photo?: ImageBitmap,
): Promise<Blob> {
  await loadFonts();
  const [img, mark] = await Promise.all([photo ?? loadBitmap(spec.photo), leafMark()]);
  const { w: W, h: H } = CARD_SIZES[size];
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  const bn = spec.lang === "bn";
  const wide = size === "wide";
  const centre = !wide;

  ctx.fillStyle = C.linen;
  ctx.fillRect(0, 0, W, H);

  // নিজের ছবি: the chosen photo fills the card around its focal point; nothing drawn on it.
  if (spec.layout === "photo") {
    drawCover(ctx, img, { x: 0, y: 0, w: W, h: H }, spec.focal.x, spec.focal.y);
    return toJpeg(canvas);
  }

  // Photo frame: wide = right column; square = top, centred.
  const frame: Box = wide
    ? { w: spec.kind === "category" ? 470 : 420, h: 518, x: 0, y: 56 }
    : { w: 640, h: 560, x: (W - 640) / 2, y: 56 };
  if (wide) frame.x = W - 56 - frame.w;

  // Frame shadow, then the clipped photo, then the hairline.
  ctx.save();
  ctx.shadowColor = "rgba(52, 57, 43, 0.28)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 22;
  ctx.fillStyle = C.paleOlive;
  ctx.beginPath();
  ctx.roundRect(frame.x, frame.y, frame.w, frame.h, frameRadii);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(frame.x, frame.y, frame.w, frame.h, frameRadii);
  ctx.clip();
  drawCover(ctx, img, frame, spec.focal.x, spec.focal.y);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = C.paleOlive;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(frame.x + 0.5, frame.y + 0.5, frame.w - 1, frame.h - 1, frameRadii);
  ctx.stroke();
  ctx.restore();

  if (spec.badge) drawBadge(ctx, spec.badge, spec.lang, frame, img, spec.focal);

  // Text column.
  const textX = wide ? 72 : 72;
  const textW = wide ? frame.x - 56 - 72 : W - 144;
  const anchorX = centre ? W / 2 : textX;
  ctx.textAlign = centre ? "center" : "left";
  ctx.textBaseline = "middle";
  const line = (text: string, font: string, color: string, mid: number) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.fillText(text, anchorX, mid);
  };

  const blocks: Block[] = [];
  // Eyebrow: the shelf (or "আচারকুঠির তাক").
  const eyebrowFont = `600 26px ${bn ? F.bn : F.ui}`;
  const eyebrow = oneLine(ctx, eyebrowFont, spec.eyebrow, textW);
  blocks.push({ h: 34, draw: (t) => line(eyebrow, eyebrowFont, C.moss, t + 17) });
  // Lead name: large, shrinks to fit one line, else wraps to two.
  const leadMax = wide ? (spec.kind === "category" ? 104 : 92) : 100;
  const leadFont = (px: number) => `800 ${px}px ${bn ? F.bn : F.en}`;
  const leadPx = fitSize(ctx, leadFont, spec.lead, textW, leadMax, 64);
  ctx.font = leadFont(leadPx);
  const leadLines =
    ctx.measureText(spec.lead).width > textW
      ? twoLines(ctx, spec.lead, textW, spec.lang)
      : [spec.lead];
  const leadLH = Math.round(leadPx * (bn ? 1.15 : 1));
  const gapTop = wide ? 18 : 8;
  blocks.push({
    h: gapTop + leadLH * leadLines.length,
    draw: (t) =>
      leadLines.forEach((l, i) =>
        line(l, leadFont(leadPx), C.kacha, t + gapTop + leadLH * i + leadLH / 2),
      ),
  });
  // Second name: Fraunces italic under a Bangla lead, Anek Bangla under an English one.
  if (spec.second) {
    const secondFont = (px: number) =>
      bn ? `italic 400 ${px}px ${F.serif}` : `600 ${px}px ${F.bn}`;
    const px = fitSize(ctx, secondFont, spec.second, textW, 38, 28);
    const second = oneLine(ctx, secondFont(px), spec.second, textW);
    const mt = bn ? 2 : 12;
    blocks.push({ h: mt + 46, draw: (t) => line(second, secondFont(px), C.moss, t + mt + 23) });
  }
  // Rule (wide cards only, as in the mockups).
  if (wide)
    blocks.push({
      h: 28 + 3 + (spec.line ? 22 : 0),
      draw: (t) => {
        ctx.fillStyle = C.leaf;
        ctx.beginPath();
        ctx.roundRect(textX, t + 28, 72, 3, 2);
        ctx.fill();
      },
    });
  // ছোট লাইন.
  if (spec.line) {
    const font = `500 30px ${bn ? F.bn : F.ui}`;
    ctx.font = font;
    const lines = twoLines(ctx, spec.line, wide ? Math.min(520, textW) : 820, spec.lang);
    const mt = wide ? 0 : 18;
    blocks.push({
      h: mt + 41 * lines.length,
      draw: (t) => lines.forEach((l, i) => line(l, font, C.forest, t + mt + 41 * i + 20)),
    });
  }

  const footH = 32;
  const drawFoot = (top: number) => {
    const parts: [string, string][] = [
      [`500 22px ${F.bn}`, "আচারকুঠি"],
      [`500 22px ${F.ui}`, "·"],
      [`500 22px ${F.ui}`, "acharkuthi.store"],
    ];
    const gap = 12;
    const markW = 30;
    const widths = parts.map(([f, s]) => ((ctx.font = f), ctx.measureText(s).width));
    const total = markW + widths.reduce((a, b) => a + b + gap, 0);
    let x = centre ? (W - total) / 2 : textX;
    ctx.drawImage(mark, x, top, markW, (markW * mark.height) / mark.width);
    x += markW + gap;
    ctx.textAlign = "left";
    parts.forEach(([f, s], i) => {
      ctx.font = f;
      ctx.fillStyle = C.moss;
      ctx.fillText(s, x, top + footH / 2);
      x += (widths[i] ?? 0) + gap;
    });
    ctx.textAlign = centre ? "center" : "left";
  };

  if (wide) {
    // Text block and footer centred as one column beside the photo.
    const footGap = spec.kind === "category" ? 44 : 40;
    const total = blocks.reduce((n, b) => n + b.h, 0) + footGap + footH;
    let top = Math.round((H - total) / 2);
    for (const b of blocks) {
      b.draw(top);
      top += b.h;
    }
    drawFoot(top + footGap);
  } else {
    // Square: text under the photo, footer pinned to the bottom.
    let top = frame.y + frame.h + 32; // the eyebrow's top margin under the photo
    for (const b of blocks) {
      b.draw(top);
      top += b.h;
    }
    drawFoot(H - 52 - footH);
  }

  return toJpeg(canvas);
}

/** Frosted linen pill on the photo's top-left corner: "১০% ছাড়" / "10% off". */
function drawBadge(
  ctx: Ctx,
  [num, word]: [string, string],
  lang: "bn" | "en",
  frame: Box,
  img: ImageBitmap,
  focal: { x: number; y: number },
) {
  const numFont = `800 34px ${F.ui}, ${F.bn}`;
  const wordFont = lang === "bn" ? `600 28px ${F.bn}` : `600 26px ${F.ui}`;
  ctx.font = numFont;
  const nw = ctx.measureText(num).width;
  ctx.font = wordFont;
  const ww = ctx.measureText(word).width;
  const pill: Box = { x: frame.x + 24, y: frame.y + 24, w: 26 + nw + 10 + ww + 26, h: 64 };

  ctx.save();
  ctx.shadowColor = "rgba(52, 57, 43, 0.16)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "rgba(243, 241, 230, 0.62)";
  ctx.beginPath();
  ctx.roundRect(pill.x, pill.y, pill.w, pill.h, 999);
  ctx.fill();
  ctx.restore();
  // The blurred photo shows through the pill (CSS backdrop-filter: blur(12px) saturate(1.2)).
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(pill.x, pill.y, pill.w, pill.h, 999);
  ctx.clip();
  ctx.filter = "blur(12px) saturate(1.2)";
  drawCover(ctx, img, frame, focal.x, focal.y);
  ctx.filter = "none";
  ctx.fillStyle = "rgba(243, 241, 230, 0.62)";
  ctx.fillRect(pill.x, pill.y, pill.w, pill.h);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = "rgba(243, 241, 230, 0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(pill.x + 0.5, pill.y + 0.5, pill.w - 1, pill.h - 1, 999);
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = numFont;
  ctx.fillStyle = C.chili;
  ctx.fillText(num, pill.x + 26, pill.y + pill.h / 2);
  ctx.font = wordFont;
  ctx.fillStyle = C.kacha;
  ctx.fillText(word, pill.x + 26 + nw + 10, pill.y + pill.h / 2);
  ctx.restore();
}

/** JPEG under 300 KB: quality steps down until it fits. */
async function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  let last: Blob | null = null;
  for (const q of [0.88, 0.82, 0.76, 0.7, 0.62]) {
    last = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (last && last.size <= MAX_BYTES) return last;
  }
  if (!last) throw new Error("card export failed");
  return last;
}

/**
 * Draws and uploads cards, three at a time. `upload` is the server action; `onDone` fires after
 * each card (for the progress bar). Returns how many failed.
 */
export async function renderAndUpload(
  specs: readonly CardSpec[],
  upload: (form: FormData) => Promise<{ ok: boolean }>,
  onDone?: (done: number, failed: number) => void,
): Promise<{ done: number; failed: number }> {
  let next = 0;
  let done = 0;
  let failed = 0;
  const photos = new Map<string, Promise<ImageBitmap>>();
  const photo = (url: string) => {
    let p = photos.get(url);
    if (!p) photos.set(url, (p = loadBitmap(url)));
    return p;
  };
  async function worker() {
    while (next < specs.length) {
      const spec = specs[next++];
      if (!spec) break;
      try {
        const bmp = await photo(spec.photo);
        const [wide, square] = await Promise.all([
          renderCard(spec, "wide", bmp),
          renderCard(spec, "square", bmp),
        ]);
        const form = new FormData();
        form.set("kind", spec.kind);
        form.set("refId", String(spec.refId));
        form.set("pageKey", spec.pageKey);
        form.set("lang", spec.lang);
        form.set("hash", spec.hash);
        form.set("wide", new File([wide], "wide.jpg", { type: "image/jpeg" }));
        form.set("square", new File([square], "square.jpg", { type: "image/jpeg" }));
        const r = await upload(form);
        if (!r.ok) failed++;
      } catch (e) {
        console.error("share card", spec.kind, spec.refId, spec.lang, e);
        failed++;
      }
      done++;
      onDone?.(done, failed);
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  return { done, failed };
}
