"use server";

import { db, schema, sql } from "@repo/db";
import {
  productImageUploadInput,
  shareCardInput,
  shareCardJobsInput,
  shareCardUploadInput,
} from "@repo/validators";
import { readImageSize } from "@/lib/image-size";
import {
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  putProductImage,
  putShareCard,
  r2PublicUrl,
  uploadsEnabled,
} from "@/lib/r2";
import { requireAdmin } from "@/lib/require-admin";
import { buildCardSpecs, cardKey, isStale, storedCards, type CardSpec } from "@/lib/share-cards";

/*
 * Share cards (docs/future/og-sharing.md). Owner and staff both edit them in Share Studio
 * (owner, 2026-11-26), so every action here needs an admin, not only the owner.
 */

/** Rendered JPEGs are well under this (the renderer aims for 300 KB). */
const CARD_MAX_BYTES = 1024 * 1024;
const SIZES = { wide: [1200, 630], square: [1080, 1080] } as const;

/**
 * The cards the browser should draw: one product's, shelf's or page's (after a save), or all of
 * them (Settings "শেয়ার কার্ড"). Stale-only by default, so re-running only redraws what changed.
 */
export async function shareCardJobs(input: unknown): Promise<CardSpec[]> {
  await requireAdmin();
  const q = shareCardJobsInput.parse(input);
  if (!uploadsEnabled()) return [];
  const rows = await storedCards();
  const specs = await buildCardSpecs(
    q.kind ? { kind: q.kind, id: q.id, pageKey: q.pageKey } : undefined,
    rows,
  );
  return q.onlyStale ? specs.filter((s) => isStale(s, rows.get(cardKey(s)))) : specs;
}

export type ShareCardUploadResult =
  { ok: true } | { ok: false; reason: "disabled" | "file" | "stale" | "failed" };

/**
 * One rendered card in one language: a 1200×630 and a 1080×1080 JPEG. The server rebuilds the
 * card's inputs and only stores it when they still match what the browser drew (`hash`).
 */
export async function uploadShareCard(form: FormData): Promise<ShareCardUploadResult> {
  await requireAdmin();
  if (!uploadsEnabled()) return { ok: false, reason: "disabled" };
  const f = shareCardUploadInput.parse({
    kind: form.get("kind"),
    refId: form.get("refId"),
    pageKey: form.get("pageKey") ?? "",
    lang: form.get("lang"),
    hash: form.get("hash"),
  });

  const files: Partial<Record<keyof typeof SIZES, ArrayBuffer>> = {};
  for (const size of ["wide", "square"] as const) {
    const file = form.get(size);
    if (!(file instanceof File) || file.type !== "image/jpeg" || file.size > CARD_MAX_BYTES)
      return { ok: false, reason: "file" };
    const bytes = await file.arrayBuffer();
    const dim = readImageSize(bytes);
    const [w, h] = SIZES[size];
    if (!dim || dim.width !== w || dim.height !== h) return { ok: false, reason: "file" };
    files[size] = bytes;
  }
  const { wide, square } = files;
  if (!wide || !square) return { ok: false, reason: "file" };

  const rows = await storedCards();
  const spec = (
    await buildCardSpecs({ kind: f.kind, id: f.refId || undefined, pageKey: f.pageKey }, rows)
  ).find((s) => s.lang === f.lang && s.pageKey === f.pageKey && s.refId === f.refId);
  if (!spec || spec.hash !== f.hash) return { ok: false, reason: "stale" };

  try {
    const version = (rows.get(cardKey(spec))?.version ?? 0) + 1;
    const [wideUrl, squareUrl] = await Promise.all([
      putShareCard(f.kind, spec.slug, f.lang, "wide", version, wide),
      putShareCard(f.kind, spec.slug, f.lang, "square", version, square),
    ]);
    const values = {
      wideUrl,
      squareUrl,
      wideBytes: wide.byteLength,
      squareBytes: square.byteLength,
      version,
      renderedFrom: spec.hash,
    };
    await db
      .insert(schema.shareCards)
      .values({ kind: f.kind, refId: f.refId, pageKey: f.pageKey, lang: f.lang, ...values })
      .onDuplicateKeyUpdate({ set: { ...values, updatedAt: sql`now()` } });
    // The storefront reads share_cards on every request (its pages are dynamic): live at once.
    return { ok: true };
  } catch (e) {
    console.error("share card upload failed", e);
    return { ok: false, reason: "failed" };
  }
}

export type ShareStudioSaveResult = { ok: true } | { ok: false; reason: "disabled" };

/**
 * Share Studio "সংরক্ষণ" for one page in one language: image mode, custom photo and focal point,
 * and the share-only title and description (empty = the page's own text). The storefront's
 * <title> and meta description never change (owner, 2026-11-26: share only).
 */
export async function saveShareStudio(input: unknown): Promise<ShareStudioSaveResult> {
  await requireAdmin();
  const r2 = r2PublicUrl();
  const d = shareCardInput(r2 ?? "https://uploads-disabled.invalid").parse(input);
  if (d.mode === "custom" && !r2) return { ok: false, reason: "disabled" };
  const key = { kind: d.kind, refId: d.refId, pageKey: d.pageKey, lang: d.lang };
  const fields = {
    mode: d.mode,
    title: d.title || null,
    description: d.description || null,
    // Kept when switching back to অটো, so নিজের ছবি can be turned on again without a new upload.
    ...(d.sourceImageUrl ? { sourceImageUrl: d.sourceImageUrl } : {}),
    focalX: d.focalX.toFixed(3),
    focalY: d.focalY.toFixed(3),
    // A site page in অটো has no card of its own: the storefront shows the site card.
    ...(d.kind === "page" && d.mode === "auto"
      ? { wideUrl: null, squareUrl: null, renderedFrom: null }
      : {}),
  };
  await db
    .insert(schema.shareCards)
    .values({ ...key, ...fields })
    .onDuplicateKeyUpdate({ set: { ...fields, updatedAt: sql`now()` } });
  return { ok: true };
}

export type ShareSourceUploadResult =
  { ok: true; url: string } | { ok: false; reason: "disabled" | "type" | "size" | "failed" };

/** "নিজের ছবি" upload: one JPG / PNG / WebP up to 5 MB into R2 (share/…). */
export async function uploadShareSource(form: FormData): Promise<ShareSourceUploadResult> {
  await requireAdmin();
  if (!uploadsEnabled()) return { ok: false, reason: "disabled" };
  const { slug } = productImageUploadInput.parse({ slug: form.get("slug") || "share" });
  const file = form.get("file");
  if (!(file instanceof File) || !(file.type in IMAGE_TYPES)) return { ok: false, reason: "type" };
  if (file.size > IMAGE_MAX_BYTES) return { ok: false, reason: "size" };
  try {
    const url = await putProductImage(
      slug,
      await file.arrayBuffer(),
      file.type as keyof typeof IMAGE_TYPES,
      "share",
    );
    return { ok: true, url };
  } catch (e) {
    console.error("share photo upload failed", e);
    return { ok: false, reason: "failed" };
  }
}
