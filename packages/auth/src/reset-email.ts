import nodemailer, { type Transporter } from "nodemailer";

/**
 * "পাসওয়ার্ড ভুলে গেছেন?" email (owner-approved wording, 2026-11-15), sent over the shop's
 * SMTP mailbox (Hostinger; SMTP_* / MAIL_FROM, validated by each app's env.js).
 *
 * Without SMTP settings outside production the link is printed to the server log instead, so the
 * flow can be tried locally. In production a missing mailbox is an error: the customer then sees
 * "লিংকটি পাঠানো যায়নি" rather than waiting for an email that never comes.
 */

/** How long a reset link works (also stated in the email and on the expired-link message). */
export const RESET_LINK_SECONDS = 60 * 60;

let transport: Transporter | null = null;

export function mailer() {
  const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = process.env;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT) || 465;
  transport ??= nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    // Don't let a slow mailbox hold the request open.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return { transport, from: process.env.MAIL_FROM || user };
}

export const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * The storefront asks for the reset from its page-language login page (`redirectTo` is "/login"
 * or "/en/login"), and Better Auth carries that in the link's `callbackURL`. English when it is
 * the English site's page; Bangla otherwise (the default site, and the admin app).
 */
export function resetEmailLang(url: string): "bn" | "en" {
  try {
    const cb = new URL(url).searchParams.get("callbackURL") ?? "";
    const path = cb.startsWith("http") ? new URL(cb).pathname : cb;
    return path === "/en" || path.startsWith("/en/") ? "en" : "bn";
  } catch {
    return "bn";
  }
}

const COPY = {
  // Owner-approved Bangla wording (2026-11-15).
  bn: {
    hello: (who: string) => `আসসালামু আলাইকুম ${who},`,
    guest: "গ্রাহক",
    body: "আপনার আচারকুঠি অ্যাকাউন্টের পাসওয়ার্ড বদলাতে নিচের লিংকে যান। লিংকটি ১ ঘণ্টা কাজ করবে।",
    button: "পাসওয়ার্ড বদলান",
    ignore: "আপনি অনুরোধ না করে থাকলে এই ইমেইলটি উপেক্ষা করুন, আপনার পাসওয়ার্ড বদলাবে না।",
    sign: "— আচারকুঠি",
    subject: "আচারকুঠি: পাসওয়ার্ড বদলানোর লিংক",
    font: "'Anek Bangla','Noto Sans Bengali',Arial,sans-serif",
  },
  // English site (phase 6); drafted by Claude for the owner to review.
  en: {
    hello: (who: string) => (who ? `Hello ${who},` : "Hello,"),
    guest: "",
    body: "To change the password for your Acharkuthi account, open the link below. The link works for 1 hour.",
    button: "Change password",
    ignore: "If you didn’t ask for this, you can ignore this email. Your password won’t change.",
    sign: "— Acharkuthi",
    subject: "Acharkuthi: your password reset link",
    font: "Arial,Helvetica,sans-serif",
  },
} as const;

export function resetEmail(name: string, url: string, lang: "bn" | "en" = resetEmailLang(url)) {
  const c = COPY[lang];
  const who = name.trim() || c.guest;
  const text = [c.hello(who), "", c.body, "", url, "", c.ignore, "", c.sign].join("\n");
  // Brand token values written out (email clients can't read CSS variables): --ink, --brand,
  // --on-brand, --ink-muted.
  const html = `<div lang="${lang}" style="font-family:${c.font};font-size:16px;line-height:1.6;color:#34392b;max-width:480px">
<p>${escape(c.hello(who))}</p>
<p>${c.body}</p>
<p><a href="${escape(url)}" style="display:inline-block;background:#2b4103;color:#e8e5d5;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600">${c.button}</a></p>
<p style="font-size:14px;color:#5e6848">${escape(c.ignore)}</p>
<p>${c.sign}</p>
</div>`;
  return { subject: c.subject, text, html };
}

export async function sendResetEmail(to: string, name: string, url: string): Promise<void> {
  const m = mailer();
  if (!m) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP is not configured");
    console.info(`[dev] password reset link for ${to}: ${url}`);
    return;
  }
  await m.transport.sendMail({ from: m.from, to, ...resetEmail(name, url) });
}
