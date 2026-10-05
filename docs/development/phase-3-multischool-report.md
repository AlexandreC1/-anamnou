# Phase 3 multi-school verification

Date: 2026-09-15

## Result and scope

Added repeatable verification for four schools, eight classes and two independent
Nest application instances sharing PostgreSQL. Both instances run in one test
process with separate listeners and application dependencies. This checks shared
database behavior; it does not simulate separate hosts or establish a supported
production school count.

The tests confirm:

- The same database session works through either application instance.
- Concurrent reader requests return only the authorized class members. Private
  contact information stays absent, and requests from another school return 404.
- Concurrent profile edits with the same version produce one success and one
  conflict. The stored version advances once and one correctly scoped audit
  record identifies the successful editor.

Fixtures require APP_ENV=test and a local database whose name ends in _test.
Cleanup targets only the generated fixture IDs. Existing application data is
preserved. Normal API rate limits remain enabled.

## Current architecture

React 19, TypeScript, React Router and Vite serve the browser application. NestJS
12 on Node 24 provides the API. Prisma connects to PostgreSQL 17. Local data lives
in the yearbook database at 127.0.0.1:5433, persisted by the
yearbook-local_postgres-data Docker volume. Photos live separately in MinIO's
yearbook-local_media-data volume.

Authentication uses verified accounts, Argon2id password hashes and database
sessions delivered through HttpOnly cookies. Authorization checks school and class
membership, roles, ownership and visibility on the server. Accounting means audit
records for supported actions, not billing or a tamper-proof external audit store.

There is no Redis or shared application cache. API responses use no-store. Each
API instance has its own rate limiter, upload concurrency limit and database pool
of five connections. School isolation is enforced by application checks and
relational constraints; this is not a PostgreSQL row-level security design.

## Measurements and validation

The initial integration run passed all 32 cases, including the three new cases.
The reader smoke scenario issued 64 requests in four batches of 16. Locally it
recorded 1,072 ms elapsed, 186 ms p50, 407 ms p95 and 422 ms maximum request time.
These values include successful reads and denials while other integration files
were running. They are observations, not performance targets or a load benchmark.

Run npm run test:integration to repeat the verification. Search its output for
local-multischool-read-smoke to find the timing diagnostic. The test asserts
correctness, not machine-dependent latency thresholds.

Final validation:

- npm run check passed: lint, formatting, types, 14 API unit tests, 19 browser
  component tests, 32 integration tests, production build and 16 desktop/mobile
  end-to-end tests. The browser suite completed in 4.2 minutes.
- npm audit --audit-level=high reported zero vulnerabilities.
- The live web application returned HTTP 200 at http://localhost:3000. Both the
  direct API /ready endpoint and its web proxy returned status ok.
- A separate browser walkthrough exercised the demo dashboard, editor, profile
  and reader, with zero page errors and no horizontal overflow on the mobile
  reader. The current editorial interface remains available for review.

The full check's second smoke sample recorded 763 ms elapsed, 149 ms p50,
246 ms p95 and 255 ms maximum. Variation between these small local samples is
another reason not to use them as a production capacity claim.

## Remaining production work

Before adding API replicas, make rate limits consistent across instances and size
the total connection budget against PostgreSQL capacity. Measure sustained traffic
with representative class sizes, photo uploads and downloads, and concurrent edits
to the same class. Class-level write locks intentionally serialize conflicting
work and need measurement under that traffic.

Deployment still needs production TLS/proxy configuration, monitoring, scheduled
database and object backups, and a demonstrated restore. Docker volumes alone
are not backups. Introduce caching only for a measured bottleneck, with tenant,
permission and invalidation rules included in the design.

## Files changed in this milestone

- apps/api/test/multischool.integration.ts: fixtures, concurrent HTTP checks and
  timing diagnostic, included by the existing integration test command.
- docs/development/phase-3-multischool-report.md: evidence and architecture limits.

No application behavior or schema migration was needed for these checks.
