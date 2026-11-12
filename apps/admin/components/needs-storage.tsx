/** admin.css .needs: marks a value or control that has no database storage yet. */
export function NeedsStorage({ label = "needs storage" }: { label?: string }) {
  return (
    <span className="inline-flex h-5 flex-none items-center gap-1 rounded-sm border border-dashed border-[#d97706] bg-[#fffbeb] px-1.5 text-[11px] leading-[14px] font-medium whitespace-nowrap text-[#92400e]">
      {label}
    </span>
  );
}
