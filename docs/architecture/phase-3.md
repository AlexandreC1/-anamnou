# Current architecture: Phase 3

React 19 + React Router remain in `apps/web`; NestJS remains in `apps/api`.
The API is a modular monolith: identity, schools/classes/invitations and the new
profile/media/yearbook module. Services contain business rules; controllers parse
strict Zod inputs and delegate. Shared UI exists within the web app; no speculative
`packages/ui` or second frontend requires a workspace abstraction yet.

The `publication` module name groups preparation of the publication, not an
implemented publishing capability. It exports no publish/snapshot operation.

PostgreSQL/Prisma owns accounts, sessions, tenancy, drafts, profiles and media metadata.
MinIO stores normalized image bytes through `ObjectStorage`. Sharp is the only new
production dependency: a maintained native decoder/encoder is needed for signature,
dimension, metadata and full-decoding validation; handwritten image decoding would
be unsafe. Its platform binaries are locked through npm. Mailpit remains local email.

ClassAccess locks a class while checking school administration or active membership.
Profile/media own-write use cases explicitly opt out of the default admin-only write
gate and apply their own owner/purpose checks. Tenant composite foreign keys reinforce
these rules. Profile and draft versions implement optimistic concurrency inside the
same transaction. Draft section replacement preserves supplied owned IDs and order.

Uploaded originals are discarded after decoding. The API serves private normalized
WebP via session-authorized routes and checks current membership and profile visibility
on every request. This controlled proxy is the local access strategy; provider-signed
object URLs are not exposed. It allows immediate revocation and keeps browser code
independent of MinIO/S3. Published sharing/retention remains a Phase 5 decision.

The class route is role-aware: admins see real aggregate progress and management
actions; members see their contribution and reading actions. Optional profile/contact
sharing is explicit. The reader is labeled as a draft and uses paginated current
shared profiles. Four locales share component logic; content written by users is
not machine-translated.

The infrastructure, host processes, proxy, logging, health/readiness, isolated test
database and GitHub Actions remain unchanged. No new environment configuration is
needed. See [ADR 0010](../adr/0010-profiles-media-drafts.md),
[API contract](../api/yearbooks.md) and [security review](../security/publication-review.md).
