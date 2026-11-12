import "./env.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/db", "@repo/auth", "@repo/validators"],
  serverExternalPackages: ["mysql2"],
  typedRoutes: true,
  poweredByHeader: false,
  // forbidden() renders app/forbidden.tsx for staff on owner-only pages.
  experimental: { authInterrupts: true },
};

export default nextConfig;
