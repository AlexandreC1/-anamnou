# Security hardening delivery, October 6, 2026

This follows the baseline review in `backend-status-security-plan-2026-10-06.md`.
This is a hardening milestone, not production certification. The owner confirmed
that the Haiti pilot includes minors and that the system administrator handles submissions and reviews. Production rollout remains gated on the items below.

## Changes

- Updated vulnerable NestJS, Nodemailer, Multer and transitive dependencies. The
  npm audit on October 6 reports **zero known vulnerabilities** across the lockfile.
  Kept the xcode UUID override on a CommonJS-compatible release.
- Limited concurrent Argon2 operations to two per API process, with immediate 429
  admission failure and no unbounded queue. Invalid reset tokens are checked before
  hashing; the original atomic one-use consumption check remains in place.
- Correct passwords can log in after repeated failed attempts against the account.
  Failed attempts remain counted; shared IP limits and hashing admission still apply.
- Added PostgreSQL-backed atomic request counters outside test mode, explicit trusted
  proxy IP/CIDR configuration, and bounded expiry cleanup. Liveness uses a separate
  in-memory limiter so an unavailable database cannot break `/health`.
- Added session listing and individual/all-session revocation, with timestamps and
  current-session status. Token hashes stay server-side. Added a ten-session cap,
  seven-day absolute expiry, 24-hour idle expiry, and one-hour idle expiry for
  platform administrators. School/class administrators retain the ordinary idle limit.
- Added four-language Account security settings and school affiliation status.
- School verification requires a platform administrator, password reauthentication,
  and an audited reason. Production invitation creation and acceptance require a
  verified school. School name/location/slug changes invalidate verification.
  Development/test keep prototype invitation flows; the production gate is tested
  directly using the same service with verification enforcement enabled.
- Added limits of five administered school workspaces per creator and fifty classes
  per school. Storage intent reservation is serialized by class row locks with
  128 MiB per member per class and 1 GiB per class, counting conservative declared
  bytes. These are operational defaults, not billing entitlements.
- Added PROCESSING upload leases. Storage upload/download/deletion happen outside
  class transactions. Content permissions are rechecked after retrieval. Failed
  leases are retired for cleanup; committed uploads are not reset.
- Scheduled bounded identity/media cleanup every five minutes while the API runs.
  Successful object purges are recorded so deleted rows do not monopolize the next
  cleanup batch. Failed storage deletion remains retryable. This is an API timer,
  not an independent managed scheduler; multiple replicas can perform harmless
  duplicate deletion of an already deleted object.
- Email delivery now commits a durable claim before SMTP, with a fenced lease,
  exponential backoff, eight-attempt limit and safe dead-letter event. Failed sends
  delete only the attempted token hash. Re-requesting verification/reset resets the
  job. Crash recovery may send a replacement link; delivery is at-least-once,
  not exactly-once. No plaintext token is persisted in the outbox.
- CI audits dependencies in a separate job even if formatting fails, pins actions
  by commit, and fixes the previously failing mobile script formatting.
- Added AES-256-GCM encrypted PostgreSQL dumps and isolated restore tests. A local
  backup was restored successfully before schema migration. The local key file has
  Windows ACL access restricted to the current user and SYSTEM. Neither key nor
  dump is committed. A separate secure key copy is needed for recovery.

## Database location and recovery

The application database is local PostgreSQL in Docker Desktop:

- Container: `yearbook-local-postgres-1`.
- Volume: `yearbook-local_postgres-data`.
- Container data directory: `/var/lib/postgresql/data`.
- Docker engine volume path: `/var/lib/docker/volumes/yearbook-local_postgres-data/_data`.
- Development database: `yearbook`, on loopback port 5433 in this checkout.
- Photos are separate in MinIO volume `yearbook-local_media-data`.

Docker Desktop manages these Linux paths inside its storage on the Windows host.
GitHub stores source code and migrations, not database contents or photo objects.
No managed production database has been provisioned.

Local recovery commands, using the pinned Node runtime:

```text
npm run db:backup
npm run db:restore:test -- .tools/backups/<timestamp>.dump.enc
```

The test restores into a randomly named disposable database and removes it. It
never restores over the application database. `BACKUP_ENCRYPTION_KEY` can supply
an independent base64-encoded 32-byte key instead of the ignored local key file.
Database backups alone cannot recover photos. Local encrypted dumps are not an
offsite disaster recovery strategy. Production scheduling, retention, media
redundancy, offsite copies and RPO/RTO targets remain to be provisioned and tested.

## Schema rollout

Two additive migrations were applied to development and isolated test databases:

- `202610060001_session_management`: session IDs/activity timestamps, school
  verification, media PROCESSING state and purge timestamps.
- `202610060002_email_delivery_leases`: email lease IDs and dead-letter timestamps.

No account passwords, memberships or photo objects are migrated or removed.
Take another verified backup before applying these migrations anywhere else.
Older API versions do not understand PROCESSING, so stop upload writers before
rolling an API version back; prefer a forward fix over reversing the enum.

## Verification

`npm run check` passed: lint, formatting, type checks, 15 API unit tests, 28 UI tests, 35 integration tests, builds, and 16 desktop/mobile browser tests. The encrypted
pre-migration and post-migration dumps restored successfully to temporary databases; a tampered backup was rejected. Local web and proxied API readiness returned 200 at http://127.0.0.1:3000, and an invalid reset-token probe returned the expected 400 with the correct mutation origin. Dependency audit
returned `found 0 vulnerabilities`. No production services or real users were tested.

## Remaining launch gates

1. Revoke the previously exposed GitHub credential and replace it securely. This
   work does not prove that credential was revoked and does not reproduce it.
2. Implement and enforce MFA, especially for privileged accounts. Session controls
   and password reauthentication do not substitute for MFA.
3. For minors, implement the shared governance model in `universal-governance-standard.md`;
   approve the applicable guardian/school consent, notice, withdrawal, retention,
   reporting/moderation, data export and erasure process. Consent must be tied to
   reviewed policy versions and appropriate authorization. The pilot cannot be
   declared ready while these workflows are absent. Institutional verification
   only addresses impersonation, not parental consent or legal compliance.
4. Provision production PostgreSQL/private storage/SMTP, least-privilege access,
   offsite database and media recovery, a durable scheduler, centralized alerts,
   monitoring, secrets rotation and a tested incident process.
5. Complete signed Android/iOS release testing (iOS needs a Mac), TLS-only release
   configuration, cookie isolation, navigation restrictions and privacy review.
6. Keep voting and publication out of this change. Immutable snapshots must be
   implemented and tested before publishing any historical yearbook.
7. Have this security-sensitive change explicitly reviewed before merging, per
   AGENTS.md and PROJECT_BIBLE.md. Branch push does not constitute that review.

## Changed files

See the accompanying Git diff for the exact file list. Changes are confined to
identity/classes/media infrastructure, their tests, Account security and school
status UI, Prisma migrations, dependency manifests, CI, backup scripts and these
security reports. No cloud provider migration or publication feature is included.

Exact changed paths:

- .env.example
- .github/workflows/ci.yml
- apps/api/package.json
- apps/api/src/app.ts
- apps/api/src/auth/controller.ts
- apps/api/src/auth/delivery.ts
- apps/api/src/auth/hashing.ts
- apps/api/src/auth/service.ts
- apps/api/src/classes/controller.ts
- apps/api/src/classes/invitations.ts
- apps/api/src/classes/module.ts
- apps/api/src/classes/schools.ts
- apps/api/src/classes/service.ts
- apps/api/src/config.ts
- apps/api/src/maintenance.ts
- apps/api/src/publication/cleanup.ts
- apps/api/src/publication/media.ts
- apps/api/src/rate-limits.ts
- apps/api/test/classes.integration.ts
- apps/api/test/config.test.ts
- apps/api/test/hashing.test.ts
- apps/api/test/identity.integration.ts
- apps/api/test/rate-limits.integration.ts
- apps/web/src/App.tsx
- apps/web/src/class-api.ts
- apps/web/src/ClassDashboard.tsx
- apps/web/src/Classes.tsx
- apps/web/src/Identity.tsx
- apps/web/src/prism.css
- apps/web/src/SchoolVerification.tsx
- apps/web/src/SecuritySettings.test.tsx
- apps/web/src/SecuritySettings.tsx
- docs/development/backend-status-security-plan-2026-10-06.md
- docs/development/security-hardening-delivery-2026-10-06.md
- package-lock.json
- package.json
- prisma/migrations/202610060001_session_management/migration.sql
- prisma/migrations/202610060002_email_delivery_leases/migration.sql
- prisma/schema.prisma
- scripts/database-backup.mjs
- scripts/mobile.mjs
- tests/e2e/fixtures.ts

## Superseded pilot implementation contract

The owner subsequently broadened the requirement to international, shared governance. See [Universal governance standard](universal-governance-standard.md), which supersedes the single-administrator model below. The following historical workflow
is planned; it is not implemented by the technical hardening patch:

1. Record participation requests against authenticated class membership. Keep
   age bands minimal; do not require dates of birth, identity document images,
   private contact fields or other unnecessary personal information.
2. Keep minors out of class content and photo uploads while review is pending.
   Invitation acceptance alone must not approve participation. Ordinary class
   administrators must not bypass the platform approval gate.
3. Give the system administrator a paginated review queue. Approval requires
   authenticated administrator identity, recent reauthentication, a reviewed
   notice/consent policy version, and a reference to reviewed guardian/school
   authorization. Store a decision, timestamp, reviewer and audit event.
   Administrative approval does not itself create guardian authorization.
4. Support refusal and withdrawal with immediate access and visibility changes,
   including removal from profile, photo and draft projections. Recheck these
   conditions on every protected API operation and test concurrent revocation.
5. Provide private abuse reports to the system administrator, bounded submissions,
   clear acknowledgement, escalation and audited moderation decisions.
6. Make personal-data export and erasure requests trackable. Exports must contain
   only the requester's data. Erasure must remove photo bytes and sensitive profile
   fields, revoke sessions, and handle last-administrator ownership without leaving
   an orphaned class. Define lawful audit/backup retention and communicate it.
7. Test request, approval, denial, withdrawal, spoofed administrator, cross-class
   access and duplicate submissions through real API/database/browser flows.

The pilot's accountable organization, legally appropriate guardian/school
permission, notice wording, retention periods and escalation contacts still need
review and operational assignment. Do not ship a checkbox that claims to resolve
those questions. No legal compliance conclusion is asserted here.
