# ADR 0012: scoped governance grants and review queue coverage

Status: accepted implementation direction, October 6, 2026. Security review is required before merge.

## Context

Claude Code completed authenticator MFA and login hardening through d96973d. The next milestone in the universal governance standard is shared review responsibility. Existing PLATFORM_ADMIN and SchoolAdmin privileges do not express consent, safeguarding, privacy or audit duties, expiry, or independent approval.

## Decision

Add a Governance module to the existing NestJS monolith. Schools remain the tenant boundary; do not create a competing Organization hierarchy. Introduce immutable-role GovernanceGrant records and ReviewQueue configurations. Supported grant roles are QUEUE_MANAGER, CONSENT_REVIEWER, SAFEGUARDING_REVIEWER, PRIVACY_REVIEWER and AUDITOR.

An MFA-authenticated platform administrator requests a grant. A different MFA-authenticated platform administrator approves it with password/factor reauthentication and an audited reason. The recipient cannot approve their own grant. Requesting one's own grant is allowed, but independent approval is still necessary. Expiry is one to ninety days as an operational default. An expired ACTIVE record grants no access and must be revoked before replacement. Revocation is immediately effective and can be done by one authorized platform administrator; reducing access does not need a second approver.

School-scoped QUEUE_MANAGER grants authorize queue configuration. PLATFORM_ADMIN alone can inspect grant/queue configuration and administer grants, but does not confer queue management or case-content privileges. Every governance operation except viewing one's own grant history requires an MFA-verified session and an active verified account. Session expiry and idle thresholds remain enforced by the identity layer; privileged configuration mutations require fresh factor reauthentication. Mutation endpoints require the current password and a fresh authenticator or recovery code using the existing MFA service. No new cryptographic implementation or dependency is introduced.

Each queue has two different people with active, matching-role grants in the same school. Consent, safeguarding and privacy are supported queue types. Composite foreign keys enforce school and recipient ownership, CHECK constraints enforce distinct reviewers and approval actors, and a partial unique index prevents duplicate ACTIVE grants for a recipient/role/school. Roles cannot be edited through this API. All grant and queue mutations lock the school row; reads use a shared lock. Queue reassignment requires its current version and increments it. These locks also serialize grant revocation against queue reconfiguration.

Queue reads calculate coverage from grant expiry/revocation, account status and MFA enrollment. Uncovered queues remain visible to authorized operators for correction. Coverage does not imply human availability or on-call attendance. No automatic case processing is enabled by this milestone.

## Consequences and limits

Two MFA-enrolled platform administrators are necessary to provision grants. Provision initial platform administrators through a separately reviewed and audited operational procedure. This milestone does not implement administrator bootstrap or recovery; no public first-admin or privileged self-registration endpoint is added. Reviewer affiliation/authorization is reviewed by operators; merely entering a user ID does not prove institutional affiliation.

Queue configurations are metadata, not case permissions. The later case module must additionally enforce assignment, conflict, evidence access, jurisdiction policy, appeals, escalation and actor separation. Automated fallback routing, scheduling, evidence storage, participant consent and privacy fulfillment remain separate milestones. This backend milestone provides API endpoints; an operator-facing governance UI is still needed.

Audit rows contain actor/target IDs and decision reasons, not factor codes, passwords or submitted evidence. Use reasons without personal details or credentials. Append-only/tamper-resistant audit infrastructure remains a production requirement.

## Verification

The integration scenario exercises real HTTP, MFA recovery-factor step-up, PostgreSQL grants, self-approval denial, concurrent approvals, cross-school denial, missing MFA, distinct reviewers, expired/revoked coverage, optimistic reassignment conflicts and database constraint bypass attempts. Run the complete repository check and dependency audit before delivery.
