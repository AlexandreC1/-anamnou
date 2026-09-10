# Test strategy

npm test runs API tests using Node's test runner against compiled TypeScript and
web tests using Vitest, jsdom and React Testing Library.

API smoke tests start real HTTP servers with deliberately unreachable dependency
endpoints: liveness must still respond, readiness must return safe 503, and
request IDs, headers, unknown routes and rate limits must behave correctly.
Environment tests verify rejection without leaking invalid values.

npm run test:integration requires real PostgreSQL and MinIO, migrated and seeded.
It verifies readiness/OpenAPI/CORS, uniqueness under concurrent inserts,
transaction rollback, object round-trip, anonymous access denial, invalid keys,
and deletion. Integration fixtures use random keys and clean up in finally blocks.
Tests refuse APP_ENV=production. Use disposable local data only.

npm run test:e2e starts the compiled API and web preview on dedicated ports
4100/3100 and tests desktop and phone-sized Chromium. It covers navigation,
deep-link reload, live dependency checks, visible network errors and retry,
keyboard skip navigation, reduced motion and missing-route recovery.

A mocked network failure exists only inside browser tests; no production response
is mocked. There are no student fixtures or hidden fake business workflows.
The MVP's full acceptance flow is intentionally deferred to later phases.

CI runs the same sequence on Ubuntu, installs Chromium with system dependencies,
uses generated local credentials, and uploads browser diagnostics on failure.
A workflow file alone does not prove that a remote CI run has passed.
