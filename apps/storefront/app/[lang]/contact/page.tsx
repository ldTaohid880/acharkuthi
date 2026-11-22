import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { Icon } from "@/components/icon";
import { getDict } from "@/lib/i18n/dict";
import { langOf, pageMeta } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang = await langOf(params);
  const [title, description] = getDict(lang).meta.contact;
  return pageMeta({
    title,
    description,
    path: "/contact",
    lang,
  });
}

const PHONE = "01624607294";
const EMAIL = "info@acharkuthi.store";
// Bangladesh country code + the number without its leading zero.
const WHATSAPP = `https://wa.me/880${PHONE.slice(1)}`;

const svg = { viewBox: "0 0 24 24", "aria-hidden": true } as const;
const FACEBOOK = "https://www.facebook.com/acharkuthi";
const INSTAGRAM = "https://www.instagram.com/acharkuthi_store";
const MESSENGER = "https://m.me/acharkuthi";

const mailIcon = (
  <svg {...svg} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
    <path d="M4.5 7l7.5 6 7.5-6" />
  </svg>
);
const messengerIcon = (
  <svg {...svg} fill="currentColor">
    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.13.71l1.98-.87c.17-.08.36-.09.53-.04.91.25 1.88.38 2.9.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6 7.46l-2.94 4.66c-.47.74-1.47.93-2.17.4l-2.34-1.75a.6.6 0 00-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.66c.47-.74 1.47-.93 2.17-.4l2.34 1.75a.6.6 0 00.72 0l3.16-2.4c.42-.32.97.18.69.63z" />
  </svg>
);
const fbIcon = (
  <svg {...svg} fill="currentColor">
    <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10.5H8v3h2.6V21h2.9z" />
  </svg>
);
const igIcon = (
  <svg {...svg} fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const IMG = "/images/contact";

/**
 * Contact (owner redesign, 2026-11-21, from the owner reference): photo header, a list of ways to
 * reach us (WhatsApp chat with no visible number, email, Messenger), the form, and a separate
 * "follow us" photo band for Facebook and Instagram. No map, no phone number, no help strip.
 */
export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = await langOf(params);
  const t = getDict(lang).contact;
  const ways = [
    { href: WHATSAPP, label: t.wa, note: t.chat, noteLang: lang, icon: <Icon name="chat" /> },
    { href: `mailto:${EMAIL}`, label: t.mail, note: EMAIL, noteLang: "en", icon: mailIcon },
    { href: MESSENGER, label: t.messenger, note: t.chat, noteLang: lang, icon: messengerIcon },
  ];
  return (
    <div className="page-contact">
      <main className="cx" lang={lang}>
        <section className="cx-hero" aria-labelledby="ct-h">
          <picture className="cx-bg">
            <source
              media="(max-width: 720px)"
              srcSet={`${IMG}/hero-mobile-720.webp 720w, ${IMG}/hero-mobile-1080.webp 1080w`}
              sizes="100vw"
            />
            <img
              src={`${IMG}/hero-1440.webp`}
              srcSet={`${IMG}/hero-1440.webp 1440w, ${IMG}/hero-2400.webp 2400w`}
              sizes="100vw"
              alt={t.heroAlt}
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <div className="wrap cx-hero-in">
            <span className="cx-eyebrow">{t.eyebrow}</span>
            <h1 className="cx-h1" id="ct-h">
              {t.title}
            </h1>
            <p className="cx-lede">{t.lede}</p>
          </div>
        </section>

        <section className="cx-main" aria-label={t.ways}>
          <div className="wrap ct-main">
            <div className="cx-ways">
              <h2 className="ct-h2 cx-rule">{t.ways}</h2>
              <ul>
                {ways.map((w) => (
                  <li key={w.href}>
                    <a
                      href={w.href}
                      {...(w.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}
                    >
                      <span className="cx-ic">{w.icon}</span>
                      <span>
                        <b>{w.label}</b>
                        <small lang={w.noteLang}>{w.note}</small>
                      </span>
                      <Icon name="arrow" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="cx-reply">
                <Icon name="leaf" />
                {t.reply}
              </p>
            </div>
            <ContactForm whatsapp={WHATSAPP} />
          </div>
        </section>

        <section className="cx-follow" aria-labelledby="follow-h">
          {/* eslint-disable-next-line @next/next/no-img-element -- static responsive WebP set */}
          <img
            className="cx-follow-img"
            src={`${IMG}/follow-1440.webp`}
            srcSet={`${IMG}/follow-800.webp 800w, ${IMG}/follow-1440.webp 1440w, ${IMG}/follow-2400.webp 2400w`}
            sizes="100vw"
            alt={t.followAlt}
            loading="lazy"
            decoding="async"
          />
          <div className="wrap cx-follow-in">
            <h2 className="cx-h2" id="follow-h">
              {t.follow}
            </h2>
            <p className="cx-follow-text">{t.followText}</p>
            <div className="cx-follow-btns">
              <a className="ak-btn cx-sbtn" href={FACEBOOK} target="_blank" rel="noopener">
                {fbIcon}
                {t.followFb}
              </a>
              <a className="ak-btn cx-sbtn" href={INSTAGRAM} target="_blank" rel="noopener">
                {igIcon}
                {t.followIg}
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
