# Phase 2 security review

- Existing verified sessions gate every school/class/invitation API.
- Class reads hold a shared class lock through authorization and data selection;
  class mutations hold an exclusive lock and recheck current membership/role.
- Nonmembers receive 404; guests cannot read member directories. Neither directory
  nor invitation metadata exposes account email, password hashes or token hashes.
- Parameterized SQL is used for row locks; strict bodies and bounded pagination
  reject injected tenant IDs, role grants, unknown fields and malformed IDs.
- Invite role grants exclude admins at both validation and database layers.
  Maximum uses and acceptance uniqueness have database constraints. Concurrent
  joins and last-admin demotions are explicitly tested against PostgreSQL.
- Revoked or expired links cannot enroll new members. Retried successful acceptance
  does not consume another use. Removal prevents old/new invitation re-entry.
- Mutations use the existing exact-Origin/JSON CSRF policy and rate limits.
  Protected inputs render as React text; no HTML injection is used. QR generation
  runs locally and loads no remote URL, eliminating a QR-service SSRF path.
- Audits contain actor, target, action, class/school, timestamp and role-change
  before/after metadata; secrets are excluded. New audit/tenant foreign keys restrict
  accidental erasure. Retention/export/erasure workflows remain future work.
- Public registration/recovery responses remain uniform for unknown/existing
  accounts. UX says request received rather than claiming delivery or eligibility.
- Local demo credentials are random, ignored and never logged; verified demo
  fixtures are available only through an explicit development-only seed command.

Before production release, review real school ownership/consent workflows, backup
restoration, public SMTP delivery and deployment configuration. This phase does
not establish those operational gates or claim production release readiness.
