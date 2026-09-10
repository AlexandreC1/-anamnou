# ADR 0008: local identity and revocable sessions

Status: Implemented on the Phase 1 review branch; supersedes ADR 0004's deferral.

## Decision

Use Argon2id (64 MiB, three iterations, one lane), with 15–128 character
passwords. Hashing is provided by node-argon2 rather than hand-written crypto.
The parameters exceed the [OWASP minimum](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

Use cryptographically random 256-bit opaque session tokens. PostgreSQL holds
only SHA-256 digests; the browser gets a host-only HttpOnly, SameSite=Strict
cookie with a seven-day absolute expiry. Production requires Secure cookies
and HTTPS. No session secret is needed because tokens are random lookup keys,
not signed self-contained claims. Logout deletes the session; password reset
deletes every session for that user. Disabled or unverified users cannot use one.

Mutations require the exact configured web Origin and application/json.
Cross-site Fetch Metadata is rejected. Deploy frontend and /api on the same
origin; reverse proxies must preserve Origin and not trust arbitrary forwarding
headers. Browser clients do not store authentication tokens in localStorage.

Verification lasts 24 hours; recovery lasts 30 minutes. Tokens are purpose-bound,
hashed, unique per user/purpose and consumed transactionally. Row locks serialize
password reset with login, and conditional deletion prevents double redemption.
Resending replaces the previous link. Links use URL fragments; the frontend
removes the fragment on mount and requires explicit submission to consume it.

Nodemailer sends real SMTP email to local Mailpit. Production requires SMTP
credentials, a real sender, and TLS. No public inbox or verification bypass
exists in the application. Requests queue delivery intent in PostgreSQL, keeping
SMTP response times and failures out of account-existence responses. Registration
and its first delivery job commit atomically. The API worker locks one job using
FOR UPDATE SKIP LOCKED, generates a token in memory, persists only its digest,
sends the email, then commits and removes the job. Failures roll back and retry
after one minute, with safe structured error logging. No secret payload is stored
in the job table. Jobs survive process restarts and multiple API workers cooperate.
SMTP cannot be transactional: a crash after sending but before commit may deliver
an unusable link followed by a fresh link on retry. Use the latest email. Monitor
job age and retry counts before production rollout; there is no external queue.

Account-level attempt counters use atomic PostgreSQL upserts and survive API
restarts. They allow ten attempts per operation/account per 15 minutes. An
additional per-process IP limiter allows 60 auth requests per minute. Production
must also bound aggregate traffic at ingress, especially before scaling replicas.

## Role boundaries

USER is the default platform role. PLATFORM_ADMIN is persisted but cannot be
self-assigned through any API. No admin provisioning credentials are seeded.
Class administrator, student/member, staff and guest roles belong to class
membership; school administrator belongs to school ownership. Phase 2 will
implement those scoped grants rather than turn them into global account powers.
The Phase 1 /me resource always derives its owner from the authenticated session.
There is no user-ID edit endpoint and no role-changing endpoint.

## Data integrity

Unique normalized email, foreign keys, unique token-per-purpose constraints,
locale checks and active-user verification checks are enforced by PostgreSQL.
Security audits contain actor, action, target and timestamp, never passwords,
email tokens or session keys. Class/school audit relationships arrive with those
entities in Phase 2. Existing foundation metadata and media remain unchanged.

## Alternatives

JWTs complicate immediate revocation without providing a need in this modular
monolith. External identity SaaS violates local-core requirements. Mailpit makes
verification testable using real SMTP without sending test emails externally.
