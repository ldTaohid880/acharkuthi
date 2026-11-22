"use client";

import { signIn } from "@repo/auth/client";
import { cn } from "@repo/ui/lib/utils";
import { signInInput } from "@repo/validators";
import { CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { btn } from "@/components/btn";
import { GoogleButton } from "./google-button";

/**
 * The sign-in card. Desktop: 400px card with a centered title (SignIn-Desktop). Phone: no card,
 * 44px controls (SignIn-Phone). Error and loading states from SignIn-States.
 */
export function LoginForm() {
  const router = useRouter();
  const id = useId();
  // "empty": a field was left blank (not a wrong password); "wrong": the server refused it.
  const [failure, setFailure] = useState<"empty" | "wrong" | null>(null);
  const failed = failure !== null;
  const [pending, setPending] = useState(false);
  const [show, setShow] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Not a form action: React would reset the fields after it, losing the typed email.
    const formData = new FormData(e.currentTarget);
    setFailure(null);
    const parsed = signInInput.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      const blank = (k: string) => !String(formData.get(k) ?? "").trim();
      setFailure(blank("email") || blank("password") ? "empty" : "wrong");
      return;
    }
    setPending(true);
    const { error } = await signIn.email(parsed.data);
    if (error) {
      setPending(false);
      setFailure("wrong");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  const input =
    "border-input flex h-9 w-full min-w-0 items-center gap-2 rounded-md border bg-white px-3 text-sm shadow-xs max-tab:h-11 max-tab:text-[15px] focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--ring)] has-[:disabled]:opacity-60";
  const invalid =
    "border-destructive shadow-[0_0_0_3px_rgba(220,38,38,.15)] focus-within:border-destructive focus-within:shadow-[0_0_0_3px_rgba(220,38,38,.15)]";

  return (
    <div className="tab:max-w-[400px] tab:rounded-xl tab:border tab:border-border tab:bg-white tab:shadow-xs w-full">
      <div className="max-tab:hidden flex flex-col gap-1.5 px-6 pt-6 text-center">
        <h1 className="text-xl leading-7 font-semibold">অ্যাডমিনে ঢুকুন</h1>
        <p className="text-muted-foreground text-[13px] leading-5">
          Sign in · আপনার অ্যাকাউন্টের ইমেইল দিয়ে ঢুকুন
        </p>
      </div>
      <form
        onSubmit={onSubmit}
        noValidate
        aria-busy={pending || undefined}
        className="tab:p-6 max-tab:gap-[18px] flex flex-col gap-4"
      >
        {failed ? (
          <div
            role="alert"
            className="bg-destructive-soft flex items-start gap-3 rounded-lg border border-[#fecaca] px-4 py-3 text-[#991b1b]"
          >
            <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden />
            <div>
              <div className="font-medium">ঢোকা গেল না</div>
              <div className="text-xs leading-4">
                {failure === "empty"
                  ? "ইমেইল আর পাসওয়ার্ড দুটোই লিখুন।"
                  : "ইমেইল বা পাসওয়ার্ড মিলছে না। আবার চেষ্টা করুন।"}
              </div>
            </div>
          </div>
        ) : null}

        <GoogleButton disabled={pending} />

        <div className="flex items-center gap-3">
          <span className="bg-border h-px flex-auto" />
          <span className="text-muted-foreground text-xs leading-4">অথবা ইমেইল দিয়ে</span>
          <span className="bg-border h-px flex-auto" />
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${id}-email`} className="text-sm leading-5 font-medium">
            ইমেইল
          </label>
          <div className={input}>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              disabled={pending}
              className="placeholder:text-muted-foreground min-w-0 flex-auto bg-transparent outline-none"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${id}-pass`} className="text-sm leading-5 font-medium">
            পাসওয়ার্ড
          </label>
          <div className={cn(input, "pr-1", failed && invalid)}>
            <input
              id={`${id}-pass`}
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={pending}
              aria-invalid={failed || undefined}
              aria-describedby={failure === "wrong" ? `${id}-pass-err` : undefined}
              className="placeholder:text-muted-foreground min-w-0 flex-auto bg-transparent outline-none"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              disabled={pending}
              aria-label={show ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখান"}
              aria-pressed={show}
              className={btn({
                variant: "ghost",
                className: "max-tab:size-9 size-7 rounded-sm p-0",
              })}
            >
              {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </button>
          </div>
          {failure === "wrong" ? (
            <span id={`${id}-pass-err`} className="text-destructive text-xs leading-4 font-medium">
              পাসওয়ার্ড ভুল
            </span>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={pending}
          className={btn({
            block: true,
            className:
              "max-tab:mt-1 max-tab:h-11 max-tab:text-[15px] h-10 disabled:opacity-75 [&_svg]:animate-spin",
          })}
        >
          {pending ? (
            <>
              <LoaderCircle aria-hidden />
              ঢোকানো হচ্ছে…
            </>
          ) : (
            "ঢুকুন"
          )}
        </button>
      </form>
    </div>
  );
}
