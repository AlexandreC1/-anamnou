# Identity API

The live OpenAPI document is GET /openapi.json. All mutations require the
configured PUBLIC_WEB_URL Origin, JSON Content-Type and a JSON body. Session
cookies are required for /me. Public auth routes remain subject to rate limits.

| Endpoint                       | Input                                         | Result                                                 |
| ------------------------------ | --------------------------------------------- | ------------------------------------------------------ |
| POST /auth/register            | email, password, displayName, optional locale | 202 accepted; email verification required              |
| POST /auth/login               | email, password                               | 200 safe user and session cookie, or `{mfaRequired}`   |
| POST /auth/mfa                 | code (6 digits or recovery code)              | 200 safe user and session cookie; needs `yearbook_mfa` |
| POST /auth/logout              | {}                                            | 200; removes and clears session, idempotent            |
| POST /auth/resend-verification | email                                         | 202 generic response                                   |
| POST /auth/verify-email        | token                                         | 200; consumes valid verification token                 |
| POST /auth/forgot-password     | email                                         | 202 generic response                                   |
| POST /auth/reset-password      | token, password                               | 200; consumes token and revokes all sessions           |
| GET /me                        | session cookie                                | own safe fields, emailVerified, mfaEnabled             |
| GET /me/mfa                    | session cookie                                | enabled, recoveryCodesRemaining                        |
| POST /me/mfa/setup             | password                                      | setup secret and otpauth URI; expires in 10 minutes    |
| POST /me/mfa/enable            | code (6 digits)                               | ten recovery codes, shown once; other sessions revoked |
| POST /me/mfa/disable           | password, code                                | 200; removes factor and codes; other sessions revoked  |
| POST /me/mfa/recovery-codes    | password, code                                | ten new recovery codes; previous codes invalidated     |
| PATCH /me                      | displayName and/or locale                     | same safe user shape                                   |

Emails normalize to trimmed lowercase and must be valid, at most 254 characters.
Display names are 1–80 characters without control characters. Locale is ht/fr/en/es.
Passwords are 15–128 characters on creation/reset. Tokens are 64 hexadecimal
characters. Unknown fields are rejected, including id, role and passwordHash.
Request bodies are bounded at 16 KiB. Error bodies use statusCode, safe message
and requestId. Login intentionally does not distinguish bad password, unknown
user, disabled user or unverified user. Recovery/registration do not return user
existence or tokens. Email is queued durably; SMTP failures retry without changing
the public request response. See ADR 0008 for delivery semantics.

Multi-factor authentication is described in ADR 0011. When an account has MFA,
login returns `{ "mfaRequired": true }` with a five-minute HttpOnly `yearbook_mfa`
challenge cookie and no session; `POST /auth/mfa` completes sign-in. A challenge
accepts five guesses. `role` reports `PLATFORM_ADMIN` only on MFA-verified sessions.
Login attempts are limited to ten per account per client address per 15 minutes,
counted before password hashing. `PATCH /schools/:id/verification` requires
`password` and `code` in addition to `verified` and `reason`.
