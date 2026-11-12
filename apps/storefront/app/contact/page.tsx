import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { Icon } from "@/components/icon";
import { soon } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to Acharkuthi on WhatsApp, by email, or send us a message.",
};

const PHONE = "01624607294";
const EMAIL = "info@acharkuthi.store";
// Bangladesh country code + the number without its leading zero.
const WHATSAPP = `https://wa.me/880${PHONE.slice(1)}`;

const svg = { viewBox: "0 0 24 24", "aria-hidden": true } as const;

// Owner override of the Contact board: no phone number on this page (spam), WhatsApp opens a chat.
const WAYS = [
  {
    href: WHATSAPP,
    label: "WhatsApp",
    bn: false,
    note: "চ্যাট শুরু করুন",
    noteBn: true,
    external: true,
    icon: <Icon name="chat" />,
  },
  {
    href: `mailto:${EMAIL}`,
    label: "ইমেইল",
    bn: true,
    note: EMAIL,
    noteBn: false,
    external: false,
    icon: (
      <svg {...svg} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
        <path d="M4.5 7l7.5 6 7.5-6" />
      </svg>
    ),
  },
  {
    href: "https://www.facebook.com/acharkuthi",
    label: "Facebook",
    bn: false,
    note: "/acharkuthi",
    noteBn: false,
    external: true,
    icon: (
      <svg {...svg} fill="currentColor">
        <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10.5H8v3h2.6V21h2.9z" />
      </svg>
    ),
  },
  {
    href: "https://www.instagram.com/acharkuthi_store",
    label: "Instagram",
    bn: false,
    note: "@acharkuthi_store",
    noteBn: false,
    external: true,
    icon: (
      <svg {...svg} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

const HELP = [
  ["/track", "আমার অর্ডার কোথায়?", "Track an order"],
  ["/shipping-policy", "ডেলিভারি ও পেমেন্ট", "Delivery and payment"],
  ["/faq", "পণ্য নিয়ে প্রশ্ন", "FAQs"],
  ["/return-refund-policy", "রিটার্ন ও রিফান্ড", "Returns and refunds"],
] as const;

export default function ContactPage() {
  return (
    <div className="page-contact">
      <main>
        <section className="intro" aria-labelledby="ct-h">
          <div className="wrap">
            <nav className="crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Contact</span>
            </nav>
            <div className="intro-in">
              <div>
                <span className="ak-eyebrow" lang="bn">
                  যোগাযোগ · Contact
                </span>
                <h1 className="h1-bn" id="ct-h" lang="bn">
                  কিছু <span className="ak-brush">বলার</span> আছে?
                </h1>
              </div>
              <div>
                <p className="lede-bn" lang="bn">
                  আমাদের সাথে কথা বলুন। আপনার প্রশ্ন, মতামত কিংবা পরামর্শ—সবই আমাদের কাছে
                  গুরুত্বপূর্ণ।
                </p>
                <span className="ak-hand-bn hn" lang="bn">
                  চিঠির মতো করেই লিখুন
                </span>
              </div>
            </div>
          </div>
          <div className="ak-deckle deck-b" aria-hidden="true" />
        </section>

        <section className="main" aria-label="Contact">
          <div className="wrap ct-main">
            <div className="ct-ways">
              <h2 className="ct-h2" lang="bn">
                অন্যভাবে যোগাযোগ
              </h2>
              <p className="ct-sub">Other ways to reach us</p>
              <ul>
                {WAYS.map((w) => (
                  <li key={w.href}>
                    <a href={w.href} {...(w.external ? { target: "_blank", rel: "noopener" } : {})}>
                      <span className="ct-ic">{w.icon}</span>
                      <span>
                        <b lang={w.bn ? "bn" : undefined}>{w.label}</b>
                        <small lang={w.noteBn ? "bn" : undefined}>{w.note}</small>
                      </span>
                      <Icon name="arrow" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <ContactForm whatsapp={WHATSAPP} />
          </div>
          <div className="wrap">
            <div className="ct-help">
              <div className="ct-help-h">
                <h2 className="ct-h2" lang="bn">
                  অন্য কিছু জানতে চান?
                </h2>
                <p className="ct-sub">Quick links to the right page</p>
              </div>
              <ul>
                {HELP.map(([href, bn, en]) => (
                  <li key={href}>
                    <Link href={soon(href)}>
                      <b lang="bn">{bn}</b>
                      <span>
                        {en}
                        <Icon name="arrow" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
