import { adminRoleOf } from "@repo/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";
import { NoAccess } from "./no-access";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Admin sign-in (SignIn-Desktop / SignIn-Phone / SignIn-States). Bangla only: nobody has an
 * admin language yet before signing in. Signed-in customers or deactivated staff see "no access".
 */
export default async function LoginPage() {
  const session = await getSession();
  if (adminRoleOf(session)) redirect("/");

  return (
    <main className="max-tab:justify-start max-tab:gap-8 max-tab:bg-white max-tab:px-6 max-tab:pt-[72px] max-tab:pb-8 bg-subtle flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-12">
      {/* Desktop / tablet: brand row above the card. */}
      <div className="max-tab:hidden flex items-center gap-2.5">
        <Logo className="size-10 rounded-[10px] text-[22px]" />
        <div className="flex flex-col leading-[1.15]">
          <span className="text-lg font-semibold">আচারকুঠি</span>
          <span className="text-muted-foreground text-xs leading-4">অ্যাডমিন · Admin</span>
        </div>
      </div>

      {session ? (
        <NoAccess email={session.user.email} storefrontUrl={env.STOREFRONT_URL} />
      ) : (
        <>
          {/* Phone: logo and left-aligned title, no card. */}
          <div className="tab:hidden flex w-full flex-col items-start gap-5">
            <Logo className="size-12 rounded-xl text-[26px]" />
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">
                অ্যাডমিনে ঢুকুন
              </h1>
              <p className="text-muted-foreground">আচারকুঠি অ্যাডমিন · Sign in</p>
            </div>
          </div>
          <LoginForm />
        </>
      )}

      <span className="tab:hidden flex-auto" />
      <p className="text-muted-foreground max-w-[360px] text-center text-xs leading-4">
        শুধু মালিক ও আমন্ত্রিত স্টাফ ঢুকতে পারবেন। অ্যাক্সেস লাগলে মালিককে বলুন।
      </p>
    </main>
  );
}

function Logo({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`bg-primary inline-flex flex-none items-center justify-center font-[family-name:var(--font-anek)] leading-none font-bold text-white ${className}`}
    >
      আ
    </span>
  );
}
