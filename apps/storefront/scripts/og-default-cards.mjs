/**
 * Renders the site's default link-preview cards (docs/future/og-sharing.md, phase 1) into
 * public/og/: a 1200×630 wide card and a 1080×1080 square card for each language, as JPEG.
 * Template: "Studio" (owner pick, 2026-11-26): dark kacha field, mustard name, linen text, the
 * Home hero photo in a jar-shoulder frame. Colours and radii are the tokens in
 * packages/ui/src/styles/acharkuthi.css.
 *
 * Run from apps/storefront after changing the design:  node scripts/og-default-cards.mjs
 * Needs Playwright's Chromium (pnpm exec playwright install chromium) and network for the fonts.
 */
import { readFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public/og");
const MAX_BYTES = 300 * 1024;

const dataUri = async (file, type) =>
  `data:${type};base64,${(await readFile(path.join(root, file))).toString("base64")}`;
const photo = await dataUri("public/images/hero/hero-desktop-2400.webp", "image/webp");
const logo = await dataUri("public/brand/mark.png", "image/png");

/** Page-language copy: the language's name leads, the other follows (like product names). */
const COPY = {
  bn: {
    lang: "bn",
    lead: "আচারকুঠি",
    second: "Acharkuthi",
    line: "ঐতিহ্যবাহী বাংলা আচার",
    foot: "সারা বাংলাদেশে ক্যাশ অন ডেলিভারি",
  },
  en: {
    lang: "en",
    lead: "Acharkuthi",
    second: "আচারকুঠি",
    line: "Heritage Bengali pickles",
    foot: "Cash on delivery across Bangladesh",
  },
};

const SIZES = {
  wide: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
};

function html(c, size) {
  const bn = c.lang === "bn";
  const leadFont = bn ? "'Anek Bangla'" : "'Baloo 2'";
  const secondFont = bn ? "Fraunces" : "'Anek Bangla'";
  const wide = size === "wide";
  return `<!doctype html><html lang="${c.lang}"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@500;700;800&family=Baloo+2:wght@800&family=Fraunces:ital,opsz,wght@1,9..144,400&family=Instrument+Sans:wght@500;600&display=block" rel="stylesheet">
<style>
  :root { --kacha:#2b4103; --mustard:#f5d84c; --linen:#e8e5d5; --pale-olive:#c4c3a5;
          --radius-soft:14px; --radius-shoulder:44px; }
  * { margin:0; box-sizing:border-box; }
  html,body { width:${SIZES[size].width}px; height:${SIZES[size].height}px; overflow:hidden; }
  body { background: radial-gradient(120% 90% at ${wide ? "20% 30%" : "50% 20%"}, #3a5410 0%, var(--kacha) 55%, #1f3002 100%);
         color:var(--linen); font-family:'Instrument Sans','Anek Bangla',sans-serif;
         display:flex; ${wide ? "align-items:center; padding:56px 56px 56px 72px; gap:56px;" : "flex-direction:column; align-items:center; padding:64px 72px 60px; gap:40px; text-align:center;"} }
  .text { ${wide ? "flex:1 1 0; min-width:0;" : ""} display:flex; flex-direction:column; ${wide ? "" : "align-items:center;"} }
  .mark { width:${wide ? 80 : 96}px; height:${wide ? 84 : 100}px; background:var(--mustard);
          -webkit-mask:url(${logo}) center/contain no-repeat; mask:url(${logo}) center/contain no-repeat;
          margin-bottom:${wide ? 28 : 0}px; }
  .lead { font-family:${leadFont}; font-weight:800; color:var(--mustard);
          font-size:${bn ? (wide ? 112 : 124) : wide ? 108 : 120}px; line-height:${bn ? 1.15 : 0.95}; }
  .second { font-family:${secondFont}; ${bn ? "font-style:italic; font-weight:400;" : "font-weight:600;"}
            font-size:${wide ? 40 : 44}px; line-height:1.2; margin-top:${bn ? 4 : 14}px; }
  .rule { width:72px; height:3px; background:var(--mustard); border-radius:2px; margin:${wide ? "30px 0 24px" : "28px 0 22px"}; }
  .line { font-family:${bn ? "'Anek Bangla'" : "'Instrument Sans'"}; font-weight:${bn ? 600 : 600}; font-size:${wide ? 34 : 38}px; line-height:1.3; }
  .foot { font-family:${bn ? "'Anek Bangla'" : "'Instrument Sans'"}; font-weight:500; font-size:${wide ? 24 : 28}px;
          color:var(--pale-olive); margin-top:${wide ? 14 : 12}px; }
  .photo { ${wide ? "flex:0 0 470px; height:518px;" : "width:936px; height:420px;"}
           border-radius:var(--radius-shoulder) var(--radius-shoulder) var(--radius-soft) var(--radius-soft);
           background:url(${photo}) ${wide ? "74% 60%/auto 120%" : "62% 62%/112% auto"} no-repeat;
           box-shadow:0 24px 48px -18px rgba(0,0,0,.55), 0 0 0 1px rgba(245,216,76,.25); }
</style></head><body>
${wide ? "" : '<div class="mark"></div>'}
<div class="text">
  ${wide ? '<div class="mark"></div>' : ""}
  <div class="lead">${c.lead}</div>
  <div class="second">${c.second}</div>
  <div class="rule"></div>
  <div class="line">${c.line}</div>
  <div class="foot">${c.foot}</div>
</div>
${wide ? '<div class="photo"></div>' : ""}
${wide ? "" : '<div class="photo"></div>'}
</body></html>`;
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const c of Object.values(COPY)) {
    for (const [size, viewport] of Object.entries(SIZES)) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
      await page.setContent(html(c, size), { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const file = path.join(out, `site-${c.lang}-${size}.jpg`);
      // Step quality down until the card is under the 300 KB limit chat apps like.
      for (const quality of [88, 82, 76, 70]) {
        await page.screenshot({ path: file, type: "jpeg", quality });
        if ((await stat(file)).size <= MAX_BYTES) break;
      }
      console.log(`${path.relative(root, file)}  ${Math.round((await stat(file)).size / 1024)} KB`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
