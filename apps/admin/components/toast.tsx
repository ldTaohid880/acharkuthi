"use client";

import { cn } from "@repo/ui/lib/utils";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/** States.dc.html toasts: success (with undo), error (with retry) and busy. Bottom centre. */
export interface ToastInput {
  tone: "ok" | "err" | "busy";
  title: string;
  sub?: string | undefined;
  action?: { label: string; onClick: () => void };
}

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast outside ToastProvider");
  return show;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<(ToastInput & { key: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((t: ToastInput) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ ...t, key: Date.now() });
    if (t.tone !== "busy") timer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  const Icon =
    toast?.tone === "ok" ? CircleCheck : toast?.tone === "err" ? CircleAlert : LoaderCircle;

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="max-tab:bottom-[92px] pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
      >
        {toast ? (
          <div
            key={toast.key}
            role={toast.tone === "err" ? "alert" : "status"}
            className="border-border pointer-events-auto flex w-[356px] max-w-full items-start gap-3 rounded-lg border bg-white px-4 py-3.5 shadow-lg"
          >
            <Icon
              aria-hidden
              className={cn(
                "mt-0.5 size-4 flex-none",
                toast.tone === "ok" && "text-[#15803d]",
                toast.tone === "err" && "text-danger-text",
                toast.tone === "busy" && "animate-spin",
              )}
            />
            <div className="min-w-0 flex-auto">
              <div className="font-medium">{toast.title}</div>
              {toast.sub ? (
                <div className="text-muted-foreground text-xs leading-4">{toast.sub}</div>
              ) : null}
            </div>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  setToast(null);
                }}
                className={cn(
                  "inline-flex h-7 flex-none items-center rounded-sm px-2.5 text-xs font-medium",
                  toast.tone === "err"
                    ? "border-border hover:bg-accent border bg-white shadow-xs"
                    : "hover:bg-accent",
                )}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
