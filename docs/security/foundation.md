# Phase 0 security boundary

## Implemented controls

- Random development secrets are written only to ignored .env and never printed.
- Configuration rejects missing/invalid values and requires HTTPS URLs in production mode.
- Containers and API bind to loopback. Existing local PostgreSQL is preserved.
- Private storage denies anonymous object reads; no public upload endpoints exist.
- Internal object keys reject traversal and filesystem paths.
- Helmet response headers, explicit CORS, request IDs, safe errors and no-store responses.
- Single-process public endpoint rate limiting, including a tested 429 response.
- Logs deliberately exclude raw error objects, request URLs, bodies and headers.
- Global validation configuration is ready for later DTOs; no mutating API exists.

## Limits

No accounts or tenant-owned resources exist, so authentication bypass, IDOR,
cross-school access, profile privacy, privilege escalation and session CSRF
cannot be meaningfully verified yet. Those tests are required in later phases.
The application cannot accept personal information or actual student uploads.

S3 is an internal adapter, not a secure upload workflow. No signature, dimension,
MIME or file-size upload validation is claimed. The environment-selected endpoint
is trusted operator configuration; users cannot select an arbitrary fetch URL.

No third-party product analytics or tracking is configured. Phase 0 error and
request telemetry is local and contains no user identifiers.

## Dependencies

The root overrides pin patched multer 2.3.0, deepmerge-ts 8.0.2 and mysql2 3.24.4
because upstream NestJS/Prisma dependency ranges initially selected vulnerable
versions. Verify these pins with npm audit and remove them when upstream resolves
patched versions itself. Database generation, migrations and runtime tests must
continue to pass after changes. No force-fix downgrade or audit suppression is used.

ESLint 9 is retained for the JSX accessibility plugin's declared compatibility;
npm reports it deprecated. Upgrade both when compatible tooling is available.
This is a maintenance limitation, not a disabled lint check.

## Before production

Review identity, tenant isolation, moderation/minor privacy and retention;
use least-privilege storage credentials; terminate TLS; configure a trusted proxy
explicitly; audit container images; test backups/restores; set release and rollback
procedures; review dependency changes and require passing CI. No production-ready
claim is made by completing this local foundation.
