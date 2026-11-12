import type { Metadata } from "next";
import { authNextPath } from "@repo/validators";
import { AuthView, type AuthMode } from "./auth-view";

export const metadata: Metadata = { title: "সাইন ইন", robots: { index: false } };

/** Sign in, register and forgot password (Auth.dc.html, AuthMobile.dc.html, AccountStates.dc.html A–C). */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawNext = typeof sp.next === "string" ? sp.next : undefined;
  const next = authNextPath.safeParse(rawNext).data ?? null;
  const view = sp.view;
  const mode: AuthMode = view === "register" ? "register" : view === "forgot" ? "forgot" : "login";

  return (
    <main className="au wrap2 pgap">
      <div className="stage2">
        <aside className="brandp only-desk">
          <div>
            <h2 lang="bn">ঘরের স্বাদ, আপনার নিজের ঠিকানায়</h2>
            <span className="ak-hand-bn hn" lang="bn">
              মা-খালাদের হাতের রেসিপি
            </span>
          </div>
          <div className="jarw" aria-hidden="true">
            <div className="ak-blot v2 sunb" />
            {/* eslint-disable-next-line @next/next/no-img-element -- local SVG still-life */}
            <img src="/jar.svg" alt="" />
          </div>
        </aside>
        <section className="formp" aria-live="polite">
          <div className="card">
            <AuthView initialMode={mode} next={next} />
          </div>
        </section>
      </div>
    </main>
  );
}
