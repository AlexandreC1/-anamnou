# Anamnou: backend status, security assessment and delivery plan

Review date: October 6, 2026 (America/New_York).
Reviewed baseline: `f9f6772dda937c83f939f55618ad378f62baf9b9`, branch
`feat/phase-3-yearbook`. This is a source and delivery-evidence review, not an
independent penetration test or production certification. No backend fixes,
dependency changes, deployment, credential revocation or new feature work were
performed for this report.

## 1. Executive assessment

The backend exists and supports a substantial private yearbook prototype. It is
not yet a production-ready service or a complete publishable yearbook product.
The immediate work is hardening and release verification, followed by safe
moderation/voting and immutable publication. Rebuilding the backend or introducing
microservices would add risk without addressing the current problems.

The previous local delivery results remain useful evidence, but they must not be
confused with a green GitHub release gate. The pushed commit's CI run failed at
formatting; downstream checks did not execute. Current dependency findings also
differ from older reports and must supersede their security conclusions.

## 2. What has been built

| Area                  | Implemented behavior                                                                                                                                | Important limit                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Foundation            | npm workspaces; NestJS/TypeScript API; PostgreSQL/Prisma; versioned migrations; S3-compatible storage; local Docker services; OpenAPI; CI workflow  | Local infrastructure, not a verified production deployment                                                                   |
| Identity              | Registration, email verification, login/logout, password recovery/reset, authenticated account reads/updates, four-language email copy              | No MFA, self-service session management or complete account erasure workflow                                                 |
| Credential protection | Argon2id, 256-bit random session/recovery tokens stored as hashes, one-use recovery tokens, expiry checks, session revocation on password reset     | Seven-day absolute session lifetime; no idle expiry or device/session cap                                                    |
| School/class tenancy  | School and class creation, memberships, school/class/platform roles, paginated directories, role changes, last-class-admin protection               | Creating a school immediately makes its creator an administrator; institutional identity is unverified                       |
| Invitations           | Random hashed codes, invite URL/QR support, bounded use count and expiry, revocation, explicit acceptance, retry-safe acceptance                    | Possession of a shared code conveys its configured MEMBER/STAFF/GUEST role; no named-recipient approval flow                 |
| Profiles              | Name, optional biography/quote/interests/aspiration/contact, own-profile editing, separately controlled profile/contact visibility                  | No consent records, privacy export or defined retention lifecycle                                                            |
| Media                 | Authenticated upload intent/content/complete/delete; class ownership; private reads; image normalization; abandoned-object cleanup function and CLI | No durable storage quota, automated scheduler or production media moderation                                                 |
| Yearbooks             | Admin-edited draft title/theme/ordered sections/media; class-only preview; member/staff/quote projections; optimistic versions                      | Mutable drafts only; no publish endpoint or historical snapshot                                                              |
| Auditability          | Database audit entries for major identity/class/invitation/profile/media/yearbook changes; safe structured HTTP/error logs                          | No tamper-resistant audit export, centralized alerting or complete incident workflow                                         |
| Web experience        | Four-language responsive yearbook UI, interactive illustrated cover, saved Appearance settings                                                      | Appearance is device-local UI preference, not a backend class configuration                                                  |
| Native apps           | Android/iOS Capacitor projects share the web UI; native HTTP adapter; authenticated photos; Android back navigation                                 | Android debug app installed/launched; iOS project synchronized but not built/tested with Xcode; no signed production release |

Core persistence includes User, Session, IdentityToken, AuthThrottle,
IdentityEmailJob, School, SchoolAdmin, Class, ClassMembership, Invitation,
InvitationAcceptance, Profile, MediaAsset, Yearbook, YearbookSection,
YearbookSectionMedia and AuditLog.

Database migrations enforce uniqueness, membership relationships, invitation
counters, same-class media/profile/section references and bounded metadata.
Authorization lives in server-side services; React visibility is not the security
boundary. Class row locks serialize authorization-sensitive operations, and
version checks reject stale saves.

The directory named `publication` implements profiles, media and drafts. Its name
does not mean publishing has been implemented. Voting, results, moderation
queues, immutable published snapshots, guest sharing, graduation mode, alumni
events, notifications beyond identity email and payments remain future work.
The Project Bible still governs their order. Native apps were added through the
user's explicit scope change.

## 3. Security controls already present

- Exact configured Origin checks, cross-site Fetch Metadata rejection and JSON
  mutation requirements; SameSite=Strict cookies, HttpOnly, Secure in production.
- Authenticated server-side tenant/role checks. Nonmembers generally receive 404;
  guests are excluded from profiles, directories and private draft content.
- Strict Zod bodies, bounded strings/pagination, UUID validation, parameterized
  Prisma/tagged SQL and escaped React rendering.
- Image signatures, declared byte count and decoded metadata checked; JPEG/PNG/
  WebP only; animation rejected; maximum 8 MB input, 16 million input pixels,
  128-pixel minimum dimension and 8192-pixel maximum dimension; orientation
  normalized, metadata stripped, output resized to 2400 pixels and re-encoded.
- Authorization precedes upload buffering. Four upload requests and two image
  decoders are permitted concurrently per API process, with an upload deadline.
- Private storage and generated internal object keys. No user URL ingestion or
  arbitrary storage-key API was found in reviewed media flows.
- Request IDs, no-store API responses, Helmet headers and sanitized errors/logs.
- Integration tests cover cross-school/class access, guest/removed members,
  privilege escalation, CSRF, token replay, reset/login races, invitation races,
  private contacts, malicious images, stale updates and database constraints.

These controls substantially reduce common risks. They do not prove the absence
of vulnerabilities, and API Helmet headers do not establish the headers served
by a future web CDN or mobile WebView.

## 4. Verification and delivery evidence

| Evidence                            | Result and interpretation                                                                                                                                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Earlier local full checks           | The redesign report records 14 API unit tests, 20 web tests, 32 integration tests and 16 browser tests passing before the native/settings follow-up. Historical evidence, not rerun today.                           |
| Final native/settings follow-up     | 4 web test files, 27 tests passed; repository lint passed; web TypeScript/Vite and Android Gradle build passed; APK installation returned Success and activity launch returned Status: ok.                           |
| iOS                                 | Project generated and synchronized only; no macOS/Xcode build, physical-device authentication or upload verification.                                                                                                |
| Pushed commit CI                    | Failed at `npm run format:check`: `scripts/mobile.mjs`. Installation, migrations, storage initialization and lint passed. Typecheck, unit/integration tests, build, browser tests and dependency audit were skipped. |
| Current full dependency audit       | 11 affected package entries: 1 critical, 3 high, 7 moderate. Entries include transitive parent packages, not 11 independent exploitable bugs.                                                                        |
| Current production-dependency audit | 6 affected package entries: 1 critical, 1 high, 4 moderate. Actual runtime reachability requires separate assessment.                                                                                                |
| Current review                      | Source, schema, security notes, native configuration, audit output and GitHub CI inspected. No attack traffic/load tests or fresh complete test suite run.                                                           |

CI: https://github.com/AlexandreC1/-anamnou/actions/runs/37360237608

## 5. Security risks and overlooked release gaps

Priority describes remediation order. Advisory severity is separately identified.
"Confirmed" means a code/configuration condition was observed, not that a breach
or exploit was demonstrated. Some risks below were already documented but remain
unresolved; others were not clearly captured in the earlier delivery report.

### R1. Credential exposure in tooling history — urgent

A literal GitHub personal access token appears in prior shell/approval history
supplied to this session. This is confirmed exposure in tooling context, not
evidence that the token was committed to this repository or is still valid.
The value has not been reproduced, validated or used for this review.

Action: revoke that token, review its scope and access activity, create a
replacement only if needed, and use the credential manager or a secure input
flow. Check shell histories and stored automation/approval records for copies.
A full repository-history secret scan remains unperformed. Removing a visible
copy alone is insufficient once a credential has been exposed.

### R2. Vulnerable dependencies and incomplete CI — release blocker

`proxy-addr` has a critical IPv4-mapped IPv6 trusted-proxy spoofing advisory.
The inspected app does not explicitly configure `trust proxy`, so the advisory
does not prove the present loopback configuration is exploitable. It matters
particularly when configuring production ingress and client-IP based controls.
Patch before enabling a reviewed proxy trust policy.

Runtime audit also reports high-severity `nodemailer` and moderate
`@nestjs/platform-express`, `multer`, `fast-uri` and `ip-address`. The current
media route uses express.raw rather than Multer multipart/disk handling; this
limits the directly observed Multer attack surface but does not make the
dependency audit clean. Sender/recipient inputs are bounded, which also affects
Nodemailer exploitability; upgrade and regression-test rather than assume safety.

Development/tooling findings additionally include high-severity `brace-expansion`
and `source-map-js`, and moderate Capacitor CLI/xcode/uuid dependency paths.
Do not automatically apply a CLI downgrade or `npm audit fix --force` suggested
by the resolver. Review compatible patched versions and existing overrides.

CI has an audit gate, but it is after earlier checks and was skipped on the
latest push. Make security auditing independently visible and require a fully
green commit before release. Prior clean-audit claims are historical snapshots.

### R3. Password hashing can consume resources before rejection — high

In `auth/service.ts`, `redeem()` computes the new Argon2 hash before checking
whether the reset token exists or is valid. A syntactically valid random token
therefore triggers expensive work before rejection. Registration/login also
perform memory-hard work without a bounded application hashing queue.
Each configured hash uses a 64 MiB memory-cost parameter. Per-IP request limits
help but do not establish a distributed CPU/memory budget.

Action: validate token eligibility before expensive hashing, preserve atomic
one-use redemption with a final transactional recheck, bound simultaneous hash
operations/queue length, and test invalid-token floods under resource limits.
Do not weaken Argon2 parameters to compensate for missing admission controls.

### R4. Account throttling can be weaponized; counters accumulate — high

`throttle()` increments an operation/email counter for every attempt, including
successful logins, and rejects after ten in a 15-minute window. Someone who
knows an email can consume that user's login allowance without knowing the
password. Requests with many different valid-shaped emails create persistent
AuthThrottle rows. No scheduled cleanup was found for these rows, expired
sessions or identity tokens.

Action: combine bounded account/IP/device controls and progressive delays,
preserve uniform recovery responses, and avoid easy attacker-controlled blanket
lockout. Add bounded TTL cleanup and resource budgets. OWASP explicitly warns
that account lockouts can become denial-of-service mechanisms.

### R5. Single-process abuse controls and unlimited retained uploads — high

The Express rate-limit stores and upload/decoder counters are process-local.
Multiple replicas multiply those allowances; restarting clears IP limits.
No production ingress/trusted-proxy policy is established. Behind one proxy,
the default client-IP behavior can also unfairly group legitimate users.

The ten-unfinished-upload limit excludes READY media. A member/admin can keep
completing uploads; no retained-byte quota per user/class/school, daily upload
budget or media-download budget is present. School/class creation also has no
durable per-account quota. Cleanup is a CLI, not an observed scheduled service.

Action: define edge and shared admission limits, per-account/tenant byte quotas,
egress limits, connection/body deadlines and an idempotent cleanup schedule.
Measure actual memory use: raw buffering, decoding and full-byte download reads
can amplify the nominal file size. OWASP recommends limits for both uploads and
downloads.

### R6. School ownership and role authenticity are unverified — high

`SchoolsService.create()` immediately assigns school administration to the
creator. This is useful for prototyping but does not prove affiliation with a
real institution. A school administrator has class administration authority
across that school, so institutional ownership is a significant trust boundary.
Shared invitations can confer STAFF status without proving staff identity.

Action: distinguish an unverified workspace from a verified institution, define
ownership claims/approval/disputes and audit privileged provisioning. Restrict
who may issue staff/guest invitations or require approval where appropriate.
No existing-school takeover bypass was demonstrated. This is a trust/impersonation
gap, not a finding that tenants can read one another's private data.

### R7. Privacy, minors, reporting and moderation are incomplete — high

There is no implemented consent/age-related workflow, abuse-report queue,
moderation action lifecycle, appeal flow, account export/deletion, or reviewed
retention policy. Private defaults are helpful but do not address coercion,
harassment, unsafe uploads or a legitimate request to remove personal data.
Audit and ownership foreign keys also need a deliberate erasure strategy.

Action: define the intended audience/jurisdictions and obtain appropriate policy
review before real student onboarding; implement consent, reporting, scoped
moderation and export/erasure workflows. This review does not determine legal
obligations. Avoid expanding publication or voting exposure before these controls.

### R8. Privileged account and session controls are incomplete — high

No MFA, privileged step-up authentication, active-session listing/revoke-all,
session cap or idle expiry was found. Platform/school/class administrators have
high-impact capabilities. Existing password resets revoke sessions, which is a
good control, but ordinary stolen-session response remains limited.

Action: prioritize MFA and recent reauthentication for privileged operations,
device/session management, incident revocation and safe ownership transfer.
Make service-level audit records and alerts part of these operations.

### R9. External I/O is performed while database locks are held — medium

Email delivery holds a user row lock during SMTP send, inside a 20-second
transaction. Media storage put/get/delete operations also occur within class
transactions. Slow external services can retain locks and database connections,
block work for a class/user and amplify denial-of-service pressure. A crash after
SMTP send but before commit can produce an invalid link followed by a retry;
that limitation is already documented.

Action: design durable claim/lease jobs and bounded workers, move external I/O
outside long database locks, and finalize changes with idempotent transactions
and authorization/version rechecks. Preserve current race-safety guarantees.
Add retry budgets, dead-letter handling and queue-age alerts.

### R10. Recovery, monitoring and audit integrity are unverified — high

No automated production backup/restore drill, measured recovery objectives,
centralized error/abuse alerting, secret rotation procedure, or tested deployment
rollback was found in the reviewed repository. Application logs are deliberately
minimal, but failed authentication/authorization trends and queue health lack
an observed security-monitoring workflow. Database audit rows are not evidence
of a tamper-resistant archive or least-privilege audit writer.

Action: set RPO/RTO targets, encrypt database/media backups, perform restoration
drills, define retention/access for audit records, separate runtime/migration
credentials and alert on auth abuse, storage failures and stalled mail jobs.
Container-image security and actual hosted permissions remain unverified.

### R11. Native-client security verification is incomplete — medium/high gate

The HTTP bridge carries the configured Origin explicitly and uses the platform
cookie store. Origin is a browser CSRF signal, not proof of an authentic mobile
app; all server authorization remains necessary. No physical-device regression
was recorded for the complete login/reset/logout/upload/privacy flow. Release
cookie isolation/persistence, logs, WebView navigation/CSP, backup/restore,
screenshots/app-switcher privacy, signed builds and iOS behavior need review.

The configured logging behavior is debug-only; this is not evidence that release
builds leak credentials. Android backup is disabled and local HTTP permission
is scoped to the debug configuration. Verify the final release artifact rather
than rely on scaffold defaults. App attestation is optional defense-in-depth,
not a replacement for sessions, tenant checks or rate limiting.

### R12. Mutable drafts cannot satisfy publication guarantees — future blocker

There is no immutable snapshot entity or publication lifecycle today. Cleanup
only considers current profile/section references. A future published book must
not lose photos when someone changes their live profile or deletes draft media.

Action: introduce versioned snapshot content/media references and retention before
building publish. Restrict deletion against published references; corrections
create new versions. Keep historic books separate from living alumni profiles.

## 6. Recommended backend architecture

Keep one modular NestJS service with PostgreSQL as the source of truth and private
object storage for normalized media. Reuse the existing identity and class-access
boundaries. Organize business domains as identity, schools/classes, profiles,
media, yearbooks, moderation, voting, notifications/jobs and operations.

Use a worker process for scheduled/durable jobs when introduced. The existing
database outbox can evolve into leases/retries/dead letters. Add a shared limiter
or queue infrastructure only when the deployment/concurrency requirement is
defined. Avoid adopting microservices or replacing authentication as a first step.

Maintain a deployment-specific origin/proxy policy for web and native clients,
database least privilege, private storage policy, strict API schemas and a clear
tenant/role permission matrix. Authorize media before issuing any short-lived
delivery capability if moving from proxy reads to signed URLs.

## 7. Ordered delivery plan

| Milestone                       | Work                                                                                                                                                                                        | Exit criteria                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A: restore release confidence   | Revoke exposed token; repair formatting; review/patch dependency paths; run audits independently in CI; pin CI actions by reviewed commit; inspect credentials and deployed configuration   | Rotated credentials; full green CI on exact release commit; no unreviewed critical/high runtime findings; documented reachability decisions for remaining advisories |
| B: identity and abuse hardening | Bound Argon2 concurrency; early reset-token eligibility check plus atomic recheck; redesign account throttling; trusted-proxy/edge/shared limits; active-session management; privileged MFA | Tests for invalid-token floods, attacker lockout, proxy spoofing, multi-instance limits and session revocation; measured resource budgets                            |
| C: tenant trust and privacy     | Verified school ownership states/claims; privileged role provisioning; staff-invite policy; consent and data minimization; report/moderation workflow; export/deletion/retention rules      | Explicit permission matrix; scoped moderation audits; erasure and cross-tenant tests; reviewed student onboarding policy                                             |
| D: media and operations         | Persistent byte quotas; upload/download admission limits; asynchronous I/O with leases; cleanup scheduling; bounded expired-auth cleanup; monitoring and recovery                           | Quotas hold under concurrency; job retries are safe; backup restore drill succeeds; storage/queue/auth alerts exercised                                              |
| E: Phase 4 voting               | Safe category templates; member eligibility; open/close rules; unique category/voter database constraints; moderation and results visibility                                                | Concurrent duplicate votes fail safely; cross-class voting denied; closed rounds immutable; privacy/moderation acceptance tests                                      |
| F: Phase 5 publishing           | Review state; idempotent publish; immutable snapshot manifest/content/media references; versioned corrections; reviewed class/guest sharing and revocation                                  | Live profile edits do not alter history; referenced media survives cleanup; unauthorized publication/guest reads denied; concurrent publish is retry-safe            |
| G: controlled pilot             | Production HTTPS/SMTP/storage/DB; observability; documented rollback; signed Android/iOS builds; independent security review                                                                | End-to-end representative class journey passes on web and physical devices; production restoration and incident exercises completed                                  |

Milestones A-D come before exposing a broad student pilot. E-F complete the
graduating-class MVP. Graduation, memories, alumni events and monetization follow
the Bible once that core is reliable. This is sequencing, not a fixed timeline;
hosting, audience, moderation staffing and ownership verification affect effort.

## 8. Exact next backend task

Start with Milestone A and the high-priority identity resource controls in B.
Do not start voting or publication implementation while CI/audit and credential
exposure remain unresolved. Create small reviewable changes: release verification,
dependency upgrades, then hashing/throttle controls. Each should have meaningful
behavior tests and its own security review.

Suggested acceptance checklist:

1. No exposed active credential remains in the reviewed tooling/history.
2. Linux CI completes typecheck, unit/integration/browser tests, build and audit.
3. Reset requests with nonexistent tokens avoid expensive password hashing.
4. Hash concurrency is bounded under both single-IP and distributed requests.
5. An attacker cannot trivially consume a known account's entire login budget.
6. Shared limits and trusted-proxy rules work on the chosen production topology.
7. READY storage quota and auth/media cleanup are demonstrably bounded.
8. Privileged sessions and school ownership have explicit threat-model decisions.

## 9. Review commands and limitations

Read-only inspection used `git status`, source/schema/test/document searches,
`npm audit --json`, `npm audit --omit=dev --json`, `gh run list`, `gh run view`
and the failed CI logs. Raw audit files are ignored under `.tools` and contain
dependency data. This report is the only repository file added by this review.
Historical successful checks are labeled separately from today's inspection.
No vulnerability was exploited and no stored user data was inspected.

Not established: actual public hosting/TLS/headers, database role privileges,
storage encryption/IAM, secret rotation state, backup reliability, branch
protection, native release behavior, production SMTP reputation, or absence of
secrets across all Git history. Existing security documents acknowledge many
of these operational gates; they were deferred rather than all being overlooked.

## 10. Sources

- Local implementation: `apps/api/src/app.ts`, `auth/security.ts`,
  `auth/service.ts`, `auth/controller.ts`, `auth/delivery.ts`, `classes/access.ts`,
  `classes/schools.ts`, `classes/invitations.ts`, `publication/media.ts`,
  `publication/image.ts`, `publication/cleanup.ts`, `publication/yearbooks.ts`,
  `storage.ts`, `config.ts`, `prisma/schema.prisma` and migrations.
- Existing `docs/security/*`, `docs/development/prism-redesign-report.md`,
  `.github/workflows/ci.yml`, native configuration and test sources.
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): throttling, attacker-induced lockout, MFA and sensitive-operation reauthentication.
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): validation, authorization and storage/upload/download resource limits.
- [proxy-addr advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h): affected trust-subnet behavior; applicability depends on configuration.
- Exact package advisory details were obtained from the npm registry audit on the review date; re-audit after changes because advisory state is time-dependent.
