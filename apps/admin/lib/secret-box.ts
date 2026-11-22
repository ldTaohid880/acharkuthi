import "server-only";

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { env } from "@/env";

/**
 * Encrypts courier keys and tokens at rest (AES-256-GCM). The key is derived from
 * BETTER_AUTH_SECRET, so no extra env var is needed; changing that secret makes the saved
 * values unreadable and they must be entered again.
 */
const key = Buffer.from(
  hkdfSync("sha256", env.BETTER_AUTH_SECRET, "acharkuthi-admin", "settings-secret-box:v1", 32),
);

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64")}`;
}

/** Null when missing or unreadable (wrong secret, tampered). */
export function open(sealed: string | null | undefined): string | null {
  if (!sealed?.startsWith("v1:")) return null;
  try {
    const raw = Buffer.from(sealed.slice(3), "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** "••••a9f2": the last 4 characters only. */
export const last4 = (v: string | null) => (v ? `••••${v.slice(-4)}` : null);
