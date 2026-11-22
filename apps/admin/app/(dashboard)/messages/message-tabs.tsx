import { cn } from "@repo/ui/lib/utils";
import type { Route } from "next";
import Link from "next/link";
import type { Dict } from "@/lib/i18n/dict";

type Section = "inbox" | "archive" | "subscribers";

/**
 * admin.css .utabs: ইনবক্স · আর্কাইভ · নিউজলেটার সাবস্ক্রাইবার (Messages-* and Subscribers-*
 * boards). The count beside a tab is primary when that tab is open, grey otherwise.
 */
export function MessageTabs({
  t,
  active,
  unread,
  subscribers,
  inboxHref = "/messages",
  archiveHref = "/messages?box=archive",
  tall,
  short,
  className,
}: {
  t: Dict["messages"];
  active: Section;
  unread: number;
  /** Shown beside the subscribers tab on the Subscribers boards only. */
  subscribers?: number | undefined;
  inboxHref?: string;
  archiveHref?: string;
  tall?: boolean | undefined;
  short?: boolean | undefined;
  className?: string | undefined;
}) {
  const tab = (on: boolean) =>
    cn(
      "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 text-sm font-medium whitespace-nowrap",
      tall ? "h-12" : "h-10",
      on ? "border-primary text-foreground" : "text-muted-foreground border-transparent",
    );
  const count = (n: number, on: boolean) => (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
        on ? "bg-primary text-white" : "bg-muted text-foreground",
      )}
    >
      {n}
    </span>
  );
  const items: { key: Section; href: string; label: string; n?: number | undefined }[] = [
    { key: "inbox", href: inboxHref, label: t.inbox, n: unread || undefined },
    { key: "archive", href: archiveHref, label: t.archive },
    {
      key: "subscribers",
      href: "/messages/subscribers",
      label: short ? t.subscribersShort : t.subscribers,
      n: short ? undefined : subscribers,
    },
  ];
  return (
    <nav
      aria-label={t.sectionsAria}
      className={cn(
        "border-border flex [scrollbar-width:none] gap-1 overflow-x-auto border-b",
        className,
      )}
    >
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href as Route}
          aria-current={active === i.key ? "page" : undefined}
          className={tab(active === i.key)}
        >
          {i.label}
          {i.n !== undefined ? count(i.n, active === i.key) : null}
        </Link>
      ))}
    </nav>
  );
}
