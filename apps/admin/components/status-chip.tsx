import { cn } from "@repo/ui/lib/utils";
import type { StatusTone } from "@/lib/order-status";

/** admin.css .st-*: colour, dot and text label, always together. */
const TONE: Record<StatusTone, string> = {
  new: "bg-st-new-bg text-st-new-fg border-st-new-bd",
  conf: "bg-st-conf-bg text-st-conf-fg border-st-conf-bd",
  pack: "bg-st-pack-bg text-st-pack-fg border-st-pack-bd",
  book: "bg-st-book-bg text-st-book-fg border-st-book-bd",
  transit: "bg-st-transit-bg text-st-transit-fg border-st-transit-bd",
  deliv: "bg-st-deliv-bg text-st-deliv-fg border-st-deliv-bd",
  settled: "bg-st-settled-bg text-st-settled-fg border-st-settled-bd",
  cancel: "bg-st-cancel-bg text-st-cancel-fg border-st-cancel-bd",
  return: "bg-st-return-bg text-st-return-fg border-st-return-bd",
  partial: "bg-st-partial-bg text-st-partial-fg border-st-partial-bd",
};

export function StatusChip({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] flex-none items-center gap-1.5 rounded-sm border px-2 text-xs leading-4 font-medium whitespace-nowrap before:size-1.5 before:flex-none before:rounded-full before:bg-current",
        TONE[tone],
      )}
    >
      {label}
    </span>
  );
}
