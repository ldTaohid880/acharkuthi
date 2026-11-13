"use client";

import { cn } from "@repo/ui/lib/utils";
import {
  adminAddressFields,
  DIVISIONS,
  districtsOf,
  upazilasOf,
  type AdminAddressField,
  type AdminAddressFields,
} from "@repo/validators";
import { ChevronDown } from "lucide-react";
import type { Dict } from "@/lib/i18n/dict";

export type AddressValue = Record<AdminAddressField, string>;
export type AddressErrors = Partial<Record<AdminAddressField, string>>;
type AT = Dict["orders"]["address"];

export const EMPTY_ADDRESS: AddressValue = {
  name: "",
  phone: "",
  division: "",
  district: "",
  upazila: "",
  area: "",
  address: "",
  postal: "",
};

/** Client check with the same schema the server action uses; messages from the dictionary. */
export function addressErrors(v: AdminAddressFields, t: AT): AddressErrors {
  const r = adminAddressFields.safeParse(v);
  if (r.success) return {};
  const msg: Record<AdminAddressField, string> = {
    name: t.errName,
    phone: t.errPhone,
    division: t.errPick,
    district: t.errPick,
    upazila: t.errPick,
    area: t.errAddress,
    address: t.errAddress,
    postal: t.errPostal,
  };
  const out: AddressErrors = {};
  for (const i of r.error.issues) {
    const k = i.path[0] as AdminAddressField;
    out[k] ??= msg[k];
  }
  return out;
}

export const fieldCls = (err: boolean, large: boolean) =>
  cn(
    "border-input focus:border-primary placeholder:text-muted-foreground w-full min-w-0 rounded-md border bg-white px-3 text-sm shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)] disabled:opacity-50",
    large ? "wide:h-9 wide:text-sm h-11 text-[15px]" : "h-9",
    err && "border-destructive focus:border-destructive shadow-[0_0_0_3px_rgba(220,38,38,.15)]",
  );

export function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  error?: string | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-sm leading-5 font-medium">
        {label}
      </label>
      {children}
      {error ? <span className="text-destructive text-xs leading-4">{error}</span> : null}
    </div>
  );
}

function Select({
  id,
  value,
  options,
  placeholder,
  disabled,
  error,
  large,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  disabled?: boolean;
  error: boolean;
  large: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          fieldCls(error, large),
          "cursor-pointer appearance-none pr-9",
          !value && "text-muted-foreground",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o} className="text-foreground">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
        aria-hidden
      />
    </div>
  );
}

/** Name, mobile, division → district → upazila, area, address, post code (checkout's parts). */
export function AddressFields({
  value,
  onChange,
  errors,
  t,
  idPrefix,
  large = false,
}: {
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  errors: AddressErrors;
  t: AT;
  idPrefix: string;
  large?: boolean;
}) {
  const set = (patch: Partial<AddressValue>) => onChange({ ...value, ...patch });
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <div className="tab:grid-cols-2 grid grid-cols-1 gap-3">
      <Field label={t.name} htmlFor={id("name")} error={errors.name}>
        <input
          id={id("name")}
          value={value.name}
          maxLength={120}
          placeholder={t.namePh}
          onChange={(e) => set({ name: e.target.value })}
          className={fieldCls(!!errors.name, large)}
        />
      </Field>
      <Field label={t.phone} htmlFor={id("phone")} error={errors.phone}>
        <input
          id={id("phone")}
          value={value.phone}
          inputMode="tel"
          maxLength={20}
          placeholder={t.phonePh}
          onChange={(e) => set({ phone: e.target.value })}
          className={cn(fieldCls(!!errors.phone, large), "font-mono")}
        />
      </Field>
      <Field label={t.division} htmlFor={id("division")} error={errors.division}>
        <Select
          id={id("division")}
          value={value.division}
          options={DIVISIONS}
          placeholder={t.pick}
          error={!!errors.division}
          large={large}
          onChange={(division) => set({ division, district: "", upazila: "" })}
        />
      </Field>
      <Field label={t.district} htmlFor={id("district")} error={errors.district}>
        <Select
          id={id("district")}
          value={value.district}
          options={districtsOf(value.division)}
          placeholder={t.pick}
          disabled={!value.division}
          error={!!errors.district}
          large={large}
          onChange={(district) => set({ district, upazila: "" })}
        />
      </Field>
      <Field label={t.upazila} htmlFor={id("upazila")} error={errors.upazila}>
        <Select
          id={id("upazila")}
          value={value.upazila}
          options={upazilasOf(value.division, value.district)}
          placeholder={t.pick}
          disabled={!value.district}
          error={!!errors.upazila}
          large={large}
          onChange={(upazila) => set({ upazila })}
        />
      </Field>
      <Field label={t.area} htmlFor={id("area")} error={errors.area}>
        <input
          id={id("area")}
          value={value.area}
          maxLength={120}
          placeholder={t.areaPh}
          onChange={(e) => set({ area: e.target.value })}
          className={fieldCls(!!errors.area, large)}
        />
      </Field>
      <Field
        label={t.address}
        htmlFor={id("address")}
        error={errors.address}
        className="tab:col-span-2"
      >
        <input
          id={id("address")}
          value={value.address}
          maxLength={255}
          placeholder={t.addressPh}
          onChange={(e) => set({ address: e.target.value })}
          className={fieldCls(!!errors.address, large)}
        />
      </Field>
      <Field label={t.postal} htmlFor={id("postal")} error={errors.postal}>
        <input
          id={id("postal")}
          value={value.postal}
          inputMode="numeric"
          maxLength={4}
          onChange={(e) => set({ postal: e.target.value })}
          className={cn(fieldCls(!!errors.postal, large), "font-mono")}
        />
      </Field>
    </div>
  );
}
