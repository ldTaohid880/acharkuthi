"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn, formatTaka } from "@repo/ui/lib/utils";
import { takaToPaisa, type AdminLang } from "@repo/validators";
import { ChevronLeft, Info, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useState, useTransition } from "react";
import {
  disconnectSteadfast,
  newWebhookToken,
  saveDeliveryFees,
  saveShopInfo,
  saveSteadfastKeys,
  setCod,
  testSteadfast,
  type SteadfastResult,
} from "@/app/actions/settings";
import { btn } from "@/components/btn";
import { ShareCardsCard } from "@/components/share-cards";
import { useBreakpoint } from "@/components/shell/shell-context";
import { useToast } from "@/components/toast";
import { fill, relativeTime } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import type { SettingsData } from "@/lib/settings";
import type { ShareCardSummary } from "@/lib/share-cards";

type ST = Dict["settings"];
type BP = "phone" | "tab" | "desk";

const okBadge = "bg-badge-ok-bg text-badge-ok-fg";
const dangerBadge = "bg-badge-danger-bg text-badge-danger-fg";
const OTHER_METHODS = [
  { name: "bKash", kind: "mobileBanking" },
  { name: "Nagad", kind: "mobileBanking" },
  { name: "SSLCommerz", kind: "cardOnline" },
] as const;

function Badge({
  className,
  dot,
  children,
}: {
  className: string;
  dot?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] flex-none items-center gap-1.5 rounded-sm px-2 text-xs leading-4 font-medium whitespace-nowrap",
        className,
      )}
    >
      {dot ? <span className="size-2 rounded-full bg-[#16a34a]" aria-hidden /> : null}
      {children}
    </span>
  );
}

function Switch({
  on,
  label,
  large,
  disabled,
  onClick,
}: {
  on: boolean;
  label: string;
  large: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex flex-none items-center rounded-full p-0.5 disabled:cursor-not-allowed",
        large ? "h-[26px] w-11" : "h-5 w-9",
        on ? "bg-primary justify-end" : "justify-start bg-[#e5e5e5]",
      )}
    >
      <span
        className={cn(
          "rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)]",
          large ? "size-[22px]" : "size-4",
        )}
      />
    </button>
  );
}

export function SettingsView({
  data,
  t,
  lang,
  shareCards,
}: {
  data: SettingsData;
  t: ST;
  lang: AdminLang;
  shareCards: ShareCardSummary;
}) {
  const bp: BP = useBreakpoint();
  const toast = useToast();
  const [pending, start] = useTransition();
  const sf = data.steadfast;
  const large = bp !== "desk";

  // Form state (shop details + fees). Tablet saves both from one bar.
  const [phone, setPhone] = useState(data.shop.phone);
  const [email, setEmail] = useState(data.shop.email);
  const [pickup, setPickup] = useState(data.shop.pickupAddress);
  const [feeIn, setFeeIn] = useState(String(data.fees.in / 100));
  const [feeOut, setFeeOut] = useState(String(data.fees.out / 100));
  const [errs, setErrs] = useState<Partial<Record<"phone" | "email" | "fees", string | undefined>>>(
    {},
  );
  const [keysOpen, setKeysOpen] = useState(false);
  /** Turning COD off stops every storefront order, so it asks first. Turning it on doesn't. */
  const [codAsk, setCodAsk] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const fail = () => toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
  const run = (fn: () => Promise<unknown>, ok: string) =>
    start(async () => {
      try {
        await fn();
        toast({ tone: "ok", title: ok });
      } catch {
        fail();
      }
    });

  function checkShop(): boolean {
    const e: typeof errs = {};
    if (phone.trim() && !/^01[3-9]\d{8}$/.test(phone.trim())) e.phone = "01XXXXXXXXX";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "hello@example.com";
    setErrs((x) => ({ ...x, phone: e.phone, email: e.email }));
    return !e.phone && !e.email;
  }
  function fees(): { in: number; out: number } | null {
    const a = takaToPaisa(feeIn);
    const b = takaToPaisa(feeOut);
    const bad = a === null || b === null;
    setErrs((x) => ({ ...x, fees: bad ? t.badFee : undefined }));
    return bad ? null : { in: a, out: b };
  }
  const shopPayload = () => ({
    phone: phone.trim(),
    email: email.trim(),
    pickupAddress: pickup.trim(),
  });
  const saveShop = () => checkShop() && run(() => saveShopInfo(shopPayload()), t.saved);
  const saveFees = () => {
    const f = fees();
    if (f) run(() => saveDeliveryFees(f), t.saved);
  };
  const saveBoth = () => {
    const f = fees();
    if (!checkShop() || !f) return;
    run(async () => {
      await saveShopInfo(shopPayload());
      await saveDeliveryFees(f);
    }, t.saved);
  };

  const testToast = (r: SteadfastResult) =>
    r.ok
      ? toast({ tone: "ok", title: fill(t.testOk, { b: formatTaka(r.balance) }) })
      : r.reason === "network"
        ? toast({ tone: "err", title: t.testNet, sub: t.testNetSub })
        : toast({ tone: "err", title: t.testAuth, sub: t.testAuthSub });
  const test = () =>
    start(async () => {
      try {
        testToast(await testSteadfast());
      } catch {
        fail();
      }
    });
  const copy = (text: string) =>
    void navigator.clipboard.writeText(text).then(() => toast({ tone: "ok", title: t.copied }));
  const when = (d: Date | null) => (d ? relativeTime(d, lang) : "—");

  /* ── shared pieces ─────────────────────────────────────────────── */
  const inputCls = cn(
    "border-input focus-within:border-primary focus:border-primary placeholder:text-muted-foreground flex w-full min-w-0 items-center gap-2 rounded-md border bg-white px-3 shadow-xs outline-none focus-within:shadow-[0_0_0_3px_var(--ring)] focus:shadow-[0_0_0_3px_var(--ring)]",
    large ? "h-11 text-[15px]" : "h-9 text-sm",
  );
  const label = "text-sm leading-5 font-medium";
  const errText = (m?: string) =>
    m ? <span className="text-destructive text-xs leading-4">{m}</span> : null;
  const card = "border-border rounded-xl border bg-white shadow-xs";
  const cardH = bp === "phone" ? "" : "px-6 pt-5";
  const cardT = bp === "phone" ? "text-[15px] font-semibold" : "text-base leading-6 font-semibold";
  const cardD = "text-muted-foreground text-[13px] leading-5";
  const cardB = bp === "phone" ? "flex flex-col gap-3.5" : "px-6 pt-4 pb-6";
  const section = (id: string, children: React.ReactNode, className?: string) => (
    <section
      id={id}
      className={cn(card, bp === "phone" && "flex flex-col gap-3.5 p-4", "scroll-mt-4", className)}
    >
      {children}
    </section>
  );
  const footer = (children: React.ReactNode, between = false) =>
    bp === "desk" ? (
      <div
        className={cn(
          "border-border flex items-center gap-2 border-t px-6 py-3",
          between ? "justify-between" : "justify-end",
        )}
      >
        {children}
      </div>
    ) : null;
  const saveBtn = (onClick: () => void) =>
    bp === "desk" ? (
      <button type="button" disabled={pending} onClick={onClick} className={btn({ size: "sm" })}>
        {t.save}
      </button>
    ) : (
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        className={btn({ size: "lg", block: true })}
      >
        {t.save}
      </button>
    );
  const readOnlyField = (
    id: string,
    lbl: React.ReactNode,
    value: string,
    actions: React.ReactNode,
    help?: string,
  ) => (
    <div className="flex min-w-0 flex-col gap-2">
      <label className={label} htmlFor={id}>
        {lbl}
      </label>
      <div className={cn(inputCls, "pr-1")}>
        <input
          id={id}
          readOnly
          value={value}
          className={cn(
            "min-w-0 flex-auto bg-transparent font-mono outline-none",
            bp === "phone" ? "text-xs" : "text-[13px]",
          )}
        />
        {actions}
      </div>
      {help ? <span className="text-muted-foreground text-xs leading-4">{help}</span> : null}
    </div>
  );
  const smallBtn = (text: string, onClick: () => void, disabled = false) => (
    <button
      type="button"
      disabled={pending || disabled}
      onClick={onClick}
      className={btn({
        variant: "ghost",
        size: bp === "desk" ? "xs" : "sm",
        className: bp === "tab" ? "h-9" : "",
      })}
    >
      {text}
    </button>
  );

  /* ── দোকানের তথ্য ─────────────────────────────────────────────── */
  const shopFields = (
    <div className={cn("grid gap-4", bp === "phone" ? "grid-cols-1 gap-3.5" : "grid-cols-2")}>
      <div className="flex min-w-0 flex-col gap-2">
        <label className={label} htmlFor="s-ph">
          {t.phone}
        </label>
        <input
          id="s-ph"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
          className={cn(inputCls, "font-mono")}
        />
        {errText(errs.phone)}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <label className={label} htmlFor="s-em">
          {t.email}
        </label>
        <input
          id="s-em"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="hello@example.com"
          className={inputCls}
        />
        {errText(errs.email)}
      </div>
      <div className={cn("flex min-w-0 flex-col gap-2", bp !== "phone" && "col-span-2")}>
        <label className={label} htmlFor="s-ad">
          {t.pickup}
        </label>
        <textarea
          id="s-ad"
          value={pickup}
          maxLength={500}
          onChange={(e) => setPickup(e.target.value)}
          placeholder={t.pickupPh}
          className={cn(
            inputCls,
            "h-auto resize-y py-2 leading-5",
            bp === "desk" ? "min-h-16" : "min-h-[72px]",
          )}
        />
      </div>
    </div>
  );
  const shopCard = section(
    "shop",
    <>
      <div className={cardH}>
        <h2 className={cardT}>{t.shopTitle}</h2>
        {bp === "phone" ? null : <p className={cardD}>{t.shopDesc}</p>}
      </div>
      <div className={cardB}>{shopFields}</div>
      {bp === "phone" ? saveBtn(saveShop) : null}
      {footer(saveBtn(saveShop))}
    </>,
  );

  /* ── ডেলিভারি চার্জ ───────────────────────────────────────────── */
  const feeInput = (id: string, lbl: string, val: string, set: (v: string) => void) => (
    <div className="flex min-w-0 flex-col gap-2">
      <label className={label} htmlFor={id}>
        {lbl}
      </label>
      <div className={inputCls}>
        <span className="text-muted-foreground">৳</span>
        <input
          id={id}
          inputMode="decimal"
          value={val}
          onChange={(e) => set(e.target.value)}
          className="min-w-0 flex-auto bg-transparent tabular-nums outline-none"
        />
      </div>
    </div>
  );
  const feesCard = section(
    "delivery",
    <>
      <div className={cardH}>
        <h2 className={cardT}>{t.deliveryTitle}</h2>
        {bp === "phone" ? null : <p className={cardD}>{t.deliveryDesc}</p>}
      </div>
      <div className={cardB}>
        <div className={cn("grid grid-cols-2", bp === "phone" ? "gap-2.5" : "gap-4")}>
          {feeInput("d-in", t.feeIn, feeIn, setFeeIn)}
          {feeInput("d-out", t.feeOut, feeOut, setFeeOut)}
        </div>
        {errText(errs.fees)}
      </div>
      {bp === "phone" ? saveBtn(saveFees) : null}
      {footer(saveBtn(saveFees))}
    </>,
  );

  /* ── কুরিয়ার: Steadfast ───────────────────────────────────────── */
  const connBadge = sf.connected ? (
    <Badge className={okBadge} dot>
      {bp === "phone" ? t.connectedShort : t.connected}
    </Badge>
  ) : (
    <Badge className="bg-muted text-foreground">{t.notConnected}</Badge>
  );
  const kcard = (lbl: string, value: string, big = false) => (
    <div className="border-border flex min-w-0 flex-col gap-1.5 rounded-xl border bg-white p-4">
      <span className="text-muted-foreground text-xs leading-4">{lbl}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          big
            ? bp === "desk"
              ? "text-[22px] leading-[30px]"
              : "text-xl"
            : "text-[15px] leading-[30px]",
        )}
      >
        {value}
      </span>
    </div>
  );
  const keyFields = (
    <div className="grid grid-cols-2 gap-4">
      {readOnlyField(
        "c-key",
        t.apiKey,
        sf.apiKey ?? "—",
        smallBtn(t.change, () => setKeysOpen(true)),
      )}
      {readOnlyField(
        "c-sec",
        t.secretKey,
        sf.secretKey ?? "—",
        smallBtn(t.change, () => setKeysOpen(true)),
      )}
    </div>
  );
  const eventTag = (
    <div className="flex flex-wrap items-center gap-2">
      {bp === "phone" ? null : (
        <span className="text-muted-foreground text-xs leading-4">{t.events}</span>
      )}
      {["delivery_status", "tracking_update"].map((e) => (
        <span
          key={e}
          className="border-border inline-flex h-[22px] items-center rounded-sm border bg-white px-2 font-mono text-xs"
        >
          {e}
        </span>
      ))}
    </div>
  );
  const eventsTable = (
    <table className="border-border w-full border-separate border-spacing-0 overflow-hidden rounded-[10px] border text-sm">
      <thead>
        <tr className="[&>th]:border-border [&>th]:text-muted-foreground [&>th]:h-10 [&>th]:border-b [&>th]:px-3 [&>th]:text-left [&>th]:text-[13px] [&>th]:font-medium">
          <th>{t.colTime}</th>
          <th>{t.colConsignment}</th>
          <th>{t.colType}</th>
          <th>{t.colStatus}</th>
          <th>{t.colResult}</th>
        </tr>
      </thead>
      <tbody>
        {sf.events.length === 0 ? (
          <tr>
            <td colSpan={5} className="text-muted-foreground px-3 py-4 text-center text-xs">
              {t.noEvents}
            </td>
          </tr>
        ) : null}
        {sf.events.slice(0, bp === "desk" ? 5 : 20).map((e) => (
          <tr
            key={e.id}
            className="[&>td]:border-border [&>td]:border-b [&>td]:px-3 [&>td]:py-2.5 last:[&>td]:border-b-0"
          >
            <td className="text-xs whitespace-nowrap">{relativeTime(e.at, lang)}</td>
            <td className="font-mono text-xs">{e.consignment ?? "—"}</td>
            <td className="font-mono text-xs">{e.type ?? "—"}</td>
            <td className="font-mono text-xs">{e.status ?? "—"}</td>
            <td>
              <Badge
                className={
                  e.result === "no_order"
                    ? dangerBadge
                    : e.result === "accepted"
                      ? okBadge
                      : "bg-muted text-foreground"
                }
              >
                {t.result[e.result]}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const webhookFields = (
    <>
      {readOnlyField(
        "wh-url",
        bp === "phone" ? (
          t.callback
        ) : (
          <>
            {t.callback} <span className="text-muted-foreground font-normal">{t.callbackHint}</span>
          </>
        ),
        sf.callbackUrl,
        smallBtn(t.copy, () => copy(sf.callbackUrl)),
      )}
      {readOnlyField(
        "wh-tok",
        t.token,
        sf.tokenMasked ?? "—",
        <>
          {smallBtn(t.copy, () => sf.token && copy(sf.token), !sf.token)}
          {bp === "phone"
            ? null
            : smallBtn(
                t.newToken,
                () => run(() => newWebhookToken(), t.newTokenDone),
                !sf.connected,
              )}
        </>,
        bp === "desk" ? t.tokenHelp : undefined,
      )}
    </>
  );
  const webhookBadge = sf.token ? (
    <Badge className={okBadge} dot={bp !== "tab"}>
      {t.active}
    </Badge>
  ) : (
    <Badge className="bg-muted text-foreground">{t.inactive}</Badge>
  );
  const disconnectBtn = sf.connected ? (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(() => disconnectSteadfast(), t.disconnected)}
      className={btn({
        variant: "ghost",
        size: bp === "desk" ? "sm" : "lg",
        className: "text-[#b91c1c]",
      })}
    >
      {t.disconnect}
    </button>
  ) : (
    <span />
  );
  const testBtn = (cls = "") => (
    <button
      type="button"
      disabled={pending || !sf.connected}
      onClick={test}
      className={btn({ variant: "outline", size: bp === "desk" ? "sm" : "lg", className: cls })}
    >
      {bp === "desk" ? <RefreshCw aria-hidden /> : null}
      {t.test}
    </button>
  );

  const courierDesk = section(
    "courier",
    <>
      <div className="flex items-start justify-between gap-3 px-6 pt-5">
        <div>
          <h2 className={cardT}>{t.courierTitle}</h2>
          <p className={cardD}>{t.courierDesc}</p>
        </div>
        {connBadge}
      </div>
      <div className="flex flex-col gap-4 px-6 pt-4 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {kcard(t.balance, sf.balance !== null ? formatTaka(sf.balance) : "—", true)}
          {kcard(t.lastTest, when(sf.checkedAt))}
          {kcard(t.lastSync, when(sf.syncedAt))}
        </div>
        {keyFields}
        <p className="text-muted-foreground text-xs leading-4">{t.keysHelp}</p>
        <hr className="border-border" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-medium">{t.webhookTitle}</div>
            <div className="text-muted-foreground text-xs leading-4">{t.webhookDesc}</div>
          </div>
          {webhookBadge}
        </div>
        {webhookFields}
        {eventTag}
        <div>
          <div className="mb-1.5 text-xs leading-4 font-medium">{t.recent}</div>
          {eventsTable}
        </div>
        <p className="text-muted-foreground text-xs leading-4">{t.manualSync}</p>
      </div>
      {footer(
        <>
          {disconnectBtn}
          {testBtn()}
        </>,
        true,
      )}
    </>,
  );

  const courierTab = section(
    "courier",
    <>
      <div className="flex items-start justify-between gap-3 px-6 pt-5">
        <div>
          <h2 className={cardT}>{t.courierTitle}</h2>
          <p className={cardD}>{t.courierDesc}</p>
        </div>
        {connBadge}
      </div>
      <div className="flex flex-col gap-4 px-6 pt-4 pb-6">
        <div className="grid grid-cols-3 gap-2.5">
          {kcard(t.balance, sf.balance !== null ? formatTaka(sf.balance) : "—", true)}
          {kcard(t.lastTest, when(sf.checkedAt))}
          {kcard(t.lastSync, when(sf.syncedAt))}
        </div>
        {keyFields}
        <hr className="border-border" />
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">{t.webhookTitle}</div>
            <div className="text-muted-foreground text-xs leading-4">{t.webhookDescTab}</div>
          </div>
          {webhookBadge}
        </div>
        {webhookFields}
        {eventTag}
        <div className="flex flex-wrap items-center gap-2">
          {testBtn()}
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className={btn({ variant: "outline", size: "lg" })}
          >
            {t.eventLog}
          </button>
          <span className="flex-auto" />
          {disconnectBtn}
        </div>
      </div>
    </>,
  );

  const courierPhone = (
    <>
      {section(
        "courier",
        <>
          <div className="flex items-center justify-between gap-2">
            <div className={cardT}>{t.courierTitle}</div>
            {connBadge}
          </div>
          <div className="border-border flex items-center justify-between rounded-[10px] border bg-[#fafafa] p-3">
            <span className="text-muted-foreground text-xs leading-4">{t.balance}</span>
            <span className="text-xl font-semibold tabular-nums">
              {sf.balance !== null ? formatTaka(sf.balance) : "—"}
            </span>
          </div>
          <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs leading-4">
            <dt className="text-muted-foreground">{t.lastTest}</dt>
            <dd className="m-0 text-right">{when(sf.checkedAt)}</dd>
            <dt className="text-muted-foreground">{t.apiKey}</dt>
            <dd className="m-0 text-right font-mono">{sf.apiKey ?? "—"}</dd>
            <dt className="text-muted-foreground">{t.secretKey}</dt>
            <dd className="m-0 text-right font-mono">{sf.secretKey ?? "—"}</dd>
          </dl>
          <div className="flex gap-2">
            {testBtn("flex-1 basis-0")}
            <button
              type="button"
              onClick={() => setKeysOpen(true)}
              className={btn({ variant: "outline", size: "lg", className: "flex-1 basis-0" })}
            >
              {sf.connected ? t.changeKeys : t.connect}
            </button>
          </div>
          {sf.connected ? disconnectBtn : null}
        </>,
      )}
      {section(
        "webhook",
        <>
          <div className="flex items-center justify-between gap-2">
            <div className={cardT}>{t.webhookTitleShort}</div>
            {webhookBadge}
          </div>
          <p className="text-muted-foreground text-xs leading-4">
            {t.webhookDescPhone}{" "}
            {sf.events[0] ? fill(t.lastEvent, { t: relativeTime(sf.events[0].at, lang) }) : null}
          </p>
          {webhookFields}
          {eventTag}
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className={btn({ variant: "outline", size: "lg", block: true })}
          >
            {t.eventLog}
          </button>
        </>,
      )}
    </>
  );

  /* ── পেমেন্ট পদ্ধতি ───────────────────────────────────────────── */
  const codRow = (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        bp !== "phone" && "border-border rounded-[10px] border",
        bp === "desk" ? "p-3" : bp === "tab" ? "p-3.5" : "",
      )}
    >
      <div>
        <div className="font-medium">{bp === "phone" ? t.codOnShort : t.codOn}</div>
        <div className="text-muted-foreground text-xs leading-4">
          {bp === "phone" ? t.codHelpPhone : t.codHelp}
        </div>
      </div>
      <Switch
        on={data.codEnabled}
        label={t.codOn}
        large={large}
        disabled={pending}
        onClick={() =>
          data.codEnabled ? setCodAsk(true) : run(() => setCod({ enabled: true }), t.codSaved.on)
        }
      />
    </div>
  );
  const others = (
    <>
      <div className="mt-1 text-xs leading-4 font-medium">
        {t.others} <span className="text-muted-foreground font-normal">{t.othersNote}</span>
      </div>
      {OTHER_METHODS.map((m) => (
        <div
          key={m.name}
          className="flex items-center justify-between gap-3 rounded-[10px] border border-dashed border-[#d4d4d4] bg-[#fafafa] p-3"
        >
          <div>
            <div className="flex items-center gap-1.5 font-medium">
              {m.name} <Badge className="bg-muted text-foreground">{t.notOn}</Badge>
            </div>
            <div className="text-muted-foreground text-xs leading-4">{t[m.kind]}</div>
          </div>
          <Switch on={false} label={m.name} large={large} disabled />
        </div>
      ))}
    </>
  );
  const payCard = section(
    "cod",
    <>
      <div className={cardH}>
        <h2 className={cardT}>{t.payTitle}</h2>
        {bp === "phone" ? null : <p className={cardD}>{t.payDesc}</p>}
      </div>
      <div className={cn(cardB, "flex flex-col gap-3")}>
        {codRow}
        {others}
        {bp === "desk" ? (
          <div className="border-border flex items-start gap-3 rounded-[10px] border bg-white px-4 py-3">
            <Info className="text-muted-foreground mt-0.5 size-4 flex-none" aria-hidden />
            <p className="text-xs leading-4">{t.payInfo}</p>
          </div>
        ) : bp === "phone" ? (
          <p className="text-muted-foreground text-xs leading-4">{t.payInfoPhone}</p>
        ) : null}
      </div>
    </>,
  );

  const shareCard = <ShareCardsCard t={t.share} summary={shareCards} bp={bp} />;

  const dialogs = (
    <>
      <KeysDialog open={keysOpen} onOpenChange={setKeysOpen} t={t} onSaved={testToast} />
      <Dialog.Root open={codAsk} onOpenChange={setCodAsk}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="border-border fixed top-1/2 left-1/2 z-50 flex w-[420px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border bg-white p-5 shadow-lg">
            <div className="flex flex-col gap-1.5">
              <Dialog.Title className="text-base leading-6 font-semibold">
                {t.codOffTitle}
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground text-sm leading-5">
                {t.codOffBody}
              </Dialog.Description>
            </div>
            <div className="flex justify-end gap-2">
              <Dialog.Close className={btn({ variant: "outline", size: "lg" })}>
                {t.codOffKeep}
              </Dialog.Close>
              <button
                type="button"
                disabled={pending}
                className={btn({ variant: "destructive", size: "lg" })}
                onClick={() => {
                  setCodAsk(false);
                  run(() => setCod({ enabled: false }), t.codSaved.off);
                }}
              >
                {t.codOffConfirm}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={logOpen} onOpenChange={setLogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            aria-describedby={undefined}
            className="border-border fixed top-1/2 left-1/2 z-50 flex max-h-[85dvh] w-[680px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl border bg-white p-5 shadow-lg"
          >
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-base leading-6 font-semibold">{t.recent}</Dialog.Title>
              <Dialog.Close
                aria-label={t.close}
                className={btn({ variant: "ghost", size: "iconLg" })}
              >
                <X aria-hidden />
              </Dialog.Close>
            </div>
            <ScrollArea className="min-h-0 flex-1" viewportClassName="max-h-[60dvh]">
              <div className="overflow-x-auto">{eventsTable}</div>
            </ScrollArea>
            <p className="text-muted-foreground text-xs leading-4">{t.manualSync}</p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );

  /* ───── Phone (<768): Settings-Phone ───── */
  if (bp === "phone")
    return (
      <div className="flex h-full flex-col">
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
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            {shopCard}
            {feesCard}
            {courierPhone}
            {payCard}
            {shareCard}
          </div>
        </ScrollArea>
        {dialogs}
      </div>
    );

  /* ───── Tablet 834 (768–1023): Settings-Tablet, one save bar for shop + fees ───── */
  if (bp === "tab")
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex max-w-[760px] flex-col gap-4 px-6 pt-5 pb-8">
            <div>
              <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
              <p className="text-muted-foreground text-[13px] leading-4">{t.sub}</p>
            </div>
            {shopCard}
            {feesCard}
            {courierTab}
            {payCard}
            {shareCard}
          </div>
        </ScrollArea>
        <div className="border-border flex flex-none items-center justify-end border-t bg-white px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,.05)]">
          <button
            type="button"
            disabled={pending}
            onClick={saveBoth}
            className={btn({ size: "lg" })}
          >
            {t.save}
          </button>
        </div>
        {dialogs}
      </div>
    );

  /* ───── Desktop (≥1024): Settings-Desktop ───── */
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="wide:px-8 wide:pt-6 wide:pb-12 flex flex-col gap-6 px-6 pt-5 pb-8">
          <div>
            <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
            <p className="text-muted-foreground text-[13px] leading-4">{t.sub}</p>
          </div>
          <div className="flex flex-wrap items-start gap-8">
            <nav
              aria-label={t.navAria}
              className="sticky top-0 flex flex-[0_0_180px] flex-col gap-0.5"
            >
              {(["shop", "delivery", "courier", "cod", "share"] as const).map((k) => (
                <a
                  key={k}
                  href={`#${k}`}
                  className="hover:bg-muted rounded-md px-2.5 py-1.5 text-sm text-[#525252]"
                >
                  {t.nav[k]}
                </a>
              ))}
            </nav>
            <div className="flex max-w-[820px] min-w-0 flex-[999_1_560px] flex-col gap-4">
              {shopCard}
              {feesCard}
              {courierDesk}
              {payCard}
              {shareCard}
            </div>
          </div>
        </div>
      </ScrollArea>
      {dialogs}
    </div>
  );
}

/** "বদলান" / "যুক্ত করুন": new API + Secret keys, tested against Steadfast before saving. */
function KeysDialog({
  open,
  onOpenChange,
  t,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  t: ST;
  onSaved: (r: SteadfastResult) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [pending, start] = useTransition();
  const input =
    "border-input focus:border-primary h-11 w-full rounded-md border bg-white px-3 font-mono text-[13px] shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)]";
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setApiKey("");
          setSecretKey("");
        }
        onOpenChange(v);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="border-border fixed top-1/2 left-1/2 z-50 flex w-[440px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border bg-white p-5 shadow-lg"
        >
          <div>
            <Dialog.Title className="text-base leading-6 font-semibold">{t.keysTitle}</Dialog.Title>
            <p className="text-muted-foreground text-[13px] leading-5">{t.keysBody}</p>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium">
            {t.apiKey}
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              className={input}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            {t.secretKey}
            <input
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              type="password"
              autoComplete="off"
              className={input}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Dialog.Close className={btn({ variant: "outline", size: "lg" })}>
              {t.cancel}
            </Dialog.Close>
            <button
              type="button"
              disabled={pending || apiKey.trim().length < 8 || secretKey.trim().length < 8}
              onClick={() =>
                start(async () => {
                  try {
                    const r = await saveSteadfastKeys({ apiKey, secretKey });
                    onSaved(r);
                    if (r.ok) onOpenChange(false);
                  } catch {
                    onSaved({ ok: false, reason: "network" });
                  }
                })
              }
              className={btn({ size: "lg" })}
            >
              {t.keysSave}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
