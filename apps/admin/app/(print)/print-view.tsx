"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn, formatTaka } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import { ChevronLeft, Printer } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { btn } from "@/components/btn";
import { digits, fill } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import type { PrintOrder, ShopInfo } from "@/lib/order-print";

type Mode = "both" | "slip" | "label";
const MODES: Mode[] = ["both", "slip", "label"];

export type PrintViewOrder = PrintOrder & { placed: string };

/**
 * প্রিন্ট (OrderPrint-Desktop, desktop only): A4 packing slip and 4×6 shipping label per order.
 * The bar is screen-only; printing uses named @page sizes from globals.css (slip A4, label 4×6).
 */
export function PrintView({
  orders,
  shop,
  t,
  zones,
  lang,
  back,
}: {
  orders: PrintViewOrder[];
  shop: ShopInfo;
  t: Dict["print"];
  zones: Dict["orders"]["zone"];
  lang: AdminLang;
  back: { href: string; label: string };
}) {
  const [mode, setMode] = useState<Mode>("both");
  const pages = orders.length * (mode === "both" ? 2 : 1);
  // Narrow screens (no board): shrink each paper preview to fit; printing always uses full size.
  const width = useSyncExternalStore(
    onResize,
    () => window.innerWidth,
    () => 1440,
  );
  const fit = (paper: number) => Math.min(1, (width - 32) / paper);
  const fitVars = {
    "--fit-slip": fit(720),
    "--fit-label": fit(384),
  } as React.CSSProperties;
  return (
    <div className="flex h-dvh flex-col bg-[#e5e5e5] print:block print:h-auto print:bg-white">
      {/* Desktop: one 64px row (the board). Below 1024 (no board): back + print on the first row,
          the three modes full width under them so nothing scrolls or wraps mid-word. */}
      <div className="border-border desk:h-16 desk:flex-nowrap desk:px-6 desk:py-0 flex flex-none flex-wrap items-center gap-x-3 gap-y-2.5 border-b bg-white px-4 py-3 print:hidden">
        <Link
          href={back.href as Route}
          className={btn({
            variant: "ghost",
            size: "sm",
            className:
              "max-desk:h-11 max-desk:min-w-0 max-desk:flex-1 max-desk:basis-0 max-desk:justify-start max-desk:px-2 max-desk:text-[15px]",
          })}
        >
          <ChevronLeft aria-hidden />
          <span className="truncate">{back.label}</span>
        </Link>
        <span className="bg-border desk:block hidden h-5 w-px" aria-hidden />
        <span className="desk:block hidden font-medium">{t.title}</span>
        <div
          role="tablist"
          className="bg-muted desk:ml-2 desk:inline-flex desk:h-[38px] desk:w-auto max-desk:order-last grid w-full grid-cols-3 items-stretch gap-0.5 rounded-[10px] p-[3px]"
        >
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "desk:h-8 desk:whitespace-nowrap inline-flex min-h-10 items-center justify-center rounded-[7px] px-3 py-1 text-center text-sm leading-tight font-medium",
                mode === m ? "text-foreground bg-white shadow-xs" : "text-muted-foreground",
              )}
            >
              {t.modes[m]}
            </button>
          ))}
        </div>
        <span className="desk:block hidden flex-auto" />
        <span className="text-muted-foreground max-tab:hidden text-xs leading-4 whitespace-nowrap">
          {fill(t.summary, { n: digits(orders.length, lang), p: digits(pages, lang) })}
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className={btn({ className: "max-desk:h-11 max-desk:px-5 max-desk:text-[15px]" })}
        >
          <Printer aria-hidden />
          {t.print}
        </button>
        <span className="text-muted-foreground tab:hidden order-last w-full text-xs leading-4">
          {fill(t.summary, { n: digits(orders.length, lang), p: digits(pages, lang) })}
        </span>
      </div>

      <ScrollArea
        className="min-h-0 flex-1 print:block print:h-auto print:overflow-visible"
        viewportClassName="print:!overflow-visible print:!h-auto"
      >
        <div
          style={fitVars}
          className="max-desk:gap-6 max-desk:p-4 flex flex-col items-center gap-10 p-10 print:block print:p-0"
        >
          {orders.map((o) => (
            <div
              key={o.id}
              className="max-desk:gap-6 flex flex-wrap items-start justify-center gap-10 print:block"
            >
              {mode !== "label" ? <Slip o={o} t={t} zones={zones} /> : null}
              {mode !== "slip" ? <Label o={o} t={t} shop={shop} /> : null}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function onResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

const box = "inline-block size-3.5 rounded-[3px] border-[1.5px] border-[#0a0a0a]";

function Slip({
  o,
  t,
  zones,
}: {
  o: PrintViewOrder;
  t: Dict["print"];
  zones: Dict["orders"]["zone"];
}) {
  const cell = "border-b border-[#d4d4d4] px-2.5 py-2 text-left text-[13px]";
  const head =
    "border-b-[1.5px] border-[#0a0a0a] px-2.5 py-2 text-left text-[13px] font-semibold text-[#404040]";
  return (
    <article
      aria-label={t.slip}
      className="print-slip flex h-[1018px] w-[720px] [zoom:var(--fit-slip,1)] flex-col gap-6 bg-white px-[52px] py-12 text-[#0a0a0a] shadow-[0_2px_8px_rgba(0,0,0,.15)] print:h-[297mm] print:w-[210mm] print:[zoom:1] print:break-after-page print:px-[15mm] print:py-[14mm] print:shadow-none"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="bg-primary inline-flex size-10 flex-none items-center justify-center rounded-lg font-[family-name:var(--font-anek)] text-[22px] leading-none font-bold text-white print:[print-color-adjust:exact]"
          >
            আ
          </span>
          <div>
            <div className="text-lg font-semibold">{t.shop}</div>
            <div className="text-muted-foreground text-xs leading-4">{t.tagline}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold">{t.slip}</div>
          <div className="font-mono text-sm font-semibold">{o.number}</div>
          <div className="text-muted-foreground text-xs leading-4">{o.placed}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 border-t-[1.5px] border-b border-t-[#0a0a0a] border-b-[#d4d4d4] py-4">
        <div>
          <div className="text-muted-foreground text-xs leading-4">{t.recipient}</div>
          <div className="text-[15px] font-medium">{o.name}</div>
          <div className="font-mono text-xs">{o.phone}</div>
          <div className="mt-1">{o.address}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs leading-4">{t.courier}</div>
          <div className="font-medium">{o.courier || "—"}</div>
          <div className="flex items-center gap-1.5 text-xs leading-4">
            {t.consignment} <span className="font-mono">{o.consignment || "—"}</span>
          </div>
          <div className="text-xs leading-4">
            {t.tracking} <span className="font-mono">{o.tracking || "—"}</span>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={cn(head, "w-7")} />
            <th className={head}>{t.product}</th>
            <th className={head}>{t.size}</th>
            <th className={cn(head, "text-right")}>{t.qty}</th>
            <th className={cn(head, "text-right")}>{t.price}</th>
          </tr>
        </thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id}>
              <td className={cell}>
                <span className={box} />
              </td>
              <td className={cell}>
                {i.bn ? (
                  <>
                    <b className="font-semibold">{i.bn}</b>{" "}
                    <span className="text-muted-foreground">{i.en}</span>
                  </>
                ) : (
                  <b className="font-semibold">{i.en}</b>
                )}
              </td>
              <td className={cell}>{i.size}</td>
              <td className={cn(cell, "text-right tabular-nums")}>{i.qty}</td>
              <td className={cn(cell, "text-right tabular-nums")}>{formatTaka(i.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <dl className="[&_dt]:text-muted-foreground grid w-[280px] grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px] [&_dd]:m-0 [&_dd]:text-right [&_dd]:tabular-nums">
          <dt>{t.subtotal}</dt>
          <dd>{formatTaka(o.subtotal)}</dd>
          {o.discount ? (
            <>
              <dt>{t.discount}</dt>
              <dd>−{formatTaka(o.discount)}</dd>
            </>
          ) : null}
          <dt>{fill(t.delivery, { z: o.zone ? zones[o.zone] : "—" })}</dt>
          <dd>{formatTaka(o.shippingFee)}</dd>
          <dt className="!text-foreground border-t-[1.5px] border-[#0a0a0a] pt-2 text-[15px] font-semibold">
            {t.cod}
          </dt>
          <dd className="border-t-[1.5px] border-[#0a0a0a] pt-2 text-[15px] font-semibold">
            {formatTaka(o.cod)}
          </dd>
        </dl>
      </div>

      {o.note ? (
        <div className="rounded-lg border border-dashed border-[#a3a3a3] px-3.5 py-3">
          <div className="text-muted-foreground text-xs leading-4">{t.note}</div>
          <p className="whitespace-pre-line">{o.note}</p>
        </div>
      ) : null}

      <span className="flex-auto" />
      <div className="flex justify-between border-t border-[#d4d4d4] pt-3 text-xs text-[#525252]">
        <span>{t.packedBy}</span>
        <span>{t.checkedBy}</span>
        <span>{t.box}</span>
      </div>
    </article>
  );
}

function Label({ o, t, shop }: { o: PrintViewOrder; t: Dict["print"]; shop: ShopInfo }) {
  return (
    <article
      aria-label={t.label}
      className="print-label flex h-[576px] w-[384px] [zoom:var(--fit-label,1)] flex-col gap-3.5 border-2 border-[#0a0a0a] bg-white p-5 text-[#0a0a0a] shadow-[0_2px_8px_rgba(0,0,0,.15)] print:h-[6in] print:w-[4in] print:[zoom:1] print:break-after-page print:shadow-none"
    >
      <div className="flex items-center justify-between border-b-2 border-[#0a0a0a] pb-2.5">
        <div className="text-base font-bold">{o.courier || "—"}</div>
        <div className="font-mono text-[13px] font-semibold">{o.number}</div>
      </div>
      <div>
        <div className="text-[11px] leading-[14px] font-semibold tracking-[.04em]">
          {t.trackingCode}
        </div>
        <div className="font-mono text-[30px] leading-9 font-semibold tracking-[.06em]">
          {o.tracking || "—"}
        </div>
        <div className="flex items-center gap-1.5 text-xs leading-4">
          {t.consignment} <span className="font-mono font-medium">{o.consignment || "—"}</span>
        </div>
      </div>
      <div className="border-t border-[#0a0a0a] pt-2.5">
        <div className="text-[11px] leading-[14px] font-semibold">{t.recipient}</div>
        <div className="text-lg leading-6 font-semibold">{o.name}</div>
        <div className="font-mono text-base font-semibold">{o.phone}</div>
        <p className="mt-1 text-sm leading-5">{o.address}</p>
      </div>
      <div className="flex items-center justify-between rounded-md border-2 border-[#0a0a0a] px-3 py-2.5">
        <span className="font-semibold">{t.codCollect}</span>
        <span className="text-[26px] font-bold tabular-nums">{formatTaka(o.cod)}</span>
      </div>
      {o.note ? (
        <div className="text-xs leading-4">
          <b>{t.note}:</b> {o.note}
        </div>
      ) : null}
      <span className="flex-auto" />
      <div className="border-t border-[#0a0a0a] pt-2.5 text-xs leading-4">
        <b>{t.sender}</b> {t.shop}
        {shop.phone ? (
          <>
            {" · "}
            <span className="font-mono">{shop.phone}</span>
          </>
        ) : null}
        {shop.pickupAddress ? (
          <>
            <br />
            {shop.pickupAddress}
          </>
        ) : null}
      </div>
    </article>
  );
}
