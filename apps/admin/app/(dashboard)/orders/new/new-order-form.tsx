"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn, formatTaka } from "@repo/ui/lib/utils";
import {
  DELIVERY_FEES,
  MANUAL_ORDER_SOURCES,
  zoneForDistrict,
  type AdminLang,
  type ManualOrderSource,
} from "@repo/validators";
import { ChevronLeft, Minus, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createManualOrder } from "@/app/actions/orders";
import {
  AddressFields,
  addressErrors,
  EMPTY_ADDRESS,
  Field,
  fieldCls,
  type AddressErrors,
  type AddressValue,
} from "@/components/address-fields";
import { btn } from "@/components/btn";
import { Crumb } from "@/components/shell/shell-context";
import { useToast } from "@/components/toast";
import { digits, fill } from "@/lib/format";
import { body, card, CardHead, kv } from "../card";
import type { OT } from "../orders-parts";

export interface SellableVariant {
  id: number;
  name: string;
  nameBn: string | null;
  label: string;
  /** Paisa, display only: the server action re-reads prices. */
  price: number;
  stock: number;
}

type Method = "cod" | "bkash" | "nagad";
const METHODS: Method[] = ["cod", "bkash", "nagad"];

const chip = (on: boolean) =>
  cn(
    "inline-flex h-9 flex-none cursor-pointer items-center rounded-full border px-3 text-[13px] font-medium whitespace-nowrap max-desk:h-11 max-desk:px-4 max-desk:text-sm",
    on ? "border-primary bg-primary-soft text-primary" : "border-border bg-white text-foreground",
  );

export function NewOrderForm({
  variants,
  t,
  lang,
}: {
  variants: SellableVariant[];
  t: OT;
  lang: AdminLang;
}) {
  const c = t.create;
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [source, setSource] = useState<ManualOrderSource>("in_person");
  const [lines, setLines] = useState<{ id: number; qty: number }[]>([]);
  const [q, setQ] = useState("");
  const [addr, setAddr] = useState<AddressValue>(EMPTY_ADDRESS);
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<Method>("cod");
  const [paid, setPaid] = useState(false);
  const [txn, setTxn] = useState("");
  const [coupon, setCoupon] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<
    AddressErrors & {
      email?: string | undefined;
      items?: string | undefined;
      coupon?: string | undefined;
    }
  >({});
  const [formError, setFormError] = useState("");

  const byId = useMemo(() => new Map(variants.map((v) => [v.id, v])), [variants]);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return variants
      .filter((v) => `${v.name} ${v.nameBn ?? ""} ${v.label}`.toLowerCase().includes(s))
      .slice(0, 8);
  }, [q, variants]);

  const subtotal = lines.reduce((n, l) => n + (byId.get(l.id)?.price ?? 0) * l.qty, 0);
  const zone = zoneForDistrict(addr.district || undefined);
  const fee = zone ? DELIVERY_FEES[zone] : 0;

  function add(v: SellableVariant) {
    setLines((ls) =>
      ls.some((l) => l.id === v.id)
        ? ls.map((l) => (l.id === v.id ? { ...l, qty: Math.min(l.qty + 1, v.stock) } : l))
        : [...ls, { id: v.id, qty: 1 }],
    );
    setQ("");
    setErrors((e) => ({ ...e, items: undefined }));
  }
  const setQty = (id: number, qty: number) =>
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, qty } : l)));

  function submit() {
    const errs: typeof errors = addressErrors(addr, t.address);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = t.address.errEmail;
    if (!lines.length) errs.items = c.errNoItems;
    setErrors(errs);
    if (Object.keys(errs).length) {
      setFormError(c.errFields);
      return;
    }
    setFormError("");
    start(async () => {
      try {
        const r = await createManualOrder({
          ...addr,
          email,
          source,
          note,
          items: lines.map((l) => ({ variantId: l.id, quantity: l.qty })),
          paymentMethod: method,
          paid,
          transactionId: txn,
          couponCode: coupon,
        });
        if (r.ok) {
          toast({ tone: "ok", title: c.created });
          router.push(`/orders/${r.id}` as Route);
          return;
        }
        if (r.reason === "location") setErrors({ upazila: t.address.errPick });
        if (r.reason === "coupon") setErrors({ coupon: c.errCoupon });
        setFormError(
          r.reason === "stock"
            ? c.errStock
            : r.reason === "product"
              ? c.errProduct
              : r.reason === "coupon"
                ? c.errCoupon
                : c.errFields,
        );
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  const submitBtn = (className: string) => (
    <button
      type="button"
      disabled={pending}
      onClick={submit}
      className={btn({ size: "lg", className })}
    >
      {c.submit}
    </button>
  );

  return (
    <div className="flex h-full flex-col">
      <Crumb value={c.title} />

      {/* Phone header */}
      <header className="border-border tab:hidden sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-white pr-2 pl-1">
        <Link
          href="/orders"
          aria-label={t.detail.backPhone}
          className={btn({ variant: "ghost", size: "iconLg", className: "[&_svg]:size-5" })}
        >
          <ChevronLeft aria-hidden />
        </Link>
        <b className="flex-auto text-lg leading-6 font-semibold">{c.title}</b>
      </header>

      {/* Tablet / desktop header */}
      <div className="tab:flex wide:px-8 wide:pt-6 wide:pb-6 hidden flex-none flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/orders"
            aria-label={t.detail.backAria}
            className={btn({
              variant: "outline",
              size: "iconLg",
              className: "wide:hidden [&_svg]:size-5",
            })}
          >
            <ChevronLeft aria-hidden />
          </Link>
          <div>
            <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{c.title}</h1>
            <p className="text-muted-foreground text-[13px] leading-5">{c.sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/orders"
            className={btn({
              variant: "outline",
              size: "lg",
              className: "wide:h-9 wide:px-4 wide:text-sm",
            })}
          >
            {c.cancel}
          </Link>
          {submitBtn("wide:h-9 wide:px-4 wide:text-sm")}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="tab:gap-4 tab:px-6 tab:pt-0 tab:pb-8 wide:px-8 wide:pb-12 desk:flex-row desk:flex-wrap desk:items-start flex flex-col gap-3 p-4 pb-[110px]">
          {formError ? (
            <p role="alert" className="text-destructive max-tab:hidden desk:w-full text-sm">
              {formError}
            </p>
          ) : null}
          <div className="desk:flex-[1.6_1_0] max-tab:gap-3 flex min-w-0 flex-col gap-4">
            <section className={card}>
              <CardHead title={c.source} />
              <div className={cn(body, "flex-row flex-wrap gap-2")}>
                {MANUAL_ORDER_SOURCES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={source === s}
                    onClick={() => setSource(s)}
                    className={chip(source === s)}
                  >
                    {t.detail.sources[s]}
                  </button>
                ))}
              </div>
            </section>

            <section className={card}>
              <CardHead title={c.items} desc={c.itemsSub} phoneSub={c.itemsSub} />
              <div className={cn(body, "gap-3")}>
                <div className="relative">
                  <Search
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                    aria-hidden
                  />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={c.searchPh}
                    aria-label={c.searchPh}
                    className={cn(fieldCls(!!errors.items, true), "wide:h-9 wide:text-sm pl-9")}
                  />
                  {q.trim() ? (
                    <div className="border-border absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-white shadow-md">
                      {matches.length === 0 ? (
                        <p className="text-muted-foreground p-3 text-sm">{c.noMatch}</p>
                      ) : (
                        matches.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            disabled={v.stock <= 0}
                            onClick={() => add(v)}
                            className="hover:bg-accent flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm disabled:opacity-50"
                          >
                            <span className="min-w-0 flex-auto">
                              <span className="block font-medium">{v.name}</span>
                              <span className="text-muted-foreground block text-xs leading-4">
                                {[v.nameBn, v.label].filter(Boolean).join(" · ")} ·{" "}
                                {v.stock > 0
                                  ? fill(c.inStock, { n: digits(v.stock, lang) })
                                  : c.outOfStock}
                              </span>
                            </span>
                            <span className="tabular-nums">{formatTaka(v.price)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
                {errors.items ? (
                  <span className="text-destructive -mt-1 text-xs leading-4">{errors.items}</span>
                ) : null}

                {lines.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{c.noItems}</p>
                ) : (
                  lines.map((l) => {
                    const v = byId.get(l.id);
                    if (!v) return null;
                    return (
                      <div key={l.id} className="flex items-center gap-3">
                        <div className="min-w-0 flex-auto">
                          <div className="font-medium">{v.name}</div>
                          <div className="text-muted-foreground text-xs leading-4">
                            {v.label} · <span className="tabular-nums">{formatTaka(v.price)}</span>{" "}
                            · {fill(c.inStock, { n: digits(v.stock, lang) })}
                          </div>
                        </div>
                        <div className="flex flex-none items-center gap-1.5">
                          <button
                            type="button"
                            aria-label={c.less}
                            disabled={l.qty <= 1}
                            onClick={() => setQty(l.id, l.qty - 1)}
                            className={btn({
                              variant: "outline",
                              size: "iconSm",
                              className: "max-desk:size-11",
                            })}
                          >
                            <Minus aria-hidden />
                          </button>
                          <span className="w-6 text-center tabular-nums">{l.qty}</span>
                          <button
                            type="button"
                            aria-label={c.moreQty}
                            disabled={l.qty >= v.stock}
                            onClick={() => setQty(l.id, l.qty + 1)}
                            className={btn({
                              variant: "outline",
                              size: "iconSm",
                              className: "max-desk:size-11",
                            })}
                          >
                            <Plus aria-hidden />
                          </button>
                        </div>
                        <span className="w-20 flex-none text-right font-medium tabular-nums">
                          {formatTaka(v.price * l.qty)}
                        </span>
                        <button
                          type="button"
                          aria-label={c.remove}
                          onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
                          className={btn({
                            variant: "ghost",
                            size: "iconSm",
                            className: "max-desk:size-11",
                          })}
                        >
                          <X aria-hidden />
                        </button>
                      </div>
                    );
                  })
                )}

                <dl className={cn(kv, "border-border border-t pt-3")}>
                  <dt>{t.subtotal}</dt>
                  <dd>{formatTaka(subtotal)}</dd>
                  <dt>{t.discount}</dt>
                  <dd>—</dd>
                  <dt>{t.delivery}</dt>
                  <dd>{zone ? formatTaka(fee) : "—"}</dd>
                  <dt className="text-foreground font-medium">{t.total}</dt>
                  <dd className="text-base font-semibold">{formatTaka(subtotal + fee)}</dd>
                </dl>
              </div>
            </section>

            <section className={card}>
              <CardHead title={c.customer} />
              <div className={cn(body, "gap-3")}>
                <AddressFields
                  value={addr}
                  onChange={setAddr}
                  errors={errors}
                  t={t.address}
                  idPrefix="no"
                  large
                />
                <Field
                  label={
                    <>
                      {c.email}{" "}
                      <span className="text-muted-foreground font-normal">{c.optional}</span>
                    </>
                  }
                  htmlFor="no-email"
                  error={errors.email}
                >
                  <input
                    id="no-email"
                    type="email"
                    value={email}
                    maxLength={255}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldCls(!!errors.email, true)}
                  />
                </Field>
                {zone ? (
                  <p className="text-muted-foreground text-xs leading-4">
                    {fill(zone === "in" ? c.deliveryIn : c.deliveryOut, { v: formatTaka(fee) })} ·{" "}
                    {c.deliveryHelp}
                  </p>
                ) : null}
              </div>
            </section>
          </div>

          <div className="desk:flex-[1_1_0] max-tab:gap-3 flex min-w-0 flex-col gap-4">
            <section className={card}>
              <CardHead title={c.payment} />
              <div className={cn(body, "gap-3")}>
                <div className="flex flex-wrap gap-2">
                  {METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={method === m}
                      onClick={() => setMethod(m)}
                      className={chip(method === m)}
                    >
                      {t.methods[m]}
                    </button>
                  ))}
                </div>
                <label className="wide:min-h-0 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={paid}
                    onChange={(e) => setPaid(e.target.checked)}
                    className="accent-primary size-4"
                  />
                  {c.paid}
                </label>
                <Field
                  label={
                    <>
                      {c.txn}{" "}
                      <span className="text-muted-foreground font-normal">{c.optional}</span>
                    </>
                  }
                  htmlFor="no-txn"
                >
                  <input
                    id="no-txn"
                    value={txn}
                    maxLength={120}
                    onChange={(e) => setTxn(e.target.value)}
                    className={cn(fieldCls(false, true), "font-mono")}
                  />
                </Field>
              </div>
            </section>

            <section className={card}>
              <CardHead title={c.coupon} />
              <div className={cn(body, "gap-2")}>
                <input
                  value={coupon}
                  maxLength={40}
                  placeholder={c.couponPh}
                  aria-label={c.coupon}
                  onChange={(e) => {
                    setCoupon(e.target.value.toUpperCase());
                    setErrors((er) => ({ ...er, coupon: undefined }));
                  }}
                  className={cn(fieldCls(!!errors.coupon, true), "font-mono")}
                />
                {errors.coupon ? (
                  <span className="text-destructive text-xs leading-4">{errors.coupon}</span>
                ) : null}
              </div>
            </section>

            <section className={card}>
              <CardHead title={c.note} />
              <div className={cn(body, "gap-3")}>
                <textarea
                  value={note}
                  maxLength={500}
                  placeholder={c.notePh}
                  aria-label={c.note}
                  onChange={(e) => setNote(e.target.value)}
                  className="border-input focus:border-primary placeholder:text-muted-foreground min-h-[72px] w-full resize-y rounded-md border bg-white px-3 py-2 text-sm leading-5 shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)]"
                />
                <p className="text-muted-foreground text-xs leading-4">{c.afterHelp}</p>
              </div>
            </section>
          </div>
        </div>
      </ScrollArea>

      {/* Phone: fixed bottom bar */}
      <div className="border-border tab:hidden fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t bg-white px-4 pt-3 pb-6">
        {formError ? (
          <p role="alert" className="text-destructive text-sm">
            {formError}
          </p>
        ) : null}
        {submitBtn("w-full")}
      </div>
    </div>
  );
}
