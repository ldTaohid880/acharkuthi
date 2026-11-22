# Storefront UX audit

Date: 2026-11-08 · Build: the storefront dev server already running on `localhost:3000` (seeded DB) ·
Widths checked: 1440 and 390 (320/360/430 boards are Search boards, superseded by the owner, so not checked).

Owner overrides treated as intentional (not defects): checkout uses site chrome, search is Shop-only
(`/search` 404 is correct), contact page redesign, Anek Bangla headings.

## Scope and limits (read this first)

- **What was done:** every route in the build table was loaded at 1440 and 390. An automated sweep
  checked sideways scrolling, headings, unlabeled inputs, unnamed controls, tap-target size, images and
  placeholder text. Journeys a–f were walked by hand in the in-app browser. The page copy was compared
  with these boards: Main, Product, ProductStates, Shop States, Basket, BasketStates, Checkout,
  CheckoutStates, Track, Account, AccountStates, Auth, Faq, Shipping, Unavailable, RecipeDetail,
  NotFound, ErrorPatterns.
- **What was not done:** a section-by-section pixel comparison (spacing, type, colour) of every row
  against its desktop and mobile boards. The screenshots in this session are low resolution, and doing
  that properly for 22 rows means one task per row, as `AGENTS.md` describes. Mobile boards were not
  read one by one; mobile was judged on behaviour (sheets, sticky bars, overflow, targets). Findings
  below are only what was actually seen; there is no claim of a pixel match.
- Screenshots are referenced by what they show. They were taken in the browser pane and are not saved
  in the repo.
- Test data created in the local DB: 2 COD orders (`AK-261108-456112` guest, `AK-261108-007875`
  signed in), 1 saved address, 1 contact message, 1 newsletter signup, 1 site review, and the test
  account `ux-audit-1108@example.test` (password `AuditPass-7319x`). Delete them before any shared use.

## Summary

| Priority                                 | Count |
| ---------------------------------------- | ----- |
| P0: blocks buying or loses data          | 1     |
| P1: broken flow or clear design mismatch | 11    |
| P2: polish                               | 15    |
| Questions for the owner                  | 8     |

No console errors other than the expected 401 (wrong password test) and 404s (404 tests). No sideways
scrolling on any page at 390. Every page has exactly one `h1`. Prices seen were all `৳` via
`formatTaka`, and basket, checkout, confirmation and tracking totals matched (৳250 + ৳60 = ৳310; 2 × ৳250

- ৳60 = ৳560).

## Fix log

- **P0 (2026-11-08): fixed.** `checkout-view.tsx` `set()` stored `undefined` server errors that hid
  client errors when merged; it now deletes the key.
- **P1 (2026-11-08):**
  - #1 placeholder copy: **kept on purpose until launch** (owner, Q1). Not a defect.
  - #2 size radios: fixed (`aria-label` "300 g, ৳250").
  - #3 notify me: **built** (owner, Q3). One field, mobile number or email
    (`components/restock-alert.tsx`, `app/actions/restock.ts`, `restockRequestInput`), table
    `restock_requests` (migration `0010`), admin page `/restock-requests` with "Mark notified".
    No board draws the form; its copy was approved by the owner in chat.
  - #4 mini-basket: fixed. Browser Back closes the sheet or drawer; closing it in place removes the
    extra history entry.
  - #5 confirmation: fixed (owner, Q5). The placed order is kept in `sessionStorage` for the tab, so
    a reload or Back/Forward shows it again.
  - #6 focus: fixed on checkout (client and server errors) and on the auth forms.
  - #7 selects: fixed (`Select` `label` prop → `aria-label` on the combobox and listbox).
  - #8 greeting: fixed ("নমস্কার, {name}").
  - #9 reorder: **already built as designed.** Account.dc.html shows it only on delivered orders
    (`o.reorder`), and the build does the same; the audit's test orders were pending.
  - #10 unknown recipe: fixed. Real 404 with the RecipeDetail "missing" view
    (`app/recipes/[slug]/not-found.tsx`).
  - #11 unknown shelf: fixed. Real 404 and no fake heading. The list pages' `loading.tsx` moved
    into route groups (`app/recipes/(list)`, `app/shop/(all)`) so they no longer wrap the dynamic
    routes, which now stream behind in-page `<Suspense>` skeletons after the lookup.
- **P2 (2026-11-09):**
  - #12 basket label: fixed ("1 item" / "N items").
  - #13 logos: fixed. 2× copies `mark-96.png`, `wordmark-80.png`, `logo-256.png` (7–34 KB instead of
    64–137 KB); the originals stay in `public/brand/`.
  - #14 coming-soon controls: **hidden** (owner): the বাং toggle and the card hearts. The card's inert
    "Notify me" now links to the product page, where the restock form is.
  - #15 tap targets: breadcrumbs get an invisible 44px hit area on phones. Re-measured: card names are
    stretched links over the whole card, the footer links are already ≥44px, and the FAQ items under 44px
    are inline links in answer text (exempt). The hearts are gone (#14).
  - #16 newsletter: fixed. "Subscribing…" with a spinner while sending, same button width.
  - #17 product names: fixed. Checkout, the confirmation and tracking use the Bangla name, like the basket.
  - #18 double confirmation: fixed. The phone basket bar is hidden on product pages, which have their
    own sticky bar and snackbar.
  - #19 checkout alerts: fixed. Only the summary is `role="alert"`; field messages are linked with
    `aria-describedby` (inputs and location selects).
  - #20 confirmation text: fixed (owner). The confirmation's first step drops "অর্ডার জমা হলে এই পাতায়
    নিশ্চিতকরণ দেখতে পাবেন।"; the form keeps the full Checkout.dc.html sentence.
  - #21 track link: fixed. It goes to `/track?order=…`, and the guest form is prefilled.
  - #22 dates: fixed. Order numbers use the Dhaka date; Account shows "9 নভেম্বর 2026" like tracking.
    Order numbers made before this fix keep their old date.
  - #23 subject "two errors": not a defect. "বিষয় বেছে নিন" is the select's placeholder option
    (Contact.dc.html); only one error shows.
  - #24 contact email: fixed. Fields are checked on blur with `contactInput`, so `bad-email` shows the
    Contact board's "ইমেইলটি ঠিক মনে হচ্ছে না…".
  - #25 speed: **not rechecked.** A production build can't run next to the running dev server
    (same `.next`).
  - #26 sign in: the Google button has an explicit `aria-label`. The brand panel `h2` before the `h1`
    is kept because Auth.dc.html draws it that way.

## P0

### Checkout: an invalid mobile number is accepted on screen, then "Place order" silently does nothing

- **Page / width:** `/checkout`, 1440 and 390.
- **Steps:** add any jar, open `/checkout`, type `0171` in মোবাইল নম্বর, press Tab. Fill everything
  else correctly and press "অর্ডার নিশ্চিত করুন".
- **What happens:** no error under the phone field (`aria-invalid="false"`, no `is-error`), even after
  submit. With the other fields empty, the error summary counts 5 fields and leaves the phone out. With
  everything else valid, pressing the button does nothing at all: no error, no loading text, no order.
  The shopper is stuck and gets no hint why.
- **Should happen:** CheckoutStates "Mobile number, invalid": "নম্বরটি ঠিক নয়। ১১ সংখ্যার নম্বর লিখুন,
  যেমন 01XXX-XXXXXX", shown on blur and on submit, with the value kept.
- **Evidence:** screenshot at 390 after blur shows `0171` with only the helper text. Running
  `checkoutContact.safeParse` from `@repo/validators` directly on the same value **does** return the phone
  error, so the schema is right and the fault is in what the browser runs.
- **Likely file:** `apps/storefront/components/checkout-view.tsx` (`clientErrors`, `show`, `submit`) or a
  stale client bundle of `@repo/validators`. The audited server was already running before this session.
  **First step:** restart the dev server and retest. If it still happens, debug `clientErrors(v)` in the
  browser.

## P1

### Global

1. **Placeholder and sample content is live on customer pages.** Home reviews show "Sample content ·
   Demonstration reviews, not real customers." and "[Sample review text…] [Customer name] [date]" when
   there are no real reviews. Our story, Recipes and Recipe details show image slots with file names
   and art-direction notes ("recipe-panta.jpg · Panta bhat in a clay bowl…"). All four policy pages show
   "সর্বশেষ হালনাগাদ: [তারিখ নির্ধারিত হবে]" and "খসড়া, পর্যালোচনার অপেক্ষায়". Recipe details say
   "নমুনা রেসিপি…". This copy comes from the boards, but it is design scaffolding, not customer copy.
   Files: `components/home-reviews.tsx` (`SAMPLE`), `app/our-story/page.tsx`,
   `components/recipes-view.tsx`, `components/recipe-body.tsx`, `components/doc-page.tsx`. See Q1.

### Product details — `/pickles/[slug]`

2. **The size picker radios have no accessible name.** At 1440, the accessibility tree shows `radio` with
   no name for "300 g" and "500 g" (no `aria-label` or `aria-labelledby`; the text sits in child nodes
   the role doesn't pick up). File: `components/variant-picker.tsx`.
3. **"স্টকে এলে জানান" (notify me) does nothing.** On `/pickles/tamarind` (out of stock) the button has
   `aria-disabled` and a `title` saying "Stock notifications are coming soon". ProductStates shows it as
   a working action. This is a dead end. File: `components/variant-picker.tsx:221`. See Q3.

### Mini-basket (mobile sheet)

4. **The back button leaves the page instead of closing the sheet.** At 390, on a product page, open the
   basket sheet from the header and press browser Back: the browser goes to the previous page (Recipes)
   and the product page is lost. The sheet should close first. File: `components/mini-basket.tsx`.

### Checkout — `/checkout`

5. **Refreshing the confirmation loses the order number.** After "অর্ডার জমা হয়েছে", a reload (or Back
   then Forward) redirects to `/basket`, because the cart is empty (`checkout-view.tsx:164`). A guest
   then has no way to get the order number, and tracking needs it. There is no confirmation URL and no
   email. File: `components/checkout-view.tsx`. See Q5.
6. **Focus doesn't move to the first invalid field.** On a failed submit, focus stays on the button.
   ErrorPatterns says: "প্রথম ত্রুটিপূর্ণ ঘরে ফোকাস যায়". The same happens on register. Files:
   `components/checkout-view.tsx`, `app/login/auth-view.tsx`.
7. **The location selects (বিভাগ / জেলা / উপজেলা) have no accessible name.** They are `role="combobox"`
   buttons with no `aria-labelledby`, so a screen reader hears only the current value. The same applies
   to the Contact "বিষয়" select. File: `components/select.tsx`.

### Account — `/account`

8. **Wrong greeting.** It shows "Hello, UX Audit"; Account.dc.html shows "নমস্কার, {{pName}}". File:
   `app/account/page.tsx`.
9. **"আবার অর্ডার করুন" (reorder) is missing.** Account.dc.html and AccountStates show it on order rows.
   The built `/account/orders` shows only "বিস্তারিত দেখুন" and "অর্ডার ট্র্যাক করুন", and both go to the
   same `/track?order=…` URL. File: `app/account/orders/page.tsx`.

### Recipe details — `/recipes/[slug]`

10. **Unknown recipe shows the generic 404 with HTTP 200.** `/recipes/nope-xyz` returns status 200 and the
    site 404 ("এই পাতাটা খুঁজে পাওয়া গেল না!"). RecipeDetail.dc.html has its own state: "এই রেসিপিটি খুঁজে
    পাওয়া গেল না · লিংকটি পুরনো হতে পারে… · সব রেসিপি দেখুন / আচারের দোকানে যান", and it should return 404. File: `app/recipes/[slug]/page.tsx`.

### Shop — `/shop/[category]`

11. **Unknown shelf returns 200 and streams a fake shelf first.** `/shop/nope` returns 200. Its server HTML
    starts with "The shop · Nope pickles" before the 404 UI replaces it. It should be a real 404 with no
    fake heading. File: `app/shop/[category]/page.tsx`.

## P2

### Global

12. Header basket label reads "Basket, 1 items". It should be "1 item". File: `components/header-client.tsx`.
13. The logo PNGs are 1048–1372 px wide but shown at 34–135 px, on every page. Serve sized images.
    Files: `components/site-header.tsx`, `site-footer.tsx`.
14. "Coming soon" controls only explain themselves through `title` tooltips, which don't show on touch:
    the Bengali toggle ("Bengali version coming soon") and the card heart ("Saved items are coming soon").
    Files: `header-client.tsx:107`, `product-card.tsx:47`. See Q3.
15. Some tap targets are under 44 px at 390: product-card name links are 21–25 px tall, card "Save" hearts
    are 40×40, FAQ category chips are 30 px tall, the footer policy links are 30 px, and the breadcrumb
    links are 32–36 px. (Shop States asks for 44 px hit areas.)

### Home

16. Newsletter: during submit the button stays "Subscribe" (it is disabled). ErrorPatterns "Action
    processing" asks for the label to change while the width stays the same. A repeat signup with the
    same email shows "Thank you, you're on the list." again, which is fine but untested for intent.
    File: `components/newsletter-form.tsx`.

### Product / Basket / Checkout

17. The basket says "কাঁচা আমের আচার", but checkout, the confirmation and tracking say "Raw Mango Pickle"
    for the same line. Pick one name per context. Files: `checkout-view.tsx`, `track-result.tsx`.
18. Mobile, after "কার্টে যোগ করুন": two confirmations stack, the Bangla snackbar "কার্টে যোগ হয়েছে… কার্ট
    দেখুন" and the English bar "1 in your basket · View basket". BasketStates shows one snackbar.
    Files: `components/add-to-basket.tsx`, `basket-bar.tsx`.
19. Every checkout field error is `role="alert"`, so a failed submit announces 6–8 alerts at once.
    Only the summary should be an alert; field messages should hang off `aria-describedby` (ErrorPatterns
    §2). The inputs also have `aria-describedby=null`. File: `checkout-view.tsx:588`.
20. The confirmation "এরপর কী হবে" repeats "অর্ডার জমা হলে এই পাতায় নিশ্চিতকরণ দেখতে পাবেন।" after the
    order is placed, which reads oddly. File: `checkout-view.tsx`.
21. "অর্ডার ট্র্যাক করুন" on the confirmation links to `/track` without `?order=`, so the shopper retypes
    the number. Account already uses `?order=`. File: `checkout-view.tsx`.

### Order tracking / Account

22. Dates disagree. Order `AK-261108-…` (8 Nov) shows "9 নভেম্বর 2026" on tracking and "9 Nov 2026" in
    Account. The order number uses server time, the dates use another zone, and the two pages use
    different languages. Files: `app/actions/checkout.ts` (`orderNumber`), `lib/track.ts`,
    `app/account/orders/page.tsx`.

### Contact

23. The subject field shows two errors at once: "বিষয় বেছে নিন" and "একটি বিষয় বেছে নিন". File:
    `components/contact-form.tsx`.
24. After the empty-submit error, typing an invalid email (`bad-email`) and leaving the field keeps
    "ইমেইল লিখুন". ErrorPatterns' message for this is "ইমেইলটি সঠিক মনে হচ্ছে না…". File:
    `components/contact-form.tsx`.

### Speed

25. Registration took about 10 s from submit to `/account`. `/checkout` took about 8.9 s and
    `/return-refund-policy` about 4.6 s on first server render. `/recipes` and `/recipes/khichuri` had no
    `h1` 2.5 s after load (still on the loading skeleton). These are dev-mode timings; recheck in a
    production build.

### Sign in

26. The Google button's accessible name is empty in the accessibility tree, even though "Continue with
    Google" is visible. On desktop `/login` an `h2` ("ঘরের স্বাদ…", the brand panel) comes before the `h1`.
    File: `app/login/google-button.tsx`, `auth-view.tsx`.

## Journeys

| Journey                                                                                                     | 1440                       | 390                          | Notes                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a. Home → Shop → search/filter → Product → variant → add → mini-basket → Basket → Checkout → placed → Track | **Fail**                   | **Fail**                     | Works with a valid phone (orders placed, totals right, double-submit blocked, track by order + phone works). Fails on P0 (invalid phone), P1 #4 (back closes page) and #5 (refresh loses confirmation).                                                                                                         |
| b. Register → sign out → sign in → Account (orders, addresses) → reorder / track                            | **Fail**                   | not run                      | Register, sign-out confirm, wrong password ("ইমেইল বা পাসওয়ার্ড মিলছে না"), sign in, order history, saved address and track all work. Reorder is missing (P1 #9).                                                                                                                                              |
| c. Signed out: `/checkout`, `/account`                                                                      | Pass                       | Pass (code path is the same) | `/checkout` allows guest checkout, as designed. `/account` redirects to `/login?next=%2Faccount`.                                                                                                                                                                                                               |
| d. Recipes → Recipe details → buy the pickle                                                                | Pass (with content issues) | not run                      | "পণ্য দেখুন" goes to `/pickles/raw-mango`. Placeholder image slots (P1 #1).                                                                                                                                                                                                                                     |
| e. Contact / newsletter / site review, valid + invalid                                                      | Pass with P2s              | not run                      | All three save and confirm, and their buttons disable while sending. The empty-submit check on the review dialog didn't run, so it is unverified.                                                                                                                                                               |
| f. Broken paths                                                                                             | **Fail**                   | —                            | 404 works for an unknown URL and an unknown product. The unknown recipe (#10) and unknown shelf (#11) are wrong. The out-of-stock product shows "স্টক শেষ" and blocks adding. Empty checkout redirects to the basket. Wrong password works. A failed checkout (server error) was not forced, so it is untested. |

## Questions for the owner

1. **Placeholder copy (P1 #1):** should sample reviews, image-slot labels, "নমুনা রেসিপি" and the policy
   "খসড়া / [তারিখ নির্ধারিত হবে]" banners be hidden until real content exists, or kept on purpose until
   launch?
2. **Language mix:** the desktop header, footer, Shop and Product sections are English, but checkout,
   basket, account and errors are Bangla, and the mobile drawer is Bangla. The boards draw it the same
   way. Is a mixed-language site the intent until the Bengali toggle works?
3. **"Coming soon" controls:** "Notify me", the "Save" heart and the বাং toggle are visible but inert. Keep
   them, hide them, or build them?
4. **"কার্ট" vs "ঝুড়ি":** the Product board says "কার্টে যোগ করুন / কার্ট দেখুন", while the basket, mini-basket
   and checkout say "ঝুড়ি". Should it be one term?
5. **Order confirmation persistence (P1 #5):** add a confirmation URL (for example `/order/[number]`
   behind phone/email), or send an SMS or email? The design doesn't show either.
6. **Register success:** Auth.dc.html shows an "আপনার অ্যাকাউন্ট তৈরি হয়েছে" panel. The build goes
   straight to `/account` when `?next=` is set. Is that intended?
7. **Checkout back link:** Checkout.dc.html has "কার্টে ফিরুন". It isn't on the built page, probably
   because of the site-chrome override. Should it come back in the page body?
8. **Phone number on checkout:** the checkout chrome has `tel:01624607294` links. The contact page hides
   the number on purpose. Is showing it on checkout OK?
