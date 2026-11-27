# Future: advanced link-preview (Open Graph) studio

Status: **phases 1–3 built (2026-11-26)**, phases 4–6 planned (owner request, 2026-11-22; "advanced,
with preview, modern"). It does not block launch.

Owner answers (2026-11-26) to §10's questions: ship the **Studio** template first; **no price** on
card images (price lives only in the `product:*` tags); cache refresh is the **Sharing Debugger link
only** (no Facebook app, so no `FB_APP_ID` / `FB_APP_SECRET`).

Phase 1, as built:

- Static default cards in `apps/storefront/public/og/site-{bn,en}-{wide,square}.jpg` (Studio:
  kacha field, mustard name, Home hero photo), rendered by `apps/storefront/scripts/og-default-cards.mjs`
  (Playwright). Re-render after a design change and bump `SITE_CARD_VERSION` in `lib/share-card.ts`.
- `share_cards` table (migration `0034_share_cards`). `ref_id` and `page_key` are NOT NULL
  (0 / "") instead of null, so the unique key works in MySQL. Nothing writes it yet.
- `lib/share-card.ts` `getShareCard()` resolves product → category → page → site row → static card.
  Until phase 2 renders item cards, products and shelves show the site card.
- `pageMeta()` lists both JPEGs (type, size, alt, `secure_url` on https), always
  `summary_large_image`, takes share-text overrides, and `noindex` for utility pages (basket,
  checkout, track, login, account, unavailable now have their own title, canonical and `og:url`).
- Products print `og:type=product` and `product:*` tags from `components/product-og.tsx` (Next's
  `other` field writes `name=`, not `property=`). `theme-color` is linen, the page ground.
- `shareCardInput(r2PublicUrl)` in `@repo/validators` for the phase 3 save action.

Phase 2, as built (2026-11-26):

- `apps/admin/lib/share-cards.ts` builds each product/shelf card's inputs per language and a
  hash of them (`CARD_DESIGN_VERSION` is in the hash: bump it after a design change and every
  card goes stale). Products without a photo get no card (the shelf card is used).
- `apps/admin/lib/og/render.ts` draws the card on a canvas in the owner's browser and exports
  JPEG under 300 KB. Photos come through `/api/og-source` (owner only, our R2 / storefront photos
  only), so **no R2 CORS rule is needed**.
- `uploadShareCard` (owner, Zod) checks both JPEGs' size and dimensions, rebuilds the inputs and
  refuses a stale hash, stores `og/<kind>/<slug>-<lang>-<size>-v<version>.jpg` in R2 and upserts
  `share_cards`. Old versions stay in R2 (add a lifecycle rule on `og/` later, see §3.6).
- Saving a product or shelf redraws its cards in the background. Settings › শেয়ার কার্ড shows how
  many are out of date (e.g. after a price change on the Stock page) and remakes them.

Phase 3, Share Studio, as built (2026-11-26). Design: `docs/design/share-studio/*.png` (owner
approved draft 3; there is no admin canvas board for it):

- Admin › কনটেন্ট › শেয়ার প্রিভিউ at `/content/share` (list) and `/content/share/<kind>/<key>`
  (editor; kind `product` | `category` | `page`). **Owner and staff** both edit (owner).
- One form (image অটো / নিজের ছবি with a draggable focal point, title, description, per language)
  drives nine stacked, live previews: WhatsApp, Facebook, Messenger, Telegram, X, LinkedIn,
  Discord, Slack, iMessage (approximate; brand marks bundled from Simple Icons).
- **No automatic feedback** (owner): no truncation flags, scores, warnings or crop shading. The
  person editing sees the previews update and decides. Plain facts only in the list.
- **Share-only text** (owner): overrides change og/twitter tags, never `<title>` or the meta
  description. Placeholders are the page's own text, read from the live storefront page.
- নিজের ছবি is uploaded to R2 (`share/…`) and drawn into 1200×630 / 1080×1080 cards around the
  focal point (layout "photo"); site pages in অটো keep the storefront's site card.
- Not built: version history/restore (needs a `share_card_versions` table, §3.6) and the health
  score of §3.4 (the owner does not want automatic feedback in the Studio).

Phase 2 card design, approved by the owner 2026-11-26 (mockups rendered with Playwright):

- Product and shelf cards use the **light** variant: linen ground (`--linen`), names in `--kacha`
  (Anek Bangla 800 / Baloo 2 800), second name in `--moss` (Fraunces italic / Anek Bangla 600),
  a short `--leaf` rule, footer = leaf jar mark + "আচারকুঠি · acharkuthi.store". Photo frame:
  jar-shoulder radii (44 / 14), pale-olive hairline, soft shadow. The site cards stay dark (phase 1).
- Product photo: the image flagged `is_featured` (the styled one), else the first image.
- Under the names: the admin's ছোট লাইন (`tagline` / `tagline_en`) instead of the spice level;
  left out when empty. No price.
- Badges: **discount only**, when a size has a compare-at price ("১০% ছাড়" / "10% off"):
  a frosted linen pill on the photo's top-left corner (Home featured-picks badge style), the
  percent in `--chili` 800, the word in `--kacha`.
- Shelf card: eyebrow "আচারকুঠির তাক" / "From the Acharkuthi shelves", shelf name, rule, footer,
  shelf header photo (or the default Shop header). No product count.

Goal: every shared link (WhatsApp, Messenger, Facebook, Instagram DM, Telegram, X, LinkedIn,
Discord, Slack, iMessage, Google Chat) shows a large, sharp, on-brand card in the right language.
The owner manages it from an admin **Share Studio**: templates, per-item overrides, live
multi-platform previews, a health score, and one-click cache refresh.

## 1. Where things stand (audit of the live site, 2026-11-22)

Already done (keep it):

- Every public page has its own `og:title`, `og:description`, `og:url`, `og:site_name`,
  `og:locale` (`bn_BD` / `en_US`) plus `og:locale:alternate`, canonical and hreflang. All of it
  comes from `pageMeta()` in `apps/storefront/lib/seo.ts`.
- Products have their own title (both names), description and photo (from R2).
- Facebook, Telegram and Twitter crawlers get 200 for pages and for `img.acharkuthi.store`.

Gaps:

| #   | Problem                                                                                         | Effect                                                                      |
| --- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | Product `og:image` is **WebP**                                                                  | WhatsApp, and sometimes Messenger, show no image                            |
| 2   | Product photos are **portrait 1195×1600** (one is square)                                       | FB, Messenger and WhatsApp crop through the middle or shrink to a thumbnail |
| 3   | Every other page uses `/brand/logo.png` (1118×1024) with `twitter:card=summary`                 | Small square thumbnail, no large card                                       |
| 4   | Products are `og:type=website` with no price tags                                               | No price on FB/Messenger; Facebook Shops can't read them                    |
| 5   | `/basket`, `/track` (and other utility pages) have no `og:url`/canonical and reuse Home's title | Odd previews if shared                                                      |
| 6   | Category OG uses the logo, not the category's header photo                                      | Generic preview                                                             |
| 7   | Category description in admin is placeholder-like ("amer achar")                                | Weak preview text (owner fills in admin)                                    |

## 2. Target result

**Every shared link**

- Primary image: **1200×630 JPEG** (under 300 KB, sRGB, progressive), `og:image:secure_url`,
  `og:image:type`, `og:image:width/height`, `og:image:alt` in the page language.
- Secondary image: **1080×1080 JPEG** square in the same `og:image` list. WhatsApp's small bubble
  and some apps pick a square, so a designed square beats a centre crop of the wide card.
- `twitter:card=summary_large_image`, `twitter:image:alt`; `theme-color` for chat accents.
- **Language-aware cards**: `/` gets the Bangla card (Bangla name large), `/en/` the English card.
  Same design, text order flipped, like the product names on the site.

**Products**

- `og:type=product` plus `product:price:amount`, `product:price:currency=BDT`,
  `product:availability` (in stock / out of stock), `product:condition=new`,
  `product:brand=Acharkuthi`, `product:retailer_item_id` (SKU), `product:category`.
  Matches the existing Product JSON-LD, so Google, Facebook Shops and Pinterest Rich Pins agree.
- Card: generated from a template (photo, both names, "from ৳…", spice level, small logo), or an
  owner-uploaded custom photo with focal-point crop, which wins.
- **Smart badges** on the card (optional per template): "নতুন · New", "বেস্টসেলার",
  "স্টক শেষ · Sold out" (auto from stock), "ছাড় ১৫%" (when a compare-at price exists).

**Categories, site pages, utility pages**

- Category: card from its header photo plus name and product count; override allowed.
- Site pages (Home, Shop, Story, Contact, FAQ, policies): each can have its own card; else the site
  default from Settings.
- Utility pages (basket, checkout, track, account, login): `noindex`, their own title and
  canonical, the site default card.
- Order tracking links shared by customers show a neutral card (never order details).

## 3. Share Studio (admin)

### 3.1 Templates (Settings → শেয়ার কার্ড · Share cards)

- 3 or 4 built-in layouts, each with a wide (1200×630) and a square (1080×1080) variant:
  1. **Split**: photo left (rounded), names, price and logo right on the brand band.
  2. **Full-bleed**: photo fills the card with a soft gradient band at the bottom for text.
  3. **Studio**: dark heritage background (brand voice) with the jar centred and gold text.
  4. **Minimal**: photo plus a small logo only (for owner photos that already have text).
- Template settings: background (brand tokens only), text colour, logo position, show/hide price,
  badges and spice level. One template is the default; products and categories can pick another.
- Templates are data (JSON in `shop_settings.og_templates`), rendered by one shared renderer, so a
  change re-renders everything in a bulk pass.

### 3.2 Per item (product edit, category edit, page settings)

New card **"শেয়ার প্রিভিউ · Share preview"**:

- Mode: `অটো` (template) / `নিজের ছবি` (custom upload) / `টেমপ্লেট বদলান`.
- **Focal-point crop**: drag a point on the photo; the wide and square crops both keep it in view,
  with platform **safe-zone overlays** (WhatsApp square crop, X rounded corners, Telegram's
  bottom bar) toggled on the image.
- Title and description overrides with **live character counters** and platform limits
  (FB title ~60 chars before truncation, description ~110, WhatsApp ~2 lines), in বাংলা | English
  tabs like the description card.
- **AI suggest** (optional, later): drafts a share title and description in both languages from
  the product data for the owner to edit. Uses the Claude API with the latest model; never saved
  without the owner's click.

### 3.3 Live previews (the core of the request)

A preview panel that updates as the owner types or drags, with accurate mock-ups:

- Facebook feed post, Messenger bubble, WhatsApp chat bubble (light and dark), Instagram DM,
  Telegram, X (large card), LinkedIn, Discord embed, Slack unfurl, iMessage.
- Switches: **Bangla / English** version, **phone / desktop** width, **light / dark** chat theme.
- Each mock-up uses the real truncation and crop rules of that app, labelled "approximate".
- Shows the final image file size and dimensions, and warns when over limits.

### 3.4 Health score and checks

Per item and site-wide (Settings dashboard), green/amber/red:

- Image present, JPEG, right size, under 300 KB; square variant present.
- Title and description present in both languages and within limits; no placeholder text
  (reuse `isPlaceholder()` from `lib/seo.ts`).
- Product tags complete (price, availability, SKU); card price matches the current price (else
  "needs regenerate").
- Live check: fetch the public URL as `facebookexternalhit` and `WhatsApp` user agents from the
  server and compare the returned tags with what the admin expects.
- A list view: "১২টি পণ্যের কার্ড পুরোনো" with a one-click fix.

### 3.5 Cache refresh

- Every change bumps `og_image_version`, and the image URL carries `?v=<version>`.
- **"Facebook-এ রিফ্রেশ"**: calls the Graph API (`POST /?id=<url>&scrape=true` with an app access
  token in env `FB_APP_ID` / `FB_APP_SECRET`), which also refreshes Messenger and WhatsApp
  previews. Without a token, open the Sharing Debugger for that URL instead.
- Auto-refresh after save and after bulk regenerate (rate-limited queue, both language URLs).
- Telegram: link to `@WebpageBot` with the URL prefilled.

### 3.6 History

- Keep the last 5 generated cards per item (R2 `og/…`), with "restore" and a before/after view.
- Old files are deleted from R2 after a week (lifecycle rule on the `og/` prefix).

## 4. Image pipeline

**Recommended: render in the admin browser, store in R2.** The standalone bundles are built on
Windows, so `sharp`'s Linux binary is not reliably in the Hostinger bundle, and `next/og`
(satori) can't read WebP. A canvas (or `OffscreenCanvas` in a Web Worker for bulk) decodes WebP,
draws Bangla with the real fonts and exports JPEG, with no server native code.

1. **Renderer** `apps/admin/lib/og/render.ts` (client only):
   `renderCard({ template, size: "wide" | "square", lang, photo, focal, texts, badges }) → Blob`.
   - Load fonts with `FontFace` (Anek Bangla, Instrument Sans, Fraunces) before drawing; wait
     for `document.fonts.ready`.
   - Text fitting: shrink to fit, max 2 lines, Bangla-aware line breaking (`Intl.Segmenter`).
   - Export JPEG at quality 0.85; step down quality until under 300 KB.
   - R2 must send CORS headers for `admin.acharkuthi.store`, or the canvas is "tainted" and can't
     export. Add a CORS policy on the `acharkuthi` bucket (GET from the admin origin).
2. **Upload**: `uploadOgImage(form)` server action, `requireRole("owner")`, Zod-validated, JPEG
   only, up to 1 MB, stored at `og/<kind>/<slug>-<lang>-<size>-v<version>.jpg`. Reuse the
   sign-then-send Content-Length upload in `lib/r2.ts`.
3. **Triggers**:
   - Product/category save when name, price, stock state, main photo, template or texts changed.
   - Template change in Settings: bulk pass over everything using it.
   - "Regenerate all" with a progress bar (Web Worker, 3 at a time, resumable).
   - Price changes from other screens (stock page, bulk edits) mark cards "stale"; the health
     list offers a one-click regenerate.
4. **Fallback chain** in the storefront: item card → category card → page card → site default.
   Never a WebP or portrait photo.

Alternative if browser rendering proves awkward: a storefront route `/og/[kind]/[slug].jpg` using
`sharp` (fix the bundle to include `@img/sharp-linux-x64` by installing with
`--os=linux --cpu=x64` in `scripts/deploy/prepare.mjs`), cached in R2 on first hit.

## 5. Data model (needs `pnpm db:generate`; deploy storefront first)

New table `share_cards` (one row per item and language) instead of many columns:

| Column                       | Type                                       | Notes                                                            |
| ---------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| `id`                         | serial                                     |                                                                  |
| `kind`                       | enum `product`, `category`, `page`, `site` |                                                                  |
| `ref_id`                     | int null                                   | product/category id; null for page/site                          |
| `page_key`                   | varchar(40) null                           | `home`, `shop`, `story`, `contact`, `faq`, `policies`            |
| `lang`                       | enum `bn`, `en`                            |                                                                  |
| `mode`                       | enum `auto`, `custom`                      |                                                                  |
| `template`                   | varchar(30)                                | template id                                                      |
| `title`, `description`       | varchar(120) / varchar(300) null           | overrides                                                        |
| `source_image_url`           | varchar(500) null                          | custom photo (R2)                                                |
| `focal_x`, `focal_y`         | decimal(4,3) default 0.5                   | crop focus                                                       |
| `wide_url`, `square_url`     | varchar(500) null                          | generated JPEGs (R2)                                             |
| `wide_bytes`, `square_bytes` | int null                                   | for the health check                                             |
| `version`                    | int default 0                              | cache-busting `?v=`                                              |
| `rendered_from`              | varchar(64) null                           | hash of inputs (name, price, photo, template); differs → "stale" |
| `updated_at`                 | timestamp                                  |                                                                  |

Unique key `(kind, ref_id, page_key, lang)`. History rows go in `share_card_versions` (card id,
version, URLs, created_at), keeping 5.

`shop_settings`: `og_templates` JSON, `og_default_template`, `fb_refresh_enabled`.

Validators in `@repo/validators`: `shareCardInput` (title up to 120, description up to 300,
URLs must start with `R2_PUBLIC_URL`, focal 0 to 1), `shareTemplateInput`.

Remember MariaDB in production (no LATERAL; see the deploy notes): no orderBy/limit inside to-many
`with`.

## 6. Storefront changes

- `pageMeta()` in `lib/seo.ts` takes a resolved `ShareCard` (`lib/share-card.ts` resolves the
  fallback chain, cached per request with React `cache()`):
  - `openGraph.images`: wide first, then square, each with width, height, type and alt;
  - `twitter.card = "summary_large_image"` always;
  - title and description overrides;
  - product extras through `other` (`og:type=product`, `product:*`). Check that Next doesn't also
    print `og:type=website`; if it does, drop `openGraph.type` for products.
- Product, category and page `generateMetadata` pass their card; utility pages pass
  `robots: { index: false }` and their own title and canonical.
- Revalidate tag `share-card:<kind>:<id>` from the admin on save (`revalidateTag`), so new tags
  are live at once.
- Tests in `lib/seo.test.ts` and `lib/share-card.test.ts`: fallback order, versioned URLs, both
  images listed, product tags, language variants, placeholder text rejected.

## 7. Build order

1. Schema + validators + storefront resolver with the site default card (fixes gaps 1–6 quickly,
   using one hand-made default JPEG per language).
2. Renderer + templates + bulk "generate all" (every product and category gets cards).
3. Share Studio card on product/category edit with live previews and focal crop.
4. Health score, stale detection, Settings dashboard.
5. Facebook refresh integration, history/restore.
6. Optional: AI suggest for share text.

## 8. Done when

- [ ] Every public URL (both languages) returns a 1200×630 JPEG plus a 1080×1080 JPEG, large card
      tags, and correct text; products carry price and availability tags.
- [ ] The owner can switch auto/custom/template, drag the focal point, edit texts, and see live
      previews for at least FB, Messenger, WhatsApp (light/dark), Telegram and X.
- [ ] Health dashboard is all green; changing a price marks the card stale and one click fixes it.
- [ ] Facebook Sharing Debugger shows no warnings for Home, Shop, a category and every product.
- [ ] Real WhatsApp, Messenger and Telegram chats show the large image and right title.
- [ ] `pnpm lint check-types test` passes; storefront deployed before admin (schema).

## 9. Testing tools

- Facebook: https://developers.facebook.com/tools/debug/ ("Scrape again" also refreshes Messenger
  and WhatsApp's cached previews for that URL).
- Telegram: send the link to `@WebpageBot`.
- LinkedIn: https://www.linkedin.com/post-inspector/
- General: https://www.opengraph.xyz/
- Terminal: `curl -A "facebookexternalhit/1.1" https://acharkuthi.store/pickles/<slug>`.

## 10. Rules and open questions

- AGENTS.md rules apply: `requireRole("owner")` on every action, Zod input, ScrollArea scrolling,
  Tailwind + shadcn in admin. **There is no admin canvas board for the Share Studio**: show the
  owner a mockup of the studio and of each card template before building (design-fidelity rule 6).
- Brand voice: heritage, not homely (no "homemade", no domestic scenes) on cards and AI text.
- Open questions for the owner:
  1. Which card templates to ship first (Split, Full-bleed, Studio, Minimal)?
  2. Show the price on cards? (Stale detection handles price changes.)
  3. Set up a Facebook app for one-click cache refresh, or use the debugger link only?
  4. Turn on AI-suggested share text?
