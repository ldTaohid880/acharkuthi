# Deploying to Hostinger

Both apps run as Node.js websites on the Hostinger Business plan (account `u225292959`) and share
one MySQL database, `u225292959_prod`.

| App        | Domain                   | Hostinger build step                        |
| ---------- | ------------------------ | ------------------------------------------- |
| storefront | `acharkuthi.store`       | runs the Drizzle migrations, then goes live |
| admin      | `admin.acharkuthi.store` | none (prebuilt), then goes live             |

## How it works

Hostinger's build servers can't build this repo well (pnpm workspace, and their glibc is too old
for Next's native compiler), so the apps are built elsewhere and Hostinger only runs them:

1. `scripts/deploy/prepare.mjs` builds each app with `NEXT_OUTPUT=standalone` (Next's
   self-contained `server.js` plus the node_modules it actually uses) and packs it into
   `.deploy/<app>.tar.gz`, a tiny npm project with no dependencies:
   - `start.cjs` starts the app (Hostinger entry file).
   - `package.json` `build` script: `node app/migrate.cjs` for the storefront, a no-op for the admin.
2. `scripts/deploy/hostinger.mjs push` uploads the bundle through the Hostinger API, starts a
   Node.js build of it, streams the build log and checks that the site answers.
3. **Migrations run on Hostinger itself**, inside the storefront's build, against
   `DATABASE_URL` (`127.0.0.1`). No remote database access is needed. If a migration fails, the
   build fails and the previous version keeps running. The script refuses to run on a database
   that has tables but no `__drizzle_migrations` table (someone else's data).

Environment variables live on Hostinger, not in the bundle. Next reads them at runtime, so
changing one only needs `pnpm deploy:env`, not a rebuild.

## One-time setup

1. **API token.** hPanel → Account → API → new token. Put it in `.env.deploy`
   (copy `.env.deploy.example`) for local deploys, and in the GitHub repository secret
   `HOSTINGER_API_TOKEN` for CI.
2. **Database.** `u225292959_prod` still holds the old app's tables (owner: old data, fine to
   replace). The storefront env template sets `MIGRATE_ARCHIVE_EXISTING=u225292959_prod`, so the
   first deploy renames every old table to `old_<name>` (data kept, nothing dropped) and then
   creates the new schema. The flag only acts while the database has no `__drizzle_migrations`
   table, and only when it equals the database name. Remove it after the first deploy, and drop
   the `old_*` tables in phpMyAdmin once you no longer need them.
3. **Environment variables.** Copy `deploy/env/storefront.env.example` and
   `deploy/env/admin.env.example` to `.env` files in the same folder (git-ignored), fill them in,
   then check and save:

   ```powershell
   pnpm deploy:env storefront deploy/env/storefront.env
   pnpm deploy:env storefront deploy/env/storefront.env --yes
   pnpm deploy:env admin deploy/env/admin.env --yes
   ```

   Without `--yes` it only prints which keys it would set and which old keys it would delete.
   It replaces the whole set, so the old app's `JWT_SECRET`, `SITE_URL` and so on are removed.

4. **Google sign-in.** In the Google Cloud OAuth client add the redirect URIs
   `https://acharkuthi.store/api/auth/callback/google` and
   `https://admin.acharkuthi.store/api/auth/callback/google`.
5. **First owner.** Set `BOOTSTRAP_OWNER_EMAIL`, `BOOTSTRAP_OWNER_PASSWORD` (and optionally
   `BOOTSTRAP_OWNER_NAME`) in the admin env. On start, if there is no owner yet, that account is
   created (or promoted) as owner. Remove them after the first sign-in.
6. **Catalog data.** A fresh database has no categories or products. Either add them in the
   admin, or seed once from your computer: in hPanel → Databases → Remote MySQL allow your IP for
   `u225292959_prod`, then run `pnpm db:seed` with `packages/db/.env` pointing at
   `srv788.hstgr.io` (remote host, only for this). Remove the remote access afterwards.
7. **CI.** Push the repo to GitHub, add the `HOSTINGER_API_TOKEN` secret and a `production`
   environment (Settings → Environments; add required reviewers there if you want a manual
   approval before each deploy).

## Everyday use

| Command                                        | What it does                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `pnpm deploy`                                  | checks + build + push both apps (storefront first)                  |
| `pnpm deploy:prepare [storefront\|admin\|all]` | lint, types, tests, standalone build, `.deploy/*.tar.gz`            |
| `pnpm deploy:prepare admin --skip-checks`      | same without the checks                                             |
| `pnpm deploy:push [storefront\|admin\|all]`    | upload the bundles and build on Hostinger                           |
| `pnpm deploy:status`                           | latest build and env keys of each site                              |
| `pnpm deploy:env <app> <file> [--yes]`         | replace an app's env vars                                           |
| `pnpm clean`                                   | remove `.next`, `.turbo`, test results, Playwright reports, bundles |

`deploy:prepare` builds a copy of your working tree in `.deploy/src` (tracked files plus new,
non-ignored ones; never `.env` files) with a fresh hoisted install, so it never touches a running
dev server's `.next`.

**CI/CD** (`.github/workflows/deploy.yml`): every push to `main` runs the checks, builds both
bundles, keeps them as a workflow artifact for 7 days and deploys storefront then admin. Run it
by hand from the Actions tab to deploy one app. `ci.yml` still checks pull requests.

## Schema changes

Unchanged: edit `packages/db/src/schema/*`, `pnpm db:generate`, commit `packages/db/drizzle/`.
The next storefront deploy applies it. Deploy the storefront before an admin build that needs
the new columns.

## When something goes wrong

- `pnpm deploy:status`, then the build log in hPanel → Websites → Node.js → Deployments.
- "Migration failed: … already has N tables": the database holds another app's tables. Set
  `MIGRATE_ARCHIVE_EXISTING` to the database name for one deploy (setup step 2).
- Photos are served from the R2 bucket's `r2.dev` address, which Cloudflare rate-limits and
  doesn't recommend for production. Connect a custom domain to the `acharkuthi` bucket
  (Cloudflare → R2 → bucket → Settings → Custom Domains) and change `R2_PUBLIC_URL` in both env
  files. Photos already saved keep their old address.
- Site shows the old app or a Hostinger page: hPanel → clear cache, or wait a minute.
- Roll back: re-run an older successful workflow run (Actions → run → Re-run jobs), or
  `git checkout <old commit>` and `pnpm deploy`. Migrations are not rolled back.
