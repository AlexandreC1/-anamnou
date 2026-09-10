# ADR 0004: defer identity implementation to Phase 1

Status: Accepted (scope boundary); authentication strategy remains proposed

There are no identities, roles, protected resources or authentication endpoints
in Phase 0. Public health endpoints must not be interpreted as authenticated APIs.

Phase 1 must choose and review the session strategy, password hashing, CSRF
protection and local email delivery before implementation. Argon2id and opaque
server-side sessions in PostgreSQL are candidates, not implemented guarantees.
Do not introduce an external identity SaaS for the local core.

Every later protected resource must establish caller, tenant ownership,
membership, role and operation permission server-side. Cross-tenant and privilege
escalation tests are required before those phases are complete.
