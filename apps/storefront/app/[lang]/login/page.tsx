import type { Metadata } from "next";
import { authNextPath } from "@repo/validators";
import { getDict } from "@/lib/i18n/dict";
import { langOf, pageMeta } from "@/lib/seo";
import { AuthView, type AuthMode } from "./auth-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang = await langOf(params);
  return pageMeta({ title: getDict(lang).auth.metaTitle, path: "/login", lang, noindex: true });
}

/**
 * Sign in, register and forgot password (Auth.dc.html, AuthMobile.dc.html, AccountStates.dc.html
 * A–C), plus the reset link's "নতুন পাসওয়ার্ড দিন" step (no board; owner-approved 2026-11-15).
 */
export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await langOf(params);
  const t = getDict(lang).auth;
  const sp = await searchParams;
  const rawNext = typeof sp.next === "string" ? sp.next : undefined;
  const next = authNextPath.safeParse(rawNext).data ?? null;
  const view = sp.view;
  // The reset email's link lands here with ?token=… (valid) or ?error=INVALID_TOKEN (expired/used).
  const resetToken = typeof sp.token === "string" && sp.token ? sp.token.slice(0, 200) : null;
  const resetLink = resetToken !== null || sp.error === "INVALID_TOKEN";
  const mode: AuthMode = resetLink
    ? "reset"
    : view === "register"
      ? "register"
      : view === "forgot"
        ? "forgot"
        : "login";

  return (
    <main className="au wrap2 pgap">
      <div className="stage2">
        {/* Owner, 2026-11-22: the panel is the Acharkuthi brand illustration (logo, tagline and
            garlic jar drawn in), filling the panel in place of the heading and jar drawing. */}
        <aside className="brandp photo only-desk">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand art */}
          <img
            src="/images/auth/login-800.webp"
            srcSet="/images/auth/login-800.webp 800w, /images/auth/login-1200.webp 1200w"
            sizes="(max-width: 1440px) 40vw, 580px"
            alt={t.brandTitle}
            width={1200}
            height={1490}
          />
        </aside>
        <section className="formp" aria-live="polite">
          <div className="card">
            <AuthView initialMode={mode} next={next} resetToken={resetToken} />
          </div>
        </section>
      </div>
    </main>
  );
}
