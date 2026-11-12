"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import type { OrderTab } from "@repo/validators";
import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Package,
  PhoneCall,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { btn } from "@/components/btn";
import { fill } from "@/lib/format";
import type { OT } from "./orders-parts";

/**
 * Owner redesign (2026-11-13), replacing the boards' status tabs/chips: an attention board above
 * the Orders header. Only steps with orders show; the whole board hides when nothing needs a
 * look. One soft tone (olive), no sub-text.
 */
const CARDS: { tab: OrderTab; icon: LucideIcon }[] = [
  { tab: "new", icon: PhoneCall },
  { tab: "confirmed", icon: Package },
  { tab: "packed", icon: Truck },
  { tab: "problem", icon: CircleAlert },
];

export function AttentionBoard({
  counts,
  current,
  t,
  href,
  compact,
}: {
  /** Counts across all orders (not narrowed by search or filters). */
  counts: Record<OrderTab, number>;
  current: OrderTab | null;
  t: OT;
  href: (tab: OrderTab) => string;
  /** 2 columns (phone, 1194 list column) instead of one row. */
  compact?: boolean;
}) {
  const cards = CARDS.filter((c) => counts[c.tab] > 0);
  if (cards.length === 0) return null;
  return (
    <section
      aria-label={t.attn.title}
      className="bg-primary-soft tab:p-3.5 flex flex-col gap-2.5 rounded-xl p-3"
    >
      <h2 className="text-primary text-sm leading-5 font-semibold">{t.attn.title}</h2>
      <div
        className={cn(
          "grid grid-cols-2 gap-2",
          !compact && "tab:grid-cols-[repeat(var(--k),minmax(0,1fr))]",
        )}
        style={{ "--k": cards.length } as React.CSSProperties}
      >
        {cards.map(({ tab, icon: Icon }) => {
          const on = current === tab;
          return (
            <Link
              key={tab}
              href={href(tab) as Route}
              scroll={false}
              aria-current={on || undefined}
              className={cn(
                "flex min-h-14 min-w-0 items-center gap-2.5 rounded-lg border bg-white px-3 py-2 shadow-xs outline-none focus-visible:shadow-[0_0_0_3px_var(--ring)]",
                on ? "border-primary" : "border-border hover:border-[#d4d4d4]",
              )}
            >
              <Icon className="text-primary size-4 flex-none" aria-hidden />
              <span className="flex min-w-0 flex-auto flex-col">
                {/* Two columns are narrow: let the label wrap instead of cutting it off. */}
                <span
                  className={cn(
                    "text-muted-foreground text-xs leading-4",
                    compact ? "line-clamp-2" : "truncate",
                  )}
                >
                  {t.attn[tab as "new" | "confirmed" | "packed" | "problem"]}
                </span>
                <span className="tabular text-xl leading-7 font-semibold">{counts[tab]}</span>
              </span>
              {compact ? null : (
                <ChevronRight className="text-muted-foreground size-4 flex-none" aria-hidden />
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

const ALL: OrderTab[] = [
  "all",
  "new",
  "confirmed",
  "packed",
  "booked",
  "transit",
  "delivered",
  "problem",
  "cancelled",
];

/** "স্ট্যাটাস: সব 8 ▾": one dropdown with all 9 statuses and their counts. */
export function StatusMenu({
  counts,
  current,
  t,
  href,
  large,
  block,
}: {
  counts: Record<OrderTab, number>;
  /** null when several statuses are picked in the phone filter sheet. */
  current: OrderTab | null;
  t: OT;
  href: (tab: OrderTab) => string;
  large?: boolean;
  block?: boolean;
}) {
  const label = current ? t.tabs[current] : t.attn.several;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={btn({
          variant: "outline",
          size: large ? "lg" : "default",
          className: cn("justify-between", block && "w-full"),
        })}
      >
        <span className="truncate">
          {fill(t.statusIs, { v: label })}
          {current ? (
            <span className="tabular text-muted-foreground ml-1.5 font-normal">
              {counts[current]}
            </span>
          ) : null}
        </span>
        <ChevronDown className="text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60 rounded-lg p-1 shadow-md">
        {ALL.map((tab) => (
          <DropdownMenuItem
            key={tab}
            asChild
            className={cn(
              "focus:bg-accent gap-2 rounded-sm px-2 text-sm",
              large ? "h-11" : "h-8",
              current === tab && "font-medium",
            )}
          >
            <Link href={href(tab) as Route} scroll={false}>
              <Check
                className={cn("size-4", current === tab ? "text-primary" : "invisible")}
                aria-hidden
              />
              <span className="flex-auto">{t.tabs[tab]}</span>
              <span className="tabular text-muted-foreground text-xs">{counts[tab]}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
