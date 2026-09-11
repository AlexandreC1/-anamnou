# Phase 2 implementation report

## Summary

Implemented private school/class workspaces, memberships, class roles, invitation
links/codes/QR, explicit acceptance, revocation and the member directory. The
creator's latest direction restores Anamnou as the display name. Verification and
recovery now show a concrete next step, the submitted address, a local test-inbox
action where configured, and an address-correction action in all four languages.

## Repository audit

The repository was clean at `a443b8a` on `feat/phase-1-identity`. Existing architecture:
npm-workspace React/Vite frontend, NestJS modular API, Prisma/PostgreSQL, S3 storage,
local Mailpit and GitHub CI. Existing useful code includes sessions, validation,
safe errors, structured logging, isolated test databases and responsive styles.
Existing dependencies were retained. The visible email wording incorrectly led
local users to wait in their personal mailbox; the new flow explains the actual
delivery destination. No application files were replaced wholesale. Foundation,
identity, historical reports and all existing migrations were preserved.

Target: extend the modular monolith with schools/classes services and existing
session authentication. Risks/open decisions are official school verification,
school-admin transfer and eventual retention/erasure; none is silently invented.
Scope is Phase 2 only, plus the requested name/UX corrections.

## Files changed

- `.impeccable.md`
- `AGENTS.md`
- `apps/api/src/app.ts`
- `apps/api/src/auth/module.ts`
- `apps/api/src/classes/access.ts`
- `apps/api/src/classes/controller.ts`
- `apps/api/src/classes/invitations.ts`
- `apps/api/src/classes/module.ts`
- `apps/api/src/classes/rules.ts`
- `apps/api/src/classes/schools.ts`
- `apps/api/src/classes/service.ts`
- `apps/api/src/errors.ts`
- `apps/api/test/classes.integration.ts`
- `apps/api/test/classes.test.ts`
- `apps/web/index.html`
- `apps/web/package.json`
- `apps/web/src/App.tsx`
- `apps/web/src/class-api.ts`
- `apps/web/src/ClassCommon.tsx`
- `apps/web/src/class-copy.ts`
- `apps/web/src/Classes.tsx`
- `apps/web/src/ClassManage.tsx`
- `apps/web/src/delivery-copy.ts`
- `apps/web/src/Identity.test.tsx`
- `apps/web/src/Identity.tsx`
- `apps/web/src/identity-copy.ts`
- `apps/web/src/public-copy.ts`
- `apps/web/src/styles.css`
- `apps/web/vite.config.ts`
- `docs/adr/0001-monorepo.md`
- `docs/adr/0009-class-tenancy.md`
- `docs/api/classes.md`
- `docs/development/classes.md`
- `docs/development/phase-2-report.md`
- `docs/security/class-review.md`
- `package.json`
- `package-lock.json`
- `prisma/migrations/202609100001_classes/migration.sql`
- `prisma/migrations/202609100002_audit_metadata/migration.sql`
- `prisma/schema.prisma`
- `prisma/seed-demo.ts`
- `README.md`
- `tests/e2e/classes.spec.ts`
- `tests/e2e/identity.spec.ts`
- `tests/e2e/mail-helper.ts`

## Architecture decisions

[ADR 0009](../adr/0009-class-tenancy.md) records ownership, role permissions,
locking, invitation semantics, pagination and generated slugs. A verified creator
owns a private school workspace; this does not confer official school accreditation.
Class/school/platform admins have explicit permission checks. Members and staff
may read the directory; guests may only read class metadata. Removed members
cannot bypass removal through a new invitation. The last class admin is protected.

The only new runtime dependency is `qrcode` 1.5.4 for standards-based QR encoding
without an external service; handwritten QR encoding would introduce unnecessary
correctness risk. It is loaded dynamically on invitation creation. `@types/qrcode`
1.5.6 adds compile-time types. The mature package's API was checked against its
[upstream documentation](https://github.com/soldair/node-qrcode). npm audit found
zero vulnerabilities after installation. No additional infrastructure was added.

## Database

`202609100001_classes` adds School, SchoolAdmin, Class, ClassMembership, Invitation
and InvitationAcceptance, enums and scoped audit references. Foreign keys restrict
destructive deletion, composite references prevent cross-class acceptance,
uniqueness protects memberships/slugs/acceptances, and checks bound invitation uses,
years and role grants. `202609100002_audit_metadata` adds JSON audit metadata for
before/after role changes. Both migrations applied successfully to local development
and isolated test databases. Existing accounts were preserved.

Optional `npm run db:seed:demo` creates deterministic fictional school/class/member
records with randomly generated development-only credentials in an ignored file.
It was run twice successfully; it preserves existing passwords and edited records.
The ordinary seed remains operational metadata only. No profile/yearbook seed
content was invented for a later phase.

## API

See [the exact endpoint inventory](../api/classes.md). Added school CRUD subset,
class CRUD subset, own school/class lists, directory, membership updates, invitation
creation/listing/revocation and explicit acceptance. Existing identity/health routes
remain. `/openapi.json` is version 0.2.0 with generated request schemas.

## Frontend

Routes: `/classes`, `/schools/new`, `/schools/:id/manage`, `/classes/new`,
`/classes/:id`, `/classes/:id/members`, `/classes/:id/manage`, `/join`. My Class is
available from navigation and account settings. Creation forms ask for school/class
names rather than internal slug identifiers. Pages include loading/error/retry,
empty and success states. Invitation secrets display once, only in the admin's
creation response; QR generation uses that same URL. All new UI copy has ht/fr/en/es
variants. Registration/recovery UX and current branding were updated as requested.

## Tests and commands

Using pinned Node 24.20.0/npm in PowerShell:

- `npm.cmd install qrcode@1.5.4 --workspace @yearbook/web` and
  `npm.cmd install --save-dev @types/qrcode@1.5.6 --workspace @yearbook/web` — passed.
- `npx.cmd prisma validate` — passed.
- `npx.cmd prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script --output prisma/migrations/202609100001_classes/migration.sql`
  — generated SQL; reviewed and supplemented with database CHECK constraints before application.
- `npm.cmd run db:migrate`, `npm.cmd run db:generate` — passed.
- `npm.cmd run db:seed:demo` twice — passed; credentials not printed.
- `npm.cmd run typecheck` — passed after correcting a Swagger type import to its public export.
- `npm.cmd run test:integration` — initial 20 tests passed; final suite adds concurrent admin demotion.
- `npm.cmd run build` — passed.
- `npm.cmd run test:e2e` — initial class tests exposed an exact-label selector issue.
  Replaced it with the accessible combobox role/name selector; no timeout increase,
  skipped test, retry or security weakening. `npx.cmd playwright test tests/e2e/classes.spec.ts`
  then passed both desktop/mobile journeys.
- `npm.cmd run check` — passed: lint, formatting, typecheck, **11 API unit/smoke +
  8 frontend + 21 integration + 14 E2E = 54 tests**, then/including production builds.
  Zero skipped tests. Full local output: ignored `.tools/phase2-check.log`.
- `npm.cmd audit --audit-level=high` — zero vulnerabilities.
- `git diff --check` — passed.
- `node .tools/phase2-preview.mjs` — inspected the running localhost installation:
  demo login, French mobile class list, desktop dashboard and French verification
  next step; zero page errors. Screenshots were visually reviewed. The helper and
  images remain ignored local artifacts; no credentials are printed or committed.

The E2E suite uses actual registration, Mailpit SMTP verification, login and REST
mutations before class creation and invitation acceptance. It confirms student
controls, admin role change and access removal. Integration tests cover unknown
tenants, guest restrictions, role escalation, invalid inputs, bounded pagination,
expired/revoked/exhausted invitations, same-user retry, concurrent last-use races,
last-admin races, database constraints and secret-free scoped audit persistence.

## Security

[Security review](../security/class-review.md) documents the enforced boundaries.
Origin/JSON CSRF checks, session verification, general IP limits and safe errors
remain enabled. Additional account throttles protect creation and acceptance.
No arbitrary remote resource is fetched for QR generation. No account data is
returned through directory responses beyond the explicit public fields.

## Known risks and assumptions

Local inbox delivery is intentional; personal-mailbox SMTP is not configured.
The local service is loopback-only; QR links containing localhost cannot open this
machine from another phone. Public deployment, real SMTP, school verification,
backup restoration and privacy/consent review remain release gates. No production
release declaration is made. School-admin transfer and school/class erasure are
not provided. Historical yearbook/profile/media features remain outside this phase.
Anamnou is restored without renaming repository or infrastructure identifiers.

## Next task

Phase 3 only after explicit instruction: private member profiles, validated photo
uploads, yearbook configuration/sections and responsive preview.
