import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/** Validated environment. Import `env` instead of reading process.env directly. */
export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    /** Storefront origin. Product and recipe photos are stored as storefront paths (/images/…). */
    STOREFRONT_URL: z.url(),
    /**
     * Product photo uploads go to Cloudflare R2 (owner decision: Hostinger deploys overwrite app
     * folders). All optional: without them the upload box shows "needs storage".
     */
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET: z.string().min(1).optional(),
    /** Public address of the bucket, e.g. https://img.acharkuthi.com (no trailing slash). */
    R2_PUBLIC_URL: z.url().optional(),
    /**
     * Shop email (owner decision 2026-11-14: a Hostinger mailbox over SMTP), used for restock
     * reminders. All optional: without them the "জানান" button shows "needs storage".
     */
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    /** Sender, e.g. "আচারকুঠি <shop@acharkuthi.com>". Defaults to SMTP_USER. */
    MAIL_FROM: z.string().min(1).optional(),
    /** First owner account on a fresh database (instrumentation.ts). Remove after first sign-in. */
    BOOTSTRAP_OWNER_EMAIL: z.email().optional(),
    BOOTSTRAP_OWNER_PASSWORD: z.string().min(8).optional(),
    BOOTSTRAP_OWNER_NAME: z.string().min(1).optional(),
  },
  client: {},
  experimental__runtimeEnv: {},
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
