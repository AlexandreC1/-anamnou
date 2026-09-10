# Phase 0 delivery report

## Summary

The local production-like foundation is implemented and the full local
verification gate passes. Phase 1 has not started.

**Remote CI and a live interactive browser review remain unverified.**
The GitHub CLI returned HTTP 401 (bad credentials). The in-app browser could not
start because of the Windows sandbox launcher failure. Real headless Playwright
journeys passed, and captured desktop/phone screenshots were visually inspected.
This is a local milestone, not a production-ready declaration.

## Repository audit

The supplied GitHub repository was empty, with no commits, application,
configuration, database, tests, CI or README. It was cloned into
C:\Users\charl\-anamnou. Git origin points to
https://github.com/AlexandreC1/-anamnou.git.

The complete Bible was subsequently supplied in Downloads, read in full, and
copied unchanged to PROJECT_BIBLE.md. Its SHA-256 remains:
42fc3dbac6ca88f9e33dd6acfa0a173543e0c3d1008fad379aa4a425f4083e39.

The initial machine had Node 26.4.0, npm 11.17.0, Git 2.51.0, Docker 29.3.1 and
Compose 5.1.1. Docker Desktop was stopped and was started successfully.
A checksum-verified project-local Node 24.20.0 runtime was installed in ignored
.tools, leaving system Node unchanged.

Preserved: origin, Bible, supplied contract, and unrelated local PostgreSQL.
Replaced: no pre-existing application code.
See [the initial audit](phase-0-audit.md).

## Architecture decisions

- npm workspaces, one lockfile, React/Vite frontend and NestJS modular monolith.
- ESM throughout the applications; TypeScript emits Nest decorator metadata.
- PostgreSQL/Prisma and a private, S3-compatible MinIO adapter.
- Containers provide infrastructure; applications run as host processes.
- No shared package or empty business modules until actual use justifies them.
- Only operational metadata in Phase 0; no premature identity/business schema.
- Immutable publication and authorization requirements are recorded as future
  invariants, not advertised as existing implementations.
- ADR 0007 builds MinIO's upstream security-release source in Docker and runs
  storage as a non-root user. Its archived upstream remains a production concern.

See [architecture](../architecture/foundation.md) and [ADRs](../adr/0001-monorepo.md).

## Dependencies added and reasons

The complete inventory is in [dependencies.md](dependencies.md).
Core packages provide the explicitly requested React, Router, NestJS, Prisma,
PostgreSQL, S3 and OpenAPI capabilities. Supporting packages supply environment
validation, security headers/rate limits, local fonts and verification tooling.

Three transitive security overrides resolve the initial npm advisories.
Final npm audit reports **0 vulnerabilities**. This result covers the npm graph;
it is not a whole-container or product security certification.

## Docker services

| Service    | Verified runtime                                   | Local ports                                              | Persistence   |
| ---------- | -------------------------------------------------- | -------------------------------------------------------- | ------------- |
| PostgreSQL | 17.11                                              | 127.0.0.1:5433 on this machine; example defaults to 5432 | postgres-data |
| MinIO      | RELEASE.2025-10-15T17-29-55Z, built with Go 1.26.7 | 127.0.0.1:9000/9001                                      | media-data    |

Both containers reached healthy state. MinIO runs as UID/GID 10001.
Existing PostgreSQL on 5432 was left untouched. The port adaptation is documented.
The MinIO security build completed successfully from its pinned upstream tag.

## Environment variables

.env.example documents all used settings. setup:env generates random local
credentials and preserves an existing .env. No credentials are committed or
printed. No unused session secret is introduced before identity exists.

Variables: APP_ENV, API_PORT, WEB_PORT, PUBLIC_WEB_URL, API_BASE_URL,
POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, DATABASE_URL,
STORAGE_ENDPOINT, STORAGE_REGION, STORAGE_BUCKET, STORAGE_ACCESS_KEY,
STORAGE_SECRET_KEY. See [environment.md](environment.md).

## Database

Added prisma/schema.prisma and migration 202609090001_foundation.
SystemMetadata has a primary key, bounded text columns and timestamp.
The seed inserts foundation_version=1 idempotently and refuses production mode.

Migration deploy succeeded initially and subsequently reported no pending
migrations. Repeated seed and storage setup succeeded. No users, passwords,
schools, profiles or other business records were seeded.

## API and observability

- GET /health: real HTTP process liveness.
- GET /ready: PostgreSQL metadata and bucket availability.
- GET /openapi.json: generated operations API specification.
- No authentication, business, upload or mutation endpoints.
- Safe errors, server-generated request IDs, structured JSON logs, no-store,
  Helmet headers, configured CORS, and public endpoint rate limiting.
- Injected local analytics and error-reporting interfaces; event projection
  excludes arbitrary metadata and personal identifiers.

## Frontend

Implemented /, /about, /connection and a recoverable missing-route screen.
The shell uses local fonts, semantic navigation, skip link, route focus, responsive
layout, reduced-motion handling and visible loading/failure/retry/success states.
The connection page makes real API requests. Future class features are explicitly
unavailable rather than represented by fake data.

Desktop and 320-pixel-wide screenshots were inspected. No clipping or horizontal
overflow was observed in the captured pages. The full navigation/connection/
retry flow was exercised by Playwright against compiled applications.

## Tests

| Command                      | Result                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| npm ci                       | PASS, clean lockfile installation                                                   |
| npm run lint                 | PASS, zero warnings                                                                 |
| npm run format:check         | PASS                                                                                |
| npm run typecheck            | PASS, root tools and both applications                                              |
| npm test                     | PASS: 6 API unit/HTTP tests, 5 frontend tests                                       |
| npm run test:integration     | PASS: 3 real database/storage/API tests                                             |
| npm run build                | PASS: both applications                                                             |
| npm run test:e2e             | PASS: 8 desktop/mobile Chromium cases, including the four-language shell regression |
| npm run check                | PASS: entire aggregate gate, exit 0                                                 |
| npm audit --audit-level=high | PASS: 0 reported vulnerabilities                                                    |

Exact test files:

- apps/api/test/analytics.test.ts: event metadata allowlist.
- apps/api/test/config.test.ts: invalid configuration, secret-safe errors, HTTPS.
- apps/api/test/health.test.ts: dependency-independent liveness, safe unready
  response, request IDs, response headers, missing routes and rate limits.
- apps/api/test/foundation.integration.ts: real readiness/OpenAPI/CORS, concurrent
  uniqueness, rollback, private object round-trip, anonymous denial and deletion.
- apps/web/src/App.test.tsx: navigation, missing route, retry and invalid API body.
- tests/e2e/foundation.spec.ts: navigation/reload, real API, failure/retry,
  keyboard, reduced motion and recovery.
- tests/e2e/visual.spec.ts: desktop/mobile screenshots and narrow viewport overflow.

Local logs are in ignored .tools/final-check.log and .tools/clean-install.log.
Playwright diagnostics/screenshots are in ignored test-results and playwright-report.

## Commands and corrections

Commands were run from the repository root, with the portable Node directory
prepended to PATH. npm.cmd/npx.cmd are the Windows equivalents of documented npm/npx.

Additional executed commands:

- git clone https://github.com/AlexandreC1/-anamnou.git C:\Users\charl\-anamnou — empty clone succeeded.
- docker desktop start — succeeded.
- npm install — succeeded; initial advisory findings subsequently fixed.
- npm update multer — resolved a stale installed override; final audit clean.
- npm run setup:env — created private random local credentials.
- npm run db:generate — succeeded.
- npm run infra:up — initially failed on occupied port 5432; succeeded on 5433.
- docker compose --progress plain up -d --build --wait — patched containers healthy.
- npm run db:migrate — applied migration, then verified no pending migrations.
- npm run db:seed — succeeded repeatedly.
- npm run storage:init — succeeded repeatedly.
- npx playwright install chromium — succeeded.
- docker compose exec -T postgres postgres --version — 17.11.
- docker compose exec -T minio minio --version — pinned October security release.
- docker compose exec -T minio id — non-root UID/GID 10001.
- git check-ignore .env .tools/node.zip apps/api/src/generated/prisma/client.ts — all ignored.
- Secret-value scan of 77 source/build files — no generated local secrets found.
- git add -N . — makes new files reviewable in git diff; no content committed.
- git diff --check — original Bible has an extra blank line at EOF.
- git diff --check -- . ':!PROJECT_BIBLE.md' — all authored files clean.
- gh repo view AlexandreC1/-anamnou --json nameWithOwner,defaultBranchRef — failed, HTTP 401.

Initial TypeScript checks exposed NestJS 12's ESM requirement; configuration was
corrected. A unit test exposed unsafe URL parsing in environment validation;
the parser was fixed and all tests rerun. No failed checks were disabled.

The Bible's original trailing blank line was preserved, not silently edited.
The in-app browser/image sandbox launcher failed; approved file reads allowed
visual review of the passing headless browser screenshots.

## CI

.github/workflows/ci.yml installs the lockfile, generates local secrets, starts
Compose, migrates/seeds/initializes storage, then runs lint, formatting, types,
unit/integration tests, production builds, E2E and npm audit.
Browser diagnostics upload on failure; infrastructure is stopped afterward.

**Remote workflow execution is unverified because GitHub authentication failed.**
No push, PR, merge, or production deployment has been performed.

## Security considerations tested

Missing/invalid environment inputs, secret-safe errors, generated request IDs,
HTTP security headers, origin behavior, rate limits, safe 404/503 responses,
database uniqueness/rollback, private storage access, key traversal rejection,
object deletion, and local-secret exclusion from source/frontend output.

Identity, IDOR, cross-tenant access, CSRF, profile privacy, voting, invitations,
upload validation and historical immutability are not implemented and are not
claimed as tested.

## Known risks and limitations

- GitHub authentication must be restored before remote CI/review can be verified.
- Live in-app browser review remains unavailable; headless E2E and screenshot
  review are the completed browser evidence.
- MinIO open-source upstream is archived. This standalone local build must not
  be treated as a maintained production storage choice; see ADR 0007.
- ESLint 9 is deprecated but retained for its accessibility plugin's declared
  compatibility. Lint remains enabled and passes.
- No full container vulnerability scan, backup restore exercise, production
  deployment, or full product security review is claimed.
- This foundation contains no authentication or business features.

## Assumptions

Phase 0 overrides the eventual MVP seed/entity requirements: only operational
metadata is appropriate now. Anamnou is the selected display name; infrastructure
uses neutral yearbook identifiers. A separate connection screen is developer
verification, not a student onboarding workflow.

## Exact next task

Restore GitHub CLI authentication and run/review the Phase 0 GitHub Actions
workflow. Phase 1 requires a separate explicit instruction after this review.

## Files created or changed

All application files are new because the repository started empty.
Generated/dependency/build/private files are excluded from the list below.

- .editorconfig
- .env.example
- .gitattributes
- .github/workflows/ci.yml
- .gitignore
- .impeccable.md
- .node-version
- .npmrc
- .nvmrc
- .prettierignore
- .prettierrc.json
- AGENTS.md
- apps/api/package.json
- apps/api/src/analytics.ts
- apps/api/src/app.ts
- apps/api/src/config.ts
- apps/api/src/database.ts
- apps/api/src/errors.ts
- apps/api/src/health.ts
- apps/api/src/main.ts
- apps/api/src/storage.ts
- apps/api/test/analytics.test.ts
- apps/api/test/config.test.ts
- apps/api/test/environment.ts
- apps/api/test/foundation.integration.ts
- apps/api/test/health.test.ts
- apps/api/tsconfig.json
- apps/api/tsconfig.test.json
- apps/web/index.html
- apps/web/package.json
- apps/web/src/App.test.tsx
- apps/web/src/App.tsx
- apps/web/src/main.tsx
- apps/web/src/styles.css
- apps/web/src/test-setup.ts
- apps/web/tsconfig.json
- apps/web/vite.config.ts
- apps/web/vitest.config.ts
- docker/Dockerfile.minio
- docker-compose.yml
- docs/adr/0000-template.md
- docs/adr/0001-monorepo.md
- docs/adr/0002-database.md
- docs/adr/0003-storage.md
- docs/adr/0004-identity-authorization.md
- docs/adr/0005-historical-snapshots.md
- docs/adr/0006-lifecycle.md
- docs/adr/0007-local-storage-security-release.md
- docs/api/operations.md
- docs/architecture/foundation.md
- docs/ASTRA_ENGINEERING_CONTRACT.md
- docs/development/dependencies.md
- docs/development/environment.md
- docs/development/operations.md
- docs/development/phase-0-audit.md
- docs/development/phase-0-report.md
- docs/development/testing.md
- docs/security/foundation.md
- eslint.config.mjs
- package.json
- package-lock.json
- playwright.config.ts
- prisma.config.ts
- prisma/migrations/202609090001_foundation/migration.sql
- prisma/migrations/migration_lock.toml
- prisma/schema.prisma
- prisma/seed.ts
- PROJECT_BIBLE.md
- README.md
- scripts/init-storage.ts
- scripts/setup-env.mjs
- tests/e2e/foundation.spec.ts
- tests/e2e/visual.spec.ts
- tsconfig.base.json
- tsconfig.tools.json

## Follow-up: four-language shell

The foundation shell now offers Haitian Creole (Kreyòl ayisyen), French, English and Spanish. The selected locale is stored in browser localStorage and updates the document language attribute. Copy covers the home shell; the developer connection screen remains intentionally English until the product language system is designed in Phase 1. Added frontend regression coverage verifies all four choices and persistence.
