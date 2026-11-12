import { cn } from "@repo/ui/lib/utils";

/**
 * Centered "no access" / "not found" card. Desktop as States.dc.html (420px tall, h2, regular
 * text); below 1024px as States-Tablet.dc.html (24px padding, h3, small text, 44px buttons).
 */
export function StatusCard({
  mark,
  title,
  body,
  actions,
  foot,
}: {
  mark: React.ReactNode;
  title: string;
  body: string;
  actions: React.ReactNode;
  foot?: string;
}) {
  return (
    // Centered in the content area (owner request); phones leave room for the bottom nav.
    <div className="max-tab:min-h-[calc(100dvh-100px)] tab:p-6 flex min-h-full w-full items-center justify-center p-4">
      <section className="border-border desk:h-[420px] desk:gap-3.5 desk:p-8 flex w-full max-w-[420px] flex-col items-center justify-center gap-2.5 rounded-xl border bg-white p-6 text-center shadow-xs">
        {mark}
        <h1 className="desk:text-lg desk:leading-7 text-base leading-6 font-semibold">{title}</h1>
        <p className="text-muted-foreground desk:max-w-[340px] desk:text-sm desk:leading-5 text-xs leading-4">
          {body}
        </p>
        <div className={cn("flex items-center gap-2")}>{actions}</div>
        {foot ? (
          <span className="text-muted-foreground text-[11px] leading-[14px]">{foot}</span>
        ) : null}
      </section>
    </div>
  );
}
