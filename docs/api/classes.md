# Schools, classes and invitations API

All endpoints require a verified account's `yearbook_session` cookie. Mutations
require JSON and the exact configured web Origin. IDs are UUIDs. Request schemas
are generated from the Zod input shapes into `/openapi.json`; runtime validation
also enforces text/control-character rules and nonempty patches.

| Method     | Path                                          | Permission / behavior                                                      |
| ---------- | --------------------------------------------- | -------------------------------------------------------------------------- |
| POST       | /schools                                      | Verified account creates private school workspace and becomes school admin |
| GET        | /me/schools                                   | Paginated schools administered by caller                                   |
| GET, PATCH | /schools/:id                                  | School admin                                                               |
| GET        | /schools/:id/classes                          | School admin; paginated                                                    |
| POST       | /classes                                      | School admin; creator becomes class admin                                  |
| GET        | /me/classes                                   | Paginated accessible classes                                               |
| GET        | /classes/:id                                  | Active member, owning school admin or platform admin                       |
| PATCH      | /classes/:id                                  | Class/school/platform admin                                                |
| GET        | /classes/:id/members                          | Active non-guest member or admin; paginated                                |
| PATCH      | /classes/:id/members/:memberId                | Admin; last active class admin protected                                   |
| POST, GET  | /classes/:id/invitations                      | Admin; GET paginated, never reveals tokens                                 |
| POST       | /classes/:id/invitations/:invitationId/revoke | Admin; empty JSON body; idempotent                                         |
| POST       | /invitations/accept                           | Verified account; explicit code acceptance; idempotent                     |

Creation inputs: school `{name, location?}`, class `{schoolId, name,
graduationYear, motto?}`. Optional explicit `slug` is supported on both; otherwise
the service generates one. School/class patch allows only editable fields, never
school reassignment. Names max 120; motto max 240; years 1900–2200. Optional text
can be cleared with null.

Member patch requires `{role, status}`; roles MEMBER, CLASS_ADMIN, STAFF, GUEST;
status ACTIVE or REMOVED. Restore is an explicit admin operation. Directory rows
contain only id, displayName, role, status and joinedAt. Admins see removed members;
other members see active members. Guests cannot read the directory.

Invitation create accepts `{role?, expiresInDays?, maxUses?}`: defaults MEMBER,
7 days, 30 uses; ranges 1–30 days and 1–500 uses; role never CLASS_ADMIN. Creation
returns a one-time code and URL alongside metadata. The QR encodes that URL.
Acceptance takes `{code}` (32 hex characters, case-insensitive) and returns
`{classId, membershipId}`. No GET request accepts an invitation. No raw tokens
are stored in PostgreSQL or included in audit entries.

Pagination: `page=1&pageSize=20`, max page 10000 and pageSize 50. Responses:
`{items, page, pageSize, hasMore}`. Ordering is stable ascending ID. Unknown query
fields are rejected. Authentication failures use 401; inaccessible tenants use
404; denied operations within accessible classes use 403; bad/expired invitations
use 400; slug collisions and last-admin conflicts use 409. Errors use the existing
safe envelope with requestId. Creation/acceptance has additional account-based
limits (10 per operation per 15 minutes), alongside the global per-IP limiter.
