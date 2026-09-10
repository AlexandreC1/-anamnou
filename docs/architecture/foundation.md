# Foundation architecture

## Current implementation

Browser → Vite development/preview server → /api proxy → NestJS REST API.
NestJS uses Prisma with the PostgreSQL driver adapter and an S3-compatible storage
port. PostgreSQL and MinIO run as Docker infrastructure. The applications run as
Node host processes. No SaaS, Redis, microservices, authentication or business
features exist.

Node 24.20.0 is pinned. NestJS 12 and Prisma Client use ESM. TypeScript compilation
preserves Nest decorator metadata; API tests run the compiled JavaScript through
Node's built-in test runner. The web uses Vitest and React Testing Library.

## Boundaries

Controllers delegate readiness to a service. The database and storage interfaces
are injected into that service. Frontend imports neither Prisma nor database
configuration. No client environment prefix is used for secrets. Vite's
server-side proxy reads API_BASE_URL; the browser requests relative /api URLs.

The operations API has no mutation endpoints. The internal storage adapter must
remain inaccessible to public callers until the media phase adds authorization,
intent validation, size/MIME/signature/dimension checks and asset ownership.

## Operational behavior

/health proves that the HTTP process responds and does not depend on PostgreSQL.
/ready performs a real metadata query and a storage bucket request in parallel.
Failures return a safe 503, with a server-generated request ID.
/openapi.json documents the operations endpoints.

Structured JSON logs include method, response code, request ID and duration.
They exclude request URLs, bodies, headers, credentials and raw database errors.
The safe error reporter is an explicit interface, allowing a future reporting
adapter without changing exception handling.

## Future domains

The Bible's auth, users, schools, classes, memberships, yearbooks, profiles,
voting, media, notifications, events and admin domains belong in this modular
monolith as their phases are authorized. Empty domain modules and premature
shared packages have not been created.

## Minimal analytics port

LocalAnalytics writes only an allowlisted readiness event name and outcome to
the structured logger. It accepts no user identifiers or arbitrary metadata.
This is an exercised local telemetry abstraction, not third-party tracking.
