"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import {
  CalendarDays,
  Check,
  CircleX,
  Copy,
  Ellipsis,
  Printer,
  RefreshCw,
  Truck,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  addOrderNote,
  advanceOrders,
  stepBackOrder,
  undoAdvance,
  updateTracking,
} from "@/app/actions/orders";
import { bookCourier, syncCourier, unsettleOrder } from "@/app/actions/courier";
import { btn } from "@/components/btn";
import { useBreakpoint } from "@/components/shell/shell-context";
import { DateCalendar } from "@/components/date-range-calendar";
import { useToast } from "@/components/toast";
import { digits, fill, orderDate } from "@/lib/format";
import { statusLabel, type StatusTone } from "@/lib/order-status";
import { CancelDialog, CANCELLABLE, SettleDialog, type OT } from "../orders-parts";

type DbStatus = Parameters<typeof CANCELLABLE.has>[0];

export interface ActionOrder {
  id: number;
  number: string;
  status: DbStatus;
  phone: string;
  address: string;
}

const BACK: Partial<Record<DbStatus, StatusTone>> = { confirmed: "new", processing: "conf" };

function useCopy() {
  const toast = useToast();
  return (text: string, title: string) =>
    void navigator.clipboard.writeText(text).then(() => toast({ tone: "ok", title, sub: text }));
}

/** Copy button for the phone number or the address (toast on success). */
export function CopyButton({
  text,
  title,
  label,
  className,
  children,
}: {
  text: string;
  title: string;
  label?: string;
  className: string;
  children?: React.ReactNode;
}) {
  const copy = useCopy();
  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      onClick={() => copy(text, title)}
    >
      {children ?? <Copy aria-hidden />}
    </button>
  );
}

/**
 * Header toolbar (desktop / 1194), the 834 bottom bar, the phone header "…" and the phone
 * bottom bar. Each placement owns its "…" menu and cancel dialog.
 */
export function OrderActions({
  order,
  place,
  t,
  lang,
}: {
  order: ActionOrder;
  place: "wide" | "desk" | "tab" | "phoneHead" | "phoneBar";
  t: OT;
  lang: AdminLang;
}) {
  const d = t.detail;
  const toast = useToast();
  const copy = useCopy();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [pending, start] = useTransition();
  const canCancel = CANCELLABLE.has(order.status);
  const back = BACK[order.status];
  const lg = place !== "wide";

  function advance(step: "confirm" | "pack") {
    start(async () => {
      try {
        const { moved } = await advanceOrders({ ids: [order.id], step });
        if (!moved.length) return;
        toast({
          tone: "ok",
          title: step === "confirm" ? t.toastConfirmed : t.toastPacked,
          sub: fill(t.toastNow, {
            id: order.number,
            v: statusLabel(step === "confirm" ? "conf" : "pack", lang),
          }),
          action: {
            label: t.undo,
            onClick: () => start(async () => void (await undoAdvance({ ids: [order.id], step }))),
          },
        });
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  function stepBack() {
    if (!back) return;
    start(async () => {
      try {
        const r = await stepBackOrder({ id: order.id });
        toast(
          r.ok
            ? {
                tone: "ok",
                title: fill(t.toastNow, { id: order.number, v: statusLabel(back, lang) }),
              }
            : { tone: "err", title: t.saveFailed, sub: t.saveFailedSub },
        );
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  const item = "h-8 gap-2 rounded-sm px-2 text-sm focus:bg-accent";
  const menu = (trigger: React.ReactNode) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-lg p-1 shadow-md">
        <DropdownMenuItem className={item} onSelect={() => copy(order.phone, t.copied)}>
          {t.copyPhone}
        </DropdownMenuItem>
        <DropdownMenuItem className={item} onSelect={() => copy(order.address, d.addressCopied)}>
          {d.copyAddress}
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={item}>
          <Link href={`/orders/${order.id}/print` as Route}>{t.slip}</Link>
        </DropdownMenuItem>
        {back ? (
          <DropdownMenuItem className={item} disabled={pending} onSelect={stepBack}>
            {d.stepBack}
          </DropdownMenuItem>
        ) : null}
        {canCancel ? (
          <>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className={cn(item, "text-danger-text focus:text-danger-text")}
              onSelect={() => setCancelOpen(true)}
            >
              {t.cancel}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  /** confirm / pack advance here; "packed" jumps to the courier card, where booking happens. */
  function primary(className: string, withIcon: boolean) {
    const size = lg ? "lg" : "default";
    if (order.status === "pending" || order.status === "confirmed") {
      const step = order.status === "pending" ? "confirm" : "pack";
      return (
        <button
          type="button"
          disabled={pending}
          onClick={() => advance(step)}
          className={btn({ size, className })}
        >
          {t.actPhone[step]}
        </button>
      );
    }
    if (order.status !== "processing") return null;
    return (
      <a href="#courier" className={btn({ size, className })}>
        {withIcon ? <Truck aria-hidden /> : null}
        {t.actPhone.book}
      </a>
    );
  }

  const dialog = cancelOpen ? (
    <CancelDialog
      order={{ id: order.id, number: order.number }}
      t={t}
      onClose={() => setCancelOpen(false)}
    />
  ) : null;

  const cancelBtn = canCancel ? (
    <button
      type="button"
      onClick={() => setCancelOpen(true)}
      className={btn({
        variant: "outline",
        size: lg ? "lg" : "default",
        className: "text-danger-text",
      })}
    >
      {place === "wide" ? <CircleX aria-hidden /> : null}
      {t.cancel}
    </button>
  ) : null;
  const slipBtn = (
    <Link
      href={`/orders/${order.id}/print` as Route}
      className={btn({ variant: "outline", size: lg ? "lg" : "default" })}
    >
      {place === "wide" ? <Printer aria-hidden /> : null}
      {t.slip}
    </Link>
  );
  const dots = menu(
    <button
      type="button"
      aria-label={t.more}
      className={btn({ variant: "outline", size: lg ? "iconLg" : "icon" })}
    >
      <Ellipsis aria-hidden />
    </button>,
  );

  if (place === "wide" || place === "desk")
    return (
      <div className="flex flex-wrap items-center gap-2">
        {cancelBtn}
        {slipBtn}
        {primary("", place === "wide")}
        {dots}
        {dialog}
      </div>
    );

  if (place === "tab")
    return (
      <div className="border-border flex flex-none items-center gap-2 border-t bg-white px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,.05)]">
        {cancelBtn}
        {dots}
        <span className="flex-auto" />
        {slipBtn}
        {primary("", true)}
        {dialog}
      </div>
    );

  if (place === "phoneHead")
    return (
      <>
        {menu(
          <button
            type="button"
            aria-label={t.more}
            className={btn({ variant: "ghost", size: "iconLg", className: "[&_svg]:size-5" })}
          >
            <Ellipsis aria-hidden />
          </button>,
        )}
        {dialog}
      </>
    );

  return (
    <div className="border-border fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t bg-white px-4 pt-3 pb-6">
      {menu(
        <button
          type="button"
          className={btn({ variant: "outline", size: "lg", className: "flex-1 basis-0" })}
        >
          {t.more}
        </button>,
      )}
      {primary("flex-[1.4] basis-0", true)}
      {dialog}
    </div>
  );
}

/** "ডেলিভারি ট্র্যাকিং" fields. Each one saves when it changes (owner decision: auto-save). */
export function TrackingFields({
  id,
  initial,
  t,
  lang,
}: {
  id: number;
  initial: { courier: string; ref: string; eta: string };
  t: OT;
  lang: AdminLang;
}) {
  const d = t.detail;
  const toast = useToast();
  const saved = useRef(initial);
  const [courier, setCourier] = useState(initial.courier);
  const [ref, setRef] = useState(initial.ref);
  const [eta, setEta] = useState(initial.eta);
  const [open, setOpen] = useState(false);

  function save(patch: Partial<{ courierName: string; trackingRef: string; etaDate: string }>) {
    void updateTracking({ id, ...patch })
      .then(() => {
        saved.current = {
          courier: patch.courierName ?? saved.current.courier,
          ref: patch.trackingRef ?? saved.current.ref,
          eta: patch.etaDate ?? saved.current.eta,
        };
        toast({ tone: "ok", title: d.saved });
      })
      .catch(() => toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub }));
  }

  const input =
    "border-input focus:border-primary h-9 w-full min-w-0 rounded-md border bg-white px-3 text-sm shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)] max-wide:h-11 max-wide:text-[15px]";
  const label = "text-sm leading-5 font-medium";
  // UTC noon: the same calendar day in Dhaka whatever the browser time zone.
  const etaDate = eta ? new Date(`${eta}T12:00:00Z`) : undefined;
  return (
    <>
      <div className="flex min-w-0 flex-col gap-2">
        <label className={label} htmlFor="od-cn">
          {d.courierName}
        </label>
        <input
          id="od-cn"
          className={input}
          value={courier}
          maxLength={80}
          onChange={(e) => setCourier(e.target.value)}
          onBlur={() =>
            courier.trim() !== saved.current.courier && save({ courierName: courier.trim() })
          }
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <label className={label} htmlFor="od-tr">
          {d.trackRef}
        </label>
        <input
          id="od-tr"
          className={cn(input, "font-mono")}
          value={ref}
          maxLength={80}
          placeholder={d.trackRefPh}
          onChange={(e) => setRef(e.target.value)}
          onBlur={() => ref.trim() !== saved.current.ref && save({ trackingRef: ref.trim() })}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <label className={label} htmlFor="od-eta">
          <span className="max-tab:hidden">{d.eta}</span>
          <span className="tab:hidden">{d.etaShort}</span>
        </label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            id="od-eta"
            className={cn(
              input,
              "flex cursor-pointer items-center justify-between gap-2 text-left",
            )}
          >
            {etaDate ? (
              <span>{orderDate(etaDate, lang, false)}</span>
            ) : (
              <span className="text-muted-foreground">{d.etaPh}</span>
            )}
            <CalendarDays className="text-muted-foreground size-4 flex-none" aria-hidden />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto rounded-lg p-0 shadow-md">
            <DateCalendar
              value={eta || undefined}
              lang={lang}
              onChange={(iso) => {
                const v = iso ?? "";
                setEta(v);
                setOpen(false);
                if (v !== saved.current.eta) save({ etaDate: v });
              }}
            />
          </PopoverContent>
        </Popover>
        <span className="text-muted-foreground max-tab:hidden text-xs leading-4">{d.etaHelp}</span>
      </div>
    </>
  );
}

/** "নতুন নোট" + "নোট যোগ করুন". */
export function NoteForm({ id, t }: { id: number; t: OT }) {
  const d = t.detail;
  const toast = useToast();
  const phone = useBreakpoint() === "phone";
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        const text = body.trim();
        if (!text) return;
        start(async () => {
          try {
            await addOrderNote({ id, body: text });
            setBody("");
            toast({ tone: "ok", title: d.saved });
          } catch {
            toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
          }
        });
      }}
    >
      <label className="mt-1 text-sm leading-5 font-medium" htmlFor="od-note">
        {d.newNote}
      </label>
      <textarea
        id="od-note"
        value={body}
        maxLength={1000}
        onChange={(e) => setBody(e.target.value)}
        className="border-input focus:border-primary placeholder:text-muted-foreground desk:min-h-16 wide:min-h-[72px] max-tab:text-[15px] min-h-[72px] w-full resize-y rounded-md border bg-white px-3 py-2 text-sm leading-5 shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)]"
        placeholder={phone ? d.notePhShort : d.notePh}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className={btn({
            variant: "outline",
            size: "lg",
            className: "wide:h-8 wide:gap-1.5 wide:px-3 wide:text-[13px] max-tab:w-full",
          })}
        >
          {d.addNote}
        </button>
      </div>
    </form>
  );
}

/** "কুরিয়ারের জন্য নোট": saved when the field loses focus; printed on the slip and label. */
export function CourierNoteField({ id, initial, t }: { id: number; initial: string; t: OT }) {
  const toast = useToast();
  const saved = useRef(initial);
  const [note, setNote] = useState(initial);
  return (
    <textarea
      id="od-sf"
      value={note}
      maxLength={500}
      onChange={(e) => setNote(e.target.value)}
      onBlur={() => {
        const v = note.trim();
        if (v === saved.current) return;
        void updateTracking({ id, courierNote: v })
          .then(() => {
            saved.current = v;
            toast({ tone: "ok", title: t.detail.saved });
          })
          .catch(() => toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub }));
      }}
      className="border-input focus:border-primary min-h-16 w-full resize-y rounded-md border bg-white px-3 py-2 text-sm leading-5 font-normal shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)]"
    />
  );
}

/**
 * Courier card actions (OrderDetail-*): "Steadfast-এ বুক করুন" for a packed order, "স্ট্যাটাস আনুন"
 * once booked, the manual "পথে চিহ্ন দিন" / "ডেলিভার্ড চিহ্ন দিন" for orders not booked, and for the owner "টাকা পাওয়া গেছে" on a delivered order (or undo).
 */
export function CourierActions({
  id,
  status,
  booked,
  settledAt,
  payoutRef,
  owner,
  t,
  lang,
}: {
  id: number;
  status: string;
  booked: boolean;
  settledAt: Date | null;
  payoutRef: string | null;
  owner: boolean;
  t: OT;
  lang: AdminLang;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [settling, setSettling] = useState<number[]>([]);
  const cls = "wide:h-10 wide:text-sm";
  const fail = () => toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
  const book = () =>
    start(async () => {
      try {
        const r = await bookCourier({ ids: [id] });
        if (!r.ok) toast({ tone: "err", title: t.sfKeys, sub: t.sfKeysSub });
        else if (r.booked.length) toast({ tone: "ok", title: t.toastBookedOne });
        else
          toast({
            tone: "err",
            title: fill(t.toastBookFailed, { list: r.failed[0]?.number ?? "" }),
            sub: r.failed[0]?.message ?? t.saveFailedSub,
          });
      } catch {
        fail();
      }
    });
  const sync = () =>
    start(async () => {
      try {
        const r = await syncCourier({ ids: [id] });
        if (!r.ok) toast({ tone: "err", title: t.sfKeys, sub: t.sfKeysSub });
        else
          toast({
            tone: "ok",
            title: fill(t.toastSynced, { n: digits(r.checked, lang), c: digits(r.changed, lang) }),
          });
      } catch {
        fail();
      }
    });
  const unsettle = () =>
    start(async () => {
      try {
        await unsettleOrder({ id });
        toast({ tone: "ok", title: t.toastUnsettled });
      } catch {
        fail();
      }
    });
  /** Manual পথে / ডেলিভার্ড for orders not booked with Steadfast (owner, 2026-11-15). */
  const manual = (step: "ship" | "deliver") =>
    start(async () => {
      try {
        const { moved } = await advanceOrders({ ids: [id], step });
        if (!moved.length) return;
        toast({
          tone: "ok",
          title: step === "ship" ? t.toastShipped : t.toastDelivered,
          action: {
            label: t.undo,
            onClick: () => start(async () => void (await undoAdvance({ ids: [id], step }))),
          },
        });
      } catch {
        fail();
      }
    });
  return (
    <div className="flex flex-col gap-2">
      {status === "processing" && !booked ? (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={book}
            className={btn({ size: "lg", block: true, className: cls })}
          >
            <Truck aria-hidden />
            {t.bookSf}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => manual("ship")}
            className={btn({ variant: "outline", size: "lg", block: true, className: cls })}
          >
            {t.markShipped}
          </button>
        </>
      ) : null}
      {!booked && status === "shipped" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => manual("deliver")}
          className={btn({ size: "lg", block: true, className: cls })}
        >
          <Check aria-hidden />
          {t.markDelivered}
        </button>
      ) : null}
      {booked && status === "shipped" ? (
        <button
          type="button"
          disabled={pending}
          onClick={sync}
          className={btn({ variant: "outline", size: "lg", block: true, className: cls })}
        >
          <RefreshCw aria-hidden />
          {t.syncOne}
        </button>
      ) : null}
      {owner && status === "delivered" ? (
        settledAt ? (
          <div className="bg-badge-ok-bg text-badge-ok-fg flex items-center justify-between gap-2 rounded-md px-3 py-2 text-xs leading-4">
            <span>
              {fill(t.settledOn, { d: orderDate(settledAt, lang, false) })}
              {payoutRef ? ` · ${payoutRef}` : ""}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={unsettle}
              className="font-medium underline"
            >
              {t.unsettle}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSettling([id])}
            className={btn({ size: "lg", block: true, className: cls })}
          >
            <Check aria-hidden />
            {t.settleTitle}
          </button>
        )
      ) : null}
      <SettleDialog ids={settling} t={t} lang={lang} onClose={() => setSettling([])} />
    </div>
  );
}
