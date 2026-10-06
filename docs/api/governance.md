# Governance API

This backend milestone implements scoped grants and review queue configuration. It does not yet implement consent cases, evidence review, appeals or privacy fulfillment. See ADR 0012 and the universal governance standard.

All routes require the existing session cookie. Mutations require the exact configured web origin and JSON content type, plus `password` and `code` fields for fresh MFA reauthentication. Codes may be authenticator codes or unused recovery codes. Never put credentials in URLs or audit reasons.

| Method and path                                | Behavior                                                                                      | Authorization                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| GET /me/governance/grants                      | Most recent fifty grants belonging to the caller, including requested/expired/revoked history | Authenticated owner                                                          |
| POST /governance/grants                        | Propose role, school, recipient and expiry                                                    | MFA platform administrator plus step-up                                      |
| POST /governance/grants/:id/approve            | Activate a requested grant                                                                    | Different MFA platform administrator, who is not the recipient, plus step-up |
| POST /governance/grants/:id/revoke             | Revoke a requested or active grant; repeated revocation is safe                               | MFA platform administrator plus step-up                                      |
| GET /governance/grants?schoolId=...&cursor=... | Paginated grant configuration for one school                                                  | MFA platform administrator or active school-scoped governance role           |
| GET /governance/queues?schoolId=...&cursor=... | Queue configuration and live coverage flags                                                   | Same as grant listing                                                        |
| POST /governance/queues                        | Configure distinct primary and backup reviewers                                               | Active school-scoped QUEUE_MANAGER and MFA step-up                           |
| PATCH /governance/queues/:id                   | Reassign/reconfigure using current version                                                    | Same as queue creation                                                       |

Grant proposal body: `schoolId`, `userId`, `role`, `expiresInDays` (1–90), `password`, `code`. Allowed roles: QUEUE_MANAGER, CONSENT_REVIEWER, SAFEGUARDING_REVIEWER, PRIVACY_REVIEWER, AUDITOR. Recipients must already have active verified accounts and MFA enrollment. Grant proposal does not confer access until independently approved.

Approval/revocation body: `reason` (20–500 characters), `password`, `code`. Grant IDs are UUIDs. Approval after expiry or after a previous decision returns 409. Self-approval returns 403. Revoke expired grants before replacing them.

Queue creation body: `schoolId`, `name` (2–120 characters), `role` (CONSENT_REVIEWER, SAFEGUARDING_REVIEWER or PRIVACY_REVIEWER), `primaryGrantId`, `backupGrantId`, `password`, `code`. Reassignment omits schoolId and adds `version`; the server determines school ownership from the queue. Primary and backup must be different people with matching active grants in that school. Invalid coverage and stale versions return 409.

List responses contain `items` (maximum fifty) and nullable `nextCursor`. Queue items include `primaryAvailable`, `backupAvailable`, and `covered`. Available means the grant/account/MFA checks pass, not that a reviewer is currently online. Coverage changes immediately when authorization expires, is revoked or its account becomes disabled. No private student evidence or account secrets are returned.

403 indicates insufficient MFA/platform authorization; 404 intentionally conceals resources outside the caller's school grants; 409 indicates invalid state or a conflict; malformed/extra fields are rejected. Access is checked in the service transaction as well as at the controller boundary. Configuration reads and mutations are audited. Reads of one's own history contain only one's own grant metadata.
