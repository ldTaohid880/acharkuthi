// English site version of the design's 404 (content/not-found.ts and not-found-mobile.ts), owner
// "mirror" rule (2026-11-16, memory: storefront-bilingual): English copy, the Bangla eyebrow and
// the small accent line in Bangla. Drafted by Claude for the owner to review.
// Built from the drawn markup by exact swaps, so layout and styles stay identical.
import { html as desk } from "./not-found";
import { html as mob } from "./not-found-mobile";

const SWAPS: readonly (readonly [string, string])[] = [
  [
    'aria-label="৪০৪: মাঝের শূন্যের জায়গায় একটি খালি আচারের বয়াম"',
    'aria-label="404: an empty pickle jar where the middle zero should be"',
  ],
  ['<h1 lang="bn"', '<h1 lang="en"'],
  [
    'এই <span class="ak-brush">পাতাটা</span> খুঁজে পাওয়া গেল না!',
    'We couldn’t find <span class="ak-brush">this page</span>!',
  ],
  ['<p class="msg" lang="bn"', '<p class="msg" lang="en"'],
  [
    "মনে হচ্ছে আপনি যে পাতাটি খুঁজছেন, সেটি এখানে নেই।",
    "It looks like the page you’re looking for isn’t here.",
  ],
  ['<p class="en"', '<p class="en" lang="bn"'],
  ["The page you are looking for isn't here.", "আপনি যে পাতাটি খুঁজছেন, সেটি এখানে নেই।"],
  ['href="/" lang="bn">হোমে ফিরে যান', 'href="/" lang="en">Back to home'],
  ['href="/shop" lang="bn">সব আচার দেখুন', 'href="/shop" lang="en">See all pickles'],
  ['aria-label="কাজের লিংক"', 'aria-label="Useful links"'],
  ['href="/shop" lang="bn">আচারের দোকান', 'href="/shop" lang="en">Pickle shop'],
  ['href="/recipes" lang="bn">রেসিপি</a>', 'href="/recipes" lang="en">Recipes</a>'],
  ['href="/track" lang="bn">অর্ডার ট্র্যাক করুন', 'href="/track" lang="en">Track an order'],
  ['href="/contact" lang="bn">যোগাযোগ', 'href="/contact" lang="en">Contact'],
];

function toEnglish(h: string): string {
  let out = h;
  for (const [from, to] of SWAPS) {
    if (!out.includes(from)) throw new Error(`404 markup changed: "${from}" not found`);
    out = out.replaceAll(from, to);
  }
  return out;
}

export const html = toEnglish(desk);
export const htmlMobile = toEnglish(mob);
