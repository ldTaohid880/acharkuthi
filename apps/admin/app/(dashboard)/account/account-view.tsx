"use client";

import type { AdminRole } from "@repo/auth";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import { ChevronLeft, LogOut, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import {
  changePassword,
  removeAvatar,
  requestEmailChange,
  saveProfile,
  signOutDevice,
  signOutOtherDevices,
  unlinkGoogle,
  uploadAvatar,
  type AvatarResult,
} from "@/app/actions/account";
import { setAdminLang } from "@/app/actions/lang";
import { btn } from "@/components/btn";
import { useBreakpoint } from "@/components/shell/shell-context";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { Avatar } from "@/components/shell/user-menu";
import { useToast } from "@/components/toast";
import type { AccountData, AccountDevice } from "@/lib/account";
import { fill, lastActive } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import { initialsOf } from "@/lib/initials";

type AT = Dict["account"];
type PwField = "current" | "next" | "confirm";

const okBadge = "bg-badge-ok-bg text-badge-ok-fg";

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] flex-none items-center gap-1.5 rounded-sm border border-transparent px-2 text-xs leading-4 font-medium whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AccountView({
  data,
  role,
  lang,
  t,
  roles,
  signOut,
}: {
  data: AccountData;
  role: AdminRole;
  lang: AdminLang;
  t: AT;
  roles: Dict["roles"];
  signOut: string;
}) {
  const bp = useBreakpoint();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const owner = role === "owner";
  const large = bp !== "desk";

  // Profile
  const [name, setName] = useState(data.name);
  const [phone, setPhone] = useState(data.phone);
  const [profileErr, setProfileErr] = useState<"name" | "phone" | null>(null);
  // Password
  const [pw, setPw] = useState<Record<PwField, string>>({ current: "", next: "", confirm: "" });
  const [pwErr, setPwErr] = useState<PwField | null>(null);
  // Language (saved at once, like the top bar switch)
  const [curLang, setCurLang] = useOptimistic(lang);
  const [emailOpen, setEmailOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fail = () => toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
  const run = (fn: () => Promise<void>) =>
    start(async () => {
      try {
        await fn();
      } catch {
        fail();
      }
    });

  // Back from the email link: /account?email=changed (or …&error=… when it no longer works).
  useEffect(() => {
    if (!params.has("email")) return;
    if (params.has("error")) toast({ tone: "err", title: t.emailLinkBad, sub: t.emailLinkBadSub });
    else toast({ tone: "ok", title: t.emailChanged });
    router.replace("/account");
  }, [params, router, t, toast]);

  const onSaveProfile = () =>
    run(async () => {
      const r = await saveProfile({ name, phone });
      if (r.ok) {
        setProfileErr(null);
        toast({ tone: "ok", title: t.saved });
      } else if (r.field) setProfileErr(r.field);
      else fail();
    });

  const onPassword = () => {
    const confirm = bp === "phone" ? undefined : pw.confirm;
    if (!pw.next || pw.next.length < 8) return setPwErr("next");
    if (confirm !== undefined && confirm !== pw.next) return setPwErr("confirm");
    run(async () => {
      const r = await changePassword({
        ...(data.hasPassword ? { current: pw.current } : {}),
        next: pw.next,
        ...(confirm === undefined ? {} : { confirm }),
      });
      if (r.ok) {
        setPwErr(null);
        setPw({ current: "", next: "", confirm: "" });
        toast({ tone: "ok", title: data.hasPassword ? t.passwordChanged : t.passwordSet });
        router.refresh();
      } else if (r.field) setPwErr(r.field);
      else fail();
    });
  };

  const chooseLang = (next: AdminLang) => {
    if (next === curLang) return;
    start(async () => {
      setCurLang(next);
      await setAdminLang({ lang: next });
    });
  };

  const photoErr: Record<Exclude<AvatarResult, { ok: true }>["reason"], string> = {
    disabled: t.photoDisabled,
    type: t.photoType,
    size: t.photoSize,
    failed: t.photoFailed,
  };
  const pickPhoto = () => {
    if (!data.uploads) return toast({ tone: "err", title: t.photoDisabled });
    fileRef.current?.click();
  };
  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    run(async () => {
      const r = await uploadAvatar(form);
      if (r.ok) toast({ tone: "ok", title: t.saved });
      else toast({ tone: "err", title: photoErr[r.reason] });
    });
  };

  /* ── shared pieces (admin.css) ─────────────────────────────────── */
  const inputCls = (err = false) =>
    cn(
      "border-input focus-within:border-primary focus:border-primary placeholder:text-muted-foreground flex w-full min-w-0 items-center gap-2 rounded-md border bg-white px-3 shadow-xs outline-none focus-within:shadow-[0_0_0_3px_var(--ring)] focus:shadow-[0_0_0_3px_var(--ring)]",
      large ? "h-11 text-[15px]" : "h-9 text-sm",
      err && "border-destructive shadow-[0_0_0_3px_rgba(220,38,38,.15)]",
    );
  const label = "text-sm leading-5 font-medium";
  const help = (text: string) => (
    <span className="text-muted-foreground text-xs leading-4">{text}</span>
  );
  const err = (text: string | null) =>
    text ? <span className="text-destructive text-xs leading-4">{text}</span> : null;
  const card = "border-border rounded-xl border bg-white shadow-xs";
  const cardHead = (title: string, desc: string, end?: React.ReactNode) => (
    <div className="flex items-start justify-between gap-3 px-6 pt-5">
      <div>
        <h2 className="text-base leading-6 font-semibold">{title}</h2>
        <p className="text-muted-foreground text-[13px] leading-5">{desc}</p>
      </div>
      {end}
    </div>
  );
  const cardFoot = (children: React.ReactNode) => (
    <div className="border-border flex items-center justify-end gap-2 border-t px-6 py-4">
      {children}
    </div>
  );
  const sec = "border-border flex flex-col gap-3.5 rounded-xl border bg-white p-4";
  const secT = "text-[15px] leading-5 font-semibold";

  /* ── profile ───────────────────────────────────────────────────── */
  const photoRow = (
    <div className={cn("flex items-center", bp === "phone" ? "gap-3" : "gap-3.5")}>
      <Avatar initials={initialsOf(name || data.name)} image={data.image} owner={owner} size="xl" />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={pickPhoto}
          className={btn({
            variant: "outline",
            size: large ? "lg" : "sm",
            className: bp === "phone" ? "px-3.5" : "",
          })}
        >
          {t.photoChange}
        </button>
        {/* Drawn on desktop and tablet only; nothing to remove while initials show. */}
        {bp !== "phone" ? (
          <button
            type="button"
            disabled={pending || !data.image}
            onClick={() => run(async () => removeAvatar())}
            className={btn({ variant: "ghost", size: large ? "lg" : "sm" })}
          >
            {t.photoRemove}
          </button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          onPhoto(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
  const nameField = (
    <div className="flex min-w-0 flex-col gap-2">
      <label className={label} htmlFor="ac-n">
        {t.name}
      </label>
      <input
        id="ac-n"
        value={name}
        maxLength={120}
        onChange={(e) => setName(e.target.value)}
        aria-invalid={profileErr === "name" || undefined}
        className={inputCls(profileErr === "name")}
      />
      {err(profileErr === "name" ? t.nameErr : null)}
    </div>
  );
  const phoneField = (
    <div className="flex min-w-0 flex-col gap-2">
      <label className={label} htmlFor="ac-p">
        {t.phone}
      </label>
      <input
        id="ac-p"
        inputMode="tel"
        value={phone}
        placeholder="01XXXXXXXXX"
        onChange={(e) => setPhone(e.target.value)}
        aria-invalid={profileErr === "phone" || undefined}
        className={cn(inputCls(profileErr === "phone"), "font-mono text-xs")}
      />
      {err(profileErr === "phone" ? t.phoneErr : null)}
    </div>
  );
  const emailField = (
    <div className="flex min-w-0 flex-col gap-2">
      <label className={label} htmlFor="ac-e">
        {t.email}
      </label>
      {owner ? (
        <div className={cn(inputCls(), "pr-1")}>
          <input
            id="ac-e"
            readOnly
            value={data.email}
            className="min-w-0 flex-auto bg-transparent outline-none"
          />
          <button
            type="button"
            onClick={() => setEmailOpen(true)}
            className={btn({
              variant: "ghost",
              size: bp === "desk" ? "xs" : "sm",
              className: bp === "tab" ? "h-9" : "",
            })}
          >
            {t.change}
          </button>
        </div>
      ) : (
        <input id="ac-e" readOnly value={data.email} className={inputCls()} />
      )}
      {help(owner ? t.emailHelp : t.emailHelpStaff)}
    </div>
  );
  const roleBadge = (
    <Badge className={owner ? "bg-primary text-white" : "border-border bg-white"}>
      {owner ? roles.owner : roles.staff}
    </Badge>
  );
  const roleField = (
    <div className="flex min-w-0 flex-col gap-2">
      <span className={label}>{t.role}</span>
      <div className={cn(inputCls(), "bg-[#fafafa]")}>{roleBadge}</div>
      {owner ? help(t.roleHelpOwner) : null}
    </div>
  );
  const saveBtn = (size: "sm" | "lg", block = false) => (
    <button
      type="button"
      disabled={pending}
      onClick={onSaveProfile}
      className={btn({ size, block })}
    >
      {t.save}
    </button>
  );
  const profileBody = (
    <div className="flex flex-col gap-4 px-6 pt-4 pb-6">
      {photoRow}
      <div className="grid grid-cols-2 gap-4">
        {nameField}
        {phoneField}
        {emailField}
        {roleField}
      </div>
    </div>
  );

  /* ── password ──────────────────────────────────────────────────── */
  const pwInput = (f: PwField, id: string, text: string, extra?: React.ReactNode) => (
    <div className="flex min-w-0 flex-col gap-2">
      <label className={label} htmlFor={id}>
        {text}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={f === "current" ? "current-password" : "new-password"}
        value={pw[f]}
        onChange={(e) => setPw((x) => ({ ...x, [f]: e.target.value }))}
        aria-invalid={pwErr === f || undefined}
        className={inputCls(pwErr === f)}
      />
      {pwErr === f
        ? err(f === "current" ? t.currentErr : f === "next" ? t.nextErr : t.confirmErr)
        : extra}
    </div>
  );
  const pwCurrent = data.hasPassword ? pwInput("current", "pw-c", t.current) : null;
  const pwNext = pwInput("next", "pw-n", t.next, help(t.nextHelp));
  const pwConfirm = pwInput("confirm", "pw-r", t.confirm);
  const pwBtn = (size: "sm" | "lg", block = false) => (
    <button
      type="button"
      disabled={pending}
      onClick={onPassword}
      className={btn({ variant: "outline", size, block })}
    >
      {data.hasPassword ? t.changePassword : t.setPassword}
    </button>
  );

  /* ── language ──────────────────────────────────────────────────── */
  const opt = (value: AdminLang, title: string, sub: string) => {
    const on = curLang === value;
    return (
      <div
        role="radio"
        aria-checked={on}
        aria-label={title}
        tabIndex={0}
        lang={value}
        onClick={() => chooseLang(value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            chooseLang(value);
          }
        }}
        className={cn(
          "focus-visible:ring-ring flex cursor-pointer items-center gap-2.5 rounded-[10px] border outline-none focus-visible:ring-[3px]",
          bp === "tab" ? "min-h-14 px-3.5 py-3" : "px-3 py-2.5",
          on ? "border-primary bg-primary-soft" : "border-border",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-flex size-4 flex-none items-center justify-center rounded-full border bg-white",
            on ? "border-primary" : "border-[#a3a3a3]",
          )}
        >
          {on ? <span className="bg-primary size-2 rounded-full" /> : null}
        </span>
        <span className="min-w-0 flex-auto">
          <span className="font-medium">{title}</span>
          <br />
          <span className="text-muted-foreground text-xs leading-4">{sub}</span>
        </span>
      </div>
    );
  };
  const langOpts = (
    <>
      {opt("bn", "বাংলা", t.bnSub)}
      {opt("en", "English", t.enSub)}
    </>
  );

  /* ── sign-in methods and devices ───────────────────────────────── */
  const rowBtn = (text: string, onClick: () => void) => (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className={btn({ variant: "outline", size: large ? "lg" : "xs" })}
    >
      {text}
    </button>
  );
  const onUnlink = () =>
    run(async () => {
      const r = await unlinkGoogle();
      if (r.ok) toast({ tone: "ok", title: t.unlinked });
      else toast({ tone: "err", title: t.unlinkLast, sub: t.unlinkLastSub });
    });
  const passwordBadge = (
    <Badge className={data.hasPassword ? okBadge : "bg-muted text-foreground"}>
      {data.hasPassword ? t.on : t.off}
    </Badge>
  );
  const googleLabel = (
    <>
      Google{" "}
      {data.google?.email ? (
        <span className="text-muted-foreground text-xs leading-4">{data.google.email}</span>
      ) : null}
    </>
  );
  const deviceTitle = (d: AccountDevice) =>
    [d.browser, d.os].filter(Boolean).join(" · ") || t.unknownDevice;
  const deviceSub = (d: AccountDevice) =>
    d.current ? t.activeNow : lastActive(d.lastActive, lang);
  const others = data.devices.some((d) => !d.current);
  const deviceRow = (d: AccountDevice, pad: string) => (
    <div
      key={d.id}
      className={cn("border-border flex min-h-14 items-center gap-3 border-b last:border-b-0", pad)}
    >
      <span className="min-w-0 flex-auto">
        <span className="font-medium">{deviceTitle(d)}</span>{" "}
        {d.current ? <Badge className={cn(okBadge, "ml-1.5")}>{t.thisDevice}</Badge> : null}
        <br />
        <span className="text-muted-foreground text-xs leading-4">{deviceSub(d)}</span>
      </span>
      {d.current
        ? null
        : rowBtn(t.signOutDevice, () =>
            run(async () => {
              await signOutDevice({ id: d.id });
              toast({ tone: "ok", title: t.deviceOut });
            }),
          )}
    </div>
  );
  const signOutOthers = (
    <button
      type="button"
      disabled={pending || !others}
      onClick={() =>
        run(async () => {
          await signOutOtherDevices();
          toast({ tone: "ok", title: t.othersOut });
        })
      }
      className={btn({ variant: "ghost", size: "sm", className: "text-danger-text" })}
    >
      {t.signOutOthers}
    </button>
  );

  const emailDialog = (
    <EmailDialog open={emailOpen} onOpenChange={setEmailOpen} t={t} large={large} />
  );

  /* ───── Phone (<768): Account-Phone ───── */
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
            <span className="text-muted-foreground text-xs leading-4">
              {t.phoneSub} · {owner ? roles.ownerShort : roles.staffShort}
            </span>
          </div>
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            <div className={sec}>
              {photoRow}
              {nameField}
              {phoneField}
              {emailField}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs leading-4">{t.role}</span>
                {roleBadge}
              </div>
              {saveBtn("lg", true)}
            </div>
            <div className={sec}>
              <div className={secT}>{t.phoneLanguage}</div>
              <div
                role="radiogroup"
                aria-label={t.language}
                className="bg-muted grid grid-cols-2 rounded-[10px] p-[3px]"
              >
                {(["bn", "en"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={curLang === v}
                    lang={v}
                    onClick={() => chooseLang(v)}
                    className={cn(
                      "h-10 rounded-lg border-0 text-[15px] font-semibold",
                      curLang === v
                        ? "text-foreground bg-white shadow-xs"
                        : "text-muted-foreground bg-transparent",
                    )}
                  >
                    {v === "bn" ? "বাংলা" : "English"}
                  </button>
                ))}
              </div>
            </div>
            <div className={sec}>
              <div className={secT}>{t.password}</div>
              {pwCurrent}
              {pwNext}
              {pwBtn("lg", true)}
            </div>
            <SignOutButton
              className={btn({
                variant: "outline",
                size: "lg",
                block: true,
                className: "text-danger-text",
              })}
            >
              {signOut}
            </SignOutButton>
          </div>
        </ScrollArea>
        {emailDialog}
      </div>
    );

  /* ───── Tablet 834 (768–1023): Account-Tablet, profile saved from the bottom bar ───── */
  if (bp === "tab")
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex max-w-[760px] flex-col gap-4 px-6 pt-5 pb-8">
            <div>
              <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
              <p className="text-muted-foreground text-[13px] leading-4">{t.sub}</p>
            </div>
            <section className={card}>
              {cardHead(t.profile, t.profileD)}
              {profileBody}
            </section>
            <section className={card}>
              {cardHead(t.language, t.languageD)}
              <div
                role="radiogroup"
                aria-label={t.language}
                className="grid grid-cols-2 gap-2.5 px-6 pt-4 pb-6"
              >
                {langOpts}
              </div>
            </section>
            <section className={card}>
              {cardHead(t.password, t.passwordD)}
              <div className="flex flex-col gap-4 px-6 pt-4 pb-6">
                {pwCurrent}
                <div className="grid grid-cols-2 gap-4">
                  {pwNext}
                  {pwConfirm}
                </div>
                <div className="flex justify-end">{pwBtn("lg")}</div>
              </div>
            </section>
            <section className={card}>
              {cardHead(t.methodsDevices, t.methodsDevicesD)}
              <div className="flex flex-col gap-1 px-6 pt-4 pb-6">
                <div className="border-border flex min-h-14 items-center gap-3 border-b py-2">
                  <span className="min-w-0 flex-auto">{t.emailPassword}</span>
                  {passwordBadge}
                </div>
                {data.google ? (
                  <div className="border-border flex min-h-14 items-center gap-3 border-b py-2">
                    <span className="min-w-0 flex-auto">{googleLabel}</span>
                    {rowBtn(t.unlink, onUnlink)}
                  </div>
                ) : null}
                {data.devices.map((d) => deviceRow(d, "py-2"))}
              </div>
            </section>
            <SignOutButton
              className={btn({
                variant: "outline",
                size: "lg",
                className: "text-danger-text self-start",
              })}
            >
              <LogOut aria-hidden />
              {signOut}
            </SignOutButton>
          </div>
        </ScrollArea>
        <div className="border-border flex flex-none items-center justify-between gap-3 border-t bg-white px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,.05)]">
          <span />
          {saveBtn("lg")}
        </div>
        {emailDialog}
      </div>
    );

  /* ───── Desktop (≥1024): Account-Desktop ───── */
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="wide:px-8 wide:pt-6 wide:pb-12 flex flex-col gap-6 px-6 pt-5 pb-8">
          <div>
            <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
            <p className="text-muted-foreground text-[13px] leading-4">{t.sub}</p>
          </div>
          <div className="flex max-w-[1100px] flex-wrap items-start gap-4">
            <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-4">
              <section className={card}>
                {cardHead(t.profile, t.profileD)}
                {profileBody}
                {cardFoot(saveBtn("sm"))}
              </section>
              <section className={card}>
                {cardHead(t.password, t.passwordD)}
                <div
                  className={cn(
                    "grid gap-4 px-6 pt-4 pb-6",
                    data.hasPassword ? "grid-cols-3" : "grid-cols-2",
                  )}
                >
                  {pwCurrent}
                  {pwNext}
                  {pwConfirm}
                </div>
                {cardFoot(pwBtn("sm"))}
              </section>
              <section className={card}>
                {cardHead(t.devices, t.devicesD, signOutOthers)}
                <div className="px-6 pt-2 pb-6">
                  {data.devices.map((d) => deviceRow(d, "py-2.5"))}
                </div>
              </section>
            </div>
            <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
              <section className={card}>
                {cardHead(t.language, t.languageD)}
                <div
                  role="radiogroup"
                  aria-label={t.language}
                  className="flex flex-col gap-2 px-6 pt-4 pb-6"
                >
                  {langOpts}
                  <p className="text-muted-foreground text-xs leading-4">{t.langHelp}</p>
                </div>
              </section>
              <section className={card}>
                {cardHead(t.methods, t.methodsD)}
                <div className="flex flex-col gap-2.5 px-6 pt-4 pb-6">
                  <div className="flex items-center justify-between gap-2">
                    <span>{t.emailPassword}</span>
                    {passwordBadge}
                  </div>
                  {data.google ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0">{googleLabel}</span>
                      {rowBtn(t.unlink, onUnlink)}
                    </div>
                  ) : null}
                </div>
              </section>
              <SignOutButton className={btn({ variant: "outline", block: true })}>
                <LogOut aria-hidden />
                {signOut}
              </SignOutButton>
            </div>
          </div>
        </div>
      </ScrollArea>
      {emailDialog}
    </div>
  );
}

/** Email "বদলান" (owner): the new address gets a verification link; nothing changes until then. */
function EmailDialog({
  open,
  onOpenChange,
  t,
  large,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  t: AT;
  large: boolean;
}) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [bad, setBad] = useState(false);
  const [pending, start] = useTransition();
  const send = () =>
    start(async () => {
      try {
        const r = await requestEmailChange({ email });
        if (!r.ok) return setBad(true);
        onOpenChange(false);
        toast({
          tone: "ok",
          title: t.emailSent,
          sub: fill(t.emailSentSub, { email: email.trim() }),
        });
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setEmail("");
          setBad(false);
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-base leading-6 font-semibold">
                {t.emailTitle}
              </Dialog.Title>
              <p className="text-muted-foreground text-[13px] leading-5">{t.emailBody}</p>
            </div>
            <Dialog.Close
              aria-label={t.close}
              className={btn({ variant: "ghost", size: large ? "iconLg" : "iconSm" })}
            >
              <X aria-hidden />
            </Dialog.Close>
          </div>
          <label className="flex flex-col gap-2 text-sm font-medium">
            {t.newEmail}
            <input
              type="email"
              autoComplete="email"
              value={email}
              placeholder="name@example.com"
              onChange={(e) => {
                setEmail(e.target.value);
                setBad(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              aria-invalid={bad || undefined}
              className={cn(
                "border-input focus:border-primary w-full rounded-md border bg-white px-3 font-normal shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)]",
                large ? "h-11 text-[15px]" : "h-9 text-sm",
                bad && "border-destructive",
              )}
            />
            {bad ? (
              <span className="text-destructive text-xs leading-4 font-normal">{t.emailErr}</span>
            ) : null}
          </label>
          <div className="flex justify-end gap-2">
            <Dialog.Close className={btn({ variant: "outline", size: large ? "lg" : "default" })}>
              {t.cancel}
            </Dialog.Close>
            <button
              type="button"
              disabled={pending || !email.trim()}
              onClick={send}
              className={btn({ size: large ? "lg" : "default" })}
            >
              {t.sendLink}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
