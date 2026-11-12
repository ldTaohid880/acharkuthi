"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { btn } from "@/components/btn";

/** Orders-States "ত্রুটি". Bangla copy: the dictionary is server-only, and this boundary is a client file. */
export default function OrdersError({ reset }: { reset: () => void }) {
  return (
    <div className="tab:px-6 tab:pt-5 wide:px-8 wide:pt-6 p-4">
      <div className="border-border flex min-h-[340px] flex-col items-center justify-center gap-3 rounded-xl border bg-white p-6 text-center shadow-xs">
        <span className="bg-badge-danger-bg text-danger-text inline-flex size-11 items-center justify-center rounded-lg">
          <TriangleAlert className="size-5" aria-hidden />
        </span>
        <div className="text-base leading-6 font-semibold">অর্ডার লোড করা যায়নি</div>
        <p className="text-muted-foreground max-w-[280px] text-xs leading-4">
          ইন্টারনেট বা সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।
        </p>
        <button type="button" onClick={reset} className={btn({ size: "sm" })}>
          <RefreshCw aria-hidden />
          আবার চেষ্টা করুন
        </button>
      </div>
    </div>
  );
}
