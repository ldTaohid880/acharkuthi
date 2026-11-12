"use client";

import { signOut } from "@repo/auth/client";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { btn } from "@/components/btn";

/** SignIn-States "অ্যাক্সেস নেই": signed in, but not owner/staff (or deactivated). */
export function NoAccess({ email, storefrontUrl }: { email: string; storefrontUrl: string }) {
  const router = useRouter();
  return (
    <section className="border-border w-full max-w-[400px] rounded-xl border bg-white shadow-xs">
      <div className="flex flex-col items-center gap-3.5 px-6 pt-8 pb-6 text-center">
        <span className="bg-muted inline-flex size-12 items-center justify-center rounded-full text-[#525252]">
          <Lock className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg leading-7 font-semibold">এই অ্যাকাউন্টের অ্যাক্সেস নেই</h1>
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">{email}</span> আচারকুঠি অ্যাডমিনে যুক্ত
            নেই, বা অ্যাকাউন্টটি বন্ধ করা হয়েছে।
          </p>
          <p className="text-muted-foreground text-xs leading-4">
            মালিককে বলুন আপনাকে স্টাফ হিসেবে আমন্ত্রণ পাঠাতে।
          </p>
        </div>
        <div className="mt-1 flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.refresh();
            }}
            className={btn({ variant: "outline", block: true, className: "h-10" })}
          >
            অন্য অ্যাকাউন্টে ঢুকুন
          </button>
          <a
            href={storefrontUrl}
            className={btn({
              variant: "ghost",
              size: "sm",
              block: true,
              className: "text-muted-foreground",
            })}
          >
            দোকানের সাইটে যান
          </a>
        </div>
      </div>
    </section>
  );
}
