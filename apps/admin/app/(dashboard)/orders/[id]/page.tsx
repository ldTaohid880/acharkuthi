import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn, formatTaka } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import { Check, ChevronLeft, MapPin, MessageSquare, Phone } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { btn } from "@/components/btn";
import { Crumb } from "@/components/shell/shell-context";
import { StatusChip } from "@/components/status-chip";
import { digits, fill, orderDate } from "@/lib/format";
import { getDict } from "@/lib/i18n/server";
import { initialsOf } from "@/lib/initials";
import { getOrderDetail, type OrderDetail } from "@/lib/order-detail";
import { statusLabel, statusTone, type StatusTone } from "@/lib/order-status";
import { requireAdmin } from "@/lib/require-admin";
import { getShopRules } from "@repo/db";
import type { OT } from "../orders-parts";
import { body, card, CardHead, kv, Wide } from "../card";
import { AddressDialog } from "./address-dialog";
import {
  CopyButton,
  CourierActions,
  CourierNoteField,
  NoteForm,
  OrderActions,
  TrackingFields,
} from "./detail-client";

export const metadata: Metadata = { title: "Order" };

type DbStatus = OrderDetail["status"];

/**
 * অর্ডার বিস্তারিত: OrderDetail-Desktop (≥1440), -Tablet1194 (1024–1439), -Tablet (768–1023),
 * -Phone (<768). One set of cards; below 1024 the two columns dissolve and `order-*` sets each
 * board's section order. The header (and the 834 / phone action bars) stay fixed; the body scrolls.
 */
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireAdmin();
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const [o, { lang, t: dict }, rules] = await Promise.all([
    getOrderDetail(id),
    getDict(),
    getShopRules(),
  ]);
  if (!o) notFound();
  const t = dict.orders;
  const d = t.detail;

  const tone = statusTone(o.status, { booked: o.booked, settled: o.settledAt !== null });
  const method = o.payment ? t.methods[o.payment.method] : "";
  const placed = orderDate(o.createdAt, lang);
  const meta = [placed, d.sources[o.source], method].filter(Boolean).join(" · ");
  const addressText = `${o.name}, ${o.phone}\n${o.address}`;
  const cod = o.payment?.method === "cod" && o.payment.status !== "paid" ? o.payment.amount : 0;
  const actionOrder = {
    id: o.id,
    number: o.number,
    status: o.status,
    phone: o.phone,
    address: addressText,
  };

  return (
    <div className="flex h-full flex-col">
      <Crumb value={o.number} />

      {/* Phone header (OrderDetail-Phone .p-head) */}
      <header className="border-border tab:hidden sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-white pr-2 pl-1">
        <Link
          href="/orders"
          aria-label={d.backPhone}
          className={btn({ variant: "ghost", size: "iconLg", className: "[&_svg]:size-5" })}
        >
          <ChevronLeft aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-auto flex-col leading-[1.1]">
          <b className="font-mono text-[17px] leading-6 font-semibold">{o.number}</b>
          <span className="text-muted-foreground text-xs leading-4">{placed}</span>
        </div>
        <OrderActions order={actionOrder} place="phoneHead" t={t} lang={lang} />
      </header>

      {/* Tablet / desktop page header */}
      <div className="tab:flex wide:px-8 wide:pt-6 wide:pb-6 wide:items-start hidden flex-none flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-4">
        <div className="wide:hidden flex min-w-0 flex-auto items-center gap-3">
          <Link
            href="/orders"
            aria-label={d.backAria}
            className={btn({ variant: "outline", size: "iconLg", className: "[&_svg]:size-5" })}
          >
            <ChevronLeft aria-hidden />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono text-2xl leading-8 font-semibold tracking-[-0.01em]">
                {o.number}
              </h1>
              <StatusChip tone={tone} label={statusLabel(tone, lang)} />
            </div>
            <p className="text-muted-foreground text-xs leading-4">
              <span className="desk:hidden">{fill(d.placed, { d: "" })}</span>
              {meta}
            </p>
          </div>
        </div>
        <div className="wide:flex hidden flex-col gap-2">
          <Link
            href="/orders"
            className="text-muted-foreground flex items-center gap-1 text-xs leading-4"
          >
            <ChevronLeft className="size-3.5" aria-hidden />
            {d.back}
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl leading-8 font-semibold tracking-[-0.01em]">
              {o.number}
            </h1>
            <StatusChip tone={tone} label={statusLabel(tone, lang)} />
          </div>
          <p className="text-muted-foreground text-xs leading-4">{fill(d.placed, { d: meta })}</p>
        </div>
        <div className="wide:block hidden">
          <OrderActions order={actionOrder} place="wide" t={t} lang={lang} />
        </div>
        <div className="desk:block wide:hidden hidden">
          <OrderActions order={actionOrder} place="desk" t={t} lang={lang} />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="tab:gap-4 tab:px-6 tab:pb-8 wide:px-8 wide:pb-12 desk:flex-row desk:items-start desk:flex-wrap tab:pt-0 flex flex-col gap-3 p-4 pb-[110px]">
          {/* Left column (desktop / 1194) */}
          <div className="desk:flex desk:min-w-0 desk:flex-[1.45_1_0] desk:flex-col desk:gap-4 wide:flex-[999_1_560px] contents">
            <ItemsCard o={o} t={t} />
            <TimelineCard o={o} t={t} lang={lang} />
            <NotesCard o={o} t={t} lang={lang} />
          </div>
          {/* Right column */}
          <div className="desk:flex desk:min-w-0 desk:flex-[1_1_0] desk:flex-col desk:gap-4 wide:flex-[1_1_340px] contents">
            <PhoneStatus tone={tone} lang={lang} />
            <CustomerCard o={o} t={t} lang={lang} addressText={addressText} zoneFees={rules.fees} />
            <PaymentCard o={o} t={t} />
            <section className={cn(card, "max-tab:order-6 order-5")}>
              <CardHead title={d.trackTitle} desc={d.trackDesc} phoneSub={d.trackDescShort} />
              <div className={cn(body, "gap-3")}>
                <TrackingFields id={o.id} initial={o.tracking} t={t} lang={lang} />
              </div>
            </section>
            <CourierCard o={o} t={t} cod={cod} lang={lang} owner={role === "owner"} />
          </div>
        </div>
      </ScrollArea>

      {/* 834: fixed bottom bar (.t-actions). Phone: bottom bar with "আরও কাজ" + main action. */}
      <div className="tab:block desk:hidden hidden">
        <OrderActions order={actionOrder} place="tab" t={t} lang={lang} />
      </div>
      <div className="tab:hidden">
        <OrderActions order={actionOrder} place="phoneBar" t={t} lang={lang} />
      </div>
    </div>
  );
}

/* Sections. 834 order: customer, items, payment, tracking, courier, timeline, notes.
   Phone order: status, customer, customer note, items, courier, tracking, payment, timeline, notes. */

function PhoneStatus({ tone, lang }: { tone: StatusTone; lang: AdminLang }) {
  return (
    <section className={cn(card, "tab:hidden order-1 p-4")}>
      <div>
        <StatusChip tone={tone} label={statusLabel(tone, lang)} />
      </div>
    </section>
  );
}

function Totals({ o, t, className }: { o: OrderDetail; t: OT; className?: string }) {
  return (
    <dl className={cn(kv, className)}>
      <dt>{t.subtotal}</dt>
      <dd>{formatTaka(o.subtotal)}</dd>
      <dt className="flex items-center gap-1.5">
        {t.discount}
        {o.couponCode ? (
          <span className="border-border text-foreground max-tab:hidden inline-flex h-[18px] items-center rounded-sm border bg-white px-2 font-mono text-[11px] font-medium">
            {o.couponCode}
          </span>
        ) : null}
      </dt>
      <dd className={o.discount ? "text-[#15803d]" : ""}>
        {o.discount ? `−${formatTaka(o.discount)}` : "—"}
      </dd>
      <dt>{t.delivery}</dt>
      <dd>{formatTaka(o.shippingFee)}</dd>
      <dt className="text-foreground wide:border-border wide:border-t wide:pt-2 font-medium">
        {t.total}
      </dt>
      <dd className="wide:border-border wide:border-t wide:pt-2 tab:text-base font-semibold">
        {formatTaka(o.total)}
      </dd>
    </dl>
  );
}

function ItemsCard({ o, t }: { o: OrderDetail; t: OT }) {
  const d = t.detail;
  const current = (i: OrderDetail["items"][number]) =>
    i.current ? fill(d.currentProduct, { v: i.current.name }) : null;
  return (
    <section className={cn(card, "max-tab:order-4 order-2")}>
      <CardHead
        title={t.itemsTitle}
        desc={<Wide wide={d.itemsDesc} other={d.itemsDescShort} />}
        phoneSub={t.itemsSub}
      />
      <div className={cn(body, "max-tab:pt-3 pt-2")}>
        {/* Desktop and 834: table */}
        <table className="desk:max-wide:hidden max-tab:hidden w-full border-collapse text-sm">
          <thead>
            <tr className="text-muted-foreground border-border border-b text-[13px] font-medium [&>th]:h-10 [&>th]:px-3 [&>th]:font-medium [&>th]:whitespace-nowrap">
              <th className="text-left">{d.colProduct}</th>
              <th className="text-left">{d.colSize}</th>
              <th className="text-right">
                <span className="wide:inline hidden">{d.colUnit}</span>
                <span className="wide:hidden">{d.colUnitShort}</span>
              </th>
              <th className="text-right">{d.colQty}</th>
              <th className="text-right">{d.colTotal}</th>
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>td]:border-b-0">
            {o.items.map((i) => (
              <tr
                key={i.id}
                className="border-border hover:bg-subtle [&>td]:border-b [&>td]:px-3 [&>td]:py-2.5"
              >
                <td>
                  <div className="font-medium">{i.name}</div>
                  {current(i) && i.current ? (
                    <Link
                      href={`/products/${i.current.productId}` as Route}
                      className="text-muted-foreground wide:text-[11px] wide:leading-[14px] wide:underline text-xs leading-4"
                    >
                      {current(i)}
                    </Link>
                  ) : null}
                </td>
                <td>{i.size}</td>
                <td className="text-right tabular-nums">{formatTaka(i.unit)}</td>
                <td className="text-right tabular-nums">×{digits(i.qty, "en")}</td>
                <td className="text-right font-medium tabular-nums">
                  {formatTaka(i.unit * i.qty)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* 1194 and phone: rows */}
        <div className="desk:max-wide:flex tab:max-desk:hidden wide:hidden max-tab:gap-3 flex flex-col gap-2.5">
          {o.items.map((i) => (
            <div key={i.id} className="desk:min-h-12 flex items-center gap-3">
              <div className="min-w-0 flex-auto">
                <div className="font-medium">{i.name}</div>
                <div className="text-muted-foreground max-tab:hidden text-xs leading-4">
                  {[current(i), i.size, `${formatTaka(i.unit)} × ${i.qty}`]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                <div className="text-muted-foreground tab:hidden text-xs leading-4">
                  {i.size} · <span className="tabular-nums">{formatTaka(i.unit)}</span> × {i.qty}
                </div>
              </div>
              <span className="font-medium tabular-nums">{formatTaka(i.unit * i.qty)}</span>
            </div>
          ))}
        </div>
        <div className="wide:mt-3 wide:flex wide:justify-end max-tab:border-border max-tab:border-t max-tab:pt-3 desk:max-wide:border-border desk:max-wide:border-t desk:max-wide:pt-2.5 tab:max-desk:border-border tab:max-desk:mt-3 tab:max-desk:border-t tab:max-desk:pt-3 max-tab:mt-0 mt-2.5">
          <Totals o={o} t={t} className="wide:w-80" />
        </div>
      </div>
    </section>
  );
}

interface Step {
  key: string;
  label: string;
  code: string;
  internal: boolean;
  mark: "done" | "now" | "" | "bad";
  sub: string;
  future: boolean;
}

/** customer-facing flow with the two admin-only steps (booked, cash received) in place. */
const FLOW: { tone: StatusTone; status: DbStatus | null }[] = [
  { tone: "new", status: "pending" },
  { tone: "conf", status: "confirmed" },
  { tone: "pack", status: "processing" },
  { tone: "book", status: null },
  { tone: "transit", status: "shipped" },
  { tone: "deliv", status: "delivered" },
  { tone: "settled", status: null },
];
const RANK: Partial<Record<DbStatus, number>> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 4,
  delivered: 5,
};

function timeline(o: OrderDetail, t: OT, lang: AdminLang): Step[] {
  const d = t.detail;
  const last = new Map<DbStatus, OrderDetail["events"][number]>();
  for (const e of o.events) last.set(e.status, e);
  const ended = o.status === "cancelled" || o.status === "returned";
  // How far the order got: its status, or for cancelled / returned the furthest step logged.
  const rank = ended
    ? Math.max(0, ...o.events.map((e) => RANK[e.status] ?? 0), o.status === "returned" ? 4 : 0)
    : (RANK[o.status] ?? 0);
  const when = (e?: { at: Date; by: string | null }) =>
    e ? [orderDate(e.at, lang), e.by].filter(Boolean).join(" · ") : "";

  const steps: Step[] = [];
  FLOW.forEach((f, i) => {
    if (ended && i > rank) return;
    let done = i <= rank && !(i === rank + 1);
    let now = !ended && i === rank + 1;
    let sub = "";
    // Booked = handed to Steadfast; cash received = the owner's "টাকা পাওয়া গেছে".
    if (f.tone === "book") {
      done = o.booked;
      now = !ended && o.status === "processing" && !o.booked;
      if (o.booked && o.courier.bookedAt) sub = orderDate(o.courier.bookedAt, lang);
      if (o.courier.consignmentId && done) sub = [sub, o.courier.consignmentId].filter(Boolean).join(" · ");
    }
    if (f.tone === "settled") {
      done = o.settledAt !== null;
      now = o.status === "delivered" && o.settledAt === null;
      if (o.settledAt) sub = [orderDate(o.settledAt, lang, false), o.payoutRef].filter(Boolean).join(" · ");
    }
    if (f.status === "pending") sub = `${orderDate(o.createdAt, lang)} · ${d.sources[o.source]}`;
    else if (done && f.status) sub = when(last.get(f.status));
    else if (now && f.tone !== "transit" && f.tone !== "settled" && !sub) sub = d.stepNow;
    if (!done && f.tone === "transit") sub = d.transitWhen;
    if (!done && f.tone === "settled" && !sub) sub = d.settledWhen;
    steps.push({
      key: f.tone,
      label: d.steps[f.tone as keyof typeof d.steps],
      code: f.status ?? "",
      internal: f.status === null,
      mark: done ? "done" : now ? "now" : "",
      sub,
      future: !done && !now,
    });
  });
  if (ended) {
    const e = last.get(o.status);
    const reason = o.status === "cancelled" && o.cancelReason ? t.reasons[o.cancelReason] : null;
    steps.push({
      key: o.status,
      label: d.steps[o.status === "cancelled" ? "cancel" : "return"],
      code: o.status,
      internal: false,
      mark: "bad",
      sub: [when(e), reason, o.cancelNote].filter(Boolean).join(" · "),
      future: false,
    });
  }
  return steps;
}

function TimelineCard({ o, t, lang }: { o: OrderDetail; t: OT; lang: AdminLang }) {
  const d = t.detail;
  return (
    <section className={cn(card, "max-tab:order-9 order-7")}>
      <CardHead title={d.tlTitle} desc={<Wide wide={d.tlDesc} other={d.tlDescShort} />} />
      <div className={body}>
        <ol className="flex flex-col">
          {timeline(o, t, lang).map((s) => (
            <li
              key={s.key}
              className="before:bg-border relative flex gap-3 pb-4 before:absolute before:top-6 before:bottom-0 before:left-[11px] before:w-0.5 last:pb-0 last:before:hidden"
            >
              <span
                className={cn(
                  "border-border text-muted-foreground relative z-[1] flex size-6 flex-none items-center justify-center rounded-full border-2 bg-white",
                  s.mark === "done" && "border-primary bg-primary text-white",
                  s.mark === "now" &&
                    "border-primary text-primary after:bg-primary after:size-2 after:rounded-full",
                  s.mark === "bad" && "border-[#fecaca] bg-[#fee2e2] text-[#991b1b]",
                )}
              >
                {s.mark === "done" ? (
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                ) : null}
              </span>
              <div className={cn("flex flex-col gap-0.5 pt-0.5", s.future && "opacity-55")}>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">{s.label}</span>
                  {s.code ? (
                    <span className="text-muted-foreground font-mono text-[11px]">{s.code}</span>
                  ) : null}
                  {s.internal ? (
                    <>
                      <span className="bg-muted text-foreground inline-flex h-[18px] items-center rounded-sm px-2 text-[11px] font-medium">
                        {d.adminOnly}
                      </span>
                    </>
                  ) : null}
                </span>
                {s.sub ? (
                  <span className="text-muted-foreground text-xs leading-4">{s.sub}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground wide:block mt-3 hidden text-[11px] leading-[14px]">
          {d.tlNote}
        </p>
      </div>
    </section>
  );
}

function NotesCard({ o, t, lang }: { o: OrderDetail; t: OT; lang: AdminLang }) {
  const d = t.detail;
  return (
    <section className={cn(card, "max-tab:order-10 order-8")}>
      <CardHead title={d.notesTitle} desc={d.notesDesc} />
      <div className={cn(body, "gap-3")}>
        {o.notes.map((n) => (
          <div key={n.id} className="flex gap-2.5">
            <span className="wide:inline-flex hidden size-6 flex-none items-center justify-center rounded-full bg-[#e5e5e5] text-[10px] font-semibold text-[#404040]">
              {initialsOf(n.by ?? "?")}
            </span>
            <div className="border-border bg-subtle min-w-0 flex-auto rounded-[10px] border px-3 py-2.5">
              <div className="text-xs leading-4">
                <span className="font-medium">{n.by ?? "—"}</span>{" "}
                <span className="text-muted-foreground">
                  · <span className="max-tab:hidden">{orderDate(n.at, lang)}</span>
                  <span className="tab:hidden">{orderDate(n.at, lang, false)}</span>
                </span>
              </div>
              <p className="whitespace-pre-line">{n.body}</p>
            </div>
          </div>
        ))}
        <NoteForm id={o.id} t={t} />
      </div>
    </section>
  );
}

function CustomerCard({
  o,
  t,
  lang,
  addressText,
  zoneFees,
}: {
  o: OrderDetail;
  t: OT;
  lang: AdminLang;
  addressText: string;
  /** Settings "ডেলিভারি চার্জ" (paisa), for the fee change shown in the address dialog. */
  zoneFees: { in: number; out: number };
}) {
  const d = t.detail;
  const history = fill(d.history, {
    n: digits(o.previous, lang),
    r: digits(o.returned, lang),
  });
  // Owner decision: the address can change until the order is booked.
  const editable = ["pending", "confirmed", "processing"].includes(o.status);
  const profile = o.userId ? (
    <Link
      href={`/customers/${o.userId}` as Route}
      className={btn({
        variant: "ghost",
        size: "xs",
        className:
          "tab:max-desk:h-11 tab:max-desk:px-5 tab:max-desk:text-[15px] desk:max-wide:hidden max-tab:hidden",
      })}
    >
      {d.profile}
    </Link>
  ) : null;
  const copyPhone = (size: "iconSm" | "iconLg") => (
    <CopyButton
      text={o.phone}
      title={t.copied}
      label={t.copyPhoneAria}
      className={btn({ variant: "outline", size })}
    />
  );
  const call = (size: "sm" | "lg", icon: boolean) => (
    <a href={`tel:${o.phone}`} className={btn({ variant: "outline", size })}>
      {icon ? <Phone aria-hidden /> : null}
      {t.call}
    </a>
  );
  const zone = o.zone ? (
    <span className="bg-muted text-foreground mt-1.5 inline-flex h-[22px] items-center rounded-sm px-2 text-xs font-medium">
      {t.zone[o.zone]}
    </span>
  ) : null;
  return (
    <>
      <section className={cn(card, "max-tab:order-2 order-1")}>
        <CardHead
          title={d.customerTitle}
          phoneTitle={d.customerPhone}
          desc={d.customerDesc}
          aside={
            editable || profile ? (
              <span className="flex flex-none items-center gap-1.5">
                {editable ? (
                  <AddressDialog
                    id={o.id}
                    initial={o.addressParts}
                    fees={{
                      base: o.subtotal - o.discount,
                      shippingFee: o.shippingFee,
                      total: o.total,
                    }}
                    zoneFees={zoneFees}
                    t={t}
                  />
                ) : null}
                {profile}
              </span>
            ) : null
          }
        />
        <div className={cn(body, "desk:max-wide:gap-3 gap-3.5")}>
          {/* Phone */}
          <div className="tab:hidden contents">
            <div>
              <div className="text-base font-medium">{o.name}</div>
              <div className="text-muted-foreground mt-0.5 font-mono text-sm">{o.phone}</div>
              {o.email ? (
                <div className="text-muted-foreground text-xs leading-4">{o.email}</div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <a
                href={`tel:${o.phone}`}
                className={btn({ size: "lg", className: "flex-1 basis-0" })}
              >
                <Phone aria-hidden />
                {d.callNow}
              </a>
              <CopyButton
                text={o.phone}
                title={t.copied}
                className={btn({ variant: "outline", size: "lg", className: "flex-1 basis-0" })}
              >
                <CopyIcon />
                {d.copyNumber}
              </CopyButton>
            </div>
            <hr className="bg-border m-0 h-px border-0" />
          </div>

          {/* 834: name left, phone actions right */}
          <div className="tab:max-desk:flex hidden items-center justify-between gap-3">
            <Who o={o} history={history} />
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{o.phone}</span>
              {call("lg", false)}
              {copyPhone("iconLg")}
            </div>
          </div>

          {/* 1194 and desktop */}
          <div className="desk:contents hidden">
            <Who o={o} history={history} />
            <div className="wide:flex hidden items-center justify-between gap-2">
              <span className="font-mono text-sm">{o.phone}</span>
              <span className="flex items-center gap-1.5">
                {call("sm", true)}
                {copyPhone("iconSm")}
              </span>
            </div>
            <div className="wide:hidden flex items-center gap-2">
              <span className="min-w-0 flex-auto font-mono text-sm">{o.phone}</span>
              {call("lg", false)}
              {copyPhone("iconLg")}
            </div>
            <hr className="bg-border wide:block m-0 hidden h-px border-0" />
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin
              className="text-muted-foreground desk:max-wide:hidden mt-0.5 size-4 flex-none"
              aria-hidden
            />
            <div className="min-w-0 flex-auto">
              <div className="text-muted-foreground max-tab:text-[11px] max-tab:leading-[14px] text-xs leading-4">
                <span className="max-tab:hidden">{d.address}</span>
                <span className="tab:hidden">{d.addressShort}</span>
              </div>
              <p className="whitespace-pre-line">{addressText}</p>
              {zone}
            </div>
            <CopyButton
              text={addressText}
              title={d.addressCopied}
              label={d.copyAddress}
              className={btn({
                variant: "ghost",
                size: "iconLg",
                className: "wide:size-8 desk:max-wide:hidden",
              })}
            />
          </div>
          {o.note ? (
            <div className="border-border bg-subtle max-tab:hidden flex items-start gap-3 rounded-[10px] border px-4 py-3">
              <MessageSquare
                className="text-muted-foreground wide:block mt-0.5 hidden size-4 flex-none"
                aria-hidden
              />
              <div>
                <div className="text-muted-foreground text-xs leading-4">{t.customerNote}</div>
                <p className="whitespace-pre-line">{o.note}</p>
              </div>
            </div>
          ) : null}
        </div>
      </section>
      {o.note ? (
        <section className={cn(card, "tab:hidden order-3 gap-3 p-4")}>
          <h2 className="text-[15px] font-semibold">{t.customerNote}</h2>
          <p className="whitespace-pre-line">{o.note}</p>
        </section>
      ) : null}
    </>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="8" y="8" width="14" height="14" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function Who({ o, history }: { o: OrderDetail; history: string }) {
  return (
    <div>
      <div className="text-[15px] font-medium">{o.name}</div>
      {o.email ? <div className="text-xs leading-4">{o.email}</div> : null}
      <div className="text-muted-foreground text-xs leading-4">{history}</div>
    </div>
  );
}

function payBadge(status: NonNullable<OrderDetail["payment"]>["status"]) {
  return cn(
    "inline-flex h-[22px] flex-none items-center rounded-sm px-2 text-xs font-medium whitespace-nowrap",
    status === "paid"
      ? "bg-badge-ok-bg text-badge-ok-fg"
      : status === "pending"
        ? "bg-badge-warn-bg text-badge-warn-fg"
        : "bg-badge-danger-bg text-badge-danger-fg",
  );
}

function PaymentCard({ o, t }: { o: OrderDetail; t: OT }) {
  const d = t.detail;
  const p = o.payment;
  return (
    <section className={cn(card, "max-tab:order-7 order-3")}>
      <CardHead
        title={t.payment}
        desc={d.paymentsDesc}
        aside={
          p ? (
            <span className={cn(payBadge(p.status), "tab:hidden")}>{t.payStatus[p.status]}</span>
          ) : null
        }
      />
      <div className={cn(body, "gap-2.5")}>
        <div className="border-border max-tab:hidden flex flex-col gap-2 rounded-[10px] border p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{p ? t.methods[p.method] : "—"}</span>
            {p ? <span className={payBadge(p.status)}>{t.payStatus[p.status]}</span> : null}
          </div>
          <dl className={cn(kv, "text-xs leading-4")}>
            <dt>{d.amount}</dt>
            <dd className="font-medium">{p ? formatTaka(p.amount) : "—"}</dd>
            <dt>{d.txn}</dt>
            <dd className={p?.transactionId ? "font-mono" : "text-muted-foreground"}>
              {p?.transactionId ?? "—"}
            </dd>
          </dl>
        </div>
        <p className="text-muted-foreground max-tab:hidden text-[11px] leading-[14px]">
          {d.payHelp}
        </p>
        <dl className={cn(kv, "tab:hidden")}>
          <dt>{d.method}</dt>
          <dd>{p ? t.methods[p.method] : "—"}</dd>
          <dt>{d.amount}</dt>
          <dd className="font-medium">{p ? formatTaka(p.amount) : "—"}</dd>
          <dt>{d.txn}</dt>
          <dd className={p?.transactionId ? "font-mono" : "text-muted-foreground"}>
            {p?.transactionId ?? "—"}
          </dd>
        </dl>
      </div>
    </section>
  );
}

/** Steadfast booking, status and the owner's "টাকা পাওয়া গেছে" (owner decisions, 2026-11-15). */
function CourierCard({
  o,
  t,
  cod,
  lang,
  owner,
}: {
  o: OrderDetail;
  t: OT;
  cod: number;
  lang: AdminLang;
  owner: boolean;
}) {
  const d = t.detail;
  const sf = o.courier;
  return (
    <section
      id="courier"
      className={cn(card, "max-tab:order-5 order-6 scroll-mt-4 border-[#c7d2fe]")}
    >
      <CardHead
        title={t.courierTitle}
        desc={o.booked ? `${t.consignmentLabel} ${sf.consignmentId}` : t.notBooked}
      />
      <div className={cn(body, "desk:max-wide:gap-3 gap-3.5")}>
        <dl className={cn(kv, "text-xs leading-4")}>
          <dt>{d.invoice}</dt>
          <dd className="font-mono">{o.number}</dd>
          {o.booked ? (
            <>
              <dt>{t.trackingCode}</dt>
              <dd className="font-mono">{o.tracking.ref || "—"}</dd>
              <dt>{t.courierStatusLabel}</dt>
              <dd>{sf.status ? (t.sfStatus[sf.status] ?? sf.status) : "—"}</dd>
              {sf.bookedAt ? (
                <>
                  <dt>{t.bookedAt}</dt>
                  <dd>{orderDate(sf.bookedAt, lang)}</dd>
                </>
              ) : null}
              {sf.syncedAt ? (
                <>
                  <dt>{t.lastSync}</dt>
                  <dd>{orderDate(sf.syncedAt, lang)}</dd>
                </>
              ) : null}
            </>
          ) : (
            <>
              <dt className="max-tab:hidden">{d.recipient}</dt>
              <dd className="max-tab:hidden">{o.name}</dd>
              <dt className="desk:max-wide:hidden max-tab:hidden">{d.phone}</dt>
              <dd className="desk:max-wide:hidden max-tab:hidden font-mono">{o.phone}</dd>
              <dt className="wide:block hidden">{d.shipTo}</dt>
              <dd className="wide:block hidden">{o.address}</dd>
            </>
          )}
          <dt>{d.cod}</dt>
          <dd className="font-medium">{formatTaka(cod)}</dd>
        </dl>
        {o.booked ? null : (
          <div className="max-tab:hidden flex flex-col gap-2">
            <label htmlFor="od-sf" className="text-sm leading-5 font-medium">
              {t.courierNote}
            </label>
            <CourierNoteField id={o.id} initial={o.courierNote} t={t} />
            <span className="text-muted-foreground desk:max-wide:hidden text-xs leading-4">
              {d.riderHelp}
            </span>
          </div>
        )}
        <CourierActions
          id={o.id}
          status={o.status}
          booked={o.booked}
          settledAt={o.settledAt}
          payoutRef={o.payoutRef}
          owner={owner}
          t={t}
          lang={lang}
        />
        {o.booked ? null : (
          <p className="text-muted-foreground wide:block hidden text-center text-[11px] leading-[14px]">
            {d.bookedHelp}
          </p>
        )}
      </div>
    </section>
  );
}
