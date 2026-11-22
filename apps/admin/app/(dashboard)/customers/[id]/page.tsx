import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn, formatTaka } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import { AlertTriangle, ChevronLeft, ChevronRight, Phone, Star, User } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { btn } from "@/components/btn";
import { Crumb } from "@/components/shell/shell-context";
import { StatusChip } from "@/components/status-chip";
import { getCustomerPreview, type CustomerPreview } from "@/lib/customers";
import { digits, fill, orderDate } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import { getDict } from "@/lib/i18n/server";
import { statusLabel, statusTone } from "@/lib/order-status";
import { requireRole } from "@/lib/require-admin";
import { CopyButton } from "../../orders/[id]/detail-client";
import { BanCard, CustomerNoteForm } from "./customer-client";

export const metadata: Metadata = { title: "Customer" };

type CT = Dict["customers"];

const BADGE = {
  ok: "bg-badge-ok-bg text-badge-ok-fg border-transparent",
  warn: "bg-badge-warn-bg text-badge-warn-fg border-transparent",
  danger: "bg-badge-danger-bg text-badge-danger-fg border-transparent",
  outline: "border-border text-foreground bg-white",
  primary: "bg-primary border-transparent text-white",
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

/** "YYYY-MM-DD" of a moment, in Bangladesh time (the ban end date field). */
const dhakaDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(d);

/**
 * গ্রাহক বিস্তারিত: CustomerDetail-Desktop (≥1024; no 1194 board, so the desktop layout reflows),
 * -Tablet (768–1023), -Phone (<768). One set of cards: two columns from 1024, one below. The
 * header stays fixed; the body scrolls. Owner only.
 */
export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("owner");
  const [{ id }, sp, { lang, t: dict }] = await Promise.all([params, searchParams, getDict()]);
  if (!id || id.length > 36) notFound();
  const c = await getCustomerPreview(id);
  if (!c) notFound();
  const t = dict.customers;
  const d = t.detail;
  const n = (x: number) => digits(x, lang);
  const joined = fill(d.joined, { d: orderDate(c.createdAt, lang, false) });

  const card = "border-border rounded-xl border bg-white shadow-xs";
  const cardT = "max-tab:text-[15px] text-base leading-6 font-semibold";
  const cardD = "text-muted-foreground text-[13px] leading-5";
  const kcard =
    "border-border max-tab:p-3 flex min-w-0 flex-col gap-1.5 rounded-xl border bg-white p-4 shadow-xs";
  const kNum =
    "max-tab:text-xl wide:text-2xl wide:leading-8 text-[22px] leading-[30px] font-semibold tabular-nums";

  const avatar = (size: string) =>
    c.image ? (
      // eslint-disable-next-line @next/next/no-img-element -- account photos come from any host
      <img
        src={c.image}
        alt={t.customerPhoto}
        className={cn(size, "flex-none rounded-full object-cover")}
      />
    ) : (
      <span
        role="img"
        aria-label={t.customerPhoto}
        className={cn(
          size,
          "flex flex-none items-center justify-center rounded-full bg-[repeating-linear-gradient(135deg,#f5f5f5_0_8px,#efefef_8px_16px)] text-[#8a8a8a]",
        )}
      >
        <User className="size-4" aria-hidden />
      </span>
    );

  return (
    <div className="flex h-full flex-col">
      <Crumb value={c.name} />

      {/* Phone header (CustomerDetail-Phone .p-head) */}
      <header className="border-border tab:hidden flex h-14 flex-none items-center gap-2 border-b bg-white pr-2 pl-1">
        <Link
          href="/customers"
          aria-label={d.phoneBack}
          className={btn({ variant: "ghost", size: "iconLg", className: "[&_svg]:size-5" })}
        >
          <ChevronLeft aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-auto flex-col leading-[1.1]">
          <b className="truncate text-lg leading-6 font-semibold">{c.name}</b>
          <span className="text-muted-foreground text-xs leading-4">{d.phoneSub}</span>
        </div>
      </header>

      {/* Tablet / desktop page header */}
      <div className="tab:flex wide:px-8 wide:pt-6 wide:pb-6 hidden flex-none flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-4">
        <div className="desk:gap-3.5 flex min-w-0 flex-auto items-center gap-3">
          <Link
            href="/customers"
            aria-label={d.back}
            className={btn({
              variant: "outline",
              size: "iconLg",
              className: "desk:hidden [&_svg]:size-5",
            })}
          >
            <ChevronLeft aria-hidden />
          </Link>
          {avatar("desk:size-14 size-12")}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl leading-8 font-semibold tracking-[-0.01em]">
                {c.name}
              </h1>
              {c.banned ? <Badge tone="danger">{t.banned}</Badge> : null}
            </div>
            <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs leading-4">
              <span>{c.email}</span>
              <Badge small tone={c.verified ? "ok" : "warn"}>
                {c.verified ? d.emailVerified : d.emailUnverified}
              </Badge>
              <span className="desk:inline hidden">·</span>
              <Badge small tone="outline">
                {d.viaLong[c.via]}
              </Badge>
              <span>· {joined}</span>
            </p>
          </div>
        </div>
        {c.phone ? (
          <div className="desk:flex hidden items-center gap-2">
            <span className="font-mono text-sm tabular-nums">{c.phone}</span>
            <a href={`tel:${c.phone}`} className={btn({ variant: "outline", size: "sm" })}>
              <Phone aria-hidden />
              {t.call}
            </a>
            <CopyButton
              text={c.phone}
              title={t.copied}
              label={t.copyPhone}
              className={btn({ variant: "outline", size: "iconSm" })}
            />
          </div>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="tab:gap-4 tab:px-6 tab:pb-8 wide:px-8 wide:pb-12 flex flex-col gap-3 p-4 pb-8">
          {/* Phone: the person card (avatar, email, badges, number, call / copy) */}
          <section className="border-border tab:hidden flex flex-col gap-3 rounded-xl border bg-white p-4">
            <div className="flex items-center gap-3">
              {avatar("size-12")}
              <div className="min-w-0 flex-auto">
                <div className="truncate text-xs leading-4">{c.email}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge small tone={c.verified ? "ok" : "warn"}>
                    {c.verified ? t.verified : t.unverified}
                  </Badge>
                  <Badge small tone="outline">
                    {t.via[c.via]}
                  </Badge>
                  {c.banned ? (
                    <Badge small tone="danger">
                      {t.banned}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
            {c.phone ? (
              <>
                <div className="font-mono text-base tabular-nums">{c.phone}</div>
                <div className="flex gap-2">
                  <a href={`tel:${c.phone}`} className={btn({ size: "lg", className: "flex-1" })}>
                    <Phone aria-hidden />
                    {d.callLong}
                  </a>
                  <CopyButton
                    text={c.phone}
                    title={t.copied}
                    className={btn({ variant: "outline", size: "lg", className: "flex-1" })}
                  >
                    {d.copyShort}
                  </CopyButton>
                </div>
              </>
            ) : null}
          </section>

          {/* Tablet: the phone strip */}
          {c.phone ? (
            <div className="border-border max-tab:hidden desk:hidden flex items-center gap-2 rounded-xl border bg-white px-4 py-3 shadow-xs">
              <span className="min-w-0 flex-auto font-mono text-[15px] tabular-nums">
                {c.phone}
              </span>
              <a href={`tel:${c.phone}`} className={btn({ size: "lg" })}>
                {d.callLong}
              </a>
              <CopyButton
                text={c.phone}
                title={t.copied}
                className={btn({ variant: "outline", size: "lg" })}
              >
                {d.copyShort}
              </CopyButton>
            </div>
          ) : null}

          {c.returns >= 2 ? (
            <div className="flex items-start gap-3 rounded-[10px] border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[#78350f]">
              <AlertTriangle className="mt-0.5 size-4 flex-none" aria-hidden />
              <div>
                <div className="font-medium">{t.highReturn}</div>
                <div className="text-xs leading-4">
                  <span className="max-tab:hidden">
                    {fill(t.highReturnSub, { n: n(c.orders), r: n(c.returns) })}
                  </span>
                  <span className="tab:hidden">
                    {fill(d.highReturnShort, { n: n(c.orders), r: n(c.returns) })}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <div className="tab:grid-cols-4 tab:gap-2.5 desk:gap-3 grid grid-cols-3 gap-2">
            <div className={kcard}>
              <span className="text-muted-foreground max-tab:text-[11px] max-tab:leading-[14px] text-xs leading-4">
                <span className="tab:hidden">{d.kOrdersShort}</span>
                <span className="max-tab:hidden">{t.kOrders}</span>
              </span>
              <span className={kNum}>{c.orders}</span>
            </div>
            <div className={kcard}>
              <span className="text-muted-foreground max-tab:text-[11px] max-tab:leading-[14px] text-xs leading-4">
                <span className="tab:hidden">{d.kSpentShort}</span>
                <span className="max-tab:hidden">{t.kSpent}</span>
              </span>
              <span className={cn(kNum, "max-tab:text-lg")}>{formatTaka(c.spent)}</span>
            </div>
            <div className={cn(kcard, c.returns > 0 && "border-[#fecaca]")}>
              <span
                className={cn(
                  "max-tab:text-[11px] max-tab:leading-[14px] text-xs leading-4",
                  c.returns > 0 ? "text-[#991b1b]" : "text-muted-foreground",
                )}
              >
                <span className="tab:hidden">{d.kReturnsShort}</span>
                <span className="max-tab:hidden">{t.kReturns}</span>
              </span>
              <span className={cn(kNum, c.returns > 0 && "text-[#991b1b]")}>{c.returns}</span>
            </div>
            {/* 4th card: শেষ অর্ডার on the 834 board, লেখা রিভিউ on desktop; none on phones. */}
            <div className={cn(kcard, "max-tab:hidden desk:hidden")}>
              <span className="text-muted-foreground text-xs leading-4">{d.kLast}</span>
              <span className="text-base leading-[30px] font-semibold">
                {c.lastOrder ? orderDate(c.lastOrder, lang, false) : "—"}
              </span>
            </div>
            <div className={cn(kcard, "desk:flex hidden")}>
              <span className="text-muted-foreground text-xs leading-4">{d.kReviews}</span>
              <span className={kNum}>{c.reviews.length}</span>
            </div>
          </div>

          <div className="desk:flex-row desk:items-start desk:flex-wrap desk:gap-4 tab:gap-4 flex flex-col gap-3">
            {/* Left column (desktop) */}
            <div className="desk:flex desk:min-w-0 desk:flex-[999_1_560px] desk:flex-col desk:gap-4 contents">
              <OrdersCard c={c} t={t} lang={lang} />
              <ReviewsCard c={c} t={t} lang={lang} />
            </div>
            {/* Right column (desktop) */}
            <div className="desk:flex desk:min-w-0 desk:flex-[1_1_340px] desk:flex-col desk:gap-4 contents">
              <BanCard
                userId={c.id}
                banned={c.banned}
                reason={c.banReason ?? ""}
                until={c.banned && c.banExpires ? dhakaDay(c.banExpires) : undefined}
                openOnLoad={sp.ban === "1"}
                t={t}
                lang={lang}
              />
              <section className={cn(card, "max-tab:gap-3 max-tab:p-4 flex flex-col")}>
                <div className="tab:px-6 tab:pt-5">
                  <h2 className={cardT}>{t.addrTitle}</h2>
                  {c.addresses.length ? (
                    <p className={cn(cardD, "max-tab:hidden")}>
                      {fill(d.addrSub, { n: n(c.addresses.length) })}
                    </p>
                  ) : null}
                </div>
                <div className="tab:px-6 tab:pt-4 tab:pb-6 tab:grid-cols-2 desk:grid-cols-1 tab:grid flex flex-col gap-2.5">
                  {c.addresses.length === 0 ? (
                    <p className="text-muted-foreground text-xs leading-4">{t.noAddr}</p>
                  ) : null}
                  {c.addresses.map((a) => (
                    <Address key={a.id} a={a} t={t} />
                  ))}
                </div>
              </section>
              <section className={cn(card, "max-tab:gap-3 max-tab:p-4 flex flex-col")}>
                <div className="tab:px-6 tab:pt-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className={cardT}>{t.notes}</h2>
                    <p className={cn(cardD, "max-tab:hidden")}>{d.notesSub}</p>
                  </div>
                </div>
                <div className="tab:px-6 tab:pt-4 tab:pb-6 flex flex-col gap-2.5">
                  {c.notes.map((x) => (
                    <div
                      key={x.id}
                      className="border-border rounded-[10px] border bg-[#fafafa] px-3 py-2.5"
                    >
                      <div className="text-xs leading-4">
                        <span className="font-medium">{x.by ?? "—"}</span>{" "}
                        <span className="text-muted-foreground">
                          · {orderDate(x.at, lang, false)}
                        </span>
                      </div>
                      <p className="text-sm leading-5 whitespace-pre-wrap">{x.body}</p>
                    </div>
                  ))}
                  <CustomerNoteForm userId={c.id} t={t} />
                </div>
              </section>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function OrdersCard({ c, t, lang }: { c: CustomerPreview; t: CT; lang: AdminLang }) {
  const d = t.detail;
  const th = "text-muted-foreground h-10 px-3 text-left text-[13px] font-medium whitespace-nowrap";
  return (
    <section className="border-border overflow-hidden rounded-xl border bg-white shadow-xs">
      <div className="max-tab:px-4 max-tab:pt-3.5 max-tab:pb-2 px-6 pt-5">
        <h2 className="max-tab:text-[15px] text-base leading-6 font-semibold">{t.ordersTitle}</h2>
        <p className="text-muted-foreground max-tab:hidden text-[13px] leading-5">{d.ordersSub}</p>
      </div>
      {c.orderList.length === 0 ? (
        <p className="text-muted-foreground tab:px-6 tab:pb-6 tab:pt-3 border-border max-tab:border-t px-4 py-3 text-xs leading-4">
          {t.noOrders}
        </p>
      ) : (
        <>
          {/* Tablet / desktop table */}
          <div className="max-tab:hidden px-6 pt-2 pb-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className={th}>{d.colOrder}</th>
                  <th className={th}>{d.colDate}</th>
                  <th className={th}>{d.colStatus}</th>
                  <th className={cn(th, "text-right")}>
                    <span className="desk:hidden">{d.colCod}</span>
                    <span className="desk:inline hidden">{d.colTotal}</span>
                  </th>
                  <th className={cn(th, "desk:hidden w-[1%]")} />
                </tr>
              </thead>
              <tbody>
                {c.orderList.map((o) => {
                  const tone = statusTone(o.status);
                  return (
                    <tr
                      key={o.id}
                      className="border-border desk:h-auto h-14 border-b last:border-b-0 [&>td]:px-3 [&>td]:py-2.5"
                    >
                      <td>
                        <Link
                          href={`/orders/${o.id}` as Route}
                          className="text-foreground font-mono text-xs font-medium whitespace-nowrap tabular-nums"
                        >
                          {o.number}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap">{orderDate(o.createdAt, lang)}</td>
                      <td>
                        <StatusChip tone={tone} label={statusLabel(tone, lang)} />
                      </td>
                      <td className="text-right font-medium whitespace-nowrap tabular-nums">
                        {formatTaka(o.total)}
                      </td>
                      <td className="desk:hidden w-[1%] !py-0">
                        <Link
                          href={`/orders/${o.id}` as Route}
                          aria-label={fill(d.openOrder, { n: o.number })}
                          className={btn({ variant: "ghost", size: "iconLg" })}
                        >
                          <ChevronRight aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Phone list */}
          <div className="tab:hidden">
            {c.orderList.map((o) => {
              const tone = statusTone(o.status);
              return (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}` as Route}
                  className="border-border flex min-h-14 items-center gap-3 border-t px-4 py-3"
                >
                  <span className="flex min-w-0 flex-auto flex-col gap-1">
                    <span className="truncate font-mono text-xs font-medium tabular-nums">
                      {o.number}
                    </span>
                    <span className="text-muted-foreground text-xs leading-4">
                      {orderDate(o.createdAt, lang, false)}
                    </span>
                  </span>
                  <span className="flex flex-none flex-col items-end gap-1">
                    <span className="font-medium tabular-nums">{formatTaka(o.total)}</span>
                    <StatusChip tone={tone} label={statusLabel(tone, lang)} />
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function ReviewsCard({ c, t, lang }: { c: CustomerPreview; t: CT; lang: AdminLang }) {
  const d = t.detail;
  return (
    <section className="border-border max-tab:gap-3 max-tab:p-4 flex flex-col rounded-xl border bg-white shadow-xs">
      <div className="tab:px-6 tab:pt-5">
        <h2 className="max-tab:text-[15px] text-base leading-6 font-semibold">
          {t.reviewsTitle}{" "}
          {c.reviews.length ? (
            <span className="text-muted-foreground tab:hidden text-xs font-normal">
              {fill(t.reviewsN, { n: digits(c.reviews.length, lang) })}
            </span>
          ) : null}
        </h2>
        {c.reviews.length ? (
          <p className="text-muted-foreground max-tab:hidden text-[13px] leading-5">
            {fill(d.reviewsSub, { n: digits(c.reviews.length, lang) })}
          </p>
        ) : null}
      </div>
      <div className="tab:px-6 tab:pt-2 tab:pb-6 flex flex-col gap-2.5">
        {c.reviews.length === 0 ? (
          <p className="text-muted-foreground text-xs leading-4">{t.noReviews}</p>
        ) : null}
        {c.reviews.map((r) => (
          <div
            key={r.key}
            className="border-border tab:border-b tab:pb-2.5 tab:last:border-b-0 tab:last:pb-0 max-tab:gap-2.5 flex items-start gap-3"
          >
            {/* Desktop: 5 stars. Tablet: "★ 4/5". Phone: "★ 4". */}
            <span
              role="img"
              aria-label={fill(d.stars, { n: digits(r.rating, lang) })}
              className="desk:inline-flex mt-[3px] hidden gap-0.5 text-[#d4d4d4]"
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  aria-hidden
                  className={cn(
                    "size-3.5 fill-current stroke-none",
                    i <= r.rating && "text-[#f59e0b]",
                  )}
                />
              ))}
            </span>
            <span className="desk:hidden flex-none text-xs leading-4 font-medium">
              ★ {r.rating}
              <span className="max-tab:hidden">/5</span>
            </span>
            <div className="min-w-0 flex-auto">
              <div className="text-xs leading-4 font-medium">
                {r.product ? (
                  <>
                    <span className="max-tab:hidden">
                      {fill(d.productReview, { name: r.product })}
                    </span>
                    <span className="tab:hidden">{r.product}</span>
                  </>
                ) : (
                  d.siteReview
                )}
              </div>
              <p className="text-xs leading-4">{r.text}</p>
            </div>
            <Badge tone={r.approved ? "ok" : "warn"}>
              {r.approved ? (
                t.approved
              ) : (
                <>
                  <span className="max-tab:hidden">{t.pendingReview}</span>
                  <span className="tab:hidden">{d.pendingShort}</span>
                </>
              )}
            </Badge>
          </div>
        ))}
      </div>
    </section>
  );
}

function Address({ a, t }: { a: CustomerPreview["addresses"][number]; t: CT }) {
  const f = t.detail.f;
  const row = (label: string, value: string | null, mono?: boolean) =>
    value ? (
      <>
        <dt className="text-muted-foreground">{label}</dt>
        <dd className={cn("m-0", mono && "font-mono tabular-nums")}>{value}</dd>
      </>
    ) : null;
  const both = [a.district, a.division].filter(Boolean).join(" · ") || null;
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-[10px] border p-3",
        a.isDefault ? "border-primary shadow-[0_0_0_1px_var(--primary)]" : "border-border",
      )}
    >
      {a.label || a.isDefault ? (
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{a.label}</span>
          {a.isDefault ? <Badge tone="primary">{t.defaultAddr}</Badge> : null}
        </div>
      ) : null}
      <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs leading-4">
        {row(f.name, a.fullName)}
        {row(f.phone, a.phone, true)}
        {row(f.line1, a.line1)}
        {row(f.area, a.area)}
        {row(f.city, a.city)}
        {/* Desktop lists district and division apart; tablet / phone join them. */}
        <span className="desk:contents hidden">
          {row(f.district, a.district)}
          {row(f.division, a.division)}
        </span>
        <span className="desk:hidden contents">{row(f.districtDivision, both)}</span>
        {row(f.post, a.postalCode, true)}
      </dl>
    </div>
  );
}
