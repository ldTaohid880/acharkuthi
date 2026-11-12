"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reorder } from "@/app/actions/account";
import { useCart } from "@/lib/cart-store";

/**
 * "আবার অর্ডার করুন" (owner decision): adds the order's items that are still on sale to the
 * basket at today's prices, then opens the basket. The basket and checkout re-price on the server.
 */
export function ReorderButton({ orderNumber }: { orderNumber: string }) {
  const add = useCart((s) => s.add);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        type="button"
        className="ak-btn ak-btn--line sm"
        lang="bn"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          start(async () => {
            setFailed(false);
            const res = await reorder({ orderNumber }).catch(() => ({ status: "fail" as const }));
            if (res.status !== "ok") return setFailed(true);
            for (const l of res.lines) add(l);
            router.push("/basket");
          })
        }
      >
        আবার অর্ডার করুন
      </button>
      {failed && (
        // ErrorPatterns.dc.html §1, error level.
        <div className="alert" role="alert">
          <b lang="bn">কাজটি সম্পন্ন করা যায়নি</b>
          <span lang="bn">আপনার দেওয়া তথ্য রয়ে গেছে। আবার চেষ্টা করুন।</span>
        </div>
      )}
    </>
  );
}
