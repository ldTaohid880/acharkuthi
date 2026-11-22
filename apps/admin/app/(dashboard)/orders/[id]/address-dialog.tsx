"use client";

import { cn, formatTaka } from "@repo/ui/lib/utils";
import { zoneForDistrict } from "@repo/validators";
import { Pencil } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState, useTransition } from "react";
import { updateOrderAddress } from "@/app/actions/orders";
import {
  AddressFields,
  addressErrors,
  type AddressErrors,
  type AddressValue,
} from "@/components/address-fields";
import { btn } from "@/components/btn";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { useToast } from "@/components/toast";
import type { OT } from "../orders-parts";

/**
 * "ঠিকানা বদলান" (owner request 2026-11-13, no board): only shown until the order is booked.
 * When the new district moves the order across the Dhaka line, a notice shows the new delivery
 * charge and total before saving (owner picked layout A: old amounts struck through).
 */
export function AddressDialog({
  id,
  initial,
  fees,
  zoneFees,
  t,
}: {
  id: number;
  initial: AddressValue;
  fees: { base: number; shippingFee: number; total: number };
  zoneFees: { in: number; out: number };
  t: OT;
}) {
  const d = t.detail;
  const a = t.address;
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [pending, start] = useTransition();

  const zone = zoneForDistrict(value.district || undefined);
  const newFee = zone ? zoneFees[zone] : fees.shippingFee;
  const feeChanges = zone !== null && newFee !== fees.shippingFee;
  const newTotal = fees.base + newFee;

  function save() {
    const errs = addressErrors(value, a);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    start(async () => {
      try {
        const r = await updateOrderAddress({ id, ...value });
        if (r.ok) {
          toast({ tone: "ok", title: d.addressSaved });
          setOpen(false);
        } else if (r.reason === "location") {
          setErrors({ upazila: a.errPick });
        } else {
          toast({ tone: "err", title: d.addressLocked });
          setOpen(false);
        }
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setValue(initial);
          setErrors({});
        }
      }}
    >
      <Dialog.Trigger
        className={btn({
          variant: "outline",
          size: "xs",
          className: "max-desk:h-11 max-desk:px-4 max-desk:text-[15px]",
        })}
      >
        <Pencil aria-hidden />
        {d.editAddress}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="border-border fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border bg-white shadow-lg"
        >
          <div className="max-tab:px-5 max-tab:pt-5 flex-none px-6 pt-6 pb-4">
            <Dialog.Title className="text-base leading-6 font-semibold">
              {d.editAddress}
            </Dialog.Title>
          </div>
          {/* Dialog max 100dvh − 32px, minus the title (~64px) and the button row (~84px): the
              fields scroll, Save stays reachable (owner scrolling rule, 2026-11-13). */}
          <ScrollArea className="min-h-0 flex-auto" viewportClassName="max-h-[calc(100dvh-180px)]">
            <div className="max-tab:px-5 flex flex-col gap-4 px-6 pb-2">
              <AddressFields
                value={value}
                onChange={setValue}
                errors={errors}
                t={a}
                idPrefix="ea"
                large
              />
              {feeChanges ? (
                <div className="border-border bg-subtle flex flex-col gap-1.5 rounded-[10px] border px-3 py-2.5 text-sm">
                  <div className="font-medium">
                    {zone === "out" ? d.feeChangeOut : d.feeChangeIn}
                  </div>
                  <Change label={t.delivery} from={fees.shippingFee} to={newFee} />
                  <Change label={t.total} from={fees.total} to={newTotal} strong />
                </div>
              ) : null}
            </div>
          </ScrollArea>
          <div className="max-tab:px-5 max-tab:pb-5 flex flex-none justify-end gap-2 px-6 pt-4 pb-6">
            <Dialog.Close
              className={btn({
                variant: "outline",
                size: "lg",
                className: "wide:h-9 wide:px-4 wide:text-sm max-tab:flex-1",
              })}
            >
              {t.keep}
            </Dialog.Close>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className={btn({
                size: "lg",
                className: "wide:h-9 wide:px-4 wide:text-sm max-tab:flex-1",
              })}
            >
              {d.save}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Change({
  label,
  from,
  to,
  strong,
}: {
  label: string;
  from: number;
  to: number;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", strong && "font-medium")}>
        <s className="mr-1.5 font-normal text-[#a3a3a3]">{formatTaka(from)}</s>
        {formatTaka(to)}
      </span>
    </div>
  );
}
