"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import { ArrowRight, ChevronLeft, ChevronRight, Image as ImageIcon, Search, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { adminSearch, type SearchResults } from "@/app/actions/search";
import { countOf } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import { StatusChip } from "../status-chip";
import { navFor, type NavKey } from "./nav-model";
import { useBreakpoint, useShell } from "./shell-context";

/** Keyboard shortcuts drawn in the "পেজে যান" group (G then S / O). */
const SHORTCUTS: Partial<Record<NavKey, string>> = { stock: "G S", orders: "G O" };

interface PageHit {
  key: NavKey;
  label: string;
  href: string;
  kbd?: string | undefined;
}

type Hit =
  | { type: "order"; href: string; o: SearchResults["orders"][number] }
  | { type: "customer"; href: string; c: SearchResults["customers"][number] }
  | { type: "product"; href: string; p: SearchResults["products"][number] }
  | { type: "page"; href: string; g: PageHit };

const EMPTY: SearchResults = { orders: [], customers: [], products: [] };

/**
 * ⌘K search. Desktop: centered 640px palette (Search-Desktop). Tablet: wide sheet from the top
 * (Search-Tablet). Phone: full screen with a back button (Search-Phone).
 */
export function SearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t, lang, role } = useShell();
  const bp = useBreakpoint();
  const router = useRouter();
  const [q, setQ] = useState("");
  // Results with the query they answer; the palette is mounted fresh each time it opens.
  const [found, setFound] = useState<{ q: string; r: SearchResults }>({ q: "", r: EMPTY });
  const [activeRaw, setActive] = useState(0);
  const seq = useRef(0);
  const query = q.trim();
  const res = query && found.q === query ? found.r : EMPTY;

  useEffect(() => {
    if (!query) return;
    const id = ++seq.current;
    const timer = setTimeout(() => {
      adminSearch({ q: query })
        .then((r) => {
          if (id === seq.current) setFound({ q: query, r });
        })
        .catch(() => {
          if (id === seq.current) setFound({ q: query, r: EMPTY });
        });
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  function onQuery(v: string) {
    setQ(v);
    setActive(0);
  }

  // "পেজে যান": menu pages whose name matches; when none match, the two quick links.
  const pages = useMemo<PageHit[]>(() => {
    const all = navFor(role).flatMap((g) => g.items);
    const needle = q.trim().toLowerCase();
    const label = (k: NavKey) => t.nav.items[k];
    const matched = needle
      ? all.filter((i) => label(i.key).toLowerCase().includes(needle) || i.key.includes(needle))
      : [];
    if (matched.length > 0)
      return matched.map((i) => ({
        key: i.key,
        label: label(i.key),
        href: i.href,
        kbd: SHORTCUTS[i.key],
      }));
    return [
      { key: "stock", label: t.search.stockUpdate, href: "/stock", kbd: SHORTCUTS.stock },
      { key: "orders", label: t.search.orderList, href: "/orders", kbd: SHORTCUTS.orders },
    ];
  }, [q, role, t]);

  const hits: Hit[] = useMemo(
    () => [
      ...res.orders.map((o) => ({ type: "order" as const, href: `/orders/${o.id}`, o })),
      ...res.customers.map((c) => ({ type: "customer" as const, href: `/customers/${c.id}`, c })),
      ...res.products.map((p) => ({ type: "product" as const, href: `/products/${p.id}`, p })),
      ...pages.map((g) => ({ type: "page" as const, href: g.href, g })),
    ],
    [res, pages],
  );

  const active = Math.max(0, Math.min(activeRaw, hits.length - 1));

  function go(h: Hit | undefined) {
    if (!h) return;
    onOpenChange(false);
    router.push(h.href as Route);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(active + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(active - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[active]);
    }
  }

  const nothing =
    !!query &&
    found.q === query &&
    res.orders.length + res.customers.length + res.products.length === 0;
  const numeric = /^[\d+\-\sAKak-]+$/.test(query);
  const props = { t, hits, active, setActive, go, nothing, lang, role };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {bp !== "phone" ? <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" /> : null}
        <Dialog.Content
          aria-describedby={undefined}
          onKeyDown={onKeyDown}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden bg-white outline-none",
            bp === "desk" &&
              "border-border top-[88px] left-1/2 w-[640px] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-lg border shadow-lg",
            bp === "tab" &&
              "top-4 right-6 left-6 max-h-[min(820px,calc(100dvh-32px))] rounded-2xl shadow-lg",
            bp === "phone" && "inset-0",
          )}
        >
          <Dialog.Title className="sr-only">{t.search.label}</Dialog.Title>
          {bp === "desk" ? (
            <div className="border-border flex h-12 flex-none items-center gap-2.5 border-b px-3.5">
              <Search className="text-muted-foreground size-4" aria-hidden />
              <input
                autoFocus
                aria-label={t.search.label}
                value={q}
                onChange={(e) => onQuery(e.target.value)}
                className={cn(
                  "min-w-0 flex-auto border-0 bg-transparent text-[15px] outline-none",
                  numeric && "tabular font-mono",
                )}
              />
              <Kbd>Esc</Kbd>
            </div>
          ) : bp === "tab" ? (
            <div className="border-border flex flex-none items-center gap-2 border-b p-3">
              <div className="border-primary flex h-12 min-w-0 flex-auto items-center gap-2 rounded-md border bg-white px-3 shadow-[0_0_0_3px_var(--ring)]">
                <Search className="text-muted-foreground size-5" aria-hidden />
                <SearchInput q={q} setQ={onQuery} t={t} numeric={numeric} size={16} />
              </div>
              <Dialog.Close className="hover:bg-accent h-11 flex-none rounded-md px-5 text-[15px] font-medium">
                {t.search.cancel}
              </Dialog.Close>
            </div>
          ) : (
            <header className="border-border flex h-14 flex-none items-center gap-1 border-b bg-white pr-2 pl-1">
              <Dialog.Close
                aria-label={t.search.back}
                className="hover:bg-accent inline-flex size-11 flex-none items-center justify-center rounded-md"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </Dialog.Close>
              <div className="border-input flex h-11 min-w-0 flex-auto items-center gap-2 rounded-md border bg-white px-3 shadow-xs">
                <Search className="text-muted-foreground size-4" aria-hidden />
                <SearchInput q={q} setQ={onQuery} t={t} numeric={numeric} size={15} short />
              </div>
            </header>
          )}

          {bp === "tab" ? (
            <TabletResults {...props} />
          ) : (
            <CompactResults {...props} phone={bp === "phone"} />
          )}

          {bp === "desk" ? (
            <div className="border-border text-muted-foreground bg-subtle flex flex-none items-center gap-3.5 border-t px-3.5 py-2.5 text-xs leading-4">
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                {t.search.pick}
              </span>
              <span className="flex items-center gap-1">
                <Kbd>Enter</Kbd>
                {t.search.open}
              </span>
              <span className="flex-auto" />
              <span>{t.search.hint}</span>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SearchInput({
  q,
  setQ,
  t,
  numeric,
  size,
  short,
}: {
  q: string;
  setQ: (v: string) => void;
  t: Dict;
  numeric: boolean;
  size: number;
  short?: boolean;
}) {
  return (
    <>
      <input
        autoFocus
        inputMode="search"
        aria-label={t.search.label}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ fontSize: size }}
        className={cn(
          "min-w-0 flex-auto border-0 bg-transparent outline-none",
          numeric && "tabular font-mono",
        )}
      />
      {q ? (
        <button
          type="button"
          onClick={() => setQ("")}
          aria-label={short ? t.search.clearShort : t.search.clear}
          className="hover:bg-accent inline-flex size-8 flex-none items-center justify-center rounded-md"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-border bg-muted text-muted-foreground inline-flex h-5 items-center rounded-[4px] border px-1.5 font-mono text-[11px]">
      {children}
    </span>
  );
}

interface ResultProps {
  t: Dict;
  hits: Hit[];
  active: number;
  setActive: (i: number) => void;
  go: (h: Hit) => void;
  nothing: boolean;
  lang: "bn" | "en";
  role: "owner" | "staff";
}

function groupsOf(hits: Hit[]) {
  const order: Hit["type"][] = ["order", "customer", "product", "page"];
  return order
    .map((type) => ({
      type,
      items: hits.map((h, i) => ({ h, i })).filter((x) => x.h.type === type),
    }))
    .filter((g) => g.items.length > 0);
}

function groupLabel(type: Hit["type"], t: Dict) {
  return type === "order"
    ? t.search.orders
    : type === "customer"
      ? t.search.customers
      : type === "product"
        ? t.search.products
        : t.search.pages;
}

/** Desktop palette rows and phone rows (Search-Desktop / Search-Phone). */
function CompactResults({
  t,
  hits,
  active,
  setActive,
  go,
  nothing,
  phone,
}: ResultProps & { phone: boolean }) {
  return (
    <ScrollArea
      className={cn("min-h-0", phone && "flex-auto")}
      viewportClassName={phone ? "" : "max-h-[460px]"}
    >
      <div className={phone ? "px-2 pt-1 pb-6" : "px-1.5 pt-1 pb-2"}>
        {nothing ? (
          <p className="text-muted-foreground px-2.5 py-3 text-sm">{t.search.none}</p>
        ) : null}
        {groupsOf(hits).map((g) => (
          <div key={g.type} role="group" aria-label={groupLabel(g.type, t)}>
            <div className="text-muted-foreground px-2.5 pt-2 pb-1 text-xs font-medium">
              {groupLabel(g.type, t)}
              {g.type === "product" ? (
                <span className="font-normal"> · {t.search.ownerOnly}</span>
              ) : null}
            </div>
            {g.items.map(({ h, i }) => (
              <button
                key={`${h.type}-${h.href}`}
                type="button"
                onMouseMove={() => setActive(i)}
                onClick={() => go(h)}
                aria-current={i === active || undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm",
                  phone ? "min-h-12" : "min-h-10",
                  i === active && "bg-accent",
                )}
              >
                <CompactRow h={h} phone={phone} t={t} />
              </button>
            ))}
          </div>
        ))}
        {phone ? (
          <p className="text-muted-foreground px-2.5 py-4 text-xs leading-4">
            {t.search.phoneHint}
          </p>
        ) : null}
      </div>
    </ScrollArea>
  );
}

function CompactRow({ h, phone, t }: { h: Hit; phone: boolean; t: Dict }) {
  switch (h.type) {
    case "order":
      return (
        <>
          <span className="tabular w-[76px] flex-none font-mono text-xs font-medium">
            {h.o.number}
          </span>
          <span className="min-w-0 flex-auto truncate">
            {h.o.name}{" "}
            <span className="tabular text-muted-foreground font-mono text-xs">· {h.o.phone}</span>
          </span>
          <StatusChip tone={h.o.tone} label={h.o.status} />
          {!phone ? (
            <span className="tabular w-14 flex-none text-right text-xs">{h.o.total}</span>
          ) : null}
        </>
      );
    case "customer":
      return (
        <>
          <span className="inline-flex size-6 flex-none items-center justify-center rounded-full bg-[#e5e5e5] text-[10px] font-semibold text-[#404040]">
            {h.c.initials}
          </span>
          <span className="min-w-0 flex-auto truncate">
            {h.c.name} <span className="text-muted-foreground text-xs">· {h.c.email}</span>
          </span>
          {!phone ? (
            <>
              <span className="tabular text-muted-foreground font-mono text-xs">{h.c.phone}</span>
              <span className="text-muted-foreground text-xs">{h.c.orders}</span>
            </>
          ) : null}
        </>
      );
    case "product":
      return (
        <>
          <Thumb src={h.p.image} />
          <span className="min-w-0 flex-auto truncate">
            {h.p.bn} <span className="text-muted-foreground text-xs">· {h.p.en}</span>
          </span>
          {!phone ? <span className="text-muted-foreground text-xs">{h.p.sizes}</span> : null}
        </>
      );
    case "page":
      return (
        <>
          <ChevronRight className="text-muted-foreground size-4" aria-hidden />
          <span className="min-w-0 flex-auto">{h.g.label}</span>
          {!phone && h.g.kbd ? <Kbd>{h.g.kbd}</Kbd> : null}
          <span className="sr-only">{t.search.open}</span>
        </>
      );
  }
}

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="border-border bg-muted inline-flex size-7 flex-none items-center justify-center overflow-hidden rounded-md border text-[#a3a3a3]">
      {/* eslint-disable-next-line @next/next/no-img-element -- storefront-hosted product photo */}
      {src ? <img src={src} alt="" className="size-full object-cover" /> : null}
    </span>
  );
}

/** Tablet sheet rows (Search-Tablet): 60px rows, group counts, chevrons. */
function TabletResults({ t, hits, active, setActive, go, nothing, lang }: ResultProps) {
  const count = (type: Hit["type"], n: number) =>
    type === "customer"
      ? countOf(n, lang, " জন", ["person", "people"])
      : type === "page"
        ? ""
        : countOf(n, lang, "টি", ["", ""]).trim();
  return (
    <ScrollArea className="min-h-0" viewportClassName="max-h-[calc(min(820px,100dvh-32px)-73px)]">
      <div className="pb-2">
        {nothing ? (
          <p className="text-muted-foreground px-4 py-4 text-sm">{t.search.none}</p>
        ) : null}
        {groupsOf(hits).map((g) => (
          <div key={g.type} role="group" aria-label={groupLabel(g.type, t)}>
            <div className="text-muted-foreground flex items-center justify-between px-4 pt-3.5 pb-1.5 text-xs font-semibold tracking-[.02em]">
              <span>
                {groupLabel(g.type, t)}
                {g.type === "product" ? ` · ${t.search.ownerOnly}` : ""}
              </span>
              <span>{count(g.type, g.items.length)}</span>
            </div>
            {g.items.map(({ h, i }) => (
              <button
                key={`${h.type}-${h.href}`}
                type="button"
                onMouseMove={() => setActive(i)}
                onClick={() => go(h)}
                className={cn(
                  "border-border flex min-h-[60px] w-full items-center gap-3 border-t px-4 py-2 text-left",
                  i === active && "bg-primary-soft shadow-[inset_3px_0_0_var(--primary)]",
                )}
              >
                <TabletRow h={h} />
                <ChevronRight className="text-muted-foreground size-4 flex-none" aria-hidden />
              </button>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function TabletRow({ h }: { h: Hit }) {
  const icon =
    "bg-muted inline-flex size-10 flex-none items-center justify-center rounded-lg text-[#525252]";
  switch (h.type) {
    case "order":
      return (
        <>
          <span className="flex min-w-0 flex-auto flex-col gap-0.5">
            <span className="flex items-center gap-2">
              <span className="tabular font-mono text-sm font-medium">{h.o.number}</span>
              <StatusChip tone={h.o.tone} label={h.o.status} />
            </span>
            <span className="text-muted-foreground truncate text-xs">
              {h.o.name} · <span className="tabular font-mono">{h.o.phone}</span>
            </span>
          </span>
          <span className="tabular font-medium">{h.o.total}</span>
        </>
      );
    case "customer":
      return (
        <>
          <span className="inline-flex size-10 flex-none items-center justify-center rounded-full bg-[#e5e5e5] text-sm font-semibold text-[#404040]">
            {h.c.initials}
          </span>
          <span className="flex min-w-0 flex-auto flex-col gap-0.5">
            <span className="font-medium">{h.c.name}</span>
            <span className="text-muted-foreground truncate text-xs">
              <span className="tabular font-mono">{h.c.phone}</span> · {h.c.email}
            </span>
          </span>
          <span className="text-muted-foreground text-xs">{h.c.orders}</span>
        </>
      );
    case "product":
      return (
        <>
          <span className={cn(icon, "overflow-hidden")}>
            {h.p.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- storefront-hosted product photo
              <img src={h.p.image} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-4" aria-hidden />
            )}
          </span>
          <span className="flex min-w-0 flex-auto flex-col gap-0.5">
            <span className="font-medium">{h.p.bn}</span>
            <span className="text-muted-foreground truncate text-xs">
              {h.p.en} · {h.p.sizes}
            </span>
          </span>
        </>
      );
    case "page":
      return (
        <>
          <span className={icon}>
            <ArrowRight className="size-4" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-auto flex-col gap-0.5">
            <span className="font-medium">{h.g.label}</span>
          </span>
        </>
      );
  }
}
