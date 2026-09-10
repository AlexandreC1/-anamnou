# Phase 1 security review

Scope: local identity implementation, reviewed before publication of the feature
branch. This is an implementation review, not an independent penetration test or
a production release approval.

## Findings resolved

- Credentials: Argon2id hashes; no plaintext passwords in persistence or logs.
- Sessions: opaque random cookies, hashed lookup, absolute expiration, HttpOnly,
  SameSite=Strict, Secure in production. Logout and reset revoke server state.
- Reset/login races: row locking and rechecking the password hash prevent a
  concurrent old-password login from escaping reset revocation.
- Token replay: purpose, expiration and conditional one-use deletion are checked
  in the same transaction; duplicate redemption is tested concurrently.
- Account discovery via SMTP: request handlers persist delivery intent and return
  independently of SMTP latency/failure. Unknown accounts get the same accepted
  body. Database queries are not claimed to have cryptographically constant timing.
- CSRF: strict configured Origin, Fetch Metadata, SameSite cookie and JSON-only
  mutations. Missing Origin and hostile origins are explicitly rejected.
- Privilege escalation/IDOR: strict input schemas reject role, id and email edits;
  /me has no user-supplied ownership selector. Platform admin checks deny USER.
- Abuse: shared database counters, per-IP limiter, bounded JSON/password/name
  lengths, safe malformed JSON and 413 handling.
- XSS/injection: stored display names remain text in React; real browser tests use
  a script payload. Prisma and tagged SQL bind parameters; SQL email payloads fail
  validation. No user-supplied URL is fetched by identity flows.
- Email jobs: database-backed intent, transaction locks across workers, no secret
  payload, safe failure logs, retries and restart persistence tested with real SMTP.
- UI: form errors preserve input, missing links offer recovery, logout waits for
  the API response. Identity traces are disabled to avoid publishing form secrets.

## Production gates and limits

- Configure and test real SMTP/TLS, ingress limits, backups/restoration and alerts
  for delivery queue age and attempts. Mailpit is loopback-only local infrastructure.
- SMTP and PostgreSQL cannot commit atomically. A crash after sending may produce
  an invalid link followed by a fresh link. This is documented and retryable.
- Set a reviewed retention/cleanup policy for sessions, tokens, counters and
  security audits; expired credentials are already rejected regardless of cleanup.
- Before providing any privileged administration interface, define provisioning,
  MFA and audit policy. There is no role-assignment API or seeded administrator.
- School/class role and cross-tenant authorization tests belong to Phase 2, when
  those resources exist. Avatar/media validation belongs to the media phase.
- Human language review remains advisable for all four locales.
