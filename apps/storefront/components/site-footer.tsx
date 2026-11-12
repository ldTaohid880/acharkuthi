import Link from "next/link";
import { NewsletterForm } from "./newsletter-form";
import { getCategories } from "@/lib/queries";
import { shopHref } from "@/lib/routes";

const ICON = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  style: { flex: "none", marginTop: 2, color: "var(--brand)" },
} as const;
const ROW = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  color: "var(--ink)",
  textDecoration: "none",
  fontSize: 15,
  lineHeight: 1.5,
} as const;

export async function SiteFooter() {
  const shelves = await getCategories();
  return (
    <footer className="ft" id="footer">
      <div className="ak-deckle deck-t" aria-hidden="true" />
      <div className="wrap ft-news">
        <div>
          <h2 className="h-m">Letters from the kitchen</h2>
          <p>
            New pickles and recipes, now and then.
            <span className="only-desk"> Never more than we would want to read ourselves.</span>
          </p>
        </div>
        <NewsletterForm />
      </div>
      <div className="wrap ft-grid">
        <div className="ft-brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand art */}
          <img src="/brand/logo-256.png" alt="Acharkuthi" />
          <div className="ak-aside">The taste of tradition.</div>
        </div>
        <nav aria-label="Shop">
          <h3>Shop</h3>
          <ul>
            <li>
              <Link href={shopHref()}>All pickles</Link>
            </li>
            {shelves.map((s) => (
              <li key={s.slug}>
                <Link href={shopHref(s.slug)}>{s.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Acharkuthi">
          <h3>Acharkuthi</h3>
          <ul>
            <li>
              <Link href="/our-story">Our story</Link>
            </li>
            <li>
              <Link href="/recipes">Recipes</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Help">
          <h3>Legal &amp; Support</h3>
          <ul>
            <li>
              <Link href="/faq">FAQ</Link>
            </li>
            <li>
              <Link href="/shipping-policy">Shipping Policy</Link>
            </li>
            <li>
              <Link href="/return-refund-policy">Refund Policy</Link>
            </li>
            <li>
              <Link href="/privacy-policy">Privacy Policy</Link>
            </li>
            <li>
              <Link href="/terms-and-conditions">Terms of Use</Link>
            </li>
          </ul>
        </nav>
        <div>
          <h3>Contact Us</h3>
          <ul>
            <li>
              <span style={ROW}>
                <svg {...ICON}>
                  <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
                <span>529, Dhonia, Jatrabari, Dhaka</span>
              </span>
            </li>
            <li>
              <a href="tel:01624607294" style={ROW}>
                <svg {...ICON}>
                  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
                </svg>
                <span>01624607294</span>
              </a>
            </li>
            <li>
              <a href="mailto:info@acharkuthi.store" style={ROW}>
                <svg {...ICON}>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                <span style={{ overflowWrap: "anywhere" }}>info@acharkuthi.store</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="ft-acc">
        <div className="ft-brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand art */}
          <img src="/brand/logo-256.png" alt="Acharkuthi" />
          <div className="ak-aside">The taste of tradition.</div>
        </div>
        <div className="acc-list">
          <details>
            <summary>
              Shop
              <i className="ak-i i-plus" aria-hidden="true" />
            </summary>
            <ul>
              <li>
                <Link href={shopHref()}>All pickles</Link>
              </li>
              {shelves.map((s) => (
                <li key={s.slug}>
                  <Link href={shopHref(s.slug)}>{s.name}</Link>
                </li>
              ))}
            </ul>
          </details>
          <details>
            <summary>
              Acharkuthi
              <i className="ak-i i-plus" aria-hidden="true" />
            </summary>
            <ul>
              <li>
                <Link href="/our-story">Our story</Link>
              </li>
              <li>
                <Link href="/recipes">Recipes</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </ul>
          </details>
          <details open>
            <summary>
              Legal &amp; Support
              <i className="ak-i i-plus" aria-hidden="true" />
            </summary>
            <ul>
              <li>
                <Link href="/faq">FAQ</Link>
              </li>
              <li>
                <Link href="/shipping-policy">Shipping Policy</Link>
              </li>
              <li>
                <Link href="/return-refund-policy">Refund Policy</Link>
              </li>
              <li>
                <Link href="/privacy-policy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms-and-conditions">Terms of Use</Link>
              </li>
            </ul>
          </details>
          <details>
            <summary>
              Contact Us
              <i className="ak-i i-plus" aria-hidden="true" />
            </summary>
            <ul>
              <li>
                <span style={ROW}>
                  <svg {...ICON}>
                    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                  <span>529, Dhonia, Jatrabari, Dhaka</span>
                </span>
              </li>
              <li>
                <a href="tel:01624607294" style={ROW}>
                  <svg {...ICON}>
                    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
                  </svg>
                  <span>01624607294</span>
                </a>
              </li>
              <li>
                <a href="mailto:info@acharkuthi.store" style={ROW}>
                  <svg {...ICON}>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                  <span style={{ overflowWrap: "anywhere" }}>info@acharkuthi.store</span>
                </a>
              </li>
            </ul>
          </details>
        </div>
      </div>
      <div className="wrap ft-bot">
        <span>
          © {new Date().getFullYear()} Acharkuthi
          <span className="only-mob"> · Dhaka, Bangladesh</span>
        </span>
        <div className="ft-bot-r">
          {/* Privacy and Terms live in the "Legal & Support" column above; this row is social only. */}
          <nav className="ft-soc" aria-label="Social">
            <a href="https://www.facebook.com/acharkuthi" aria-label="Acharkuthi on Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10.5H8v3h2.6V21h2.9z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/acharkuthi_store"
              aria-label="Acharkuthi on Instagram"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href="https://wa.me/8801624607294" aria-label="Chat with Acharkuthi on WhatsApp">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              >
                <path d="M3.5 20.5l1.2-3.9A8.5 8.5 0 1 1 8 19.3l-4.5 1.2z" />
                <path d="M9.2 8.6c.2-.4.5-.4.7-.1l.8 1.4c.1.2.1.4-.1.6l-.5.5c.6 1.2 1.5 2.1 2.7 2.7l.5-.5c.2-.2.4-.2.6-.1l1.4.8c.3.2.3.5-.1.7-.5.5-1.2.8-2 .4-2.3-1.1-3.7-2.5-4.6-4.7-.2-.6 0-1.1.1-1.4z" />
              </svg>
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
