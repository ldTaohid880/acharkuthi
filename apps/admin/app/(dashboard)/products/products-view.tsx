"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn, formatTaka } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Ellipsis,
  Image as ImageIcon,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useState, useTransition } from "react";
import { setProductActive } from "@/app/actions/products";
import { btn } from "@/components/btn";
import { PhoneHeader } from "@/components/shell/page";
import { useToast } from "@/components/toast";
import { digits, fill } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import type { CategoryOption, ProductRow } from "@/lib/products";

type PT = Dict["products"];
type Status = "all" | "active" | "hidden";
const STATUSES: Status[] = ["all", "active", "hidden"];

const badgeCls =
  "inline-flex h-[22px] flex-none items-center rounded-sm border border-transparent px-2 text-xs leading-4 font-medium whitespace-nowrap";
const TONE = {
  ok: "bg-badge-ok-bg text-badge-ok-fg",
  warn: "bg-badge-warn-bg text-badge-warn-fg",
  danger: "bg-badge-danger-bg text-badge-danger-fg",
  secondary: "bg-muted text-foreground",
  outline: "border-border text-foreground bg-white",
} as const;

/**
 * পণ্য (Products-Desktop / -Tablet / -Phone). The list is small, so search and filters run in
 * the browser. "নতুন পণ্য" and "এডিট" open the product edit page (A8).
 */
export function ProductsView({
  rows,
  categories,
  t,
  lang,
}: {
  rows: ProductRow[];
  categories: CategoryOption[];
  t: PT;
  lang: AdminLang;
}) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>("all");
  const [sheet, setSheet] = useState(false);
  // Phone chips: one category, or "লুকানো" (owner board Products-Phone).
  const [chipCat, setChipCat] = useState<number | "hidden" | null>(null);
  const [, start] = useTransition();

  const matchQ = (r: ProductRow) => {
    const s = q.trim().toLowerCase();
    return !s || `${r.bn} ${r.en} ${r.searchTerms}`.toLowerCase().includes(s);
  };
  const filter = (c: number | null, st: Status) =>
    rows.filter(
      (r) =>
        matchQ(r) &&
        (c === null || r.categoryId === c) &&
        (st === "all" || (st === "active" ? r.active : !r.active)),
    );
  const shown = filter(cat, status);
  const phoneShown = rows.filter(
    (r) =>
      matchQ(r) &&
      (chipCat === null || (chipCat === "hidden" ? !r.active : r.categoryId === chipCat)),
  );
  const filterCount = (cat === null ? 0 : 1) + (status === "all" ? 0 : 1);

  const price = (r: ProductRow) =>
    r.minPrice === null
      ? "—"
      : r.minPrice === r.maxPrice || r.maxPrice === null
        ? formatTaka(r.minPrice)
        : `${formatTaka(r.minPrice)} – ${formatTaka(r.maxPrice)}`;

  const alert = (r: ProductRow, className?: string) => {
    if (!r.alert) return null;
    const [tone, text] =
      r.alert.kind === "out"
        ? (["danger", t.out] as const)
        : r.alert.kind === "sizesOut"
          ? (["danger", fill(t.sizesOut, { n: digits(r.alert.n, lang) })] as const)
          : (["warn", t.low] as const);
    return <span className={cn(badgeCls, TONE[tone], className)}>{text}</span>;
  };
  const state = (r: ProductRow) => (
    <span className={cn(badgeCls, r.active ? TONE.ok : TONE.secondary)}>
      {r.active ? t.active : t.hidden}
    </span>
  );
  // Placeholder icon underneath; a photo that fails to load (storefront down) just hides.
  const thumb = (r: ProductRow, size: string) => (
    <span
      aria-hidden
      className={cn(
        "border-border bg-muted relative inline-flex flex-none items-center justify-center overflow-hidden rounded-lg border text-[#a3a3a3]",
        size,
      )}
    >
      <ImageIcon className="size-5" />
      {r.image ? (
        // Storefront photo; next/image would need the storefront host in this app's config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.image}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          ref={(el) => {
            // Failed before hydration, so onError never ran.
            if (el?.complete && el.naturalWidth === 0) el.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
  const editHref = (r: ProductRow) => `/products/${r.id}` as Route;

  function toggle(r: ProductRow) {
    const next = !r.active;
    start(async () => {
      try {
        await setProductActive({ id: r.id, active: next });
        toast({
          tone: "ok",
          title: fill(next ? t.shownToast : t.hiddenToast, { name: r.bn }),
          action: {
            label: t.undo,
            onClick: () =>
              start(async () => void (await setProductActive({ id: r.id, active: !next }))),
          },
        });
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  const rowMenu = (r: ProductRow) => {
    const item = "h-8 gap-2 rounded-sm px-2 text-sm focus:bg-accent";
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t.more}
          className={btn({ variant: "ghost", size: "iconSm" })}
        >
          <Ellipsis aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 rounded-lg p-1 shadow-md">
          <DropdownMenuItem className={item} onSelect={() => toggle(r)}>
            {r.active ? t.hide : t.show}
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={item}>
            <a href={r.shopUrl} target="_blank" rel="noreferrer">
              {t.viewInShop}
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const searchBox = (large: boolean, placeholder: string, className?: string) => (
    <div
      className={cn(
        "border-input focus-within:border-primary flex min-w-0 items-center gap-2 rounded-md border bg-white px-3 shadow-xs focus-within:shadow-[0_0_0_3px_var(--ring)]",
        large ? "h-11 text-[15px]" : "h-9 text-sm",
        className,
      )}
    >
      <Search className="text-muted-foreground size-4 flex-none" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label={t.searchAria}
        placeholder={placeholder}
        className="placeholder:text-muted-foreground min-w-0 flex-auto bg-transparent outline-none"
      />
    </div>
  );

  const newButton = (size: "default" | "lg") => (
    <Link href={"/products/new" as Route} className={btn({ size })}>
      <Plus aria-hidden />
      {t.newProduct}
    </Link>
  );

  const header = (large: boolean) => (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
        <p className="text-muted-foreground text-[13px] leading-4">
          {fill(t.sub, { n: digits(rows.length, lang) })}
        </p>
      </div>
      {newButton(large ? "lg" : "default")}
    </div>
  );

  const th = "text-muted-foreground h-10 px-3 text-left text-[13px] font-medium whitespace-nowrap";
  const empty = <p className="text-muted-foreground p-6 text-center text-sm">{t.empty}</p>;
  const catName =
    cat === null
      ? t.allCategories
      : (categories.find((c) => c.id === cat)?.name ?? t.allCategories);

  return (
    <>
      {/* ───── Phone (<768): Products-Phone. Header, search and chips fixed; the list scrolls. ───── */}
      <div className="tab:hidden flex h-full flex-col">
        <PhoneHeader
          title={t.title}
          sub={fill(t.sub, { n: digits(rows.length, lang) })}
          end={
            <Link
              href={"/products/new" as Route}
              className={btn({ size: "lg", className: "px-3.5" })}
            >
              <Plus aria-hidden />
              {t.newShort}
            </Link>
          }
        />
        <div className="border-border flex flex-none flex-col gap-2.5 border-b bg-white px-4 py-3">
          {searchBox(true, t.searchPhShort)}
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {[
              { k: null as number | "hidden" | null, label: t.tabs.all },
              ...categories.map((c) => ({ k: c.id as number | "hidden" | null, label: c.name })),
              { k: "hidden" as const, label: t.hidden },
            ].map((c) => {
              const on = chipCat === c.k;
              return (
                <button
                  key={String(c.k)}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChipCat(c.k)}
                  className={cn(
                    "inline-flex h-9 flex-none items-center rounded-full border px-3 text-[13px] font-medium whitespace-nowrap",
                    on ? "bg-foreground border-foreground text-white" : "border-border bg-white",
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-4">
            {phoneShown.length === 0 ? (
              empty
            ) : (
              <div className="border-border overflow-hidden rounded-xl border bg-white">
                {phoneShown.map((r) => (
                  <Link
                    key={r.id}
                    href={editHref(r)}
                    className="border-border flex items-start gap-3 border-b px-4 py-3 last:border-b-0"
                  >
                    {thumb(r, "size-16")}
                    <span className="flex min-w-0 flex-auto flex-col gap-[3px]">
                      <span className="truncate font-medium">{r.bn}</span>
                      <span className="text-muted-foreground truncate text-xs leading-4">
                        {r.en}
                        {r.category ? ` · ${r.category}` : ""}
                      </span>
                      <span className="text-xs leading-4 tabular-nums">{price(r)}</span>
                      <span className="mt-0.5 flex flex-wrap gap-1.5">
                        {state(r)}
                        <span className={cn(badgeCls, TONE.outline, "tabular-nums")}>
                          {fill(t.stockN, { n: r.stock })}
                        </span>
                        {alert(r)}
                      </span>
                    </span>
                    <ChevronRight
                      className="text-muted-foreground mt-[22px] size-4 flex-none"
                      aria-hidden
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ───── Tablet 834 (768–1023): Products-Tablet ───── */}
      <div className="tab:flex desk:hidden hidden h-full min-h-0 flex-col">
        <div className="flex flex-none flex-col gap-4 px-6 pt-5 pb-4">
          {header(true)}
          <div className="flex gap-2">
            {searchBox(true, t.searchPh, "flex-auto")}
            <button
              type="button"
              onClick={() => setSheet(true)}
              aria-label={
                filterCount ? fill(t.filterAria, { n: digits(filterCount, lang) }) : undefined
              }
              className={btn({ variant: "outline", size: "lg" })}
            >
              <SlidersHorizontal aria-hidden />
              {t.filter}
              {filterCount ? (
                <span className="bg-primary inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold text-white">
                  {filterCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-auto flex-col px-6 pb-6">
          <ScrollArea className="border-border !min-h-0 !flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-[1] bg-white shadow-[inset_0_-1px_0_var(--border)]">
                <tr>
                  <th className={th}>{t.colProduct}</th>
                  <th className={cn(th, "text-right")}>{t.colPrice}</th>
                  <th className={cn(th, "text-right")}>{t.colStock}</th>
                  <th className={th}>{t.colState}</th>
                  <th className={cn(th, "w-px")} />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={r.id}
                    className="border-border h-[76px] border-b last:border-b-0 [&>td]:p-3"
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        {thumb(r, "size-14")}
                        <div className="min-w-0">
                          <Link href={editHref(r)} className="font-medium">
                            {r.bn}
                          </Link>
                          <div className="text-muted-foreground text-xs leading-4">
                            {r.en}
                            {r.category ? ` · ${r.category}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right tabular-nums">{price(r)}</td>
                    <td className="text-right">
                      <div className="font-medium tabular-nums">{r.stock}</div>
                      {alert(r, "mt-1")}
                    </td>
                    <td>{state(r)}</td>
                    <td className="w-px">
                      <Link href={editHref(r)} className={btn({ variant: "outline", size: "lg" })}>
                        {t.edit}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 ? empty : null}
          </ScrollArea>
        </div>
        <FilterSheet
          open={sheet}
          onOpenChange={setSheet}
          t={t}
          lang={lang}
          categories={categories}
          cat={cat}
          status={status}
          count={(c, st) => filter(c, st).length}
          apply={(c, st) => {
            setCat(c);
            setStatus(st);
            setSheet(false);
          }}
        />
      </div>

      {/* ───── Desktop (≥1024): Products-Desktop ───── */}
      <div className="desk:flex wide:px-8 wide:pt-6 wide:pb-6 hidden h-full min-h-0 flex-col gap-4 px-6 pt-5 pb-5">
        <div className="flex flex-none flex-col gap-4">
          {header(false)}
          <div className="flex flex-wrap items-center gap-2">
            {searchBox(false, t.searchPh, "w-80")}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t.categoryAria}
                className="border-input flex h-9 w-[200px] items-center justify-between gap-2 rounded-md border bg-white px-3 text-left text-sm shadow-xs"
              >
                <span className="truncate">{catName}</span>
                <ChevronDown className="text-muted-foreground size-4 flex-none" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px] rounded-lg p-1 shadow-md">
                {[{ id: null as number | null, name: t.allCategories }, ...categories].map((c) => (
                  <DropdownMenuItem
                    key={String(c.id)}
                    onSelect={() => setCat(c.id)}
                    className="focus:bg-accent h-8 gap-2 rounded-sm px-2 text-sm"
                  >
                    <Check
                      className={cn("size-4", cat === c.id ? "opacity-100" : "opacity-0")}
                      aria-hidden
                    />
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div
              role="tablist"
              className="bg-muted inline-flex h-[38px] items-center gap-0.5 rounded-[10px] p-[3px]"
            >
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={status === s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "inline-flex h-8 items-center rounded-[7px] px-3 text-sm font-medium whitespace-nowrap",
                    status === s ? "text-foreground bg-white shadow-xs" : "text-muted-foreground",
                  )}
                >
                  {t.tabs[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ScrollArea className="border-border !min-h-0 !flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
          <table className="wide:min-w-[880px] w-full border-collapse text-sm">
            <thead className="sticky top-0 z-[1] bg-white shadow-[inset_0_-1px_0_var(--border)]">
              <tr>
                <th className={th}>{t.colProduct}</th>
                <th className={th}>{t.colCategory}</th>
                <th className={cn(th, "text-right")}>{t.colPrice}</th>
                <th className={cn(th, "text-right")}>{t.colStock}</th>
                <th className={th}>{t.colSizes}</th>
                <th className={th}>{t.colState}</th>
                <th className={cn(th, "w-px")} />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr
                  key={r.id}
                  className="border-border hover:bg-subtle border-b last:border-b-0 [&>td]:px-3 [&>td]:py-2.5"
                >
                  <td>
                    <div className="flex items-center gap-3">
                      {thumb(r, "size-14")}
                      <div className="min-w-0">
                        <Link href={editHref(r)} className="font-medium">
                          {r.bn}
                        </Link>
                        <div className="text-muted-foreground text-xs leading-4">{r.en}</div>
                      </div>
                    </div>
                  </td>
                  <td>{r.category ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="text-right tabular-nums">{price(r)}</td>
                  <td className="text-right">
                    <div className="font-medium tabular-nums">{r.stock}</div>
                    {alert(r, "mt-1")}
                  </td>
                  <td className="text-muted-foreground">{r.sizes.join(", ") || "—"}</td>
                  <td>{state(r)}</td>
                  <td className="w-px">
                    <div className="flex items-center gap-1">
                      <Link href={editHref(r)} className={btn({ variant: "ghost", size: "xs" })}>
                        {t.edit}
                      </Link>
                      {rowMenu(r)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 ? empty : null}
        </ScrollArea>
      </div>
    </>
  );
}

/** Tablet "ফিল্টার": right-side sheet like the Orders filter (owner decision). */
function FilterSheet({
  open,
  onOpenChange,
  t,
  lang,
  categories,
  cat,
  status,
  count,
  apply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  t: PT;
  lang: AdminLang;
  categories: CategoryOption[];
  cat: number | null;
  status: Status;
  count: (c: number | null, s: Status) => number;
  apply: (c: number | null, s: Status) => void;
}) {
  const [c, setC] = useState(cat);
  const [s, setS] = useState(status);
  const chipCls = (on: boolean) =>
    cn(
      "inline-flex h-11 flex-none items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap",
      on ? "bg-foreground border-foreground text-white" : "border-border bg-white",
    );
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setC(cat);
          setS(status);
        }
        onOpenChange(v);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-[290px] flex-col bg-white shadow-lg outline-none"
        >
          <div className="border-border flex items-center justify-between border-b py-2 pr-2 pl-4">
            <Dialog.Title className="text-base leading-6 font-semibold">
              {t.filtersTitle}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t.close}
              className={btn({ variant: "ghost", size: "iconLg" })}
            >
              <X className="!size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <ScrollArea className="min-h-0 flex-auto">
            <div className="flex flex-col gap-5 px-4 py-3">
              <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
                <legend className="mb-2.5 text-sm font-medium">{t.status}</legend>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={s === k}
                      onClick={() => setS(k)}
                      className={chipCls(s === k)}
                    >
                      {t.tabs[k]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
                <legend className="mb-2.5 text-sm font-medium">{t.category}</legend>
                <div className="flex flex-wrap gap-2">
                  {[{ id: null as number | null, name: t.allCategories }, ...categories].map(
                    (k) => (
                      <button
                        key={String(k.id)}
                        type="button"
                        aria-pressed={c === k.id}
                        onClick={() => setC(k.id)}
                        className={chipCls(c === k.id)}
                      >
                        {k.name}
                      </button>
                    ),
                  )}
                </div>
              </fieldset>
            </div>
          </ScrollArea>
          <div className="border-border flex gap-2 border-t px-4 pt-3 pb-3">
            <button
              type="button"
              onClick={() => {
                setC(null);
                setS("all");
              }}
              className={btn({ variant: "outline", size: "lg" })}
            >
              {t.reset}
            </button>
            <button
              type="button"
              onClick={() => apply(c, s)}
              className={btn({ size: "lg", className: "flex-1" })}
            >
              {fill(t.showN, { n: digits(count(c, s), lang) })}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
