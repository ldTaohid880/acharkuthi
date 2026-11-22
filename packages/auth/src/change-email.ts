import { escape, mailer } from "./reset-email";

/**
 * Admin "আমার অ্যাকাউন্ট" → email "বদলান" ("নতুন ইমেইলে যাচাইয়ের লিংক যাবে।"): Better Auth sends
 * this to the NEW address; the email only changes once the link is opened. Wording drafted by
 * Claude for the owner to review, Bangla first with an English line, like the admin itself.
 *
 * Without SMTP settings outside production the link is printed to the server log instead.
 */

/** How long the link works (Better Auth's emailVerification.expiresIn). */
export const CHANGE_EMAIL_LINK_SECONDS = 60 * 60;

export function changeEmailMessage(name: string, url: string) {
  const who = name.trim();
  const text = [
    who ? `আসসালামু আলাইকুম ${who},` : "আসসালামু আলাইকুম,",
    "",
    "আচারকুঠি অ্যাডমিনে আপনার ইমেইল এই ঠিকানায় বদলাতে নিচের লিংকে যান। লিংকটি ১ ঘণ্টা কাজ করবে।",
    "To make this your Acharkuthi admin email, open the link below. It works for 1 hour.",
    "",
    url,
    "",
    "আপনি অনুরোধ না করে থাকলে এই ইমেইলটি উপেক্ষা করুন, কিছুই বদলাবে না।",
    "",
    "— আচারকুঠি",
  ].join("\n");
  const html = `<div lang="bn" style="font-family:'Anek Bangla','Noto Sans Bengali',Arial,sans-serif;font-size:16px;line-height:1.6;color:#0a0a0a;max-width:480px">
<p>${escape(who ? `আসসালামু আলাইকুম ${who},` : "আসসালামু আলাইকুম,")}</p>
<p>আচারকুঠি অ্যাডমিনে আপনার ইমেইল এই ঠিকানায় বদলাতে নিচের লিংকে যান। লিংকটি ১ ঘণ্টা কাজ করবে।<br><span lang="en" style="font-size:14px;color:#737373">To make this your Acharkuthi admin email, open the link below. It works for 1 hour.</span></p>
<p><a href="${escape(url)}" style="display:inline-block;background:#3d4a12;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">ইমেইল যাচাই করুন · Verify email</a></p>
<p style="font-size:14px;color:#737373">আপনি অনুরোধ না করে থাকলে এই ইমেইলটি উপেক্ষা করুন, কিছুই বদলাবে না।</p>
<p>— আচারকুঠি</p>
</div>`;
  return { subject: "আচারকুঠি অ্যাডমিন: নতুন ইমেইল যাচাই করুন", text, html };
}

export async function sendChangeEmail(to: string, name: string, url: string): Promise<void> {
  const m = mailer();
  if (!m) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP is not configured");
    console.info(`[dev] change-email link for ${to}: ${url}`);
    return;
  }
  await m.transport.sendMail({ from: m.from, to, ...changeEmailMessage(name, url) });
}
