# আচারকুঠি · Acharkuthi

Online shop and back office for Acharkuthi pickles. A pnpm + Turborepo monorepo with two
Next.js apps that share one MySQL database.

| App                 | Path              | Dev URL               | Production               |
| ------------------- | ----------------- | --------------------- | ------------------------ |
| Storefront (shop)   | `apps/storefront` | http://localhost:3000 | `acharkuthi.store`       |
| Admin (back office) | `apps/admin`      | http://localhost:3001 | `admin.acharkuthi.store` |

Shared packages:

- `packages/db`: Drizzle ORM schema, migrations and seed (MySQL / MariaDB)
- `packages/auth`: Better Auth setup shared by both apps
- `packages/validators`: shared Zod schemas
- `packages/ui`, `packages/eslint-config`, `packages/typescript-config`

## Requirements

- Node.js 22 or newer
- pnpm 11 (`corepack enable` picks the version from `package.json`)
- A local MySQL or MariaDB server

## Getting started

```sh
pnpm install

# Environment: copy the example into each place that needs it, then fill it in
cp .env.example apps/storefront/.env
cp .env.example apps/admin/.env
cp packages/db/.env.example packages/db/.env

pnpm db:migrate   # create the schema
pnpm db:seed      # optional sample data
pnpm dev          # storefront on :3000, admin on :3001
```

Every variable is described in [.env.example](.env.example). Leave the R2 and SMTP values empty
in development; uploads then stay local and emails are skipped.

## Scripts

| Command                          | What it does                              |
| -------------------------------- | ----------------------------------------- |
| `pnpm dev`                       | Run both apps in development              |
| `pnpm build`                     | Production build of every app and package |
| `pnpm lint` / `pnpm check-types` | ESLint and TypeScript checks              |
| `pnpm test`                      | Unit tests (Vitest)                       |
| `pnpm test:e2e`                  | End-to-end tests (Playwright)             |
| `pnpm format` / `format:check`   | Prettier                                  |
| `pnpm db:generate`               | New Drizzle migration from schema changes |
| `pnpm db:studio`                 | Drizzle Studio                            |

## CI and deployment

- **CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs format check, lint, types,
  tests and build on every pull request and push to `main`.
- **Deploy** ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) ships both apps to
  Hostinger on every push to `main`, or by hand from the Actions tab. It needs the repository
  secret `HOSTINGER_API_TOKEN` and a `production` environment.

Full deploy details, the one-time Hostinger setup and environment variables are in
[docs/deploy.md](docs/deploy.md).

## Secrets

Never commit real credentials. These are git-ignored on purpose:

- `.env` files in each app and in `packages/db`
- `.env.deploy` (local Hostinger API token)
- `deploy/env/*.env` (production environment sets)
- `.deploy/` (built deploy bundles)

Commit only the `*.example` templates.
