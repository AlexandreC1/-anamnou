# Phase 1 identity delivery report

Date: 2026-09-10. Scope: identity only, following the user's explicit instruction
after Phase 0. Phase 2 is not started. This report records local verification;
the feature branch is the review boundary for security-sensitive changes.

## Repository audit

The repository started this task clean at fd8973b, with a working npm workspace,
React/Vite shell, NestJS operations API, PostgreSQL/Prisma and private MinIO.
The entire Bible and engineering contract were read. Existing framework choices,
foundation migration, storage adapter, seed, fonts and existing tests were
preserved. The stale Phase 0 instruction in AGENTS.md was updated to the newly
authorized scope. No unrelated services or repositories were changed.

## Summary and architecture

Added a NestJS identity module, thin validated controllers, account service,
Argon2id hashing, opaque revocable PostgreSQL sessions, verification/recovery,
private /me settings, safe role boundaries, audits and abuse controls.
See [ADR 0008](../adr/0008-identity.md) and the
[security review](../security/identity-review.md).

Email delivery uses SMTP and a durable PostgreSQL delivery-intent table. This
removes SMTP latency/failures from account-existence responses. Jobs contain no
plaintext tokens and are retried after failure/restart. No Redis or external
identity provider is required.

## Database

- 202609090002_identity: User, Session, IdentityToken, AuditLog, AuthThrottle;
  normalized unique emails, foreign keys, token uniqueness, locale and verified
  active-user constraints.
- 202609090003_identity_delivery: IdentityEmailJob, unique user/purpose and retry
  index. Registration/audit/initial delivery intent commit in one transaction.
- Existing operational seed preserved; no passwords or fake users seeded.
- Tests automatically create/migrate/seed a separate local _test database.
  Development and test email workers cannot consume one another's jobs.

## API

POST /auth/register, /auth/login, /auth/logout, /auth/forgot-password,
/auth/reset-password, /auth/verify-email and /auth/resend-verification;
GET /me and PATCH /me. Existing /health and /ready retained.
OpenAPI is available at /openapi.json. Mutations require JSON and trusted Origin.
See [endpoint contracts](../api/identity.md).

## Frontend

Routes: /register, /login, /profile, /verify-email, /resend-verification,
/forgot-password and /reset-password. Accessible forms preserve input after
failure, announce results, offer expired/missing-link recovery and protect the
account route through real session checks. Mobile header layout was corrected
after visual inspection at 320px. UI strings and email templates cover ht/fr/en/es;
public About/diagnostic/missing pages and page titles now follow the UI locale.
Account locale controls email preference; the browser controls its own UI locale.

## Dependencies and local services

- argon2: maintained native Argon2id implementation, avoiding custom hashing.
- nodemailer and @types/nodemailer: SMTP delivery and its TypeScript contract.
- express: declares the direct dependency used for bounded JSON parsing.
- pg at the tooling root: explicit dependency for isolated test-database creation;
  the API already used PostgreSQL/pg.
- @playwright/cli 0.1.19: user-requested browser CLI, development-only.
- Mailpit 1.31.1: loopback-only SMTP 1025 and inbox 8025, alongside existing
  PostgreSQL 5433 on this machine and MinIO 9000/9001.
- New env configuration: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM.
  No SESSION_SECRET is needed for random opaque lookup sessions. Production
  rejects missing mail credentials/test sender and requires TLS/HTTPS.

## Tests and commands

Using Node 24.20.0 and npm from the pinned portable runtime:

| Command                                                            | Result                                                                |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| npm install --workspace @yearbook/api argon2 nodemailer            | Installed; audit clean                                                |
| npm install --workspace @yearbook/api --save-dev @types/nodemailer | Installed                                                             |
| npm install --workspace @yearbook/api express                      | Direct dependency declared                                            |
| npm install --save-dev pg                                          | Root test tooling dependency declared                                 |
| npm run db:generate                                                | Prisma client generated                                               |
| prisma migrate diff and npm run db:migrate                         | Additive migrations created and applied                               |
| docker compose up -d mailpit                                       | Local SMTP/inbox started                                              |
| npm run test:setup                                                 | Separate database created, all three migrations and seed applied      |
| npm run check                                                      | Lint, formatting, typecheck, tests, integration, build and E2E passed |
| npm test                                                           | 8 API unit/smoke tests and 7 frontend tests passed                    |
| npm run test:integration                                           | 10 real API/database/storage/SMTP tests passed                        |
| npm run test:e2e                                                   | 12 Chromium desktop/mobile tests passed                               |
| npm run build                                                      | API TypeScript and production Vite build passed                       |
| npm audit --audit-level=high                                       | Zero reported vulnerabilities at verification                         |
| git diff --check                                                   | Clean                                                                 |

Playwright CLI was installed with `npm install --save-dev --save-exact
@playwright/cli@0.1.19`. `npx --no-install playwright-cli --help` succeeded;
open/select/screenshot/close commands verified the real registration page and
French language switch. Its console found the absent favicon, now supplied as SVG.

The live localhost:3000 preview was also exercised through actual registration,
Mailpit email, verification, login, profile access and logout while isolated
tests ran. Screenshots were inspected for desktop and mobile, including Creole.

Failures found and fixed during verification: accessible password labels included
hint text; mobile language choice was squeezed; an E2E navigation interrupted
logout before its response; shared field labels could match a departing form
before route replacement; fresh test-database readiness lacked the operational
seed. Tests now await the destination heading. The identity suite passed three
consecutive repetitions on both desktop and mobile (12 checks), with retries
disabled. Tests were corrected or setup/UI fixed without bypassing validations.

## Security evidence

Tests cover concurrent token redemption, reset session revocation, wrong token
purpose, expired sessions/tokens, replaced verification links, inactive users,
private user responses, unknown-field/role/ID injection, default-role denial,
database normalization, CSRF, malformed JSON, body bounds, per-IP/account rates,
SQL injection input, rendered XSS payloads, HttpOnly cookies, and durable SMTP
failure/restart recovery. Existing private storage tests still pass.
Identity traces are disabled; secret-bearing environment and CLI output are ignored.

## Known risks and assumptions

- This is a local production-like identity milestone, not a production release.
  SMTP delivery, TLS, ingress, backups and monitoring require target-environment
  validation. SMTP and PostgreSQL cannot atomically commit; use the newest link
  if a worker crash causes duplicate delivery.
- Scoped school/class roles arrive in Phase 2. No role assignment or privileged
  administration endpoint exists yet. Avatar upload stays with the media phase.
- Language copy should receive human editorial review before launch.
- Test PostgreSQL uses the local development role's CREATEDB capability. Setup
  refuses production/non-loopback hosts and never drops an existing database.
- GitHub CLI's stored token is invalid; Git transport and public Actions API can
  be used independently. No credential values were displayed or committed.

## Next task

Phase 2 only after instruction: school/class creation, memberships and scoped
roles, invitations with concurrency-safe limits, QR links and member directory.

## Exact files changed

```text
.env.example
.github/workflows/ci.yml
.gitignore
.prettierignore
AGENTS.md
README.md
apps/api/package.json
apps/api/src/app.ts
apps/api/src/auth/controller.ts
apps/api/src/auth/delivery.ts
apps/api/src/auth/mail.ts
apps/api/src/auth/module.ts
apps/api/src/auth/security.ts
apps/api/src/auth/service.ts
apps/api/src/config.ts
apps/api/src/errors.ts
apps/api/test/config.test.ts
apps/api/test/foundation.integration.ts
apps/api/test/identity.integration.ts
apps/api/test/identity.test.ts
apps/web/index.html
apps/web/public/favicon.svg
apps/web/src/App.test.tsx
apps/web/src/App.tsx
apps/web/src/Identity.test.tsx
apps/web/src/Identity.tsx
apps/web/src/identity-api.ts
apps/web/src/identity-copy.ts
apps/web/src/public-copy.ts
apps/web/src/styles.css
docker-compose.yml
docs/adr/0008-identity.md
docs/api/identity.md
docs/development/identity.md
docs/development/phase-1-report.md
docs/security/identity-review.md
eslint.config.mjs
package-lock.json
package.json
playwright.config.ts
prisma/migrations/202609090002_identity/migration.sql
prisma/migrations/202609090003_identity_delivery/migration.sql
prisma/schema.prisma
scripts/setup-test-db.mjs
tests/e2e/identity.spec.ts
```
