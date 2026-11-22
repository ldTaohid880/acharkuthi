"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components/resizable";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import {
  REVIEW_KINDS,
  REVIEW_STATUSES,
  type AdminLang,
  type ReviewListQuery,
} from "@repo/validators";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  EyeOff,
  ListFilter,
  MessageSquare,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import Link from "next/link";
import { useState, useTransition } from "react";
import { approveReview, deleteReview, hideReview, saveReviewReply } from "@/app/actions/reviews";
import { btn } from "@/components/btn";
import { useToast } from "@/components/toast";
import { digits, fill, orderDate } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import { initialsOf } from "@/lib/initials";
import type { ReviewCounts, ReviewRow } from "@/lib/reviews";
import { chip } from "../orders/orders-parts";

type RT = Dict["reviews"];
type Patch = Partial<Record<keyof ReviewListQuery, string | number | undefined>>;

interface Props {
  lang: AdminLang;
  t: RT;
  query: ReviewListQuery;
  counts: ReviewCounts;
  rows: ReviewRow[];
  selected: ReviewRow | null;
  products: { id: number; name: string }[];
}

const BADGE = {
  ok: "bg-badge-ok-bg text-badge-ok-fg border-transparent",
  warn: "bg-badge-warn-bg text-badge-warn-fg border-transparent",
  outline: "border-border text-foreground bg-white",
  secondary: "bg-muted text-foreground border-transparent",
} as const;

function Badge({
  tone,
  small,
  children,
}: {
  tone: keyof typeof BADGE;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center rounded-sm border px-2 font-medium whitespace-nowrap",
        small ? "h-[18px] text-[11px] leading-[14px]" : "h-[22px] text-xs leading-4",
        BADGE[tone],
      )}
    >
      {children}
    </span>
  );
}

/** admin.css .stars: grey, filled amber up to the rating. */
function Stars({ n, size = 14, t, lang }: { n: number; size?: number; t: RT; lang: AdminLang }) {
  return (
    <span
      role="img"
      aria-label={fill(t.stars, { n: digits(n, lang) })}
      className="inline-flex flex-none gap-0.5 text-[#d4d4d4]"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          style={{ width: size, height: size }}
          className={cn("fill-current stroke-none", i <= n && "text-[#f59e0b]")}
        />
      ))}
    </span>
  );
}

function Avatar({ name, large }: { name: string; large?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full bg-[#e5e5e5] font-semibold text-[#404040]",
        large ? "size-10 text-sm" : "size-8 text-xs",
      )}
    >
      {initialsOf(name || "?")}
    </span>
  );
}

/** admin.css .tabs / .tab (segmented control). */
function Tabs({
  items,
  label,
  block,
}: {
  items: { key: string; label: string; count?: number; on: boolean; onClick: () => void }[];
  label?: string;
  block?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "bg-muted inline-flex h-[38px] max-w-full items-center gap-0.5 overflow-x-auto rounded-[10px] p-[3px]",
        block && "flex w-full",
      )}
    >
      {items.map((i) => (
        <button
          key={i.key}
          type="button"
          role="tab"
          aria-selected={i.on}
          onClick={i.onClick}
          className={cn(
            "inline-flex h-8 items-center justify-center gap-1.5 rounded-[7px] px-3 text-sm font-medium whitespace-nowrap",
            block && "flex-1 basis-0",
            i.on ? "text-foreground bg-white shadow-xs" : "text-muted-foreground",
          )}
        >
          {i.label}
          {i.count !== undefined ? <Count n={i.count} on={i.on} /> : null}
        </button>
      ))}
    </div>
  );
}

function Count({ n, on, dark }: { n: number; on: boolean; dark?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
        dark
          ? on
            ? "text-foreground bg-white"
            : "bg-[#f0f0f0]"
          : on
            ? "bg-primary text-white"
            : "bg-[#e5e5e5]",
      )}
    >
      {n}
    </span>
  );
}

export function ReviewsView(p: Props) {
  const { lang, t, query: q, counts, rows, selected } = p;
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [previewOpen, setPreviewOpen] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [deleting, setDeleting] = useState<ReviewRow | null>(null);

  function urlWith(patch: Patch): string {
    const cur: Patch = {
      status: q.status === "pending" ? undefined : q.status,
      kind: q.kind === "all" ? undefined : q.kind,
      product: q.product,
      rating: q.rating,
      sel: q.sel,
    };
    const next: Patch = { ...cur, n: undefined, ...patch };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next))
      if (v !== undefined && v !== "") sp.set(k, String(v));
    const s = sp.toString();
    return s ? `${pathname}?${s}` : pathname;
  }
  const go = (patch: Patch) => router.replace(urlWith(patch) as Route, { scroll: false });
  const pick = (r: ReviewRow) => {
    setPreviewOpen(true);
    go({ sel: r.key, n: q.n === 20 ? undefined : q.n });
  };

  const total = q.status === "approved" ? counts.approved : counts.pending;
  const n = (x: number) => digits(x, lang);

  const run = (fn: () => Promise<void>, ok: string) =>
    start(async () => {
      try {
        await fn();
        toast({ tone: "ok", title: ok });
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  const approve = (r: ReviewRow) => run(() => approveReview({ key: r.key }), t.approved);
  /** "লুকান": approved → back to pending; pending → delete after a confirm (owner decision). */
  const hide = (r: ReviewRow) =>
    r.approved ? run(() => hideReview({ key: r.key }), t.hidden) : setDeleting(r);

  const statusTabs = (block = false) => (
    <Tabs
      block={block}
      items={REVIEW_STATUSES.map((s) => ({
        key: s,
        label: t.status[s],
        count: counts[s],
        on: q.status === s,
        onClick: () => go({ status: s === "pending" ? undefined : s, sel: undefined }),
      }))}
    />
  );
  const kindTabs = (
    <Tabs
      label={t.kindAria}
      items={REVIEW_KINDS.map((k) => ({
        key: k,
        label: t.kind[k],
        ...(k === "all" ? {} : { count: counts[k] }),
        on: q.kind === k,
        onClick: () => go({ kind: k === "all" ? undefined : k, sel: undefined }),
      }))}
    />
  );
  const kindChips = (h: string) => (
    <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto pb-0.5">
      {REVIEW_KINDS.map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={q.kind === k}
          onClick={() => go({ kind: k === "all" ? undefined : k, sel: undefined })}
          className={chip(q.kind === k, h)}
        >
          {t.kind[k]}
          {k === "all" ? null : <Count n={counts[k]} on={q.kind === k} dark />}
        </button>
      ))}
    </div>
  );

  const menu = (
    label: string,
    width: string,
    items: { key: string; label: string; on: boolean; onSelect: () => void }[],
  ) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "border-input flex h-9 items-center justify-between gap-2 rounded-md border bg-white px-3 text-left text-sm shadow-xs",
          width,
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="text-muted-foreground size-4 flex-none" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 min-w-[200px] rounded-lg p-1 shadow-md">
        {items.map((i) => (
          <DropdownMenuItem
            key={i.key}
            onSelect={i.onSelect}
            className="focus:bg-accent h-8 gap-2 rounded-sm px-2 text-sm"
          >
            <Check className={cn("size-4", i.on ? "" : "invisible")} aria-hidden />
            {i.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const productName = p.products.find((x) => x.id === q.product)?.name;
  const productMenu = menu(productName ?? t.allProducts, "w-[170px]", [
    {
      key: "all",
      label: t.allProducts,
      on: !q.product,
      onSelect: () => go({ product: undefined, sel: undefined }),
    },
    ...p.products.map((x) => ({
      key: String(x.id),
      label: x.name,
      on: q.product === x.id,
      onSelect: () => go({ product: x.id, sel: undefined }),
    })),
  ]);
  const ratingMenu = menu(
    q.rating ? fill(t.ratingN, { n: n(q.rating) }) : t.allRatings,
    "w-[150px]",
    [
      {
        key: "all",
        label: t.allRatings,
        on: !q.rating,
        onSelect: () => go({ rating: undefined, sel: undefined }),
      },
      ...[5, 4, 3, 2, 1].map((x) => ({
        key: String(x),
        label: fill(t.ratingN, { n: n(x) }),
        on: q.rating === x,
        onSelect: () => go({ rating: x, sel: undefined }),
      })),
    ],
  );

  const empty = (
    <div className="p-8 text-center">
      <p className="font-medium">{t.empty[q.status]}</p>
      {q.product || q.rating || q.kind !== "all" ? (
        <p className="text-muted-foreground mt-1 text-xs leading-4">{t.emptySub}</p>
      ) : null}
    </div>
  );
  const more =
    rows.length < total ? (
      <div className="p-3">
        <Link
          href={urlWith({ n: q.n + 20 }) as Route}
          scroll={false}
          className={btn({ variant: "outline", size: "lg", block: true })}
        >
          {t.loadMore}
        </Link>
      </div>
    ) : null;

  const on = (r: ReviewRow) => selected?.key === r.key;
  const where = (r: ReviewRow) => (r.product ? r.product.name : t.wholeShop);
  const who = (r: ReviewRow) => (r.signedIn ? t.signedIn : t.guest);
  const kindShort = (r: ReviewRow) => t.kind[r.kind];

  const header = (
    <div className="flex-none">
      <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
      <p className="text-muted-foreground text-[13px] leading-4">{t.sub}</p>
    </div>
  );

  const shared = { t, lang, pending, onApprove: approve, onHide: hide };

  return (
    <>
      {/* ───── Phone (<768): Reviews-Phone. Header and chips stay; the cards scroll. ───── */}
      <div className="tab:hidden flex h-full flex-col">
        <header className="border-border flex h-14 flex-none items-center gap-2 border-b bg-white pr-2 pl-1">
          <Link
            href="/more"
            aria-label={t.backMore}
            className={btn({ variant: "ghost", size: "iconLg", className: "[&_svg]:size-5" })}
          >
            <ChevronLeft aria-hidden />
          </Link>
          <div className="flex min-w-0 flex-auto flex-col leading-[1.1]">
            <b className="text-lg leading-6 font-semibold">{t.title}</b>
            <span className="text-muted-foreground text-xs leading-4">{t.phoneSub}</span>
          </div>
          <button
            type="button"
            aria-label={t.filter}
            onClick={() => setSheet(true)}
            className={btn({
              variant: "ghost",
              size: "iconLg",
              className: "relative [&_svg]:size-5",
            })}
          >
            <ListFilter aria-hidden />
            {q.product || q.rating ? (
              <span className="bg-primary absolute top-2 right-2 size-2 rounded-full" aria-hidden />
            ) : null}
          </button>
        </header>
        <div className="border-border flex flex-none [scrollbar-width:none] gap-2 overflow-x-auto border-b bg-white px-4 py-2.5">
          {REVIEW_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={q.status === s}
              onClick={() => go({ status: s === "pending" ? undefined : s, sel: undefined })}
              className={chip(q.status === s)}
            >
              {t.status[s]}
              <Count n={counts[s]} on={q.status === s} dark />
            </button>
          ))}
          {(["product", "site"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={q.kind === k}
              onClick={() => go({ kind: q.kind === k ? undefined : k, sel: undefined })}
              className={chip(q.kind === k)}
            >
              {t.kind[k]}
            </button>
          ))}
        </div>
        <ScrollArea key={selected?.key ?? "none"} className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            {rows.length === 0 ? empty : null}
            {rows.map((r) =>
              on(r) ? (
                <article
                  key={r.key}
                  className="border-primary flex flex-col gap-2.5 rounded-xl border bg-white px-4 py-3.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <Stars n={r.rating} size={16} t={t} lang={lang} />
                    <span className="text-muted-foreground text-xs leading-4">
                      {orderDate(r.createdAt, lang, false)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{r.name}</span>
                      <Badge tone="outline">{r.signedIn ? t.signedInLong : t.guest}</Badge>
                    </div>
                    <div className="text-muted-foreground text-xs leading-4">
                      {kindShort(r)} · {where(r)}
                    </div>
                  </div>
                  <Body r={r} variant="phone" t={t} lang={lang} />
                  <ReplyBox key={r.key} r={r} variant="phone" t={t} />
                  <Actions r={r} variant="phone" {...shared} />
                </article>
              ) : (
                <article
                  key={r.key}
                  className="border-border flex flex-col gap-2.5 rounded-xl border bg-white px-4 py-3.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <Stars n={r.rating} size={16} t={t} lang={lang} />
                    <span className="text-muted-foreground text-xs leading-4">
                      {orderDate(r.createdAt, lang, false)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-muted-foreground text-xs leading-4">
                      {kindShort(r)} · {where(r)} · {who(r)}
                    </div>
                  </div>
                  <p className="text-sm leading-5">{r.text}</p>
                  <div className="flex gap-2">
                    <Actions r={r} variant="phone" {...shared} />
                    <button
                      type="button"
                      aria-label={t.replyAria}
                      onClick={() => pick(r)}
                      className={btn({ variant: "outline", size: "iconLg" })}
                    >
                      <MessageSquare aria-hidden />
                    </button>
                  </div>
                </article>
              ),
            )}
            {more}
          </div>
        </ScrollArea>
      </div>

      {/* ───── Tablet 834 (768–1023): Reviews-Tablet. Header and filters stay; cards scroll. ───── */}
      <div className="tab:flex desk:hidden hidden h-full min-h-0 flex-col gap-4 px-6 pt-5">
        {header}
        <div className="flex flex-none flex-wrap items-center gap-2">
          {statusTabs()}
          <span className="flex-auto" />
          {kindChips("h-11")}
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 pb-6">
            {rows.length === 0 ? (
              <div className="border-border rounded-xl border bg-white">{empty}</div>
            ) : null}
            {rows.map((r) =>
              on(r) ? (
                <article
                  key={r.key}
                  className="border-primary flex flex-col gap-3 rounded-xl border bg-white px-5 py-4 shadow-xs"
                >
                  <Head r={r} variant="tab" t={t} lang={lang} />
                  <Body r={r} variant="tab" t={t} lang={lang} />
                  <ReplyBox
                    key={r.key}
                    r={r}
                    variant="tab"
                    t={t}
                    actions={<Actions r={r} variant="tab" {...shared} />}
                  />
                </article>
              ) : (
                <article
                  key={r.key}
                  className="border-border flex flex-col gap-2.5 rounded-xl border bg-white px-5 py-4 shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={r.name} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.name}</span>
                        <Stars n={r.rating} t={t} lang={lang} />
                      </div>
                      <div className="text-muted-foreground text-xs leading-4">
                        {orderDate(r.createdAt, lang, false)} · {kindShort(r)} · {where(r)} ·{" "}
                        {who(r)}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm leading-5">
                    {r.title ? `${r.title} · ` : ""}
                    {r.text}
                  </p>
                  <div className="flex gap-2">
                    <Actions r={r} variant="tabShort" {...shared} />
                    <button
                      type="button"
                      onClick={() => pick(r)}
                      className={btn({ variant: "ghost", size: "lg" })}
                    >
                      {t.open}
                    </button>
                  </div>
                </article>
              ),
            )}
            {more}
          </div>
        </ScrollArea>
      </div>

      {/* ───── Split view (1024–1439): Reviews-Tablet1194 ───── */}
      {/* Owner request (2026-11-13): resizable list/preview; the preview can be closed. */}
      <div className="desk:max-wide:flex hidden h-full min-h-0">
        <ResizablePanelGroup orientation="horizontal" id="reviews-split">
          <ResizablePanel id="list" defaultSize={380} minSize={300} maxSize="65">
            <div className="flex h-full min-w-0 flex-col bg-white">
              <div className="border-border flex flex-none flex-col gap-2 border-b px-4 py-3">
                {statusTabs(true)}
                {kindChips("h-10")}
              </div>
              <ScrollArea className="min-h-0 flex-auto">
                {rows.length === 0 ? empty : null}
                {rows.map((r) => {
                  const sel = previewOpen && on(r);
                  return (
                    <button
                      key={r.key}
                      type="button"
                      aria-pressed={sel}
                      onClick={() => pick(r)}
                      className={cn(
                        "border-border flex min-h-[72px] w-full gap-3 border-b bg-white px-4 py-3.5 text-left",
                        sel && "bg-primary-soft shadow-[inset_3px_0_0_var(--primary)]",
                      )}
                    >
                      <Avatar name={r.name} />
                      <span className="flex min-w-0 flex-auto flex-col gap-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{r.name}</span>
                          <span className="flex-auto" />
                          <span className="text-muted-foreground flex-none text-[11px] leading-[14px]">
                            {orderDate(r.createdAt, lang, false)}
                          </span>
                        </span>
                        <Stars n={r.rating} t={t} lang={lang} />
                        <span className="text-muted-foreground text-xs leading-4">
                          {kindShort(r)} · {where(r)} · {who(r)}
                        </span>
                        <span className="truncate text-xs leading-4">{r.text}</span>
                      </span>
                    </button>
                  );
                })}
                {more}
              </ScrollArea>
            </div>
          </ResizablePanel>
          {previewOpen ? (
            <>
              <ResizableHandle withHandle className="bg-border w-px" />
              <ResizablePanel id="preview" minSize={420}>
                <ScrollArea className="bg-subtle h-full">
                  <div className="flex min-w-0 flex-col gap-4 px-6 pt-5 pb-8">
                    {selected ? (
                      <>
                        <div className="-mt-2 -mb-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setPreviewOpen(false)}
                            aria-label={t.closePreview}
                            title={t.closePreview}
                            className={btn({ variant: "ghost", size: "iconSm" })}
                          >
                            <X aria-hidden />
                          </button>
                        </div>
                        <section className="border-border rounded-xl border bg-white shadow-xs">
                          <div className="px-6 pt-5">
                            <Head r={selected} variant="split" t={t} lang={lang} />
                          </div>
                          <div className="px-6 pt-4 pb-6">
                            <Body r={selected} variant="split" t={t} lang={lang} />
                          </div>
                        </section>
                        <ReplyBox key={selected.key} r={selected} variant="split" t={t} />
                        <Actions r={selected} variant="split" {...shared} />
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">{t.pickOne}</p>
                    )}
                  </div>
                </ScrollArea>
              </ResizablePanel>
            </>
          ) : null}
        </ResizablePanelGroup>
      </div>

      {/* ───── Desktop (≥1440): Reviews-Desktop. Header and toolbar stay; each pane scrolls. ───── */}
      <div className="wide:flex hidden h-full min-h-0 flex-col gap-4 px-8 pt-6 pb-6">
        {header}
        <div className="flex flex-none flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {statusTabs()}
            {kindTabs}
          </div>
          <div className="flex items-center gap-2">
            {productMenu}
            {ratingMenu}
          </div>
        </div>
        <div className="flex min-h-0 flex-auto items-start gap-4">
          <ScrollArea
            className="border-border !h-auto max-h-full min-w-0 flex-[1_1_420px] overflow-hidden rounded-xl border bg-white shadow-xs"
            viewportClassName="max-h-[calc(100dvh-210px)]"
          >
            {rows.length === 0 ? empty : null}
            {rows.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-pressed={on(r)}
                onClick={() => pick(r)}
                className={cn(
                  "border-border flex w-full gap-3 border-b bg-white px-4 py-3.5 text-left last:border-b-0",
                  on(r) && "bg-primary-soft shadow-[inset_3px_0_0_var(--primary)]",
                )}
              >
                <Avatar name={r.name} />
                <span className="flex min-w-0 flex-auto flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    <Stars n={r.rating} t={t} lang={lang} />
                    <span className="flex-auto" />
                    <span className="text-muted-foreground text-[11px] leading-[14px]">
                      {orderDate(r.createdAt, lang, false)}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs leading-4">
                    <Badge small tone={r.kind === "site" ? "secondary" : "outline"}>
                      {kindShort(r)}
                    </Badge>
                    <span className="text-muted-foreground">{where(r)}</span>
                    <Badge small tone="outline">
                      {who(r)}
                    </Badge>
                    {r.photo ? (
                      <Badge small tone="outline">
                        {t.hasPhoto}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="truncate text-xs leading-4">
                    {r.title ? `${r.title} · ` : ""}
                    {r.text}
                  </span>
                </span>
              </button>
            ))}
            {more}
          </ScrollArea>
          {selected ? (
            <ScrollArea
              className="border-border !h-auto max-h-full min-w-0 flex-[999_1_560px] overflow-hidden rounded-xl border bg-white shadow-xs"
              viewportClassName="max-h-[calc(100dvh-210px)]"
            >
              <div className="px-6 pt-5">
                <Head r={selected} variant="desk" t={t} lang={lang} />
              </div>
              <div className="px-6 pt-4 pb-6">
                <Body
                  r={selected}
                  variant="desk"
                  t={t}
                  lang={lang}
                  extra={
                    <>
                      <ReplyBox key={selected.key} r={selected} variant="desk" t={t} />
                      <Actions r={selected} variant="desk" {...shared} />
                      <p className="text-muted-foreground text-[11px] leading-[14px]">
                        {selected.approved ? t.help : t.helpPending}
                      </p>
                    </>
                  }
                />
              </div>
            </ScrollArea>
          ) : null}
        </div>
      </div>

      <FilterSheet
        open={sheet}
        onOpenChange={setSheet}
        q={q}
        t={t}
        lang={lang}
        products={p.products}
        apply={(patch) => {
          setSheet(false);
          go({ ...patch, sel: undefined });
        }}
      />
      <DeleteDialog
        review={deleting}
        t={t}
        onClose={() => setDeleting(null)}
        onDelete={(r) =>
          run(async () => {
            await deleteReview({ key: r.key });
            setDeleting(null);
          }, t.deleted)
        }
        pending={pending}
      />
    </>
  );
}

type Variant = "desk" | "split" | "tab" | "phone";

/** Name, account badge, date · kind · product, status badge. */
function Head({ r, variant, t, lang }: { r: ReviewRow; variant: Variant; t: RT; lang: AdminLang }) {
  const desk = variant === "desk";
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={r.name} large />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                desk || variant === "split" ? "text-base leading-6 font-semibold" : "font-medium",
              )}
            >
              {r.name}
            </span>
            <Badge tone="outline">
              {r.signedIn ? (desk ? t.signedInCustomer : t.signedInLong) : t.guest}
            </Badge>
          </div>
          <div className="text-muted-foreground text-xs leading-4">
            {orderDate(r.createdAt, lang)} ·{" "}
            {desk ? (r.product ? t.productReview : t.siteReview) : t.kind[r.kind]}
            {" · "}
            {r.product ? (
              desk ? (
                <a href={r.product.url} target="_blank" rel="noreferrer" className="underline">
                  {r.product.name}
                </a>
              ) : (
                r.product.name
              )
            ) : (
              t.wholeShop
            )}
          </div>
        </div>
      </div>
      <Badge tone={r.approved ? "ok" : "warn"}>
        {t.status[r.approved ? "approved" : "pending"]}
      </Badge>
    </div>
  );
}

/** Stars, title, text, spice answer and the photo. */
function Body({
  r,
  variant,
  t,
  lang,
  extra,
}: {
  r: ReviewRow;
  variant: Variant;
  t: RT;
  lang: AdminLang;
  extra?: React.ReactNode;
}) {
  const desk = variant === "desk";
  const stars = (
    <div className="flex items-center gap-2.5">
      <Stars n={r.rating} size={18} t={t} lang={lang} />
      <span className="font-medium tabular-nums">{r.rating}/5</span>
    </div>
  );
  const spice = r.spice ? <Badge tone="secondary">{t.spice[r.spice]}</Badge> : null;
  const photo = r.photo ? (
    desk ? (
      <figure className="m-0 flex flex-col gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- customer upload on the shop */}
        <img src={r.photo} alt={t.photo} className="aspect-square w-full rounded-xl object-cover" />
        <figcaption className="text-muted-foreground flex justify-between text-[11px] leading-[14px]">
          <span>{t.photoCaption}</span>
          <a href={r.photo} target="_blank" rel="noreferrer" className="underline">
            {t.photoFull}
          </a>
        </figcaption>
      </figure>
    ) : (
      // eslint-disable-next-line @next/next/no-img-element -- customer upload on the shop
      <img src={r.photo} alt={t.photo} className="aspect-square w-full rounded-xl object-cover" />
    )
  ) : null;

  if (variant === "phone")
    return (
      <>
        {r.title ? <div className="font-medium">{r.title}</div> : null}
        <p className="text-sm leading-5">{r.text}</p>
        {spice ? (
          <div className="flex items-center gap-2 text-xs leading-4">
            <span className="text-muted-foreground">{t.spiceQ}</span>
            {spice}
          </div>
        ) : null}
        {photo}
      </>
    );

  return (
    <div
      className={cn(
        "grid items-start",
        desk ? "gap-5" : "gap-4",
        photo &&
          (desk
            ? "grid-cols-[minmax(0,1fr)_320px]"
            : variant === "split"
              ? "grid-cols-[minmax(0,1fr)_260px]"
              : "grid-cols-[minmax(0,1fr)_240px]"),
      )}
    >
      <div
        className={cn(
          "flex min-w-0 flex-col",
          desk ? "gap-3.5" : variant === "split" ? "gap-3" : "gap-2.5",
        )}
      >
        {stars}
        {desk ? (
          r.title || spice ? (
            <dl className="m-0 grid grid-cols-[140px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm leading-5">
              {r.title ? (
                <>
                  <dt className="text-muted-foreground">{t.reviewTitle}</dt>
                  <dd className="m-0 font-medium">{r.title}</dd>
                </>
              ) : null}
              {spice ? (
                <>
                  <dt className="text-muted-foreground">{t.spiceQ}</dt>
                  <dd className="m-0">{spice}</dd>
                </>
              ) : null}
            </dl>
          ) : null
        ) : r.title ? (
          <div className="font-medium">{r.title}</div>
        ) : null}
        <p className="leading-[22px] whitespace-pre-wrap">{r.text}</p>
        {!desk && spice ? (
          <div className="flex items-center gap-2 text-xs leading-4">
            <span className="text-muted-foreground">{t.spiceQ}</span>
            {spice}
          </div>
        ) : null}
        {extra}
      </div>
      {photo}
    </div>
  );
}

/** "আচারকুঠির উত্তর (সবার কাছে দেখাবে)" with its save button. */
function ReplyBox({
  r,
  variant,
  t,
  actions,
}: {
  r: ReviewRow;
  variant: Variant;
  t: RT;
  /** 834 board: অনুমোদন / লুকান share a row with "উত্তর সংরক্ষণ", below the box. */
  actions?: React.ReactNode;
}) {
  const toast = useToast();
  const [text, setText] = useState(r.reply ?? "");
  const [pending, start] = useTransition();
  const dirty = text.trim() !== (r.reply ?? "");
  const id = `reply-${variant}`;
  const save = () =>
    start(async () => {
      try {
        await saveReviewReply({ key: r.key, reply: text });
        toast({ tone: "ok", title: text.trim() ? t.replySaved : t.replyRemoved });
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  const large = variant !== "desk";
  const saveBtn = (
    <button
      type="button"
      disabled={pending || !dirty}
      onClick={save}
      className={btn({
        variant: "outline",
        size: large ? "lg" : "sm",
        className: variant === "phone" ? "w-full" : "",
      })}
    >
      {t.replySave}
    </button>
  );
  const box = (
    <div
      className={cn(
        "border-border flex flex-col gap-2 rounded-[10px] border p-3",
        variant === "split"
          ? "rounded-xl bg-white p-4 shadow-xs"
          : variant === "phone"
            ? "border-0 p-0"
            : "bg-[#fafafa]",
      )}
    >
      <label className="text-sm leading-5 font-medium" htmlFor={id}>
        {t.reply}{" "}
        {variant === "phone" ? null : (
          <span className="text-muted-foreground font-normal">{t.replyPublic}</span>
        )}
      </label>
      <textarea
        id={id}
        value={text}
        maxLength={1000}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.replyPh}
        className={cn(
          "border-input focus:border-primary placeholder:text-muted-foreground w-full resize-y rounded-md border bg-white px-3 py-2 leading-5 shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)]",
          large ? "text-[15px]" : "text-sm",
          variant === "split" ? "min-h-[72px]" : variant === "phone" ? "min-h-[60px]" : "min-h-16",
        )}
      />
      {actions ? null : <div className="flex justify-end">{saveBtn}</div>}
    </div>
  );
  return actions ? (
    <>
      {box}
      <div className="flex items-center gap-2">
        {actions}
        <span className="flex-auto" />
        {saveBtn}
      </div>
    </>
  ) : (
    box
  );
}

/** অনুমোদন (pending only) and লুকান. */
function Actions({
  r,
  variant,
  t,
  pending,
  onApprove,
  onHide,
}: {
  r: ReviewRow;
  variant: Variant | "tabShort";
  t: RT;
  lang: AdminLang;
  pending: boolean;
  onApprove: (r: ReviewRow) => void;
  onHide: (r: ReviewRow) => void;
}) {
  const desk = variant === "desk";
  const grow = variant === "phone" || variant === "split";
  const size = desk ? "default" : "lg";
  const cls = cn(grow && "flex-1 basis-0", variant === "phone" && "px-2.5");
  const buttons = (
    <>
      {r.approved ? null : (
        <button
          type="button"
          disabled={pending}
          onClick={() => onApprove(r)}
          className={btn({ size, className: cls })}
        >
          {desk ? <Check aria-hidden /> : null}
          {t.approve}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => onHide(r)}
        className={btn({ variant: "outline", size, className: cls })}
      >
        {/* Approved: a real hide (back to pending). Pending isn't shown yet, so the only thing
            left is deleting it (spam), and the button says so. */}
        {desk ? r.approved ? <EyeOff aria-hidden /> : <Trash2 aria-hidden /> : null}
        {r.approved ? t.hide : t.remove}
      </button>
    </>
  );
  return variant === "phone" || variant === "tabShort" ? (
    <div className={cn("flex gap-2", variant === "phone" && "flex-auto")}>{buttons}</div>
  ) : (
    <div className="flex gap-2">{buttons}</div>
  );
}

function FilterSheet({
  open,
  onOpenChange,
  q,
  t,
  lang,
  products,
  apply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  q: ReviewListQuery;
  t: RT;
  lang: AdminLang;
  products: { id: number; name: string }[];
  apply: (patch: Patch) => void;
}) {
  const [product, setProduct] = useState(q.product);
  const [rating, setRating] = useState(q.rating);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setProduct(q.product);
          setRating(q.rating);
        }
        onOpenChange(v);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-2xl bg-white shadow-lg outline-none"
        >
          <span className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#d4d4d4]" aria-hidden />
          <div className="flex items-center justify-between py-2 pr-2 pl-5">
            <Dialog.Title className="text-base leading-6 font-semibold">
              {t.filterTitle}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t.closePreview}
              className={btn({ variant: "ghost", size: "iconLg" })}
            >
              <X className="!size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <ScrollArea className="min-h-0 flex-auto">
            <div className="flex flex-col gap-5 px-5 pb-4">
              <fieldset className="m-0 border-0 p-0">
                <legend className="mb-2.5 text-sm font-medium">{t.kind.product}</legend>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={!product}
                    onClick={() => setProduct(undefined)}
                    className={chip(!product, "h-10")}
                  >
                    {t.allProducts}
                  </button>
                  {products.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      aria-pressed={product === x.id}
                      onClick={() => setProduct(x.id)}
                      className={chip(product === x.id, "h-10")}
                    >
                      {x.name}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="m-0 border-0 p-0">
                <legend className="mb-2.5 text-sm font-medium">{t.rating}</legend>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={!rating}
                    onClick={() => setRating(undefined)}
                    className={chip(!rating, "h-10")}
                  >
                    {t.allRatings}
                  </button>
                  {[5, 4, 3, 2, 1].map((x) => (
                    <button
                      key={x}
                      type="button"
                      aria-pressed={rating === x}
                      onClick={() => setRating(x)}
                      className={chip(rating === x, "h-10")}
                    >
                      ★ {digits(x, lang)}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </ScrollArea>
          <div className="border-border flex gap-2 border-t px-5 py-3">
            <button
              type="button"
              onClick={() => {
                setProduct(undefined);
                setRating(undefined);
              }}
              className={btn({ variant: "outline", size: "lg", className: "flex-1 basis-0" })}
            >
              {t.reset}
            </button>
            <button
              type="button"
              onClick={() => apply({ product, rating })}
              className={btn({ size: "lg", className: "flex-1 basis-0" })}
            >
              {t.apply}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Confirm before a pending review is deleted for good (owner decision, 2026-11-14). */
function DeleteDialog({
  review,
  t,
  pending,
  onClose,
  onDelete,
}: {
  review: ReviewRow | null;
  t: RT;
  pending: boolean;
  onClose: () => void;
  onDelete: (r: ReviewRow) => void;
}) {
  return (
    <Dialog.Root open={!!review} onOpenChange={(v) => (v ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          role="alertdialog"
          aria-describedby={undefined}
          className="border-border wide:w-[440px] wide:p-6 fixed top-1/2 left-1/2 z-50 flex w-[340px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border bg-white p-5 shadow-lg"
        >
          <div>
            <Dialog.Title className="text-base leading-6 font-semibold">{t.delTitle}</Dialog.Title>
            <p className="text-muted-foreground text-[13px] leading-5">
              {review ? fill(t.delBody, { name: review.name || t.guest }) : ""}
            </p>
          </div>
          <div className="wide:justify-end flex gap-2">
            <Dialog.Close
              className={btn({
                variant: "outline",
                size: "lg",
                className: "wide:h-9 wide:flex-none wide:px-4 wide:text-sm flex-1 basis-0",
              })}
            >
              {t.cancel}
            </Dialog.Close>
            <button
              type="button"
              disabled={pending}
              onClick={() => review && onDelete(review)}
              className={btn({
                variant: "destructive",
                size: "lg",
                className: "wide:h-9 wide:flex-none wide:px-4 wide:text-sm flex-1 basis-0",
              })}
            >
              {t.delConfirm}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
