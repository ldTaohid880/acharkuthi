"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reorder } from "@/app/actions/account";
import { useCart } from "@/lib/cart-store";
import { useLang } from "@/lib/i18n/lang-context";

/**
 * t.reorder (owner decision): adds the order's items that are still on sale to the
 * basket at today's prices, then opens the basket. The basket and checkout re-price on the server.
 */
export function ReorderButton({ orderNumber }: { orderNumber: string }) {
  const add = useCart((s) => s.add);
  const router = useRouter();
  const { lang, t: all, href } = useLang();
  const t = all.account;
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        type="button"
        className="ak-btn ak-btn--line sm"
        lang={lang}
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          start(async () => {
            setFailed(false);
            const res = await reorder({ orderNumber }).catch(() => ({ status: "fail" as const }));
            if (res.status !== "ok") return setFailed(true);
            for (const l of res.lines) add(l);
            router.push(href("/basket"));
          })
        }
      >
        {t.reorder}
      </button>
      {failed && (
        // ErrorPatterns.dc.html §1, error level.
        <div className="alert" role="alert">
          <b lang={lang}>{t.actFail}</b>
          <span lang={lang}>{t.actFailText}</span>
        </div>
      )}
    </>
  );
}
