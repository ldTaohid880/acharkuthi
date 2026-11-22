"use client";

import { RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { syncCourier } from "@/app/actions/courier";
import { testSteadfast } from "@/app/actions/settings";
import { btn } from "@/components/btn";
import { useToast } from "@/components/toast";
import { digits, fill } from "@/lib/format";
import type { AdminLang } from "@repo/validators";

/**
 * Dashboard "কুরিয়ার স্ট্যাটাস সিঙ্ক": fetches Steadfast statuses for booked orders, and for the
 * owner refreshes the account balance too.
 */
export function DashSync({
  label,
  owner,
  lang,
  t,
}: {
  label: string;
  owner: boolean;
  lang: AdminLang;
  t: { sfKeys: string; sfKeysSub: string; toastSynced: string; saveFailed: string; saveFailedSub: string };
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      try {
        const r = await syncCourier({});
        if (!r.ok) {
          toast({ tone: "err", title: t.sfKeys, sub: t.sfKeysSub });
          return;
        }
        if (owner) await testSteadfast();
        toast({
          tone: "ok",
          title: fill(t.toastSynced, { n: digits(r.checked, lang), c: digits(r.changed, lang) }),
        });
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  return (
    <button
      type="button"
      disabled={pending}
      onClick={run}
      className={btn({
        variant: "outline",
        size: "lg",
        className: "wide:h-8 wide:px-3 wide:text-[13px] wide:gap-1.5",
      })}
    >
      <RefreshCw aria-hidden className={pending ? "animate-spin" : undefined} />
      {label}
    </button>
  );
}
