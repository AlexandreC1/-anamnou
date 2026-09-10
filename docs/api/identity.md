# Identity API

The live OpenAPI document is GET /openapi.json. All mutations require the
configured PUBLIC_WEB_URL Origin, JSON Content-Type and a JSON body. Session
cookies are required for /me. Public auth routes remain subject to rate limits.

| Endpoint                       | Input                                         | Result                                                  |
| ------------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| POST /auth/register            | email, password, displayName, optional locale | 202 accepted; email verification required               |
| POST /auth/login               | email, password                               | 200 safe user fields and HttpOnly session cookie        |
| POST /auth/logout              | {}                                            | 200; removes and clears session, idempotent             |
| POST /auth/resend-verification | email                                         | 202 generic response                                    |
| POST /auth/verify-email        | token                                         | 200; consumes valid verification token                  |
| POST /auth/forgot-password     | email                                         | 202 generic response                                    |
| POST /auth/reset-password      | token, password                               | 200; consumes token and revokes all sessions            |
| GET /me                        | session cookie                                | own id, email, displayName, locale, role, emailVerified |
| PATCH /me                      | displayName and/or locale                     | same safe user shape                                    |

Emails normalize to trimmed lowercase and must be valid, at most 254 characters.
Display names are 1–80 characters without control characters. Locale is ht/fr/en/es.
Passwords are 15–128 characters on creation/reset. Tokens are 64 hexadecimal
characters. Unknown fields are rejected, including id, role and passwordHash.
Request bodies are bounded at 16 KiB. Error bodies use statusCode, safe message
and requestId. Login intentionally does not distinguish bad password, unknown
user, disabled user or unverified user. Recovery/registration do not return user
existence or tokens. Email is queued durably; SMTP failures retry without changing
the public request response. See ADR 0008 for delivery semantics.
