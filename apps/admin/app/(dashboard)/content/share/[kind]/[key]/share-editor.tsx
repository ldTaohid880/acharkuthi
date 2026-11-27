"use client";

import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import type { AdminLang } from "@repo/validators";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ExternalLink,
  Loader2,
  Monitor,
  Smartphone,
  Upload,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveShareStudio, uploadShareSource } from "@/app/actions/share-cards";
import { btn } from "@/components/btn";
import { AppPreview, type PreviewData } from "@/components/share/app-preview";
import { APP_NAME, BrandIcon, SHARE_APPS, type ShareApp } from "@/components/share/brand-icon";
import { refreshShareCards } from "@/components/share-cards";
import { useToast } from "@/components/toast";
import { fill } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import { renderCard } from "@/lib/og/render";
import type { CardLang } from "@/lib/share-cards";
import type { ShareEditorData } from "@/lib/share-studio";

type T = Dict["shareStudio"];
interface Edit {
  mode: "auto" | "custom";
  title: string;
  description: string;
  sourceImageUrl: string | null;
  focal: { x: number; y: number };
}
const LANGS: CardLang[] = ["bn", "en"];
const SITE_NAME = "আচারকুঠি · Acharkuthi";

const editOf = (d: ShareEditorData, l: CardLang): Edit => ({
  mode: d.langs[l].mode,
  title: d.langs[l].title,
  description: d.langs[l].description,
  sourceImageUrl: d.langs[l].sourceImageUrl,
  focal: d.langs[l].focal,
});
const same = (a: Edit, b: Edit) => JSON.stringify(a) === JSON.stringify(b);
const clamp01 = (n: number) => Math.min(1, Math.max(0, Math.round(n * 1000) / 1000));

/**
 * Share Studio editor. The person editing sees every app's preview update as they type, pick a
 * photo or move the focal point, and decides for themselves: the page makes no judgements
 * (owner, 2026-11-26). Overrides change only the share preview, never the page's SEO.
 */
export function ShareEditor({ data, t }: { data: ShareEditorData; t: T; lang: AdminLang }) {
  const router = useRouter();
  const toast = useToast();
  const [lang, setLang] = useState<CardLang>("bn");
  const initial = { bn: editOf(data, "bn"), en: editOf(data, "en") };
  const [edit, setEdit] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "making">("idle");
  const [uploading, setUploading] = useState(false);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [phoneApp, setPhoneApp] = useState<ShareApp>("whatsapp");
  const [moreOpen, setMoreOpen] = useState(false);
  const [, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);

  const cur = edit[lang];
  const L = data.langs[lang];
  const dirtyLangs = LANGS.filter((l) => !same(edit[l], initial[l]));
  const dirty = dirtyLangs.length > 0;
  const set = (patch: Partial<Edit>) =>
    setEdit((e) => ({ ...e, [lang]: { ...e[lang], ...patch } }));

  /* অটো cards are drawn here from the server's spec, so they always match the live design. */
  const [autoCards, setAutoCards] = useState<
    Partial<Record<CardLang, { wide: string; square: string }>>
  >({});
  useEffect(() => {
    let live = true;
    const urls: string[] = [];
    for (const l of LANGS) {
      const spec = data.langs[l].autoSpec;
      if (!spec) continue;
      void Promise.all([renderCard(spec, "wide"), renderCard(spec, "square")])
        .then(([w, s]) => {
          const wide = URL.createObjectURL(w);
          const square = URL.createObjectURL(s);
          urls.push(wide, square);
          if (live) setAutoCards((c) => ({ ...c, [l]: { wide, square } }));
        })
        .catch((e: unknown) => console.error("share studio: auto card", e));
    }
    return () => {
      live = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [data]);

  /* Leaving with unsaved changes asks first (browser close / reload). */
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const auto = autoCards[lang] ?? (L.autoSpec ? null : L.autoImage);
  const customReady = cur.mode === "custom" && cur.sourceImageUrl;
  const preview: PreviewData = {
    image: customReady
      ? { url: cur.sourceImageUrl ?? "", focal: cur.focal }
      : { url: auto?.wide ?? "", focal: { x: 0.5, y: 0.5 } },
    title: cur.title.trim() || L.defaults.title,
    description: cur.description.trim() || L.defaults.description,
    url: L.url,
    siteName: SITE_NAME,
  };

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("slug", data.slug);
      form.set("file", file);
      const r = await uploadShareSource(form);
      if (r.ok) set({ mode: "custom", sourceImageUrl: r.url, focal: { x: 0.5, y: 0.5 } });
      else toast({ tone: "err", title: t.uploadFailed, sub: t.uploadFailedSub });
    } catch {
      toast({ tone: "err", title: t.uploadFailed, sub: t.uploadFailedSub });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function save() {
    start(async () => {
      setStatus("saving");
      try {
        for (const l of dirtyLangs) {
          const e = edit[l];
          await saveShareStudio({
            kind: data.kind,
            refId: data.refId,
            pageKey: data.pageKey,
            lang: l,
            mode: e.mode === "custom" && e.sourceImageUrl ? "custom" : "auto",
            title: e.title.trim(),
            description: e.description.trim(),
            ...(e.sourceImageUrl ? { sourceImageUrl: e.sourceImageUrl } : {}),
            focalX: e.focal.x,
            focalY: e.focal.y,
          });
        }
        setStatus("making");
        await refreshShareCards(
          data.kind === "page"
            ? { kind: "page", pageKey: data.pageKey || "home" }
            : { kind: data.kind, id: data.refId },
        );
        toast({ tone: "ok", title: t.saved });
        router.refresh();
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      } finally {
        setStatus("idle");
      }
    });
  }
  const busy = status !== "idle";

  /* ── pieces ─────────────────────────────────────────────── */
  const seg = <V extends string>(
    value: V,
    options: { v: V; label: React.ReactNode; disabled?: boolean }[],
    onPick: (v: V) => void,
    aria: string,
    size: "sm" | "md" = "md",
  ) => (
    <div role="radiogroup" aria-label={aria} className="bg-muted inline-flex rounded-lg p-[3px]">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          disabled={o.disabled}
          onClick={() => onPick(o.v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 text-[13px] whitespace-nowrap disabled:opacity-50",
            size === "sm" ? "h-7" : "h-8",
            value === o.v
              ? "text-foreground bg-white font-medium shadow-xs"
              : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const langSeg = (short = false) =>
    seg(
      lang,
      LANGS.map((l) => ({ v: l, label: short ? (l === "bn" ? "বাং" : "EN") : t.langs[l] })),
      setLang,
      t.langs.bn + " / " + t.langs.en,
    );

  const saveBtn = (cls?: string) => (
    <button
      type="button"
      disabled={!dirty || busy}
      onClick={save}
      className={btn({ size: "lg", className: cls ?? "" })}
    >
      {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {status === "saving" ? t.saving : status === "making" ? t.making : t.save}
    </button>
  );

  const imageSection = (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <h2 className="text-[15px] leading-[22px] font-semibold">{t.image}</h2>
        <span className="ml-auto">
          {seg(
            cur.mode,
            [
              { v: "auto", label: t.imageMode.auto },
              { v: "custom", label: t.imageMode.custom, disabled: !data.uploads },
            ],
            (v) => set({ mode: v }),
            t.image,
          )}
        </span>
      </div>
      {cur.mode === "auto" ? (
        <>
          <div className="grid grid-cols-[1.905fr_1fr] gap-2">
            {(["wide", "square"] as const).map((size) => (
              <div
                key={size}
                className={cn(
                  "bg-muted rounded-lg bg-cover bg-center shadow-[0_0_0_1px_rgba(0,0,0,.08)]",
                  size === "wide" ? "aspect-[1200/630]" : "aspect-square",
                )}
                style={auto ? { backgroundImage: `url("${auto[size]}")` } : undefined}
                aria-hidden
              />
            ))}
          </div>
          <p className="text-muted-foreground text-xs leading-4">
            {data.kind === "product"
              ? t.autoHelpItem
              : data.kind === "category"
                ? t.autoHelpShelf
                : t.autoHelpPage}
            {data.pageKey === "policies" ? ` ${t.policiesNote}।` : ""}
          </p>
        </>
      ) : cur.sourceImageUrl ? (
        <>
          <FocalPicker
            src={cur.sourceImageUrl}
            focal={cur.focal}
            onChange={(focal) => set({ focal })}
            label={t.focalAria}
          />
          <p className="text-muted-foreground text-xs leading-4">{t.customHelp}</p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground min-w-0 flex-auto truncate font-mono text-xs">
              {cur.sourceImageUrl.split("/").pop()}
            </span>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className={btn({ variant: "outline", size: "sm" })}
            >
              {uploading ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Upload aria-hidden />
              )}
              {uploading ? t.uploading : t.change}
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="border-input text-muted-foreground hover:bg-subtle flex aspect-[1200/630] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm"
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-5" aria-hidden />
          )}
          {uploading ? t.uploading : t.choosePhoto}
        </button>
      )}
      {!data.uploads ? (
        <p className="text-muted-foreground text-xs leading-4">{t.needsStorage}</p>
      ) : null}
    </section>
  );

  const field = (
    id: string,
    label: string,
    hint: string,
    value: string,
    placeholder: string,
    onChange: (v: string) => void,
    multiline: boolean,
  ) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="text-muted-foreground ml-auto text-xs">{hint}</span>
      </div>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          placeholder={placeholder}
          maxLength={300}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
          lang={lang}
          className="border-input placeholder:text-muted-foreground focus:border-primary min-h-[104px] resize-y rounded-md border bg-white px-3 py-2 text-sm leading-5 shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)]"
        />
      ) : (
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          maxLength={120}
          onChange={(e) => onChange(e.target.value)}
          lang={lang}
          className="border-input placeholder:text-muted-foreground focus:border-primary h-9 rounded-md border bg-white px-3 text-sm shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)]"
        />
      )}
    </div>
  );

  const textSection = (p: string) => (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <h2 className="text-[15px] leading-[22px] font-semibold">{t.text}</h2>
        {cur.title || cur.description ? (
          <button
            type="button"
            onClick={() => set({ title: "", description: "" })}
            className="text-primary ml-auto text-xs font-medium underline underline-offset-2"
          >
            {t.reset}
          </button>
        ) : null}
      </div>
      {field(
        `${p}st-${lang}`,
        t.titleLabel,
        t.titleHint,
        cur.title,
        L.defaults.title,
        (v) => set({ title: v }),
        false,
      )}
      {field(
        `${p}sd-${lang}`,
        t.descLabel,
        t.descHint,
        cur.description,
        L.defaults.description,
        (v) => set({ description: v }),
        true,
      )}
    </section>
  );

  const tags = [
    ["og:title", preview.title],
    ["og:description", preview.description],
    ["og:url", L.url],
    ["og:locale", lang === "bn" ? "bn_BD" : "en_US"],
    ["og:image", customReady ? `${cur.sourceImageUrl} (1200×630)` : "1200×630 JPEG"],
    ["og:image", customReady ? `${cur.sourceImageUrl} (1080×1080)` : "1080×1080 JPEG"],
    ["twitter:card", "summary_large_image"],
  ] as const;
  const checks = [
    {
      app: "facebook" as const,
      href: `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(L.url)}`,
    },
    {
      app: "linkedin" as const,
      href: `https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(L.url)}`,
    },
    { app: "telegram" as const, href: "https://t.me/WebpageBot" },
  ];

  const moreSection = (
    <section className="border-border border-t">
      <button
        type="button"
        aria-expanded={moreOpen}
        onClick={() => setMoreOpen((o) => !o)}
        className="flex h-12 w-full items-center gap-2 text-left text-sm font-medium"
      >
        {moreOpen ? (
          <ChevronDown className="size-4" aria-hidden />
        ) : (
          <ChevronRight className="size-4" aria-hidden />
        )}
        {t.more}
        <span className="text-muted-foreground ml-auto text-xs font-normal">{t.moreHint}</span>
      </button>
      {moreOpen ? (
        <div className="flex flex-col gap-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline">
              <span className="text-sm font-medium">{t.tags}</span>
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(tags.map(([k, v]) => `${k}: ${v}`).join("\n"))
                    .then(() => toast({ tone: "ok", title: t.copied }))
                }
                className="text-primary ml-auto text-xs font-medium underline underline-offset-2"
              >
                {t.copy}
              </button>
            </div>
            <dl className="border-border bg-subtle m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-lg border px-3 py-2.5 font-mono text-xs leading-[18px]">
              {tags.map(([k, v], i) => (
                <div key={i} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="m-0 truncate">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t.check}</span>
            <div className="flex flex-wrap gap-2">
              {checks.map((c) => (
                <a
                  key={c.app}
                  href={c.href}
                  target="_blank"
                  rel="noreferrer"
                  className={btn({ variant: "outline", size: "sm" })}
                >
                  <BrandIcon app={c.app} size={14} />
                  {APP_NAME[c.app]}
                  <ExternalLink className="!size-3" aria-hidden />
                </a>
              ))}
            </div>
            <p className="text-muted-foreground text-xs leading-4">{t.checkHint}</p>
          </div>
        </div>
      ) : null}
    </section>
  );

  /** Rendered once per layout (phone / wide); `p` keeps the field ids unique. */
  const form = (p: string) => (
    <div className="flex flex-col gap-5">
      {imageSection}
      <div className="border-border border-t" />
      {textSection(p)}
      {moreSection}
    </div>
  );

  const appBlock = (app: ShareApp) => (
    <section key={app} id={`pv-${app}`} className="scroll-mt-2 px-5 pt-5 pb-1">
      <div className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold">
        <BrandIcon app={app} />
        {APP_NAME[app]}
      </div>
      <AppPreview app={app} d={preview} />
    </section>
  );

  const previewPane = (
    <div className="border-border flex min-h-0 min-w-0 flex-1 flex-col border-l bg-[#f7f7f7]">
      <div className="border-border bg-subtle flex flex-none items-center gap-2 border-b px-5 py-3">
        <span className="text-[13px] font-semibold">{t.preview}</span>
        <span className="text-muted-foreground desk:inline hidden text-xs">{t.approx}</span>
        <span className="ml-auto">
          {seg(
            device,
            [
              {
                v: "phone",
                label: (
                  <>
                    <Smartphone className="size-3.5" aria-hidden />
                    {t.phone}
                  </>
                ),
              },
              {
                v: "desktop",
                label: (
                  <>
                    <Monitor className="size-3.5" aria-hidden />
                    {t.desktop}
                  </>
                ),
              },
            ],
            setDevice,
            t.preview,
            "sm",
          )}
        </span>
      </div>
      <nav
        className="border-border flex flex-none gap-0.5 overflow-x-auto border-b bg-white px-4 py-2"
        aria-label={t.preview}
      >
        {SHARE_APPS.map((app) => (
          <button
            key={app}
            type="button"
            title={APP_NAME[app]}
            aria-label={fill(t.jump, { app: APP_NAME[app] })}
            onClick={() =>
              paneRef.current
                ?.querySelector(`#pv-${app}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="hover:bg-muted grid size-9 flex-none place-items-center rounded-lg"
          >
            <BrandIcon app={app} size={18} />
          </button>
        ))}
      </nav>
      <ScrollArea className="min-h-0 flex-1">
        <div
          ref={paneRef}
          className={cn("mx-auto pb-6", device === "phone" ? "max-w-[400px]" : "max-w-[560px]")}
        >
          {SHARE_APPS.map(appBlock)}
        </div>
      </ScrollArea>
    </div>
  );

  const unsavedMark = dirty ? (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[13px]">
      <Circle className="size-2" aria-hidden />
      {t.unsaved}
    </span>
  ) : null;

  return (
    <>
      {/* ───── Phone (<768): one page; save sits in the header, so no extra bar ───── */}
      <div className="tab:hidden flex h-full flex-col">
        <header className="border-border flex h-14 flex-none items-center gap-1 border-b bg-white pr-2 pl-1">
          <Link
            href={"/content/share" as Route}
            aria-label={t.back}
            className={btn({ variant: "ghost", size: "iconLg" })}
          >
            <ChevronLeft className="!size-5" aria-hidden />
          </Link>
          <div className="flex min-w-0 flex-auto flex-col leading-[1.1]">
            <b className="truncate text-[17px] font-semibold">{data.name}</b>
            <span className="text-muted-foreground truncate font-mono text-[11px] leading-4">
              {data.path}
            </span>
          </div>
          {langSeg(true)}
          {saveBtn("h-10 px-3.5")}
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <div className="bg-[#f7f7f7]">
            <div className="flex gap-1.5 overflow-x-auto px-3 pt-3">
              {SHARE_APPS.map((app) => (
                <button
                  key={app}
                  type="button"
                  aria-pressed={phoneApp === app}
                  onClick={() => setPhoneApp(app)}
                  className={cn(
                    "inline-flex h-10 flex-none items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium",
                    phoneApp === app
                      ? "border-foreground bg-foreground text-white"
                      : "border-border bg-white",
                  )}
                >
                  <BrandIcon app={app} size={14} mono={phoneApp === app} />
                  {APP_NAME[app]}
                </button>
              ))}
            </div>
            <div className="p-3">
              <AppPreview app={phoneApp} d={preview} />
            </div>
          </div>
          <div className="border-border border-t bg-white p-4">{form("m-")}</div>
        </ScrollArea>
      </div>

      {/* ───── Tablet and desktop (≥768): header fixed; form and previews scroll on their own ───── */}
      <div className="tab:flex hidden h-full min-h-0 flex-col">
        <div className="border-border wide:px-8 flex flex-none items-center gap-3 border-b px-6 py-4">
          <Link
            href={"/content/share" as Route}
            aria-label={t.back}
            className={btn({ variant: "ghost", size: "icon", className: "-ml-2.5" })}
          >
            <ArrowLeft className="!size-[18px]" aria-hidden />
          </Link>
          <div className="min-w-0 flex-auto">
            <h1 className="truncate text-xl leading-7 font-semibold">{data.name}</h1>
            <a
              href={L.url}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground inline-flex max-w-full items-center gap-1.5 font-mono text-xs hover:underline"
              title={t.openSite}
            >
              <span className="truncate">{L.url.replace(/^https?:\/\//, "")}</span>
              <ExternalLink className="size-3 flex-none" aria-hidden />
            </a>
          </div>
          {langSeg()}
          <span className="desk:inline-flex hidden">{unsavedMark}</span>
          <button
            type="button"
            disabled={!dirty || busy}
            onClick={() => setEdit(initial)}
            className={btn({ variant: "outline", size: "lg" })}
          >
            {t.cancel}
          </button>
          {saveBtn()}
        </div>
        <div className="flex min-h-0 flex-1">
          <ScrollArea className="tab:w-[340px] desk:w-[420px] wide:w-[460px] min-h-0 flex-none">
            <div className="wide:px-8 px-6 py-6">{form("d-")}</div>
          </ScrollArea>
          {previewPane}
        </div>
      </div>
      {/* One file input for both layouts (the image section is rendered in each). */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => void upload(e.target.files?.[0])}
      />
      <span className="sr-only" aria-live="polite">
        {status === "saving" ? t.saving : status === "making" ? t.making : ""}
      </span>
    </>
  );
}

/** The whole photo with a draggable focal point; previews crop around it (CSS background-position). */
function FocalPicker({
  src,
  focal,
  onChange,
  label,
}: {
  src: string;
  focal: { x: number; y: number };
  onChange: (f: { x: number; y: number }) => void;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const at = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    onChange({
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top) / r.height),
    });
  };
  const nudge = (dx: number, dy: number) =>
    onChange({ x: clamp01(focal.x + dx), y: clamp01(focal.y + dy) });
  return (
    <div
      ref={box}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuetext={`${Math.round(focal.x * 100)}%, ${Math.round(focal.y * 100)}%`}
      aria-valuenow={Math.round(focal.x * 100)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        at(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons) at(e);
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.1 : 0.02;
        if (e.key === "ArrowLeft") nudge(-step, 0);
        else if (e.key === "ArrowRight") nudge(step, 0);
        else if (e.key === "ArrowUp") nudge(0, -step);
        else if (e.key === "ArrowDown") nudge(0, step);
        else return;
        e.preventDefault();
      }}
      className="focus-visible:ring-ring relative mx-auto w-fit max-w-full cursor-crosshair touch-none overflow-hidden rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,.08)] outline-none select-none focus-visible:ring-[3px]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded R2 photo, any size */}
      <img src={src} alt="" draggable={false} className="block max-h-[320px] max-w-full" />
      <span
        aria-hidden
        className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white shadow-[0_1px_4px_rgba(0,0,0,.5)]"
        style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }}
      />
    </div>
  );
}
