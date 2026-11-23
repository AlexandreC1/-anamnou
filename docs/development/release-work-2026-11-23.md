# Release work, November 23, 2026

The user's current instruction is to work through the remaining release blockers.
The $0 hosting budget and separation from Gidyo remain in force. No production
launch, legal compliance or complete minors workflow is claimed.

## Participation milestone

Added school-scoped policy proposals/independent approval, participation review
requests, scoped queue assignment, decisions, withdrawal and event history.
Production class/profile/yearbook/media authorization requires a current reviewed
authorization; platform and class roles cannot override it. Withdrawing hides
the member's shared profile and owned media. Current role/queue coverage and
optimistic versions are checked on every review decision. Approved policy
versions are immutable. See [ADR 0013](../adr/0013-participation-authorization.md).

Member interface: `/settings/participation`, linked from account settings.
Reviewer interface: `/settings/participation/review`, linked from governance.
Both include English, Haitian Creole, French and Spanish copy. The reviewer
interface uses existing step-up forms that clear credentials after submission.
New page code participates in intent preloading; private account data is not
prefetched. No new dependency was added.

Four additive migrations create policy, authorization and event records, assigned
queue references, and required foundation metadata. All 14 repository migrations
were applied to the dedicated Neon production database `yearbook` in project
`anamnou-production`. It initially contained no application tables. No customer
records, fictional schools or reviewers were seeded into production.

The runtime role `anamnou_api` is distinct from the migration owner. It cannot
create schema objects, update/delete audit or participation history, or delete
policy records. Approved policies additionally have a database immutability
trigger. Reapply `deploy/runtime-privileges.sql` after future migrations.
Render starts the API directly; owner credentials are reserved for migrations.

The actual private Neon `yearbook-media` bucket passed the application's
write/read/compare/delete check. API readiness returned 200 using the restricted
production database role and this storage. That check does not exercise Gmail.
Render Free is configured only as a browser draft; no backend deployment or
Cloudflare API enablement has been performed.

## Verification

`npm run check` passed lint, formatting, type checks, build, 26 API unit tests,
42 frontend tests, three proxy tests, 38 integration tests and 20 desktop/mobile
browser tests: 129 tests total. After adding participation-screen browser
assertions, the two affected desktop/mobile journeys passed again. Production
authorization is explicitly tested with `APP_ENV=production` against an isolated
test database; it does not rely on the development fixture exception.

`npm audit --audit-level=high` now reports zero vulnerabilities, down from 23
(eight high). Updates include Multer 2.5.0, Nodemailer 10.6.1, Vite 8.3.8,
Vitest 5.1.1, the Effect 3.22.5 override and compatible transitive fixes.
No forced major-version audit fix was used.

An encrypted local database backup was restored successfully into a disposable
database. This proves the local restore procedure, not automated production
backups or production recovery objectives. Local web and API readiness both
returned 200 at `http://127.0.0.1:3000/` and port 4000 respectively.

## Remaining release gates

- Identify the accountable operator, support contact, reviewer team and reviewed
  pilot policy. The user was asked for the organization and contact while
  implementation continued. Do not fabricate these or silently reuse Gidyo.
- Complete protected evidence access/retention, independent appeals, safeguarding
  reports and subject-scoped privacy fulfillment.
- Publish accurate, operator-reviewed notices and terms. A request for review is
  not itself guardian consent or legal authorization for all processing.
- Finish durable Gmail production authorization; prior saved test-mode credentials
  were invalid on the last check. Do not describe the old inbox test as live reset.
- Deploy Render Free, verify health, enable the Cloudflare API connection and
  run real registration, verification, reset and upload journeys.
- Complete publication approval and immutable historical editions, final security
  review, production monitoring and automated production backup/restore verification. Voting remains
  unfinished and cannot be claimed as part of a complete MVP.

Real people must take the operational review roles. Configuration forms do not
make the service unattended or establish universal legal compliance.
