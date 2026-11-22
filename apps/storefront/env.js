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
    /**
     * Shop email (a Hostinger mailbox over SMTP), used for "পাসওয়ার্ড ভুলে গেছেন?" reset links
     * (read by @repo/auth). Optional in development, where the link is logged instead; required in
     * production, or reset emails fail with "লিংকটি পাঠানো যায়নি".
     */
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASS: z.string().min(1).optional(),
    /** Sender, e.g. "আচারকুঠি <info@acharkuthi.store>". Defaults to SMTP_USER. */
    MAIL_FROM: z.string().min(1).optional(),
    /**
     * Review photos go to the admin's Cloudflare R2 bucket (Hostinger replaces the app folder on
     * deploy). Optional in development, where photos land in public/uploads/reviews; required in
     * production, or a review with a photo fails.
     */
    R2_ACCOUNT_ID: z.string().min(1).optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET: z.string().min(1).optional(),
    R2_PUBLIC_URL: z.url().optional(),
    /**
     * Meta (Facebook) Pixel ID from Events Manager. A server variable on purpose: the root layout
     * reads it per request and hands it to components/meta-pixel.tsx, so Hostinger's runtime env
     * sets it without a rebuild. Unset: the pixel never loads.
     */
    META_PIXEL_ID: z
      .string()
      .regex(/^\d{5,20}$/, "digits only")
      .optional(),
  },
  client: {},
  experimental__runtimeEnv: {},
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
