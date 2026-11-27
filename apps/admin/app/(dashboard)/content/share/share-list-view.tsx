"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useMemo, useState } from "react";
import { btn } from "@/components/btn";
import { PhoneHeader } from "@/components/shell/page";
import { digits, fill, relativeTime } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import type { ShareLinkRow } from "@/lib/share-studio";

type T = Dict["shareStudio"];
type Tab = "all" | ShareLinkRow["kind"];
const TABS: Tab[] = ["all", "product", "category", "page"];

const hrefOf = (r: ShareLinkRow) => `/content/share/${r.kind}/${r.key}` as Route;

/**
 * Every shareable link and the card it shows now. Plain facts only (image/text mode, last
 * change): no automatic judgements (owner, 2026-11-26).
 */
export function ShareListView({ rows, t, lang }: { rows: ShareLinkRow[]; t: T; lang: AdminLang }) {
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const count = (k: Tab) => (k === "all" ? rows.length : rows.filter((r) => r.kind === k).length);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (tab === "all" || r.kind === tab) &&
        (!needle || r.name.toLowerCase().includes(needle) || r.path.includes(needle)),
    );
  }, [rows, tab, q]);

  const thumb = (r: ShareLinkRow, w: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- R2 / storefront card images, any host
    <img
      src={r.thumb}
      alt=""
      loading="lazy"
      className={cn(
        w,
        "aspect-[1200/630] flex-none rounded-md bg-[#f0f0f0] object-cover shadow-[0_0_0_1px_rgba(0,0,0,.08)]",
      )}
    />
  );
  const when = (r: ShareLinkRow) => (r.updatedAt ? relativeTime(r.updatedAt, lang) : "—");
  const search = (cls: string) => (
    <label
      className={cn(
        "border-input focus-within:border-primary flex h-9 items-center gap-2 rounded-md border bg-white px-3 shadow-xs focus-within:shadow-[0_0_0_3px_var(--ring)]",
        cls,
      )}
    >
      <Search className="text-muted-foreground size-4 flex-none" aria-hidden />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.search}
        aria-label={t.search}
        className="placeholder:text-muted-foreground min-w-0 flex-auto bg-transparent text-sm outline-none"
      />
    </label>
  );
  const tabs = (phone: boolean) => (
    <div role="tablist" className={cn("flex", phone ? "gap-1 px-2" : "gap-1")}>
      {TABS.map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={tab === k}
          onClick={() => setTab(k)}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 px-3 text-sm whitespace-nowrap",
            tab === k
              ? "text-foreground font-medium shadow-[inset_0_-2px_var(--primary)]"
              : "text-muted-foreground",
          )}
        >
          {t.tabs[k]}
          {phone ? null : (
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 text-xs leading-[18px] tabular-nums">
              {digits(count(k), lang)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
  const empty = <p className="text-muted-foreground p-6 text-center text-sm">{t.empty}</p>;
  const th = "text-muted-foreground h-10 px-4 text-left text-xs font-medium whitespace-nowrap";

  return (
    <>
      {/* ───── Phone (<768): header and tabs fixed, the list scrolls ───── */}
      <div className="tab:hidden flex h-full flex-col">
        <PhoneHeader
          title={t.title}
          sub={fill(t.phoneSub, { n: digits(rows.length, lang) })}
          start={
            <Link
              href={"/more" as Route}
              aria-label={t.back}
              className={btn({
                variant: "ghost",
                size: "iconLg",
                className: "-ml-3 [&_svg]:size-5",
              })}
            >
              <ChevronLeft aria-hidden />
            </Link>
          }
        />
        <div className="border-border flex-none border-b bg-white">
          <div className="px-4 pt-3">{search("w-full")}</div>
          {tabs(true)}
        </div>
        <ScrollArea className="min-h-0 flex-1">
          {shown.length === 0
            ? empty
            : shown.map((r) => (
                <Link
                  key={`${r.kind}:${r.key}`}
                  href={hrefOf(r)}
                  className="border-border flex min-h-[72px] items-center gap-3 border-b bg-white px-4 py-3"
                >
                  {thumb(r, "w-24")}
                  <span className="flex min-w-0 flex-auto flex-col gap-0.5">
                    <span className="truncate font-medium">{r.name}</span>
                    <span className="text-muted-foreground truncate text-xs leading-4">
                      {t.imageMode[r.image]} · {r.path}
                    </span>
                  </span>
                  <ChevronRight className="text-muted-foreground size-4 flex-none" aria-hidden />
                </Link>
              ))}
        </ScrollArea>
      </div>

      {/* ───── Tablet and desktop (≥768): heading, tabs and search fixed, the table scrolls ───── */}
      <div className="tab:flex wide:px-8 wide:pt-6 hidden h-full min-h-0 flex-col gap-4 px-6 pt-5 pb-6">
        <div className="flex-none">
          <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
          <p className="text-muted-foreground text-[13px] leading-[18px]">{t.sub}</p>
        </div>
        <div className="border-border flex flex-none items-center justify-between gap-3 border-b">
          {tabs(false)}
          {search("mb-1.5 w-60")}
        </div>
        <ScrollArea className="border-border !min-h-0 !flex-auto overflow-hidden rounded-xl border bg-white shadow-xs">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-subtle sticky top-0 z-[1] shadow-[inset_0_-1px_0_var(--border)]">
              <tr>
                <th className={cn(th, "w-[152px]")}>{t.cols.preview}</th>
                <th className={th}>{t.cols.page}</th>
                <th className={cn(th, "desk:table-cell hidden w-[140px]")}>{t.cols.image}</th>
                <th className={cn(th, "desk:table-cell hidden w-[140px]")}>{t.cols.text}</th>
                <th className={cn(th, "w-[140px]")}>{t.cols.updated}</th>
                <th className={cn(th, "w-12")} />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr
                  key={`${r.kind}:${r.key}`}
                  className="border-border hover:bg-subtle relative border-b last:border-b-0 [&>td]:px-4 [&>td]:py-3"
                >
                  <td>{thumb(r, "w-[120px]")}</td>
                  <td>
                    {/* The whole row opens the editor; the link covers it. */}
                    <Link
                      href={hrefOf(r)}
                      className="font-medium after:absolute after:inset-0 after:content-['']"
                    >
                      {r.name}
                    </Link>
                    <div className="text-muted-foreground mt-0.5 font-mono text-xs">
                      {r.path} · {t.kinds[r.kind]}
                    </div>
                  </td>
                  <td className="desk:table-cell text-muted-foreground hidden text-[13px]">
                    {t.imageMode[r.image]}
                  </td>
                  <td className="desk:table-cell text-muted-foreground hidden text-[13px]">
                    {t.textMode[r.text]}
                  </td>
                  <td className="text-muted-foreground text-[13px]">{when(r)}</td>
                  <td className="text-muted-foreground">
                    <ChevronRight className="size-4" aria-hidden />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 ? empty : null}
        </ScrollArea>
      </div>
    </>
  );
}
