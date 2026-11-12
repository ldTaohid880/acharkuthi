import { cn } from "@repo/ui/lib/utils";

/**
 * Page body padding from admin.css: desktop .page 24/32/48 gap 24, tablet .tab-shell .page
 * 20/24/32 gap 20, phone .p-body 16 gap 12.
 */
export function Page({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "tab:gap-5 tab:px-6 tab:pt-5 tab:pb-8 wide:gap-6 wide:px-8 wide:pt-6 wide:pb-12 flex w-full flex-col gap-3 p-4 [&>*]:flex-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Phone page header (admin.css .p-head / .p-title). Hidden from 768px, where the top bar shows. */
export function PhoneHeader({
  title,
  sub,
  start,
  end,
}: {
  title: string;
  sub?: string;
  start?: React.ReactNode;
  end?: React.ReactNode;
}) {
  return (
    <header className="border-border tab:hidden sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-white pr-2 pl-4">
      {start}
      <div className="flex min-w-0 flex-auto flex-col leading-[1.1]">
        <b className="text-lg leading-6 font-semibold">{title}</b>
        {sub ? (
          <span className="text-muted-foreground text-xs leading-4 font-normal">{sub}</span>
        ) : null}
      </div>
      {end}
    </header>
  );
}
