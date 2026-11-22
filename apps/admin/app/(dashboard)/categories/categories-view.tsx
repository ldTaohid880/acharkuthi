"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  GripVertical,
  Image as ImageIcon,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useRef, useState, useTransition } from "react";
import {
  deleteCategory,
  reorderCategories,
  saveCategory,
  uploadCategoryImage,
} from "@/app/actions/categories";
import { btn } from "@/components/btn";
import { ContentLangSwitch, type ContentLang } from "@/components/content-lang-switch";
import { NeedsStorage } from "@/components/needs-storage";
import { useBreakpoint } from "@/components/shell/shell-context";
import { useToast } from "@/components/toast";
import { digits, fill } from "@/lib/format";
import type { CategoryRow } from "@/lib/categories";
import type { Dict } from "@/lib/i18n/dict";

type CT = Dict["cats"];

const badge = (on: boolean) =>
  cn(
    "inline-flex h-[22px] flex-none items-center rounded-sm px-2 text-xs leading-4 font-medium",
    on ? "bg-badge-ok-bg text-badge-ok-fg" : "bg-muted text-foreground",
  );
const switchCls = (on: boolean) =>
  cn(
    "inline-flex h-5 w-9 flex-none cursor-pointer items-center rounded-full border-0 p-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,.2)] max-desk:h-[26px] max-desk:w-11 max-desk:after:size-[22px]",
    on ? "bg-primary justify-end" : "justify-start bg-[#e5e5e5]",
  );
const inputCls = (err = false) =>
  cn(
    "border-input focus:border-primary placeholder:text-muted-foreground w-full min-w-0 rounded-md border bg-white px-3 shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)] desk:h-9 desk:text-sm h-11 text-[15px]",
    err && "border-destructive focus:border-destructive shadow-[0_0_0_3px_rgba(220,38,38,.15)]",
  );
const help = "text-muted-foreground text-xs leading-4";
const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);

/**
 * ক্যাটাগরি (Categories-Desktop / -Tablet / -Phone, CategoryEdit-Phone). Order changes save at
 * once (drag on tablet/desktop, arrows + "হয়ে গেছে" on phones); the editor saves on "সংরক্ষণ".
 */
export function CategoriesView({
  rows,
  uploads,
  edit,
  t,
  lang,
}: {
  rows: CategoryRow[];
  uploads: boolean;
  edit: number | "new" | null;
  t: CT;
  lang: AdminLang;
}) {
  const bp = useBreakpoint();
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = useState(rows);
  const [prevRows, setPrevRows] = useState(rows);
  if (prevRows !== rows) {
    setPrevRows(rows);
    setOrder(rows);
  }
  const [reordering, setReordering] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [del, setDel] = useState<CategoryRow | null>(null);
  const [saving, start] = useTransition();

  // Tablet / desktop always show an editor: the picked category, else the first one.
  const selected: CategoryRow | null =
    edit === "new"
      ? null
      : (order.find((r) => r.id === edit) ?? (edit === null ? (order[0] ?? null) : null));
  const position = selected ? order.findIndex((r) => r.id === selected.id) + 1 : order.length + 1;
  const go = (e: number | "new" | null) =>
    router.push((e === null ? "/categories" : `/categories?edit=${e}`) as Route, { scroll: false });

  function saveOrder(next: CategoryRow[]) {
    setOrder(next);
    start(async () => {
      try {
        await reorderCategories({ ids: next.map((r) => r.id) });
        toast({ tone: "ok", title: t.orderSaved });
      } catch {
        setOrder(rows);
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }
  const move = (from: number, to: number) => {
    const next = [...order];
    const [x] = next.splice(from, 1);
    if (x) next.splice(Math.max(0, Math.min(next.length, to)), 0, x);
    return next;
  };

  function remove(c: CategoryRow) {
    start(async () => {
      try {
        await deleteCategory({ id: c.id });
        setDel(null);
        toast({ tone: "ok", title: fill(t.deleted, { name: c.nameBn || c.name }) });
        if (edit === c.id || (edit === null && order[0]?.id === c.id)) go(null);
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  const deleteDialog = (
    <Dialog.Root open={!!del} onOpenChange={(v) => (v ? undefined : setDel(null))}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          role="alertdialog"
          aria-describedby={undefined}
          className="border-border fixed top-1/2 left-1/2 z-50 flex w-[400px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border bg-white p-6 shadow-lg"
        >
          {del ? (
            <>
              <div>
                <Dialog.Title className="text-base leading-6 font-semibold">
                  {fill(t.deleteTitle, { name: del.nameBn || del.name })}
                </Dialog.Title>
                <p className="text-muted-foreground text-[13px] leading-5">
                  {del.products
                    ? fill(t.deleteBodyN, { n: digits(del.products, lang) })
                    : t.deleteBody}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Dialog.Close
                  className={btn({
                    variant: "outline",
                    size: "lg",
                    className: "desk:h-9 desk:px-4 desk:text-sm",
                  })}
                >
                  {t.keep}
                </Dialog.Close>
                <button
                  type="button"
                  onClick={() => remove(del)}
                  className={btn({
                    variant: "destructive",
                    size: "lg",
                    className: "desk:h-9 desk:px-4 desk:text-sm",
                  })}
                >
                  {t.doDelete}
                </button>
              </div>
            </>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  /* ───── Phone: CategoryEdit-Phone ───── */
  if (bp === "phone" && edit !== null) {
    const cat = edit === "new" ? null : (order.find((r) => r.id === edit) ?? null);
    return (
      <>
        <Editor
          key={String(edit)}
          cat={cat}
          position={cat ? order.findIndex((r) => r.id === cat.id) + 1 : order.length + 1}
          uploads={uploads}
          t={t}
          lang={lang}
          layout="phone"
          onSaved={(id) => go(id)}
          onDelete={cat ? () => setDel(cat) : undefined}
        />
        {deleteDialog}
      </>
    );
  }

  /* ───── Phone: Categories-Phone (normal and reorder mode) ───── */
  if (bp === "phone") {
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
            <span className={help}>
              {reordering ? t.reorderSub : fill(t.phoneSub, { n: digits(order.length, lang) })}
            </span>
          </div>
          {reordering ? (
            <button
              type="button"
              onClick={() => {
                setReordering(false);
                if (order.some((r, i) => rows[i]?.id !== r.id)) saveOrder(order);
              }}
              className={btn({ size: "lg", className: "px-3.5" })}
            >
              {t.done}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setReordering(true)}
              className={btn({ variant: "outline", size: "lg", className: "px-3.5" })}
            >
              {t.reorder}
            </button>
          )}
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            {reordering ? <p className={help}>{t.reorderHelp}</p> : null}
            {order.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">{t.empty}</p>
            ) : null}
            {order.length ? (
              <ul className="border-border m-0 list-none overflow-hidden rounded-xl border bg-white p-0">
                {order.map((c, i) => {
                  const inner = (
                    <>
                      <span className="text-muted-foreground w-[18px] tabular-nums">
                        {digits(i + 1, lang)}
                      </span>
                      <span className="flex min-w-0 flex-auto flex-col">
                        <span className="truncate font-medium">{c.nameBn || c.name}</span>
                        <span className={cn(help, "truncate")}>
                          {c.name} · {fill(t.productsN, { n: digits(c.products, lang) })}
                        </span>
                      </span>
                      <span className={badge(c.isActive)}>{c.isActive ? t.on : t.off}</span>
                    </>
                  );
                  return (
                    <li
                      key={c.id}
                      className="border-border flex min-h-14 items-center gap-3 border-b py-2 pr-2 pl-4 last:border-b-0"
                    >
                      {reordering ? (
                        <>
                          {inner}
                          <button
                            type="button"
                            disabled={i === 0}
                            aria-label={fill(t.upAria, { name: c.nameBn })}
                            onClick={() => setOrder(move(i, i - 1))}
                            className={btn({ variant: "outline", size: "iconLg" })}
                          >
                            <ChevronUp aria-hidden />
                          </button>
                          <button
                            type="button"
                            disabled={i === order.length - 1}
                            aria-label={fill(t.downAria, { name: c.nameBn })}
                            onClick={() => setOrder(move(i, i + 1))}
                            className={btn({ variant: "outline", size: "iconLg" })}
                          >
                            <ChevronDown aria-hidden />
                          </button>
                        </>
                      ) : (
                        <Link
                          href={`/categories?edit=${c.id}` as Route}
                          className="flex min-w-0 flex-auto items-center gap-3"
                        >
                          {inner}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {!reordering ? (
              <Link
                href={"/categories?edit=new" as Route}
                className={btn({ variant: "outline", size: "lg", block: true })}
              >
                <Plus aria-hidden />
                {t.newCategory}
              </Link>
            ) : null}
          </div>
        </ScrollArea>
        {deleteDialog}
      </div>
    );
  }

  /* ───── Tablet 834 / desktop: Categories-Tablet / Categories-Desktop ───── */
  const tab = bp === "tab";
  return (
    <div className="flex h-full flex-col">
      <div className="wide:px-8 wide:pt-6 wide:pb-6 flex flex-none flex-wrap items-end justify-between gap-4 px-6 pt-5 pb-4">
        <div>
          <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{t.title}</h1>
          <p className="text-muted-foreground text-[13px] leading-4">{t.sub}</p>
        </div>
        <button
          type="button"
          onClick={() => go("new")}
          className={btn({ size: tab ? "lg" : "sm" })}
        >
          <Plus aria-hidden />
          {t.newCategory}
        </button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div
          className={cn(
            "wide:px-8 wide:pb-12 tab:max-desk:pb-24 flex items-start gap-4 px-6 pb-8",
            tab ? "flex-col items-stretch" : "flex-wrap",
          )}
        >
          <section
            className={cn(
              "border-border min-w-0 overflow-hidden rounded-xl border bg-white shadow-xs",
              !tab && "flex-[999_1_520px]",
            )}
          >
            {!tab ? (
              <div className="border-border text-muted-foreground flex h-10 items-center gap-3 border-b px-3 text-[13px] font-medium">
                <span className="w-8" />
                <span className="w-6">#</span>
                <span className="w-10" />
                <span className="flex-auto">{t.colName}</span>
                <span className="w-40">{t.colSlug}</span>
                <span className="w-14 text-right">{t.colProducts}</span>
                <span className="w-24">{t.colState}</span>
                <span className="w-[76px]" />
              </div>
            ) : null}
            {order.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">{t.empty}</p>
            ) : null}
            <ul className="m-0 list-none p-0">
              {order.map((c, i) => {
                const sel = selected?.id === c.id;
                const name = c.nameBn || c.name;
                return (
                  <li
                    key={c.id}
                    onDragOver={(ev) => dragFrom !== null && ev.preventDefault()}
                    onDrop={() => {
                      if (dragFrom !== null && dragFrom !== i) saveOrder(move(dragFrom, i));
                      setDragFrom(null);
                    }}
                    className={cn(
                      "border-border flex items-center gap-3 border-b px-3 last:border-b-0",
                      tab ? "min-h-16 py-2" : "py-2.5",
                      sel ? "bg-primary-soft" : "bg-white",
                      dragFrom === i && "opacity-60",
                    )}
                  >
                    <button
                      type="button"
                      draggable
                      onDragStart={() => setDragFrom(i)}
                      onDragEnd={() => setDragFrom(null)}
                      // Keyboard: ↑ / ↓ on the focused handle moves the shelf one place (saved).
                      aria-keyshortcuts="ArrowUp ArrowDown"
                      onKeyDown={(ev) => {
                        const to = i + (ev.key === "ArrowUp" ? -1 : ev.key === "ArrowDown" ? 1 : 0);
                        if (to === i || to < 0 || to >= order.length || saving) return;
                        ev.preventDefault();
                        saveOrder(move(i, to));
                      }}
                      aria-label={fill(t.dragAria, { name })}
                      className={cn(
                        "inline-flex flex-none cursor-grab items-center justify-center rounded-md text-[#a3a3a3]",
                        tab ? "size-11 [&_svg]:size-5" : "size-8 [&_svg]:size-4",
                      )}
                    >
                      <GripVertical aria-hidden />
                    </button>
                    <span className={cn("text-muted-foreground tabular-nums", tab ? "w-5" : "w-6")}>
                      {digits(i + 1, lang)}
                    </span>
                    <Thumb src={c.imageSrc} className="size-10" />
                    {tab ? (
                      <span className="flex min-w-0 flex-auto flex-col">
                        <span className="font-medium">
                          {name} <span className={help}>· {c.name}</span>
                        </span>
                        <span className="text-muted-foreground font-mono text-xs">
                          {c.slug} · {fill(t.productsN, { n: digits(c.products, lang) })}
                        </span>
                      </span>
                    ) : (
                      <>
                        <span className="min-w-0 flex-auto">
                          <span className="font-medium">{name}</span>{" "}
                          <span className={help}>· {c.name}</span>
                        </span>
                        <span className="text-muted-foreground w-40 truncate font-mono text-xs">
                          {c.slug}
                        </span>
                        <span className="w-14 text-right tabular-nums">{c.products}</span>
                        <span className="w-24">
                          <span className={badge(c.isActive)}>{c.isActive ? t.on : t.off}</span>
                        </span>
                      </>
                    )}
                    {tab ? (
                      <span className={badge(c.isActive)}>{c.isActive ? t.on : t.off}</span>
                    ) : null}
                    <span className={cn("flex justify-end gap-0.5", !tab && "w-[76px]")}>
                      <button
                        type="button"
                        aria-label={fill(t.editAria, { name })}
                        onClick={() => go(c.id)}
                        className={btn({
                          variant: tab ? "outline" : "ghost",
                          size: tab ? "iconLg" : "iconSm",
                        })}
                      >
                        <Pencil aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={fill(t.deleteAria, { name })}
                        onClick={() => setDel(c)}
                        className={btn({
                          variant: tab ? "outline" : "ghost",
                          size: tab ? "iconLg" : "iconSm",
                        })}
                      >
                        <Trash2 aria-hidden />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          <Editor
            key={selected ? `c${selected.id}-${JSON.stringify(selected)}` : "new"}
            cat={selected}
            position={position}
            uploads={uploads}
            t={t}
            lang={lang}
            layout={tab ? "tab" : "desk"}
            onSaved={(id) => go(id)}
          />
        </div>
      </ScrollArea>
      {deleteDialog}
    </div>
  );
}

function Thumb({ src, className }: { src: string | null; className: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "border-border bg-muted relative inline-flex flex-none items-center justify-center overflow-hidden rounded-lg border text-[#a3a3a3]",
        className,
      )}
    >
      <ImageIcon className="size-4" />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ) : null}
    </span>
  );
}

/** The editor card (desktop side, tablet below the list) or the phone screen (CategoryEdit-Phone). */
function Editor({
  cat,
  position,
  uploads,
  t,
  lang,
  layout,
  onSaved,
  onDelete,
}: {
  cat: CategoryRow | null;
  position: number;
  uploads: boolean;
  t: CT;
  lang: AdminLang;
  layout: "desk" | "tab" | "phone";
  onSaved: (id: number) => void;
  onDelete?: (() => void) | undefined;
}) {
  const toast = useToast();
  const router = useRouter();
  const init = {
    nameBn: cat?.nameBn ?? "",
    name: cat?.name ?? "",
    slug: cat?.slug ?? "",
    description: cat?.description ?? "",
    descriptionBn: cat?.descriptionBn ?? "",
    imageUrl: cat?.imageUrl ?? null,
    imageSrc: cat?.imageSrc ?? null,
    headerImageUrl: cat?.headerImageUrl ?? null,
    headerImageSrc: cat?.headerImageSrc ?? null,
    isActive: cat?.isActive ?? true,
  };
  const [f, setF] = useState(init);
  const [slugTouched, setSlugTouched] = useState(!!cat);
  const [descLang, setDescLang] = useState<ContentLang>("bn");
  const [tried, setTried] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);
  /** Which picture is uploading: the shelf image or the Shop header photo. */
  const [uploading, setUploading] = useState<"image" | "header" | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLInputElement>(null);
  const set = (p: Partial<typeof f>) => {
    setF((s) => ({ ...s, ...p }));
    setSlugTaken(false);
  };
  const dirty = JSON.stringify(f) !== JSON.stringify(init);

  const err = {
    nameBn: !f.nameBn.trim() ? t.errName : "",
    name: !f.name.trim() ? t.errName : "",
    slug: slugTaken ? t.errSlugTaken : !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug) ? t.errSlug : "",
  };
  const show = tried || slugTaken;

  function save() {
    setTried(true);
    if (err.nameBn || err.name || err.slug) return;
    start(async () => {
      try {
        const r = await saveCategory({
          ...(cat ? { id: cat.id } : {}),
          nameBn: f.nameBn,
          name: f.name,
          slug: f.slug,
          description: f.description,
          descriptionBn: f.descriptionBn,
          imageUrl: f.imageUrl,
          headerImageUrl: f.headerImageUrl,
          isActive: f.isActive,
        });
        if (!r.ok) {
          setSlugTaken(true);
          return;
        }
        toast({ tone: "ok", title: t.saved });
        onSaved(r.id);
        router.refresh();
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  async function upload(file: File | undefined, kind: "image" | "header" = "image") {
    if (!file) return;
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("slug", f.slug || "category");
      const r = await uploadCategoryImage(fd);
      if (r.ok)
        set(
          kind === "header"
            ? { headerImageUrl: r.url, headerImageSrc: r.url }
            : { imageUrl: r.url, imageSrc: r.url },
        );
      else
        toast({
          tone: "err",
          title:
            r.reason === "type"
              ? t.uploadType
              : r.reason === "size"
                ? t.uploadSize
                : t.uploadFailed,
        });
    } catch {
      toast({ tone: "err", title: t.uploadFailed });
    } finally {
      setUploading(null);
    }
  }

  const phone = layout === "phone";
  const big = layout !== "desk";
  const name = cat?.nameBn || cat?.name || "";
  const field = (
    id: string,
    label: string,
    control: React.ReactNode,
    error?: string,
    hint?: string,
  ) => (
    <div className="flex min-w-0 flex-col gap-2">
      <label className="text-sm leading-5 font-medium" htmlFor={id}>
        {label}
      </label>
      {control}
      {error ? (
        <span className="text-destructive text-xs leading-4 font-medium">{error}</span>
      ) : null}
      {hint ? <span className={help}>{hint}</span> : null}
    </div>
  );
  const fields = (
    <>
      {field(
        "c-bn",
        t.nameBn,
        <input
          id="c-bn"
          value={f.nameBn}
          maxLength={120}
          onChange={(e) => set({ nameBn: e.target.value })}
          className={inputCls(show && !!err.nameBn)}
        />,
        show ? err.nameBn : "",
      )}
      {field(
        "c-en",
        t.nameEn,
        <input
          id="c-en"
          value={f.name}
          maxLength={120}
          onChange={(e) =>
            set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })
          }
          className={inputCls(show && !!err.name)}
        />,
        show ? err.name : "",
      )}
      {field(
        "c-slug",
        t.slug,
        <input
          id="c-slug"
          value={f.slug}
          maxLength={140}
          onChange={(e) => {
            setSlugTouched(true);
            set({ slug: e.target.value.toLowerCase() });
          }}
          className={cn(inputCls(show && !!err.slug), "desk:text-[13px] font-mono")}
        />,
        show ? err.slug : "",
        t.slugHelp,
      )}
      {field(
        "c-desc",
        t.description,
        <div className="flex min-w-0 flex-col gap-2">
          <ContentLangSwitch
            value={descLang}
            onChange={setDescLang}
            missing={{ bn: !f.descriptionBn.trim(), en: !f.description.trim() }}
            label={t.contentLang}
            missingLabel={t.contentLangEmpty}
          />
          <textarea
            id="c-desc"
            lang={descLang}
            value={descLang === "bn" ? f.descriptionBn : f.description}
            maxLength={2000}
            onChange={(e) =>
              set(
                descLang === "bn"
                  ? { descriptionBn: e.target.value }
                  : { description: e.target.value },
              )
            }
            className={cn(
              "border-input focus:border-primary w-full resize-y rounded-md border bg-white px-3 py-2 text-sm leading-5 shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)]",
              phone ? "min-h-[88px] text-[15px]" : "min-h-[72px]",
              layout === "tab" && "text-[15px]",
            )}
          />
        </div>,
        undefined,
        t.descriptionHelp,
      )}
    </>
  );
  /** One picture field: the shelf image (Home disc) or the Shop page header photo. */
  const picker = (kind: "image" | "header") => {
    const url = kind === "header" ? f.headerImageUrl : f.imageUrl;
    const src = kind === "header" ? f.headerImageSrc : f.imageSrc;
    const ref = kind === "header" ? headerRef : fileRef;
    const busy = uploading === kind;
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-sm leading-5 font-medium">
          {kind === "header" ? t.headerImage : t.image}
        </span>
        <div className={cn("flex gap-3", phone ? "flex-col" : "items-start")}>
          <div
            className={cn(
              "relative flex flex-none items-center justify-center overflow-hidden rounded-lg bg-[repeating-linear-gradient(135deg,#f5f5f5_0_8px,#efefef_8px_16px)] text-[#8a8a8a]",
              phone ? "h-40 w-full" : kind === "header" ? "h-24 w-40" : "size-24",
            )}
          >
            {busy ? (
              <LoaderCircle className="size-6 animate-spin" aria-hidden />
            ) : (
              <ImageIcon className="size-6" aria-hidden />
            )}
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                className="absolute inset-0 size-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            {url && !phone ? (
              <span className="text-muted-foreground truncate font-mono text-xs">
                {url.split("/").pop()}
              </span>
            ) : null}
            <div className="flex gap-1.5">
              {uploads ? (
                <>
                  <input
                    ref={ref}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      void upload(e.target.files?.[0], kind);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploading !== null}
                    onClick={() => ref.current?.click()}
                    className={btn({
                      variant: "outline",
                      size: big ? "lg" : "sm",
                      className: phone ? "flex-1" : "",
                    })}
                  >
                    {url ? t.changeImage : t.addImage}
                  </button>
                </>
              ) : (
                <NeedsStorage label="needs storage · R2" />
              )}
              {url ? (
                <button
                  type="button"
                  onClick={() =>
                    set(
                      kind === "header"
                        ? { headerImageUrl: null, headerImageSrc: null }
                        : { imageUrl: null, imageSrc: null },
                    )
                  }
                  className={btn({ variant: "ghost", size: big ? "lg" : "sm" })}
                >
                  {t.removeImage}
                </button>
              ) : null}
            </div>
            <span className={help}>
              {kind === "header" ? t.headerImageHelp : phone ? t.imageHelpPhone : t.imageHelp}
            </span>
          </div>
        </div>
      </div>
    );
  };
  const imageBlock = (
    <>
      {picker("image")}
      {picker("header")}
    </>
  );
  const activeRow = (
    <div
      className={cn(
        "flex items-center justify-between gap-3",
        !phone && "border-border rounded-[10px] border p-3",
      )}
    >
      <div>
        <div className="font-medium">{t.active}</div>
        <div className={help}>{t.activeHelp}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={f.isActive}
        aria-label={t.active}
        onClick={() => set({ isActive: !f.isActive })}
        className={switchCls(f.isActive)}
      />
    </div>
  );
  const discard = () => {
    setF(init);
    setTried(false);
    setSlugTaken(false);
  };

  if (phone) {
    return (
      <div className="flex h-full flex-col">
        <header className="border-border flex h-14 flex-none items-center gap-2 border-b bg-white pr-2 pl-1">
          <Link
            href="/categories"
            aria-label={t.backList}
            className={btn({ variant: "ghost", size: "iconLg", className: "[&_svg]:size-5" })}
          >
            <ChevronLeft aria-hidden />
          </Link>
          <div className="flex min-w-0 flex-auto flex-col leading-[1.1]">
            <b className="text-lg leading-6 font-semibold">{cat ? t.editTitlePhone : t.newTitle}</b>
            <span className={help}>
              {cat ? fill(t.editSubPhone, { name, n: digits(position, lang) }) : t.newSub}
            </span>
          </div>
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4 pb-[110px]">
            <div className="border-border flex flex-col gap-3.5 rounded-xl border bg-white p-4">
              {activeRow}
            </div>
            <div className="border-border flex flex-col gap-3.5 rounded-xl border bg-white p-4">
              {fields}
            </div>
            <div className="border-border flex flex-col gap-3.5 rounded-xl border bg-white p-4">
              {imageBlock}
            </div>
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className={btn({ variant: "ghost", size: "lg", className: "text-danger-text" })}
              >
                {t.deleteCategory}
              </button>
            ) : null}
          </div>
        </ScrollArea>
        <div className="border-border fixed inset-x-0 bottom-0 z-50 flex gap-2 border-t bg-white px-4 pt-3 pb-6">
          <button
            type="button"
            disabled={!dirty || pending}
            onClick={discard}
            className={btn({ variant: "outline", size: "lg", className: "flex-1 basis-0" })}
          >
            {t.discard}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className={btn({ size: "lg", className: "flex-[2] basis-0" })}
          >
            {t.save}
          </button>
        </div>
      </div>
    );
  }

  const head = (
    <div className="flex items-start justify-between gap-3 px-6 pt-5">
      <div>
        <h2 className="text-base leading-6 font-semibold">
          {cat ? fill(t.editTitle, { name }) : t.newTitle}
        </h2>
        <p className="text-muted-foreground text-[13px] leading-5">
          {cat ? fill(t.editSub, { n: digits(position, lang) }) : t.newSub}
        </p>
      </div>
    </div>
  );

  if (layout === "tab") {
    return (
      <>
        <section className="border-border min-w-0 rounded-xl border bg-white shadow-xs">
          {head}
          <div className="flex flex-col gap-4 px-6 pt-4 pb-6">
            {fields}
            {imageBlock}
          </div>
        </section>
        {/* Categories-Tablet .t-save: active switch + save, fixed under the scrolling page */}
        <div className="border-border fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t bg-white py-3 pr-6 pl-[88px] shadow-[0_-4px_12px_rgba(0,0,0,.05)]">
          <span className="flex items-center gap-3 text-xs">
            <span className="font-medium">{t.active}</span>
            <button
              type="button"
              role="switch"
              aria-checked={f.isActive}
              aria-label={t.active}
              onClick={() => set({ isActive: !f.isActive })}
              className={switchCls(f.isActive)}
            />
            <span className="text-muted-foreground">{t.activeHelp}</span>
          </span>
          <button type="button" disabled={pending} onClick={save} className={btn({ size: "lg" })}>
            {t.save}
          </button>
        </div>
      </>
    );
  }

  return (
    <section className="border-border min-w-0 flex-[1_1_340px] rounded-xl border bg-white shadow-xs">
      {head}
      <form
        className="flex flex-col gap-3.5 px-6 pt-4 pb-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {fields}
        {imageBlock}
        {activeRow}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={!dirty || pending}
            onClick={discard}
            className={btn({ variant: "outline" })}
          >
            {t.discard}
          </button>
          <button type="submit" disabled={pending} className={btn()}>
            {t.save}
          </button>
        </div>
      </form>
    </section>
  );
}
