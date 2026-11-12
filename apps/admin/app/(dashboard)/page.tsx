import { cn } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import { ChevronRight, RefreshCw } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { btn } from "@/components/btn";
import { NeedsStorage } from "@/components/needs-storage";
import { PhoneHeaderActions } from "@/components/shell/header-actions";
import { Page, PhoneHeader } from "@/components/shell/page";
import { StatusChip } from "@/components/status-chip";
import { getDashboard, type DashboardData } from "@/lib/dashboard";
import { agoText, digits } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import { getDict } from "@/lib/i18n/server";
import type { StatusTone } from "@/lib/order-status";
import { requireAdmin } from "@/lib/require-admin";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * "আজকের কাজ" (Dashboard-Desktop ≥1440, Dashboard-Tablet1194 1024–1439, Dashboard-Tablet
 * 768–1023, Dashboard-Phone <768). Values the database can't answer yet show "needs storage".
 */
export default async function DashboardPage() {
  const { role } = await requireAdmin();
  const [{ lang, t }, data] = await Promise.all([getDict(), getDashboard(role)]);
  const owner = role === "owner";
  const d = t.dash;

  const todos = todoCards(data, d, lang, owner);
  const side = sideCards(data, d, lang, owner);
  const today = dateLine(lang);

  return (
    <>
      <PhoneHeader
        title={d.title}
        sub={today}
        start={
          <span
            aria-hidden
            className="bg-primary inline-flex size-7 flex-none items-center justify-center rounded-md font-[family-name:var(--font-anek)] text-base leading-none font-bold text-white"
          >
            আ
          </span>
        }
        end={<PhoneHeaderActions />}
      />
      <Page>
        {/* Page header (tablet and up) */}
        <div className="max-tab:hidden flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{d.title}</h1>
            <p className="text-muted-foreground text-[13px] leading-4">
              {d.sub ? `${d.sub} · ${today}` : today}
            </p>
          </div>
          <div className="wide:flex-row flex flex-row-reverse flex-wrap items-center gap-2">
            {/* Courier sync needs the Steadfast integration: disabled until then. */}
            <button
              type="button"
              disabled
              className={btn({
                variant: "outline",
                size: "lg",
                className: "wide:h-8 wide:px-3 wide:text-[13px] wide:gap-1.5",
              })}
            >
              <RefreshCw aria-hidden />
              {d.sync}
            </button>
            <NeedsStorage />
          </div>
        </div>

        <Kpis data={data} d={d} lang={lang} owner={owner} />

        {/* To-do: cards from 768px, a list on phones */}
        <section className="max-tab:hidden flex flex-col gap-3">
          <h2 className="desk:max-wide:hidden text-base leading-6 font-semibold">
            {d.todo}{" "}
            {d.todoSub ? (
              <span className="text-muted-foreground text-xs leading-4 font-normal">
                {d.todoSub}
              </span>
            ) : null}
          </h2>
          <div
            className={cn(
              "tab:grid-cols-2 desk:grid-cols-3 grid gap-3",
              owner ? "wide:grid-cols-5" : "wide:grid-cols-4",
            )}
          >
            {todos.map((c) => (
              <Link
                key={c.key}
                href={c.href as Route}
                className="border-border tab:min-h-[132px] desk:min-h-[120px] wide:min-h-0 flex min-w-0 flex-col gap-1.5 rounded-xl border bg-white p-4 shadow-xs hover:border-[#d4d4d4] hover:shadow-md"
              >
                <span className="flex items-center justify-between gap-2">
                  <StatusChip tone={c.tone} label={c.tag} />
                  <ChevronRight className="text-muted-foreground size-4" aria-hidden />
                </span>
                <span className="tabular text-3xl leading-9 font-semibold tracking-[-0.02em]">
                  {c.n}
                </span>
                <span className="font-medium">{c.label}</span>
                <span className="text-muted-foreground text-xs leading-4">{c.sub}</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="tab:hidden flex flex-col gap-3">
          <h2 className="text-muted-foreground mt-1 text-xs leading-4 font-medium">{d.todo}</h2>
          <div className="border-border overflow-hidden rounded-xl border bg-white">
            {todos.map((c) => (
              <Link
                key={c.key}
                href={c.href as Route}
                className="border-border flex min-h-[68px] items-center gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <span className="tabular w-9 flex-none text-center text-[22px] font-semibold">
                  {c.n}
                </span>
                <span className="flex min-w-0 flex-auto flex-col gap-1">
                  <span className="font-medium">{c.label}</span>
                  <span className="flex items-center gap-2">
                    <StatusChip tone={c.tone} label={c.tag} />
                    <span className="text-muted-foreground truncate text-xs leading-4">
                      {c.subPhone}
                    </span>
                  </span>
                </span>
                <ChevronRight className="text-muted-foreground size-4 flex-none" aria-hidden />
              </Link>
            ))}
          </div>
        </section>

        {/* Low stock + waiting items */}
        <div className="wide:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] wide:gap-4 desk:grid desk:grid-cols-3 desk:items-start max-tab:hidden desk:gap-3 flex flex-col gap-5">
          <LowStockCard data={data} d={d} lang={lang} />
          <div className="desk:gap-3 wide:gap-4 flex flex-col gap-5">
            {side.map((s) => (
              <SideCard key={s.key} s={s} d={d} />
            ))}
          </div>
        </div>
        <LowStockPhone data={data} d={d} lang={lang} />
        <section className="tab:hidden flex flex-col gap-3">
          <h2 className="text-muted-foreground mt-1 text-xs leading-4 font-medium">{d.waiting}</h2>
          <div className="border-border overflow-hidden rounded-xl border bg-white">
            {side.map((s) => (
              <Link
                key={s.key}
                href={s.href as Route}
                className="border-border flex min-h-14 items-center gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <span className="min-w-0 flex-auto font-medium">
                  {s.label}
                  {s.needs ? (
                    <>
                      {" "}
                      <NeedsStorage />
                    </>
                  ) : null}
                </span>
                {s.n !== null ? <Count n={digits(s.n, "en")} /> : null}
                <ChevronRight className="text-muted-foreground size-4 flex-none" aria-hidden />
              </Link>
            ))}
          </div>
        </section>
      </Page>
    </>
  );
}

type DashDict = Dict["dash"];

function dateLine(lang: AdminLang): string {
  const now = new Date();
  const part = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", {
      timeZone: "Asia/Dhaka",
      ...o,
    }).format(now);
  return lang === "bn"
    ? `${part({ weekday: "long" })}, ${part({ day: "numeric" })} ${part({ month: "long" })}`
    : `${part({ weekday: "long" })}, ${part({ day: "numeric" })} ${part({ month: "short" })}`;
}

function Count({ n }: { n: string }) {
  return (
    <span className="bg-muted text-foreground tabular inline-flex h-5 min-w-5 flex-none items-center justify-center rounded-full px-1.5 text-[11px] font-semibold">
      {n}
    </span>
  );
}

function Kpis({
  data,
  d,
  lang,
  owner,
}: {
  data: DashboardData;
  d: DashDict;
  lang: AdminLang;
  owner: boolean;
}) {
  const cells: { key: string; label: React.ReactNode; labelPhone: string; value: string }[] = [
    {
      key: "today",
      label: d.ordersToday,
      labelPhone: d.ordersToday,
      value: String(data.ordersToday),
    },
    {
      key: "deliv",
      label: (
        <>
          {d.deliveredToday} <NeedsStorage />
        </>
      ),
      labelPhone: d.deliveredToday,
      value: "—",
    },
  ];
  if (owner) {
    cells.push(
      {
        key: "cod",
        label: (
          <>
            {d.collectedToday} <NeedsStorage />
          </>
        ),
        labelPhone: d.collectedTodayShort,
        value: "—",
      },
      {
        key: "sf",
        label: (
          <>
            {d.steadfast} <NeedsStorage />
          </>
        ),
        labelPhone: d.steadfast,
        value: "—",
      },
    );
  }
  void lang;
  return (
    <div
      className={cn(
        "border-border grid grid-cols-2 overflow-hidden rounded-xl border bg-white shadow-xs",
        owner ? "desk:grid-cols-4" : "desk:grid-cols-2",
      )}
    >
      {cells.map((c, i) => (
        <div
          key={c.key}
          className={cn(
            "border-border tab:px-5 tab:py-3.5 desk:px-[18px] desk:py-3 wide:px-5 wide:py-3.5 flex flex-col gap-0.5 px-4 py-3",
            i % 2 === 1 && "border-l",
            i >= 2 && "max-desk:border-t",
            i >= 1 && "desk:border-l",
          )}
        >
          <span className="text-muted-foreground max-tab:hidden flex flex-wrap items-center gap-1.5 text-xs leading-4">
            {c.label}
          </span>
          <span className="text-muted-foreground tab:hidden text-xs leading-4">{c.labelPhone}</span>
          <span className="tabular text-xl leading-7 font-semibold">{c.value}</span>
        </div>
      ))}
    </div>
  );
}

interface Todo {
  key: string;
  href: string;
  tone: StatusTone;
  tag: string;
  n: string;
  label: string;
  sub: React.ReactNode;
  subPhone: React.ReactNode;
}

function todoCards(data: DashboardData, d: DashDict, lang: AdminLang, owner: boolean): Todo[] {
  const age = data.newOrders.oldest ? agoText(data.newOrders.oldest, lang) : null;
  const list: Todo[] = [
    {
      key: "new",
      href: "/orders?status=new",
      tone: "new",
      tag: d.tagNew,
      n: String(data.newOrders.n),
      label: d.confirmByPhone,
      sub: age ? `${d.oldest}${age}` : "",
      subPhone: age ? `${d.oldestPhone}${age}${d.oldestPhoneEnd}` : "",
    },
    {
      key: "conf",
      href: "/orders?status=confirmed",
      tone: "conf",
      tag: d.tagConf,
      n: String(data.confirmed.n),
      label: d.toPack,
      sub: `${digits(data.confirmed.items, lang)}${d.items}`,
      subPhone: `${digits(data.confirmed.items, lang)}${d.items}`,
    },
    {
      key: "pack",
      href: "/orders?status=packed",
      tone: "pack",
      tag: d.tagPack,
      n: String(data.packed),
      label: d.toBook,
      sub: d.bookTogether,
      subPhone: d.bookTogetherPhone,
    },
    {
      key: "problem",
      href: "/orders?status=problem",
      tone: "return",
      tag: d.tagProblem,
      n: String(data.returned),
      label: d.problems,
      // Courier holds and unknown statuses come from Steadfast (needs storage).
      sub: `${d.hold} — · ${d.unknown} — · ${d.returned} ${digits(data.returned, lang)}`,
      subPhone: `${d.hold} — · ${d.unknown} — · ${d.returned} ${digits(data.returned, lang)}`,
    },
  ];
  if (owner) {
    list.push({
      key: "cod",
      href: "/orders?status=delivered",
      tone: "deliv",
      tag: d.tagDeliv,
      n: "—",
      label: d.codPending,
      sub: <NeedsStorage />,
      subPhone: <NeedsStorage />,
    });
  }
  return list;
}

interface Side {
  key: string;
  href: string;
  n: number | null;
  label: string;
  sub: string;
  needs: boolean;
  dot: string;
  items: { id: string; text: string; meta: string }[];
}

function sideCards(data: DashboardData, d: DashDict, lang: AdminLang, owner: boolean): Side[] {
  const messages: Side = {
    key: "messages",
    href: "/messages",
    n: null,
    label: d.messages,
    sub: d.messagesSub,
    needs: true,
    dot: "bg-primary",
    items: [],
  };
  if (!owner || !data.reviews || !data.restock) return [messages];
  return [
    {
      key: "reviews",
      href: "/reviews",
      n: data.reviews.n,
      label: d.reviews,
      sub: d.reviewsSub,
      needs: false,
      dot: "bg-[#f59e0b]",
      items: data.reviews.latest.map((r) => ({
        id: r.id,
        text: r.text ? `★ ${r.rating} · "${r.text}"` : `★ ${r.rating}`,
        meta: r.name,
      })),
    },
    messages,
    {
      key: "restock",
      href: "/restock-alerts",
      n: data.restock.n,
      label: d.restock,
      sub: d.restockSub,
      needs: false,
      dot: "bg-[#a3a3a3]",
      items: data.restock.top.map((r, i) => ({
        id: String(i),
        text: `${lang === "bn" ? r.bn : r.en} · ${r.size}`,
        meta: `${digits(r.people, lang)}${d.people}`,
      })),
    },
  ];
}

/** Side cards: full cards at ≥1440 and 768–1023, compact link rows at 1024–1439. */
function SideCard({ s, d }: { s: Side; d: DashDict }) {
  const first = s.items[0];
  return (
    <>
      <Link
        href={s.href as Route}
        className="border-border desk:max-wide:flex hidden min-h-16 items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-xs"
      >
        <span className="tabular w-[30px] flex-none text-xl font-semibold">{s.n ?? "—"}</span>
        <span className="flex min-w-0 flex-auto flex-col">
          <span className="font-medium">
            {s.label} {s.needs ? <NeedsStorage /> : null}
          </span>
          {first ? (
            <span className="text-muted-foreground truncate text-xs leading-4">
              {first.text}
              {first.meta ? ` · ${first.meta}` : ""}
            </span>
          ) : null}
        </span>
        <ChevronRight className="text-muted-foreground size-4 flex-none" aria-hidden />
      </Link>
      <section className="border-border desk:max-wide:hidden rounded-xl border bg-white shadow-xs">
        <div className="wide:items-start flex items-center justify-between gap-3 px-6 pt-5">
          <div className="flex items-center gap-2.5">
            <span className="tabular text-[22px] font-semibold">{s.n ?? "—"}</span>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 font-medium">
                {s.label} {s.needs ? <NeedsStorage /> : null}
              </div>
              {s.sub ? (
                <div className="text-muted-foreground text-xs leading-4">{s.sub}</div>
              ) : null}
            </div>
          </div>
          <Link
            href={s.href as Route}
            className={btn({
              variant: "ghost",
              size: "lg",
              className: "wide:h-8 wide:px-3 wide:text-[13px]",
            })}
          >
            {d.viewAll}
          </Link>
        </div>
        <ul className="wide:pb-4 flex flex-col px-6 pt-2 pb-3">
          {s.items.map((it) => (
            <li
              key={it.id}
              className="border-border wide:min-h-0 wide:py-2 flex min-h-11 items-center gap-2.5 border-t"
            >
              <span className={cn("size-2 flex-none rounded-full", s.dot)} aria-hidden />
              <span className="min-w-0 flex-auto truncate">{it.text}</span>
              <span className="text-muted-foreground flex-none text-xs leading-4">{it.meta}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function stockBadge(stock: number, d: DashDict) {
  return stock <= 0
    ? { label: d.out, cls: "bg-badge-danger-bg text-badge-danger-fg" }
    : { label: d.low, cls: "bg-badge-warn-bg text-badge-warn-fg" };
}

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] flex-none items-center rounded-sm px-2 text-xs leading-4 font-medium whitespace-nowrap",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function LowStockCard({ data, d, lang }: { data: DashboardData; d: DashDict; lang: AdminLang }) {
  return (
    <section className="border-border desk:col-span-2 wide:col-span-1 rounded-xl border bg-white shadow-xs">
      <div className="flex items-start justify-between gap-3 px-6 pt-5">
        <div>
          <div className="text-base leading-6 font-semibold">{d.lowStock}</div>
          <div className="text-muted-foreground text-[13px] leading-5">{d.lowStockSub}</div>
        </div>
        <Link
          href="/stock"
          className={btn({
            variant: "outline",
            size: "lg",
            className: "wide:h-8 wide:px-3 wide:text-[13px]",
          })}
        >
          {d.updateStock}
        </Link>
      </div>
      <div className="px-6 pt-3 pb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-muted-foreground border-border border-b text-left text-[13px] font-medium">
              <th className="h-10 px-3 font-medium whitespace-nowrap">{d.colProduct}</th>
              <th className="h-10 px-3 text-right font-medium whitespace-nowrap">{d.colStock}</th>
              <th className="h-10 px-3 text-right font-medium whitespace-nowrap">
                {d.colRequests}
              </th>
              <th className="h-10 w-[1%] px-3" />
            </tr>
          </thead>
          <tbody>
            {data.lowStock.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted-foreground px-3 py-4 text-sm">
                  {d.noLowStock}
                </td>
              </tr>
            ) : (
              data.lowStock.map((v, i) => {
                const b = stockBadge(v.stock, d);
                const [main, second] = lang === "bn" ? [v.bn, v.en] : [v.en, v.bn];
                return (
                  <tr
                    key={v.variantId}
                    className={cn(
                      "border-border hover:bg-subtle border-b last:border-b-0",
                      i === 4 && "desk:max-wide:hidden",
                    )}
                  >
                    <td className="wide:py-2.5 px-3 py-3">
                      <div className="font-medium">
                        {main} <span className="text-muted-foreground font-normal">· {v.size}</span>
                      </div>
                      <div
                        lang={lang === "bn" ? "en" : "bn"}
                        className="text-muted-foreground text-xs leading-4"
                      >
                        {second}
                      </div>
                    </td>
                    <td className="tabular wide:py-2.5 px-3 py-3 text-right font-semibold">
                      {v.stock}
                    </td>
                    <td className="tabular wide:py-2.5 px-3 py-3 text-right">{v.requests}</td>
                    <td className="wide:py-2.5 w-[1%] px-3 py-3 whitespace-nowrap">
                      <Badge {...b} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LowStockPhone({ data, d, lang }: { data: DashboardData; d: DashDict; lang: AdminLang }) {
  return (
    <section className="tab:hidden flex flex-col gap-3">
      <div className="mt-1 flex items-center justify-between">
        <h2 className="text-muted-foreground text-xs leading-4 font-medium">{d.lowStock}</h2>
        <Link href="/stock" className="text-primary text-xs leading-4 font-medium">
          {d.goStock}
        </Link>
      </div>
      <div className="border-border overflow-hidden rounded-xl border bg-white">
        {data.lowStock.length === 0 ? (
          <p className="text-muted-foreground px-4 py-4 text-sm">{d.noLowStock}</p>
        ) : (
          data.lowStock.slice(0, 4).map((v) => {
            const b = stockBadge(v.stock, d);
            const [main, second] = lang === "bn" ? [v.bn, v.en] : [v.en, v.bn];
            return (
              <div
                key={v.variantId}
                className="border-border flex min-h-14 items-center gap-3 border-b px-4 py-3 last:border-b-0"
              >
                <span className="flex min-w-0 flex-auto flex-col">
                  <span className="truncate font-medium">
                    {main} · {v.size}
                  </span>
                  <span className="text-muted-foreground truncate text-xs leading-4">
                    {second} · {d.requestsShort} {digits(v.requests, lang)}
                  </span>
                </span>
                <span className="tabular text-base font-semibold">{v.stock}</span>
                <Badge {...b} />
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
