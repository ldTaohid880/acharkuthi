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
  },
  client: {},
  experimental__runtimeEnv: {},
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
