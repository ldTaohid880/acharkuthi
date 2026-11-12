import "./env.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui", "@repo/db", "@repo/auth", "@repo/validators"],
  serverExternalPackages: ["mysql2"],
  typedRoutes: true,
  // Review photos are up to 5 MB (REVIEW_PHOTO_MAX_BYTES) plus the text fields.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
