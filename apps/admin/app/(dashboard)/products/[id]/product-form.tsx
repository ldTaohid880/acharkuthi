"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn, formatTaka } from "@repo/ui/lib/utils";
import { takaToPaisa, type AdminLang } from "@repo/validators";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  GripVertical,
  Image as ImageIcon,
  LoaderCircle,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveProduct, uploadProductImage, type SaveErrors } from "@/app/actions/product-edit";
import { refreshShareCards } from "@/components/share-cards";
import { btn } from "@/components/btn";
import { ContentLangSwitch, type ContentLang } from "@/components/content-lang-switch";
import { NeedsStorage } from "@/components/needs-storage";
import { useToast } from "@/components/toast";
import { digits, fill } from "@/lib/format";
import type { Dict } from "@/lib/i18n/dict";
import type { EditContext, EditProduct } from "@/lib/product-edit";
import { body, card, CardHead } from "../../orders/card";

type ET = Dict["pedit"];
const DETAIL_KEYS = [
  "ingredients",
  "flavor",
  "texture",
  "serving",
  "storage",
  "shelfLife",
  "allergens",
  "packaging",
] as const;
type DetailKey = (typeof DETAIL_KEYS)[number];

interface FormVariant {
  key: string;
  id?: number;
  label: string;
  weight: string;
  sku: string;
  price: string;
  compare: string;
  cost: string;
  stock: string;
  isActive: boolean;
  orders: number;
}
interface FormImage {
  key: string;
  id?: number;
  url: string;
  src: string;
  alt: string;
  altBn: string;
  /** Home "বিশেষ বাছাই" photo; at most one. */
  isFeatured: boolean;
}
interface FormState {
  nameBn: string;
  name: string;
  slug: string;
  categoryId: number | null;
  spiceLevel: number;
  terms: string[];
  /** English. */
  description: string;
  descriptionBn: string;
  /** Home featured card line, Bangla; `taglineEn` English. */
  tagline: string;
  taglineEn: string;
  /** Bangla. */
  details: Record<DetailKey, string>;
  detailsEn: Record<DetailKey, string>;
  isActive: boolean;
  isFeatured: boolean;
  variants: FormVariant[];
  images: FormImage[];
}

const toTaka = (p: number | null) => {
  if (p === null) return "";
  const t = Math.floor(p / 100);
  const ps = p % 100;
  return ps ? `${t}.${String(ps).padStart(2, "0")}` : String(t);
};
let seq = 0;
const nextKey = () => `n${++seq}`;

function fromProduct(p: EditProduct): FormState {
  return {
    nameBn: p.nameBn,
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    spiceLevel: p.spiceLevel,
    terms: p.searchTerms,
    description: p.description,
    descriptionBn: p.descriptionBn,
    tagline: p.tagline,
    taglineEn: p.taglineEn,
    details: Object.fromEntries(DETAIL_KEYS.map((k) => [k, p[k]])) as Record<DetailKey, string>,
    detailsEn: Object.fromEntries(DETAIL_KEYS.map((k) => [k, p[`${k}En`]])) as Record<
      DetailKey,
      string
    >,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    variants: p.variants.map((v) => ({
      key: `v${v.id}`,
      id: v.id,
      label: v.label,
      weight: v.weightGrams === null ? "" : String(v.weightGrams),
      sku: v.sku,
      price: toTaka(v.price),
      compare: toTaka(v.compareAtPrice),
      cost: toTaka(v.costPrice),
      stock: String(v.stock),
      isActive: v.isActive,
      orders: v.orders,
    })),
    images: p.images.map((im) => ({
      key: `i${im.id}`,
      id: im.id,
      url: im.url,
      src: im.src,
      alt: im.alt,
      altBn: im.altBn,
      isFeatured: im.isFeatured,
    })),
  };
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);

/**
 * Owner decision (2026-11-14): spice level 0–3 = that many red chillies of three
 * (0 = all grey, "Not spicy"), the same as the storefront's heatOf().
 */
const HEAT_WORDS = ["Not spicy", "Mild", "Medium", "Hot"] as const;
const heatOf = (n: number) => {
  const pods = Math.max(0, Math.min(3, n));
  return { word: HEAT_WORDS[pods] ?? "Not spicy", pods };
};

/** The storefront's chilli (/chilli.svg; product card .chilli, .chilli.off at 28 % opacity). */
function Chillies({ level, label }: { level: number; label: string }) {
  const { pods } = heatOf(level);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label}>
      {[1, 2, 3].map((n) => (
        // eslint-disable-next-line @next/next/no-img-element -- static decorative SVG
        <img
          key={n}
          src="/chilli.svg"
          alt=""
          width={13}
          height={16}
          className={cn("block h-4 w-[13px]", n > pods && "opacity-[0.28]")}
        />
      ))}
    </span>
  );
}

const inputCls = (err = false) =>
  cn(
    "border-input focus:border-primary placeholder:text-muted-foreground w-full min-w-0 rounded-md border bg-white px-3 shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)] disabled:opacity-50",
    "desk:h-9 desk:text-sm h-11 text-[15px]",
    err && "border-destructive focus:border-destructive shadow-[0_0_0_3px_rgba(220,38,38,.15)]",
  );
const smallInput = (err = false) => cn(inputCls(err), "desk:h-8 desk:text-[13px] desk:px-2.5");
const area =
  "border-input focus:border-primary placeholder:text-muted-foreground w-full min-w-0 resize-y rounded-md border bg-white px-3 py-2 text-sm leading-5 shadow-xs outline-none focus:shadow-[0_0_0_3px_var(--ring)] max-desk:text-[15px]";
const labelCls = "text-sm leading-5 font-medium";
const help = "text-muted-foreground text-xs leading-4";
const errCls = "text-destructive text-xs leading-4 font-medium";
const switchCls = (on: boolean) =>
  cn(
    "inline-flex h-5 w-9 flex-none cursor-pointer items-center rounded-full border-0 p-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,.2)] max-desk:h-[26px] max-desk:w-11 max-desk:after:size-[22px]",
    on ? "bg-primary justify-end" : "justify-start bg-[#e5e5e5]",
  );

/**
 * পণ্য এডিট (ProductEdit-Desktop ≥1024 / -Tablet 768–1023 / -Phone). One form for edit and
 * "নতুন পণ্য". Changes are kept in the page until "সংরক্ষণ করুন"; prices are typed in taka and
 * sent as integer paisa.
 */
export function ProductForm({
  initial,
  ctx,
  t,
  lang,
  savedNow,
}: {
  initial: EditProduct;
  ctx: EditContext;
  t: ET;
  lang: AdminLang;
  savedNow: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const isNew = initial.id === null;
  const [base] = useState(() => fromProduct(initial));
  const [f, setF] = useState<FormState>(base);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [termDraft, setTermDraft] = useState("");
  const [tried, setTried] = useState(false);
  const [server, setServer] = useState<SaveErrors>({});
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(0);
  const [confirm, setConfirm] = useState<FormVariant | null>(null);
  const [drag, setDrag] = useState<{ list: "v" | "i"; from: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<FormState>) => {
    setF((s) => ({ ...s, ...patch }));
    setServer({});
  };
  const setVariant = (key: string, patch: Partial<FormVariant>) =>
    set({ variants: f.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) });

  // ── what changed (the bar's "Nটি ঘর বদলেছে") ──
  const changed = (() => {
    let n = 0;
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    for (const k of [
      "nameBn",
      "name",
      "slug",
      "categoryId",
      "spiceLevel",
      "description",
      "descriptionBn",
      "tagline",
      "taglineEn",
      "isActive",
      "isFeatured",
    ] as const)
      if (!same(f[k], base[k])) n++;
    if (!same(f.terms, base.terms)) n++;
    for (const k of DETAIL_KEYS) if (f.details[k] !== base.details[k]) n++;
    for (const k of DETAIL_KEYS) if (f.detailsEn[k] !== base.detailsEn[k]) n++;
    const strip = (v: FormVariant) => ({ ...v, orders: 0 });
    const vb = new Map(base.variants.map((v) => [v.key, strip(v)]));
    for (const v of f.variants) if (!same(strip(v), vb.get(v.key))) n++;
    n += base.variants.filter((v) => !f.variants.some((w) => w.key === v.key)).length;
    if (
      !same(
        f.variants.map((v) => v.key),
        base.variants.filter((v) => f.variants.some((w) => w.key === v.key)).map((v) => v.key),
      ) &&
      n === 0
    )
      n++;
    if (!same(f.images, base.images)) n++;
    return n;
  })();
  const dirty = changed > 0;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // ── profit per unit (owner): price − cost, with the share of the price ──
  const profitOf = (v: FormVariant) => {
    const p = takaToPaisa(v.price);
    const c = v.cost ? takaToPaisa(v.cost) : null;
    return p && c !== null ? p - c : null;
  };
  const profitText = (v: FormVariant) => {
    const n = profitOf(v);
    const p = takaToPaisa(v.price);
    if (n === null || !p) return "—";
    return `${formatTaka(n)} · ${digits(Math.round((n / p) * 100), lang)}%`;
  };

  // ── validation ──
  const slugOk = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug);
  const vErr = (v: FormVariant, i: number) => ({
    label: !v.label.trim() ? t.errLabel : "",
    sku: !v.sku.trim() ? t.errSkuEmpty : server.sku?.[i] ? t.errSku : "",
    price: takaToPaisa(v.price) === null || takaToPaisa(v.price) === 0 ? t.errPrice : "",
    compare: v.compare && takaToPaisa(v.compare) === null ? t.errPrice : "",
    cost: v.cost && takaToPaisa(v.cost) === null ? t.errPrice : "",
  });
  const errs = {
    nameBn: !f.nameBn.trim() ? t.errNameBn : "",
    name: !f.name.trim() ? t.errNameEn : "",
    slug: server.slug
      ? fill(t.errSlug, { s: slugify(f.name) || "pickle-name" })
      : !slugOk
        ? t.errSlugBad
        : "",
    variants: f.variants.map(vErr),
    noSize: f.variants.length === 0 ? t.errNoSize : "",
  };
  const summary: { href: string; text: string }[] = [];
  if (errs.nameBn)
    summary.push({ href: "#pe-bn", text: fill(t.sumField, { field: t.nameBn, msg: errs.nameBn }) });
  if (errs.name)
    summary.push({ href: "#pe-en", text: fill(t.sumField, { field: t.nameEn, msg: errs.name }) });
  if (errs.slug)
    summary.push({
      href: "#pe-slug",
      text: server.slug ? t.sumSlug : fill(t.sumField, { field: t.slug, msg: errs.slug }),
    });
  if (errs.noSize) summary.push({ href: "#pe-sizes", text: errs.noSize });
  f.variants.forEach((v, i) => {
    const e = errs.variants[i];
    if (!e) return;
    for (const msg of [e.label, e.price, e.compare, e.cost, e.sku].filter(Boolean))
      summary.push({
        href: `#pe-${v.key}`,
        text: fill(t.sumSize, { label: v.label || t.newSize, msg }),
      });
  });
  for (const label of server.inUse ?? [])
    summary.push({ href: "#pe-sizes", text: fill(t.errInUse, { label }) });
  const show = tried || !!server.slug || !!server.sku || !!server.inUse;

  function save() {
    setTried(true);
    if (summary.length) return;
    const payload = {
      ...(initial.id ? { id: initial.id } : {}),
      nameBn: f.nameBn,
      name: f.name,
      slug: f.slug,
      categoryId: f.categoryId,
      spiceLevel: f.spiceLevel,
      searchTerms: f.terms,
      description: f.description,
      descriptionBn: f.descriptionBn,
      tagline: f.tagline,
      taglineEn: f.taglineEn,
      ...f.details,
      ...(Object.fromEntries(DETAIL_KEYS.map((k) => [`${k}En`, f.detailsEn[k]])) as Record<
        `${DetailKey}En`,
        string
      >),
      isActive: f.isActive,
      isFeatured: f.isFeatured,
      variants: f.variants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        label: v.label,
        weightGrams: v.weight ? Number(v.weight.replace(/\D/g, "")) || null : null,
        sku: v.sku,
        price: takaToPaisa(v.price) ?? 0,
        compareAtPrice: v.compare ? takaToPaisa(v.compare) : null,
        costPrice: v.cost ? takaToPaisa(v.cost) : null,
        stock: Number(v.stock.replace(/\D/g, "")) || 0,
        isActive: v.isActive,
      })),
      images: f.images.map((im) => ({
        ...(im.id ? { id: im.id } : {}),
        url: im.url,
        alt: im.alt,
        altBn: im.altBn,
        isFeatured: im.isFeatured,
      })),
    };
    start(async () => {
      try {
        const r = await saveProduct(payload);
        if (!r.ok) {
          setServer(r.errors);
          return;
        }
        toast({ tone: "ok", title: t.saved });
        void refreshShareCards({ kind: "product", id: r.id });
        router.replace(`/products/${r.id}?saved=1` as Route);
        router.refresh();
      } catch {
        toast({ tone: "err", title: t.saveFailed, sub: t.saveFailedSub });
      }
    });
  }

  async function upload(files: FileList | null) {
    if (!files?.length || !ctx.uploads) return;
    for (const file of Array.from(files)) {
      setUploading((n) => n + 1);
      try {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("slug", f.slug || slugify(f.name) || "product");
        const r = await uploadProductImage(fd);
        if (r.ok) {
          setF((s) => ({
            ...s,
            images: [
              ...s.images,
              { key: nextKey(), url: r.url, src: r.url, alt: "", altBn: "", isFeatured: false },
            ],
          }));
        } else {
          toast({
            tone: "err",
            title:
              r.reason === "type"
                ? t.uploadType
                : r.reason === "size"
                  ? t.uploadSize
                  : t.uploadFailed,
          });
        }
      } catch {
        toast({ tone: "err", title: t.uploadFailed });
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  const move = <T,>(list: T[], from: number, to: number) => {
    const out = [...list];
    const [x] = out.splice(from, 1);
    if (x !== undefined) out.splice(Math.max(0, Math.min(out.length, to)), 0, x);
    return out;
  };

  function addTerm(draft = termDraft) {
    const words = draft
      .split(/[,،\n]/)
      .map((w) => w.trim().slice(0, 60))
      .filter((w, i, all) => w && !f.terms.includes(w) && all.indexOf(w) === i);
    if (words.length) set({ terms: [...f.terms, ...words] });
    setTermDraft("");
  }

  // ── preview data (storefront rules) ──
  const active = f.variants.filter((v) => v.isActive);
  const priced = active.map((v) => ({
    v,
    p: takaToPaisa(v.price) ?? 0,
    c: v.compare ? takaToPaisa(v.compare) : null,
  }));
  const cheapest = (xs: typeof priced) => [...xs].sort((a, b) => a.p - b.p)[0];
  const def = cheapest(priced.filter((x) => Number(x.v.stock) > 0)) ?? cheapest(priced);
  const heat = heatOf(f.spiceLevel);
  const podsLabel = fill(t.pods, { n: digits(heat.pods, lang) });
  const catName = ctx.categories.find((c) => c.id === f.categoryId)?.name ?? t.noCategory;
  const mainSrc = f.images[0]?.src;
  // Which language each text card is editing (bilingual storefront; Bangla first, as drawn).
  const [descLang, setDescLang] = useState<ContentLang>("bn");
  const [detLang, setDetLang] = useState<ContentLang>("bn");
  const [altLang, setAltLang] = useState<ContentLang>("bn");
  const detailsOf = (l: ContentLang) => (l === "bn" ? f.details : f.detailsEn);
  const emptyIn = (l: ContentLang) => DETAIL_KEYS.filter((k) => !detailsOf(l)[k].trim()).length;
  const emptyDetails = emptyIn(detLang);
  // The preview card shows the Bangla description, like the drawn card; English until it's written.
  const previewDesc = f.descriptionBn.trim() || f.description;
  const descOf = (l: ContentLang) => (l === "bn" ? f.descriptionBn : f.description);
  const altOf = (im: FormImage, l: ContentLang) => (l === "bn" ? im.altBn : im.alt);
  const langSwitch = (
    value: ContentLang,
    onChange: (l: ContentLang) => void,
    missing: Record<ContentLang, boolean>,
  ) => (
    <ContentLangSwitch
      value={value}
      onChange={onChange}
      missing={missing}
      label={t.contentLang}
      missingLabel={t.contentLangEmpty}
    />
  );
  const termsLen = f.terms.join(", ").length;
  const offLabels = f.variants.filter((v) => !v.isActive).map((v) => v.label);

  const photo = (src: string | undefined, className: string) => (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-[repeating-linear-gradient(135deg,#f5f5f5_0_8px,#efefef_8px_16px)] text-[#8a8a8a]",
        className,
      )}
    >
      <ImageIcon className="size-6" aria-hidden />
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
  );

  const cardPreview = (w: string) => (
    <div className={cn("border-border flex flex-col gap-2 rounded-[14px] border bg-white p-2", w)}>
      {photo(mainSrc, "aspect-[4/3] rounded-[10px]")}
      <div className="flex flex-col gap-1.5 px-1.5 pb-1">
        <div>
          <div className="text-base font-medium">{f.nameBn || "—"}</div>
          <div className={help}>{f.name}</div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <Chillies level={f.spiceLevel} label={podsLabel} />
          <span className="text-muted-foreground tabular-nums">{def?.v.label ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold tabular-nums">
            {def ? formatTaka(def.p) : "—"}
          </span>
          <span
            aria-hidden
            className="bg-foreground inline-flex size-8 items-center justify-center rounded-full text-white"
          >
            <Plus className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );

  const pageHeader = (withCompare: boolean, withDesc: boolean) => (
    <div className="border-border flex flex-col gap-2 rounded-xl border bg-white p-3.5">
      <span className="text-muted-foreground text-[11px] leading-[14px]">
        {fill(t.crumbs, { cat: catName })}
      </span>
      <div>
        <div className="text-base leading-6 font-semibold">{f.nameBn || "—"}</div>
        <div className={help}>{f.name}</div>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <Chillies level={f.spiceLevel} label={podsLabel} />
        <span className="font-medium">{heat.word}</span>
        {initial.rating ? (
          <span className="text-muted-foreground">
            · ★ {digits(initial.rating.avg.toFixed(1), lang)} ({digits(initial.rating.count, lang)})
          </span>
        ) : null}
      </div>
      <div className="text-lg font-semibold tabular-nums">{def ? formatTaka(def.p) : "—"}</div>
      <div className="flex flex-wrap gap-1.5">
        {priced.map((x) => (
          <span
            key={x.v.key}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium",
              x === def ? "bg-foreground border-foreground text-white" : "border-border bg-white",
            )}
          >
            {x.v.label}
            {withCompare && x.c && x.c > x.p ? (
              <>
                {" · "}
                <s className="text-muted-foreground tabular-nums">{formatTaka(x.c)}</s>{" "}
                {formatTaka(x.p)}
              </>
            ) : null}
          </span>
        ))}
      </div>
      {withDesc && previewDesc ? (
        <p className="text-muted-foreground text-xs leading-[18px]">
          {previewDesc.length > 70 ? `${previewDesc.slice(0, 70)}…` : previewDesc}
        </p>
      ) : null}
    </div>
  );

  const statusRows = (
    <>
      <div className="flex items-center justify-between gap-3">
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
      <hr className="bg-border m-0 h-px border-0" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">{t.featured}</div>
          <div className={help}>
            <span className="max-tab:hidden">{t.featuredHelp}</span>
            <span className="tab:hidden">{t.featuredHelpPhone}</span>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={f.isFeatured}
          aria-label={t.featured}
          onClick={() => set({ isFeatured: !f.isFeatured })}
          className={switchCls(f.isFeatured)}
        />
      </div>
    </>
  );

  const title = isNew ? t.newTitle : f.nameBn || initial.nameBn;
  const subTitle = isNew ? t.newSub : fill(t.sub, { name: initial.name });
  const shop = initial.shopUrl;

  return (
    <div className="flex h-full flex-col">
      {/* Phone header (ProductEdit-Phone) */}
      <header className="border-border tab:hidden flex h-14 flex-none items-center gap-2 border-b bg-white pr-2 pl-1">
        <Link
          href="/products"
          aria-label={t.backPhone}
          className={btn({ variant: "ghost", size: "iconLg", className: "[&_svg]:size-5" })}
        >
          <ChevronLeft aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-auto flex-col leading-[1.1]">
          <b className="text-lg leading-6 font-semibold">{isNew ? t.newTitle : t.title}</b>
          {!isNew ? <span className={cn(help, "truncate")}>{initial.nameBn}</span> : null}
        </div>
        {pending ? (
          <span className="bg-muted inline-flex h-[22px] items-center rounded-sm px-2 text-xs font-medium">
            {t.saving}
          </span>
        ) : null}
      </header>

      {/* Desktop: unsaved bar (sticky under the top bar) */}
      {dirty ? (
        <div className="desk:flex wide:px-8 hidden flex-none flex-wrap items-center gap-3 border-b border-[#fde68a] bg-[#fffbeb] px-6 py-2.5">
          <CircleAlert className="size-4 text-[#b45309]" aria-hidden />
          <span className="font-medium text-[#78350f]">{t.unsaved}</span>
          <span className="text-xs text-[#92400e]">
            {fill(t.changedN, { n: digits(changed, lang) })}
          </span>
          <span className="flex-auto" />
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setF(base);
              setServer({});
              setTried(false);
            }}
            className={btn({ variant: "outline", size: "sm" })}
          >
            {t.discard}
          </button>
          <button type="button" disabled={pending} onClick={save} className={btn({ size: "sm" })}>
            {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
            {pending ? t.saving : t.save}
          </button>
        </div>
      ) : null}

      <ScrollArea className="min-h-0 flex-1">
        <div className="tab:gap-4 tab:px-6 tab:pt-5 tab:pb-8 tab:max-desk:max-w-[760px] wide:px-8 wide:pt-6 wide:pb-12 flex flex-col gap-3 p-4 pb-[110px]">
          {/* Page header (tablet / desktop) */}
          <div className="tab:flex hidden flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/products"
                aria-label={t.backAria}
                className={btn({
                  variant: "outline",
                  size: "iconLg",
                  className: "desk:hidden [&_svg]:size-5",
                })}
              >
                <ChevronLeft aria-hidden />
              </Link>
              <div className="flex flex-col gap-1.5">
                <Link
                  href="/products"
                  className="text-muted-foreground desk:flex hidden items-center gap-1 text-xs leading-4"
                >
                  <ChevronLeft className="size-3.5" aria-hidden />
                  {t.back}
                </Link>
                <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em]">{title}</h1>
                <p className="text-muted-foreground text-[13px] leading-4">{subTitle}</p>
              </div>
            </div>
            {shop ? (
              <a
                href={shop}
                target="_blank"
                rel="noreferrer"
                className={btn({
                  variant: "outline",
                  size: "lg",
                  className: "desk:h-8 desk:gap-1.5 desk:px-3 desk:text-[13px]",
                })}
              >
                {t.viewInShop}
                <ExternalLink className="desk:block hidden" aria-hidden />
              </a>
            ) : null}
          </div>

          {show && summary.length ? (
            <div
              role="alert"
              className="bg-destructive-soft flex items-start gap-3 rounded-[10px] border border-[#fecaca] px-4 py-3 text-[#991b1b]"
            >
              <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden />
              <div>
                <div className="font-medium">
                  {fill(t.errTitle, { n: digits(summary.length, lang) })}
                </div>
                <ul className="mt-1 flex list-none flex-col gap-0.5 p-0 text-xs">
                  {summary.map((s, i) => (
                    <li key={i}>
                      <a href={s.href} className="underline">
                        {s.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          <div className="desk:flex-row desk:flex-wrap desk:items-start max-tab:gap-3 flex flex-col gap-4">
            {/* Main column */}
            <div className="desk:flex desk:min-w-0 desk:flex-[999_1_560px] desk:flex-col desk:gap-4 contents">
              <section className={cn(card, "order-2")}>
                <CardHead title={t.basics} desc={t.basicsSub} />
                <div className={cn(body, "desk:grid desk:grid-cols-2 gap-4")}>
                  <div className="flex min-w-0 flex-col gap-2">
                    <label className={labelCls} htmlFor="pe-bn">
                      {t.nameBn}
                    </label>
                    <input
                      id="pe-bn"
                      value={f.nameBn}
                      maxLength={200}
                      onChange={(e) => set({ nameBn: e.target.value })}
                      className={inputCls(show && !!errs.nameBn)}
                    />
                    {show && errs.nameBn ? <span className={errCls}>{errs.nameBn}</span> : null}
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <label className={labelCls} htmlFor="pe-en">
                      {t.nameEn}
                    </label>
                    <input
                      id="pe-en"
                      value={f.name}
                      maxLength={200}
                      onChange={(e) =>
                        set({
                          name: e.target.value,
                          ...(slugTouched ? {} : { slug: slugify(e.target.value) }),
                        })
                      }
                      className={inputCls(show && !!errs.name)}
                    />
                    {show && errs.name ? <span className={errCls}>{errs.name}</span> : null}
                  </div>
                  <div className="desk:col-span-2 flex min-w-0 flex-col gap-2">
                    <label className={labelCls} htmlFor="pe-slug">
                      {t.slug}{" "}
                      <span className="text-muted-foreground max-tab:hidden font-normal">
                        {t.slugHint}
                      </span>
                    </label>
                    <div
                      className={cn(
                        inputCls(show && !!errs.slug),
                        "flex items-center gap-0 overflow-hidden p-0 pr-1",
                      )}
                    >
                      <span className="text-muted-foreground bg-subtle border-input desk:flex hidden h-full items-center border-r px-2.5 font-mono text-xs">
                        /pickles/
                      </span>
                      <input
                        id="pe-slug"
                        value={f.slug}
                        maxLength={140}
                        aria-invalid={show && !!errs.slug}
                        onChange={(e) => {
                          setSlugTouched(true);
                          set({ slug: e.target.value.toLowerCase() });
                        }}
                        className="max-desk:text-sm h-full min-w-0 flex-auto bg-transparent px-2.5 font-mono text-[13px] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSlugTouched(true);
                          set({ slug: slugify(f.name) });
                        }}
                        className={btn({
                          variant: "ghost",
                          size: "xs",
                          className: "max-desk:h-9 max-desk:px-3 max-desk:text-sm max-tab:hidden",
                        })}
                      >
                        {t.slugFromName}
                      </button>
                    </div>
                    {show && errs.slug ? <span className={errCls}>{errs.slug}</span> : null}
                    <span className={cn(help, "tab:max-desk:block hidden font-mono")}>
                      /pickles/{f.slug}
                    </span>
                    <span className={cn(help, "max-tab:hidden")}>{t.slugHelp}</span>
                    <span className={cn(help, "tab:hidden")}>
                      {fill(t.slugHelpPhone, { slug: f.slug })}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <span className={labelCls}>{t.category}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={t.category}
                        className={cn(
                          inputCls(),
                          "flex items-center justify-between gap-2 text-left",
                        )}
                      >
                        <span className="truncate">{catName}</span>
                        <ChevronDown
                          className="text-muted-foreground size-4 flex-none"
                          aria-hidden
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-lg p-1 shadow-md"
                      >
                        {[{ id: null as number | null, name: t.noCategory }, ...ctx.categories].map(
                          (c) => (
                            <DropdownMenuItem
                              key={String(c.id)}
                              onSelect={() => set({ categoryId: c.id })}
                              className="focus:bg-accent h-9 gap-2 rounded-sm px-2 text-sm"
                            >
                              <Check
                                className={cn(
                                  "size-4",
                                  f.categoryId === c.id ? "opacity-100" : "opacity-0",
                                )}
                                aria-hidden
                              />
                              {c.name}
                            </DropdownMenuItem>
                          ),
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <span className={labelCls} id="pe-spice">
                      {t.spice}{" "}
                      <span className="text-muted-foreground font-normal">{t.spiceRange}</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        role="radiogroup"
                        aria-labelledby="pe-spice"
                        className="border-border desk:inline-flex desk:w-auto desk:shadow-xs desk:flex-none grid w-full max-w-[240px] flex-[1_1_200px] grid-cols-4 overflow-hidden rounded-md border"
                      >
                        {[0, 1, 2, 3].map((n) => (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={f.spiceLevel === n}
                            onClick={() => set({ spiceLevel: n })}
                            className={cn(
                              "border-border desk:h-9 desk:w-10 desk:text-sm h-11 border-r text-[15px] font-medium last:border-r-0",
                              f.spiceLevel === n ? "bg-primary text-white" : "bg-white",
                            )}
                          >
                            {digits(n, "en")}
                          </button>
                        ))}
                      </div>
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">{t.inShop}</span>
                        <Chillies level={f.spiceLevel} label={podsLabel} />
                        <span className="font-medium">{heat.word}</span>
                      </span>
                    </div>
                  </div>
                  <div className="desk:col-span-2 flex min-w-0 flex-col gap-2">
                    <label className={labelCls} htmlFor="pe-kw">
                      {t.terms}{" "}
                      <span className="text-muted-foreground max-tab:hidden font-normal">
                        {t.termsHint}
                      </span>
                    </label>
                    <div className="desk:border-input desk:flex-row desk:flex-wrap desk:items-center desk:rounded-md desk:border desk:bg-white desk:px-2 desk:py-[5px] desk:shadow-xs flex flex-col gap-1.5">
                      {f.terms.length ? (
                        <div className="desk:contents flex flex-wrap gap-1.5">
                          {f.terms.map((w) => (
                            <span
                              key={w}
                              className="bg-muted desk:h-6 desk:pl-2 desk:text-xs inline-flex h-9 items-center gap-1 rounded-md pr-1 pl-3 text-[13px] font-medium"
                            >
                              {w}
                              <button
                                type="button"
                                aria-label={fill(t.termRemove, { t: w })}
                                onClick={() => set({ terms: f.terms.filter((x) => x !== w) })}
                                className="text-muted-foreground desk:size-[18px] inline-flex size-8 items-center justify-center rounded-sm"
                              >
                                <X className="size-3.5" aria-hidden />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <input
                        id="pe-kw"
                        value={termDraft}
                        maxLength={60}
                        placeholder={t.termsPh}
                        onChange={(e) =>
                          /[,،]/.test(e.target.value)
                            ? addTerm(e.target.value)
                            : setTermDraft(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTerm();
                          }
                        }}
                        onBlur={() => addTerm()}
                        className={cn(
                          inputCls(termsLen > 500),
                          "desk:h-6 desk:flex-[1_1_120px] desk:border-0 desk:p-0 desk:shadow-none desk:focus:shadow-none",
                        )}
                      />
                    </div>
                    <span className={cn(help, "max-tab:hidden")}>
                      {fill(t.termsHelp, { n: digits(termsLen, lang) })}
                    </span>
                    <span className={cn(help, "tab:hidden")}>
                      {fill(t.termsHelpPhone, { n: digits(termsLen, lang) })}
                    </span>
                  </div>
                </div>
              </section>

              <section className={cn(card, "order-3")}>
                <CardHead
                  title={t.description}
                  desc={t.descriptionSub}
                  aside={langSwitch(descLang, setDescLang, {
                    bn: !f.descriptionBn.trim(),
                    en: !f.description.trim(),
                  })}
                />
                <div className={body}>
                  <textarea
                    aria-label={t.description}
                    lang={descLang}
                    value={descOf(descLang)}
                    maxLength={5000}
                    onChange={(e) =>
                      set(
                        descLang === "bn"
                          ? { descriptionBn: e.target.value }
                          : { description: e.target.value },
                      )
                    }
                    className={cn(area, "max-tab:min-h-[120px] min-h-28")}
                  />
                  <div className="mt-4 flex flex-col gap-1.5">
                    <label className={labelCls} htmlFor="pe-tagline">
                      {t.tagline}
                    </label>
                    <input
                      id="pe-tagline"
                      lang={descLang}
                      value={descLang === "bn" ? f.tagline : f.taglineEn}
                      maxLength={120}
                      onChange={(e) =>
                        set(
                          descLang === "bn"
                            ? { tagline: e.target.value }
                            : { taglineEn: e.target.value },
                        )
                      }
                      className={inputCls()}
                    />
                    <span className={help}>{t.taglineHelp}</span>
                  </div>
                </div>
              </section>

              <section className={cn(card, "order-4")}>
                <CardHead
                  title={t.details}
                  desc={t.detailsSub}
                  aside={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {emptyDetails ? (
                        <span className="bg-badge-warn-bg text-badge-warn-fg inline-flex h-[22px] flex-none items-center rounded-sm px-2 text-xs font-medium whitespace-nowrap">
                          <span className="max-tab:hidden">
                            {fill(t.emptyOfN, { n: digits(emptyDetails, lang) })}
                          </span>
                          <span className="tab:hidden">
                            {fill(t.emptyN, { n: digits(emptyDetails, lang) })}
                          </span>
                        </span>
                      ) : null}
                      {langSwitch(detLang, setDetLang, {
                        bn: emptyIn("bn") > 0,
                        en: emptyIn("en") > 0,
                      })}
                    </div>
                  }
                />
                <div className={cn(body, "desk:grid desk:grid-cols-2 gap-4")}>
                  <p className={cn(help, "tab:hidden -mt-1")}>{t.detailsHelpPhone}</p>
                  {DETAIL_KEYS.map((k) => {
                    const [bnL, enL, ph] = t.fields[k];
                    const value = detailsOf(detLang)[k];
                    const empty = !value.trim();
                    const fallback = empty && !!detailsOf(detLang === "bn" ? "en" : "bn")[k].trim();
                    return (
                      <div key={k} className="flex min-w-0 flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className={labelCls} htmlFor={`pd-${k}`}>
                            {bnL}
                            {enL ? (
                              <span className="text-muted-foreground max-tab:hidden text-xs font-normal">
                                {" "}
                                · {enL}
                              </span>
                            ) : null}
                          </label>
                          {empty ? (
                            <span className="bg-muted text-foreground inline-flex h-[22px] flex-none items-center rounded-sm px-2 text-xs font-medium whitespace-nowrap">
                              <span className="max-tab:hidden">
                                {fallback ? t.emptyFallback : t.emptyHidden}
                              </span>
                              <span className="tab:hidden">{t.empty}</span>
                            </span>
                          ) : null}
                        </div>
                        <textarea
                          id={`pd-${k}`}
                          lang={detLang}
                          value={value}
                          maxLength={5000}
                          placeholder={detLang === "bn" ? ph : t.fieldsEnPh[k]}
                          onChange={(e) =>
                            set(
                              detLang === "bn"
                                ? { details: { ...f.details, [k]: e.target.value } }
                                : { detailsEn: { ...f.detailsEn, [k]: e.target.value } },
                            )
                          }
                          className={cn(area, "max-tab:min-h-[60px] min-h-16")}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>

              <section id="pe-sizes" className={cn(card, "order-5 scroll-mt-4")}>
                <CardHead
                  title={t.variants}
                  desc={t.variantsSub}
                  aside={
                    <button
                      type="button"
                      onClick={() =>
                        set({
                          variants: [
                            ...f.variants,
                            {
                              key: nextKey(),
                              label: "",
                              weight: "",
                              sku: "",
                              price: "",
                              compare: "",
                              cost: "",
                              stock: "0",
                              isActive: true,
                              orders: 0,
                            },
                          ],
                        })
                      }
                      className={btn({
                        variant: "outline",
                        size: "lg",
                        className: "desk:h-8 desk:gap-1.5 desk:px-3 desk:text-[13px] max-tab:px-3",
                      })}
                    >
                      <Plus aria-hidden />
                      <span className="max-tab:hidden">{t.addSize}</span>
                      <span className="tab:hidden">{t.addSizeShort}</span>
                    </button>
                  }
                />
                <div className={cn(body, "tab:max-desk:gap-3 gap-2.5")}>
                  {show && errs.noSize ? <span className={errCls}>{errs.noSize}</span> : null}
                  {f.variants.map((v, i) => {
                    const e = show ? errs.variants[i] : undefined;
                    const isDef = def?.v.key === v.key;
                    const label = v.label || t.newSize;
                    return (
                      <div
                        key={v.key}
                        id={`pe-${v.key}`}
                        onDragOver={(ev) => drag?.list === "v" && ev.preventDefault()}
                        onDrop={() => {
                          if (drag?.list === "v") set({ variants: move(f.variants, drag.from, i) });
                          setDrag(null);
                        }}
                        className={cn(
                          "border-border flex scroll-mt-4 flex-col gap-3 rounded-[10px] border bg-white p-3",
                          isDef && "border-primary shadow-[0_0_0_1px_var(--primary)]",
                          !v.isActive && "bg-subtle",
                        )}
                      >
                        <div className="max-tab:gap-1.5 flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            draggable
                            onDragStart={() => setDrag({ list: "v", from: i })}
                            onDragEnd={() => setDrag(null)}
                            // Keyboard: ↑ / ↓ on the focused handle moves the size one place.
                            aria-keyshortcuts="ArrowUp ArrowDown"
                            onKeyDown={(ev) => {
                              const to =
                                i + (ev.key === "ArrowUp" ? -1 : ev.key === "ArrowDown" ? 1 : 0);
                              if (to === i || to < 0 || to >= f.variants.length) return;
                              ev.preventDefault();
                              set({ variants: move(f.variants, i, to) });
                            }}
                            aria-label={fill(t.dragAria, { label })}
                            className="desk:size-8 max-tab:hidden inline-flex size-11 flex-none cursor-grab items-center justify-center rounded-md text-[#a3a3a3]"
                          >
                            <GripVertical className="size-4" aria-hidden />
                          </button>
                          <span className="font-medium">{label}</span>
                          {isDef ? (
                            <span className="bg-primary inline-flex h-[22px] items-center rounded-sm px-2 text-xs font-medium text-white">
                              <span className="max-tab:hidden">{t.defaultBadge}</span>
                              <span className="tab:hidden">{t.defaultShort}</span>
                            </span>
                          ) : null}
                          {!v.isActive ? (
                            <span className="bg-muted inline-flex h-[22px] items-center rounded-sm px-2 text-xs font-medium">
                              <span className="desk:inline hidden">{t.offBadge}</span>
                              <span className="desk:hidden">{t.off}</span>
                            </span>
                          ) : null}
                          <span className="flex-auto" />
                          <span className={cn(help, "max-tab:hidden")}>{t.on}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={v.isActive}
                            aria-label={fill(t.onAria, { label })}
                            onClick={() => setVariant(v.key, { isActive: !v.isActive })}
                            className={switchCls(v.isActive)}
                          />
                          <button
                            type="button"
                            aria-label={fill(t.deleteAria, { label })}
                            onClick={() => setConfirm(v)}
                            className={btn({
                              variant: "ghost",
                              size: "iconLg",
                              className: "desk:size-8 max-tab:hidden",
                            })}
                          >
                            <Trash2 aria-hidden />
                          </button>
                        </div>
                        <div className="desk:grid-cols-[1.2fr_0.9fr_1.3fr_1fr_1fr_0.8fr] tab:grid-cols-3 tab:max-desk:gap-3 grid grid-cols-2 gap-2.5">
                          <div className="flex min-w-0 flex-col gap-1.5">
                            <label className="text-xs font-medium" htmlFor={`${v.key}-l`}>
                              {t.sizeName}
                            </label>
                            <input
                              id={`${v.key}-l`}
                              value={v.label}
                              maxLength={80}
                              onChange={(ev) => setVariant(v.key, { label: ev.target.value })}
                              className={smallInput(!!e?.label)}
                            />
                          </div>
                          <div className="flex min-w-0 flex-col gap-1.5">
                            <label className="text-xs font-medium" htmlFor={`${v.key}-g`}>
                              {t.weight}
                            </label>
                            <input
                              id={`${v.key}-g`}
                              inputMode="numeric"
                              value={v.weight}
                              onChange={(ev) =>
                                setVariant(v.key, { weight: ev.target.value.replace(/\D/g, "") })
                              }
                              className={cn(smallInput(), "tabular-nums")}
                            />
                          </div>
                          <div className="max-tab:col-span-2 flex min-w-0 flex-col gap-1.5">
                            <label className="text-xs font-medium" htmlFor={`${v.key}-s`}>
                              {t.sku}
                            </label>
                            <input
                              id={`${v.key}-s`}
                              value={v.sku}
                              maxLength={64}
                              onChange={(ev) =>
                                setVariant(v.key, { sku: ev.target.value.toUpperCase() })
                              }
                              className={cn(smallInput(!!e?.sku), "font-mono")}
                            />
                            {e?.sku ? <span className={errCls}>{e.sku}</span> : null}
                          </div>
                          <div className="flex min-w-0 flex-col gap-1.5">
                            <label className="text-xs font-medium" htmlFor={`${v.key}-p`}>
                              {t.price}
                            </label>
                            <div
                              className={cn(smallInput(!!e?.price), "flex items-center gap-1.5")}
                            >
                              <span className="text-muted-foreground">৳</span>
                              <input
                                id={`${v.key}-p`}
                                inputMode="decimal"
                                value={v.price}
                                placeholder="0"
                                onChange={(ev) => setVariant(v.key, { price: ev.target.value })}
                                className="min-w-0 flex-auto bg-transparent tabular-nums outline-none"
                              />
                            </div>
                            {e?.price ? <span className={errCls}>{e.price}</span> : null}
                          </div>
                          <div className="flex min-w-0 flex-col gap-1.5">
                            <label className="text-xs font-medium" htmlFor={`${v.key}-c`}>
                              {t.compare}
                            </label>
                            <div
                              className={cn(smallInput(!!e?.compare), "flex items-center gap-1.5")}
                            >
                              <span className="text-muted-foreground">৳</span>
                              <input
                                id={`${v.key}-c`}
                                inputMode="decimal"
                                value={v.compare}
                                placeholder={t.optional}
                                onChange={(ev) => setVariant(v.key, { compare: ev.target.value })}
                                className="placeholder:text-muted-foreground min-w-0 flex-auto bg-transparent tabular-nums outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex min-w-0 flex-col gap-1.5">
                            <label className="text-xs font-medium" htmlFor={`${v.key}-k`}>
                              {t.stock}
                            </label>
                            <input
                              id={`${v.key}-k`}
                              inputMode="numeric"
                              value={v.stock}
                              onChange={(ev) =>
                                setVariant(v.key, { stock: ev.target.value.replace(/\D/g, "") })
                              }
                              className={cn(smallInput(), "tabular-nums")}
                            />
                          </div>
                          <div className="tab:hidden flex min-w-0 flex-col gap-1.5">
                            <label className="text-xs font-medium" htmlFor={`${v.key}-$`}>
                              {t.cost}
                            </label>
                            <div className={cn(smallInput(!!e?.cost), "flex items-center gap-1.5")}>
                              <span className="text-muted-foreground">৳</span>
                              <input
                                id={`${v.key}-$`}
                                inputMode="decimal"
                                value={v.cost}
                                placeholder={t.optional}
                                onChange={(ev) => setVariant(v.key, { cost: ev.target.value })}
                                className="placeholder:text-muted-foreground min-w-0 flex-auto bg-transparent tabular-nums outline-none"
                              />
                            </div>
                          </div>
                        </div>
                        {/* Cost / profit (owner only): profit per unit = price − cost. */}
                        <div className="bg-subtle flex flex-wrap items-center gap-2.5 rounded-md px-2.5 py-2">
                          <span className="max-tab:hidden text-xs font-medium">{t.cost}</span>
                          <div
                            className={cn(
                              smallInput(!!e?.cost),
                              "max-tab:hidden tab:max-desk:w-[120px] flex w-[110px] items-center gap-1.5",
                            )}
                          >
                            <span className="text-muted-foreground">৳</span>
                            <input
                              aria-label={t.cost}
                              inputMode="decimal"
                              value={v.cost}
                              placeholder={t.optional}
                              onChange={(ev) => setVariant(v.key, { cost: ev.target.value })}
                              className="placeholder:text-muted-foreground min-w-0 flex-auto bg-transparent tabular-nums outline-none"
                            />
                          </div>
                          <span className={help}>{t.margin}</span>
                          <span
                            className={cn(
                              "max-tab:order-last max-tab:ml-auto font-medium tabular-nums",
                              profitOf(v) !== null && (profitOf(v) ?? 0) < 0
                                ? "text-destructive"
                                : "text-[#15803d]",
                            )}
                          >
                            {profitText(v)}
                          </span>
                          <span className="max-tab:hidden flex-auto" />
                          <span className="text-muted-foreground max-tab:hidden text-xs leading-4">
                            {t.costHelp}
                          </span>
                        </div>
                        {/* Phone: up / down and delete (ProductEdit-Phone) */}
                        <div className="tab:hidden flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={i === 0}
                            aria-label={fill(t.upAria, { label })}
                            onClick={() => set({ variants: move(f.variants, i, i - 1) })}
                            className={btn({ variant: "outline", size: "iconLg" })}
                          >
                            <ChevronUp aria-hidden />
                          </button>
                          <button
                            type="button"
                            disabled={i === f.variants.length - 1}
                            aria-label={fill(t.downAria, { label })}
                            onClick={() => set({ variants: move(f.variants, i, i + 1) })}
                            className={btn({ variant: "outline", size: "iconLg" })}
                          >
                            <ChevronDown aria-hidden />
                          </button>
                          <span className="flex-auto" />
                          <button
                            type="button"
                            onClick={() => setConfirm(v)}
                            className={btn({
                              variant: "ghost",
                              size: "lg",
                              className: "text-danger-text",
                            })}
                          >
                            {t.deleteSize}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className={cn(card, "order-6")}>
                <CardHead
                  title={t.images}
                  desc={
                    <>
                      <span className="wide:inline hidden">{t.imagesSub}</span>
                      <span className="wide:hidden">{t.imagesSubTab}</span>
                    </>
                  }
                  phoneSub={t.imagesSubPhone}
                  aside={
                    f.images.length
                      ? langSwitch(altLang, setAltLang, {
                          bn: f.images.some((im) => !im.altBn.trim()),
                          en: f.images.some((im) => !im.alt.trim()),
                        })
                      : null
                  }
                />
                <div
                  className={cn(
                    body,
                    "desk:grid-cols-4 tab:grid tab:grid-cols-3 max-tab:flex-row max-tab:overflow-x-auto max-tab:pb-4 gap-3",
                  )}
                >
                  {f.images.map((im, i) => {
                    const main = i === 0;
                    return (
                      <div
                        key={im.key}
                        onDragOver={(ev) => drag?.list === "i" && ev.preventDefault()}
                        onDrop={() => {
                          if (drag?.list === "i") set({ images: move(f.images, drag.from, i) });
                          setDrag(null);
                        }}
                        className={cn(
                          "max-tab:w-[150px] max-tab:flex-none flex flex-col overflow-hidden rounded-[10px] bg-white",
                          main ? "border-primary border-2" : "border-border border",
                        )}
                      >
                        <div className="relative">
                          {photo(im.src, "aspect-square max-tab:aspect-auto max-tab:h-[132px]")}
                          <button
                            type="button"
                            draggable
                            onDragStart={() => setDrag({ list: "i", from: i })}
                            onDragEnd={() => setDrag(null)}
                            // Keyboard: ← / → (↑ / ↓) on the focused handle moves the photo one place.
                            aria-keyshortcuts="ArrowLeft ArrowRight"
                            onKeyDown={(ev) => {
                              const step =
                                ev.key === "ArrowLeft" || ev.key === "ArrowUp"
                                  ? -1
                                  : ev.key === "ArrowRight" || ev.key === "ArrowDown"
                                    ? 1
                                    : 0;
                              const to = i + step;
                              if (to === i || to < 0 || to >= f.images.length) return;
                              ev.preventDefault();
                              set({ images: move(f.images, i, to) });
                            }}
                            aria-label={t.dragImage}
                            className={btn({
                              variant: "outline",
                              size: "iconLg",
                              className:
                                "desk:size-7 max-tab:hidden absolute top-1.5 left-1.5 cursor-grab",
                            })}
                          >
                            <GripVertical aria-hidden />
                          </button>
                          {main ? (
                            <span className="bg-primary max-tab:top-1.5 max-tab:right-auto max-tab:left-1.5 absolute top-2 right-2 inline-flex h-[22px] items-center gap-1 rounded-sm px-2 text-xs font-medium text-white">
                              <Star className="max-tab:hidden size-3 fill-current" aria-hidden />
                              {t.mainImage}
                            </span>
                          ) : null}
                          {im.isFeatured ? (
                            <span className="absolute bottom-2 left-2 inline-flex h-[22px] items-center gap-1 rounded-sm bg-[#92400e] px-2 text-xs font-medium text-white">
                              <Sparkles className="max-tab:hidden size-3" aria-hidden />
                              {t.featuredImage}
                            </span>
                          ) : null}
                        </div>
                        <div className="max-tab:p-1.5 flex flex-col gap-1.5 p-2">
                          <input
                            aria-label={t.altAria}
                            placeholder={t.altPh}
                            lang={altLang}
                            value={altOf(im, altLang)}
                            maxLength={200}
                            onChange={(ev) =>
                              set({
                                images: f.images.map((x) =>
                                  x.key === im.key
                                    ? {
                                        ...x,
                                        [altLang === "bn" ? "altBn" : "alt"]: ev.target.value,
                                      }
                                    : x,
                                ),
                              })
                            }
                            className={cn(smallInput(), "max-tab:text-[13px]")}
                          />
                          {!altOf(im, altLang) ? (
                            <span className="desk:block hidden text-xs leading-4 text-[#92400e]">
                              {t.noAlt}
                            </span>
                          ) : null}
                          {/* One photo can be the Home "বিশেষ বাছাই" picture; it is left out of the product page. */}
                          <button
                            type="button"
                            aria-pressed={im.isFeatured}
                            onClick={() =>
                              set({
                                images: f.images.map((x) => ({
                                  ...x,
                                  isFeatured: x.key === im.key ? !im.isFeatured : false,
                                })),
                              })
                            }
                            className={btn({
                              variant: im.isFeatured ? "primary" : "outline",
                              size: "lg",
                              className:
                                "desk:h-7 desk:text-xs desk:px-2.5 max-tab:text-[13px] w-full px-2.5",
                            })}
                          >
                            {im.isFeatured ? t.featuredOn : t.makeFeatured}
                          </button>
                          <div className="flex gap-1">
                            {main ? (
                              <span className="text-muted-foreground max-tab:hidden flex flex-auto items-center text-xs">
                                {t.mainNote}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => set({ images: move(f.images, i, 0) })}
                                className={btn({
                                  variant: "outline",
                                  size: "lg",
                                  className:
                                    "desk:h-7 desk:text-xs desk:px-2.5 max-tab:text-[13px] flex-auto px-2.5",
                                })}
                              >
                                {t.makeMain}
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={t.deleteImage}
                              onClick={() =>
                                set({ images: f.images.filter((x) => x.key !== im.key) })
                              }
                              className={btn({
                                variant: "ghost",
                                size: "iconLg",
                                className: "desk:size-7 max-tab:hidden",
                              })}
                            >
                              <Trash2 aria-hidden />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div
                    onDragOver={(ev) => ctx.uploads && ev.preventDefault()}
                    onDrop={(ev) => {
                      ev.preventDefault();
                      void upload(ev.dataTransfer.files);
                    }}
                    className="desk:col-span-1 desk:min-h-[220px] tab:col-span-3 text-muted-foreground max-tab:w-[132px] max-tab:flex-none max-tab:p-2.5 relative flex flex-col items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[#d4d4d4] bg-[#fafafa] p-5 text-center"
                  >
                    {uploading ? (
                      <LoaderCircle className="size-6 animate-spin" aria-hidden />
                    ) : (
                      <Upload className="size-6" aria-hidden />
                    )}
                    <span className="text-foreground font-medium">
                      <span className="max-tab:hidden">{uploading ? t.uploading : t.upload}</span>
                      <span className="tab:hidden">{t.uploadPhone}</span>
                    </span>
                    <span className="desk:block hidden text-xs leading-4">
                      {t.uploadHelp}
                      <br />
                      {t.uploadTypes}
                    </span>
                    <span className="tab:max-desk:block hidden text-xs leading-4">
                      {t.uploadHelpTab}
                    </span>
                    <span className="tab:hidden text-[11px] leading-[14px]">
                      {t.uploadHelpPhone}
                    </span>
                    {ctx.uploads ? (
                      <>
                        <input
                          ref={fileRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="sr-only"
                          onChange={(ev) => {
                            void upload(ev.target.files);
                            ev.target.value = "";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className={btn({
                            variant: "outline",
                            size: "lg",
                            className: "desk:h-8 desk:text-[13px] desk:px-3 max-tab:hidden mt-1",
                          })}
                        >
                          {t.pickFile}
                        </button>
                        <button
                          type="button"
                          aria-label={t.uploadPhone}
                          onClick={() => fileRef.current?.click()}
                          className="tab:hidden absolute inset-0"
                        />
                      </>
                    ) : (
                      <NeedsStorage label="needs storage · R2" />
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Side column (desktop) / first and last cards (tablet, phone) */}
            <div className="desk:flex desk:min-w-0 desk:flex-[1_1_320px] desk:flex-col desk:gap-4 contents">
              <section className={cn(card, "order-1")}>
                <div className="desk:block hidden">
                  <CardHead title={t.status} desc={t.statusSub} />
                </div>
                <div className={cn(body, "desk:pt-4 tab:pt-4 max-tab:gap-3 gap-3.5")}>
                  {statusRows}
                </div>
              </section>
              <section className={cn(card, "desk:flex order-7 hidden")}>
                <CardHead title={t.cardPreview} desc={t.cardPreviewSub} />
                <div className={body}>{cardPreview("w-[220px]")}</div>
              </section>
              <section className={cn(card, "desk:flex order-8 hidden")}>
                <CardHead title={t.pagePreview} desc={t.pagePreviewSub} />
                <div className={body}>
                  {pageHeader(false, true)}
                  <p className="text-muted-foreground mt-2.5 text-[11px] leading-[14px]">
                    {offLabels.length
                      ? fill(t.pageNote, { labels: offLabels.join(", ") })
                      : t.pageNoteNoOff}
                  </p>
                </div>
              </section>
              {/* Tablet / phone: one previews card */}
              <section className={cn(card, "desk:hidden order-7")}>
                <CardHead title={t.previews} desc={t.previewsSub} />
                <div
                  className={cn(
                    body,
                    "tab:grid tab:grid-cols-[220px_minmax(0,1fr)] tab:items-start max-tab:gap-3 gap-4",
                  )}
                >
                  {cardPreview("w-[220px] max-tab:w-[200px]")}
                  {pageHeader(true, false)}
                </div>
              </section>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Tablet: bottom save bar (.t-save) */}
      <div className="border-border tab:flex desk:hidden hidden flex-none items-center justify-between gap-3 border-t bg-white px-6 py-3 shadow-[0_-4px_12px_rgba(0,0,0,.05)]">
        {dirty ? (
          <span className="text-xs leading-4">
            <span className="font-medium">{t.unsaved}</span>
            <span className="text-muted-foreground">
              {" "}
              · {fill(t.changedN, { n: digits(changed, lang) })}
            </span>
          </span>
        ) : savedNow ? (
          <span className="flex items-center gap-2 text-xs text-[#166534]">
            <CircleCheck className="size-4" aria-hidden />
            {t.savedNow}
          </span>
        ) : (
          <span />
        )}
        <span className="flex gap-2">
          <button
            type="button"
            disabled={!dirty || pending}
            onClick={() => {
              setF(base);
              setServer({});
              setTried(false);
            }}
            className={btn({ variant: "outline", size: "lg" })}
          >
            {t.discard}
          </button>
          <button
            type="button"
            disabled={!dirty || pending}
            onClick={save}
            className={btn({ size: "lg" })}
          >
            {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
            {pending ? t.saving : t.save}
          </button>
        </span>
      </div>

      {/* Phone: bottom bar */}
      <div className="border-border tab:hidden fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t bg-white px-4 pt-3 pb-6">
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={() => {
            setF(base);
            setServer({});
            setTried(false);
          }}
          className={btn({ variant: "outline", size: "lg", className: "flex-1 basis-0" })}
        >
          {t.discard}
        </button>
        <button
          type="button"
          disabled={(!dirty && !isNew) || pending}
          aria-busy={pending}
          onClick={save}
          className={btn({ size: "lg", className: "flex-[2] basis-0" })}
        >
          {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : null}
          {pending ? t.saving : t.save}
        </button>
      </div>

      <Dialog.Root open={!!confirm} onOpenChange={(v) => (v ? undefined : setConfirm(null))}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content
            role="alertdialog"
            aria-describedby={undefined}
            className="border-border fixed top-1/2 left-1/2 z-50 flex w-[400px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border bg-white p-6 shadow-lg"
          >
            {confirm ? (
              <>
                <div>
                  <Dialog.Title className="text-base leading-6 font-semibold">
                    {fill(confirm.orders ? t.inUseTitle : t.deleteTitle, {
                      label: confirm.label || t.newSize,
                    })}
                  </Dialog.Title>
                  <p className="text-muted-foreground text-[13px] leading-5">
                    {confirm.orders
                      ? fill(t.inUseBody, { n: digits(confirm.orders, lang) })
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
                  {confirm.orders ? (
                    <button
                      type="button"
                      onClick={() => {
                        setVariant(confirm.key, { isActive: false });
                        setConfirm(null);
                      }}
                      className={btn({ size: "lg", className: "desk:h-9 desk:px-4 desk:text-sm" })}
                    >
                      {t.turnOff}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        set({ variants: f.variants.filter((x) => x.key !== confirm.key) });
                        setConfirm(null);
                      }}
                      className={btn({
                        variant: "destructive",
                        size: "lg",
                        className: "desk:h-9 desk:px-4 desk:text-sm",
                      })}
                    >
                      {t.doDelete}
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
