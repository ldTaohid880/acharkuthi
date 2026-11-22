/**
 * Hostinger targets. Both apps run as Node.js websites on the same Business plan and share the
 * MySQL database u225292959_prod (connect from the apps through 127.0.0.1:3306).
 *
 * `migrate: true` means the Hostinger build of that app runs the Drizzle migrations before the new
 * version goes live. Only the storefront does it, so two builds never migrate at the same time;
 * deploy the storefront first.
 */
export const HOSTINGER_USERNAME = process.env.HOSTINGER_USERNAME ?? "u225292959";

export const APPS = {
  storefront: {
    pkg: "@acharkuthi/storefront",
    dir: "apps/storefront",
    domain: "acharkuthi.store",
    migrate: true,
  },
  admin: {
    pkg: "@acharkuthi/admin",
    dir: "apps/admin",
    domain: "admin.acharkuthi.store",
    migrate: false,
  },
};

/** Apps named on the command line, or all of them (storefront first). */
export function pickApps(args) {
  const names = args.filter((a) => !a.startsWith("--"));
  const list = names.length === 0 || names.includes("all") ? Object.keys(APPS) : names;
  for (const n of list)
    if (!APPS[n]) throw new Error(`Unknown app "${n}" (use storefront, admin or all)`);
  return Object.keys(APPS).filter((n) => list.includes(n));
}
