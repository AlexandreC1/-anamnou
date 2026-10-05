# Anamnou

**Yon chapit fini. Yon istwa rete.**

A digital yearbook platform for graduating classes, starting in Haiti.

**Current scope: Phase 3 profiles and yearbook drafts.** The React/NestJS application supports
verified accounts, school/class creation, memberships, role management, invitation
links/codes/QR and a private member directory in Haitian Creole, French, English
and Spanish. PostgreSQL, private object storage and email delivery run locally.
Class admins have a dashboard with contribution counts, member/invitation management,
and yearbook editing. Members can create private or class-visible profiles, upload
graduation photos, and read a responsive draft. Voting and immutable publication
remain later phases.
See [identity setup](docs/development/identity.md), [class setup](docs/development/classes.md),
and [profiles and yearbooks](docs/development/yearbooks.md).

**Waiting for a verification email?** In the local preview, open
[the test inbox](http://localhost:8025), search for your email address and open the
newest verification message. Local mail is captured there, not sent to your
personal mailbox. The registration and recovery screens link to this inbox.

Read [PROJECT_BIBLE.md](PROJECT_BIBLE.md) and
[the engineering contract](docs/ASTRA_ENGINEERING_CONTRACT.md) before changing code.

## Prerequisites

- Node **24.20.0** (see .node-version / .nvmrc) and npm 11.
- Docker Desktop with the Linux engine running, or Docker Engine with Compose v2+.
- Git; a browser. No external service account is required.
- Internet access for the initial dependency, image, and browser downloads.
  Runtime functionality and fonts stay local.

Use a Node version manager to select the pinned runtime. On the original Windows
workspace only, a checksum-verified portable runtime is available under the ignored
.tools/node-v24.20.0-win-x64 directory. It is not part of the repository.

## First start

Run these commands in the repository root:

```sh
npm ci
npm run setup:env
npm run db:generate
npm run infra:up
npm run db:migrate
npm run db:seed
npm run storage:init
```

The environment generator creates random development credentials in ignored .env
and never overwrites an existing file or prints its secrets. Do not copy blank
credentials from .env.example and expect the application to start.

Open two terminals, both in the repository root:

```sh
npm run dev:api
```

```sh
npm run dev:web
```

- Web: http://localhost:3000
- API liveness: http://127.0.0.1:4000/health
- API readiness: http://127.0.0.1:4000/ready
- OpenAPI JSON: http://127.0.0.1:4000/openapi.json
- MinIO console: http://127.0.0.1:9001 (credentials are in your private .env)
- Local email inbox: http://localhost:8025
- Create an account: http://localhost:3000/register

Visit **Connection status** in the footer and select **Check connection**. This
makes a real request through the web proxy to the API, PostgreSQL, and MinIO.
A failed dependency gives visible retry feedback, not hardcoded success.

### Port conflicts

Infrastructure binds to loopback. Defaults are PostgreSQL 5432, MinIO 9000/9001,
web 3000, API 4000, and Mailpit 1025/8025. Do not stop unrelated services to free a port.

If PostgreSQL 5432 is occupied, change POSTGRES_PORT to 5433 and change the port
inside DATABASE_URL to 5433 in .env, then rerun infra:up. The original development
machine uses **5433** because another PostgreSQL process already uses 5432.

When changing app ports, update API_PORT / API_BASE_URL together and
WEB_PORT / PUBLIC_WEB_URL together. Restart the application processes.

## Verification

After the infrastructure setup above:

```sh
npx playwright install chromium
npm run check
npm audit --audit-level=high
```

The aggregate check runs lint, formatting, typecheck, unit/HTTP smoke tests,
real infrastructure integration tests, production build, and Playwright E2E.
E2E starts its own built API and Vite preview on **4100 and 3100**; these ports
must be free. It does not reuse an unknown running server.

Individual checks:

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run test:integration
npm run build
npm run test:e2e
```

See [test strategy](docs/development/testing.md) and
[Phase 0 evidence](docs/development/phase-0-report.md) and
[Phase 1 evidence](docs/development/phase-1-report.md).

## Production-like local run

```sh
npm run build
npm run start --workspace @yearbook/api
```

In a separate terminal:

```sh
npm run preview --workspace @yearbook/web
```

These run compiled artifacts. Vite preview is a local verification server, not
the production hosting recommendation. A production web server must serve the
static web build, provide SPA fallback, and proxy /api to NestJS.
Production deployment and the product's security release gate are still future work.

## Database and storage

Prisma migrations are committed; generated client code is not. Identity adds User,
Session, IdentityToken, IdentityEmailJob, AuditLog and AuthThrottle alongside SystemMetadata. The
idempotent development seed still inserts foundation_version=1. Register through
the real account flow; no shared passwords or fake users are seeded.

MinIO uses a private bucket. storage:init is idempotent and fails if an existing
bucket policy needs review. Storage read/write/delete is an internal adapter;
there is no public upload API until authorization and validation are implemented.

Docker volumes preserve data across infra:down. Never delete volumes to repair
an application failure without understanding the data loss.

## Structure

- apps/web — Vite, React, React Router, locally bundled fonts.
- apps/api — NestJS, validation, safe errors, health/readiness, database/storage ports.
- prisma — operational schema, migration, development seed.
- scripts — environment generation and local storage initialization.
- tests/e2e — desktop and phone-sized Chromium journeys.
- docs — architecture, decisions, API, security, development and verification.
- .github/workflows/ci.yml — reproducible checks using the same local infrastructure.

Shared packages are deferred until actual shared code justifies them.

## Next phase

**Phase 2 only, after explicit instruction:** school/class creation, scoped
memberships and roles, invitation links/codes/QR, and member directory.

### First MinIO build

Compose builds the patched MinIO release from source inside Docker. The first
run takes several minutes; subsequent runs reuse the build cache. No host Go
installation is needed. See [ADR 0007](docs/adr/0007-local-storage-security-release.md).

### Languages

The shell and identity screens provide Kreyòl ayisyen, Français, English and
Español. Browser UI selection persists locally; preferred email language is saved
in the account. The opening page, About, diagnostics, missing-page recovery and
identity flows use the selected language.
