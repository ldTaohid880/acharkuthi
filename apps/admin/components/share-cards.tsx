"use client";

import { cn } from "@repo/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { shareCardJobs, uploadShareCard } from "@/app/actions/share-cards";
import { btn } from "@/components/btn";
import { useToast } from "@/components/toast";
import { fill } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import { renderAndUpload } from "@/lib/og/render";
import type { ShareCardSummary } from "@/lib/share-cards";
import type { SharePageKey } from "@/lib/share-studio";

type T = Dict["settings"]["share"];

/**
 * Redraws one product's, shelf's or page's share cards after a save (docs/future/og-sharing.md).
 * Never blocks the save: a card that fails stays out of date in Settings › শেয়ার কার্ড, where
 * it can be made again. Resolves with how many cards were drawn (Share Studio waits for it).
 */
export async function refreshShareCards(
  target: { kind: "product" | "category"; id: number } | { kind: "page"; pageKey: SharePageKey },
): Promise<number> {
  try {
    const specs = await shareCardJobs({ ...target, onlyStale: true });
    if (!specs.length) return 0;
    const r = await renderAndUpload(specs, uploadShareCard);
    return r.done - r.failed;
  } catch (e) {
    console.error("share cards", target, e);
    return 0;
  }
}

/** Settings › শেয়ার কার্ড: how many cards are out of date, and a button that remakes them. */
export function ShareCardsCard({
  t,
  summary,
  bp,
}: {
  t: T;
  summary: ShareCardSummary;
  bp: "phone" | "tab" | "desk";
}) {
  const toast = useToast();
  const router = useRouter();
  const [progress, setProgress] = useState<{ d: number; n: number } | null>(null);
  const busy = progress !== null;
  const large = bp !== "desk";

  async function run(onlyStale: boolean) {
    setProgress({ d: 0, n: 0 });
    try {
      const specs = await shareCardJobs({ onlyStale });
      if (!specs.length) {
        toast({ tone: "ok", title: t.nothing });
        return;
      }
      setProgress({ d: 0, n: specs.length });
      const r = await renderAndUpload(specs, uploadShareCard, (d) =>
        setProgress({ d, n: specs.length }),
      );
      const ok = r.done - r.failed;
      if (r.failed)
        toast({ tone: "err", title: fill(t.partial, { ok, f: r.failed }), sub: t.partialSub });
      else toast({ tone: "ok", title: fill(t.done, { n: ok }) });
    } catch {
      toast({ tone: "err", title: fill(t.partial, { ok: 0, f: 1 }), sub: t.partialSub });
    } finally {
      setProgress(null);
      router.refresh();
    }
  }

  const fresh = summary.stale === 0;
  const pct = progress?.n ? Math.round((progress.d / progress.n) * 100) : 0;

  return (
    <section
      id="share"
      className={cn(
        "border-border scroll-mt-4 rounded-xl border bg-white shadow-xs",
        bp === "phone" && "flex flex-col gap-3.5 p-4",
      )}
    >
      <div className={cn("flex items-start justify-between gap-3", bp !== "phone" && "px-6 pt-5")}>
        <div>
          <h2
            className={
              bp === "phone" ? "text-[15px] font-semibold" : "text-base leading-6 font-semibold"
            }
          >
            {t.title}
          </h2>
          {bp === "phone" ? null : (
            <p className="text-muted-foreground text-[13px] leading-5">{t.desc}</p>
          )}
        </div>
        {summary.uploads ? (
          <span
            className={cn(
              "inline-flex h-[22px] flex-none items-center gap-1.5 rounded-sm px-2 text-xs leading-4 font-medium whitespace-nowrap",
              fresh ? "bg-badge-ok-bg text-badge-ok-fg" : "bg-badge-warn-bg text-badge-warn-fg",
            )}
          >
            {fresh ? t.fresh : fill(t.stale, { n: summary.stale })}
          </span>
        ) : null}
      </div>
      <div className={cn("flex flex-col gap-3", bp !== "phone" && "px-6 pt-4 pb-6")}>
        {!summary.uploads ? (
          <p className="text-muted-foreground text-sm leading-5">{t.needsStorage}</p>
        ) : (
          <>
            <p className="text-sm leading-5">
              {fill(t.total, { n: summary.total })}
              {summary.staleNames.length ? (
                <span className="text-muted-foreground">
                  {" · "}
                  {fill(t.staleNames, { names: summary.staleNames.join(", ") })}
                </span>
              ) : null}
            </p>
            {busy ? (
              <div className="flex flex-col gap-1.5" role="status" aria-live="polite">
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-[width]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-muted-foreground flex justify-between text-xs leading-4">
                  <span>{fill(t.progress, { d: progress.d, n: progress.n || "…" })}</span>
                  <span>{t.keepOpen}</span>
                </div>
              </div>
            ) : null}
            <div className={cn("flex flex-wrap gap-2", bp === "phone" && "flex-col")}>
              <button
                type="button"
                disabled={busy || fresh}
                onClick={() => void run(true)}
                className={btn({ size: large ? "lg" : "sm", block: bp === "phone" })}
              >
                {t.run}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(false)}
                className={btn({
                  variant: "outline",
                  size: large ? "lg" : "sm",
                  block: bp === "phone",
                })}
              >
                {t.runAll}
              </button>
            </div>
            <p className="text-muted-foreground text-xs leading-4">{t.help}</p>
          </>
        )}
      </div>
    </section>
  );
}
