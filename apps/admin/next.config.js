import path from "node:path";
import { fileURLToPath } from "node:url";
import "./env.js";

/**
 * Production bundles for Hostinger (scripts/deploy/package.mjs) are built with
 * NEXT_OUTPUT=standalone: a self-contained server.js plus only the node_modules it needs.
 * Tracing starts at the monorepo root so the workspace packages are included.
 */
const standalone = process.env.NEXT_OUTPUT === "standalone";
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Security headers on every response (launch checklist, 2026-11-15). The CSP here only blocks
 * framing, <base> and plugins; a full script/style policy is a separate step.
 * HSTS is ignored by browsers over plain http, so it is harmless in local dev.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(standalone ? { output: "standalone", outputFileTracingRoot: repoRoot } : {}),
  transpilePackages: ["@repo/ui", "@repo/db", "@repo/auth", "@repo/validators"],
  serverExternalPackages: ["mysql2"],
  typedRoutes: true,
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/:path*",
      // The back office is never indexed, whatever a page's own metadata says.
      headers: [...securityHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow" }],
    },
  ],
  // forbidden() renders app/forbidden.tsx for staff on owner-only pages.
  // Product photos are up to 5 MB (lib/r2.ts IMAGE_MAX_BYTES) plus the form fields.
  experimental: { authInterrupts: true, serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
