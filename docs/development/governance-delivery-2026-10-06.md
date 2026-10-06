# Governance foundation delivery, October 6, 2026

Continues Claude Code's committed work through `d96973d` on `feat/phase-3-yearbook`: authenticator MFA, per-address login throttling, Sharp 0.35.5 and repeated-logic cleanup. That baseline was clean and its GitHub CI passed (run 37520770391). No unpublished Claude edits were present when this work started.

## Implemented behavior

The existing NestJS/PostgreSQL application now exposes governance configuration APIs. Grant roles distinguish queue management, consent review, safeguarding review, privacy review and auditing. Grants are school-scoped and expire after one to ninety days.

An MFA-authenticated platform administrator proposes a grant; a different MFA-authenticated platform administrator approves it. The recipient cannot approve their own grant. A pending, expired or revoked grant does not confer permissions. Existing platform and school administrator roles do not automatically confer queue-management permissions. Grant recipients need active verified accounts with MFA enrollment. All configuration mutations require password and second-factor reauthentication through Claude's existing MFA service.

Queues have different primary and backup reviewers with matching active grants in the same school. Configuration changes use an explicit version and reject stale updates. Reads calculate current authorization coverage, including expired/revoked grants, disabled accounts and removed MFA enrollment. Coverage means authorization eligibility, not online presence or on-call availability. Uncovered queues remain visible to authorized operators so they can replace reviewers.

School-row locks serialize configuration changes; service transactions recheck session and account state. Composite foreign keys prevent cross-school reviewer assignments, CHECK constraints prevent same-person backup and self-approval, and a partial unique index prevents duplicate ACTIVE grants for a recipient/role/school. Queue roles are checked by the service; no grant-role edit endpoint exists. Configuration reads and changes produce audit events without passwords, factor codes or evidence payloads.

## Schema and operation

Applied additive migration `202610060004_governance` to development and isolated test databases after taking an encrypted database backup. It creates two enums and the GovernanceGrant and ReviewQueue tables, plus indexes, foreign keys and constraints. It does not alter existing sessions, users, memberships or yearbook data. A pre-existing Session UUID-default difference was deliberately excluded from the migration.

Initial platform administrators must be provisioned using a reviewed operational procedure and enroll MFA. Two authorized people are needed for grant provisioning. No public privileged bootstrap or recovery endpoint was added. No roles were assigned to real users by this migration.

API contract: [Governance API](../api/governance.md). Authorization/design decisions: [ADR 0012](../adr/0012-governance-grants-and-review-queues.md).

## Verification

The real HTTP/database integration scenario passed. It exercises independently approved grants, concurrent approvals, missing MFA, cross-school denial, duplicate reviewers, expired coverage, revocation, version conflicts and direct database constraint bypass attempts. `npm run check` passed: lint, formatting, types, 20 API unit tests, 30 UI tests, 37 integration tests, both builds and 16 desktop/mobile browser tests. `npm audit --audit-level=high` reported zero vulnerabilities. The pre-migration encrypted backup restored successfully into an isolated temporary database. After refreshing the local API, the web app and proxied readiness returned 200, and the unauthenticated new grant-history route returned the expected 401. Governance routes appear in the live `/openapi.json` document. Local review URL: http://127.0.0.1:3000/.

## Files

- apps/api/src/app.ts: register governance module alongside identity and classes.
- apps/api/src/governance/controller.ts: authenticated, validated, MFA-protected routes.
- apps/api/src/governance/module.ts: module/service registration.
- apps/api/src/governance/rules.ts: strict bounded input schemas.
- apps/api/src/governance/service.ts: grants, coverage, access checks, queue updates and audits.
- apps/api/test/governance.integration.ts: complete API/database authorization scenario.
- prisma/schema.prisma: grant and queue models with existing School/User relations.
- prisma/migrations/202610060004_governance/migration.sql: additive rollout and constraints.
- docs/api/governance.md: endpoint inputs, permissions and limits.
- docs/adr/0012-governance-grants-and-review-queues.md: architecture and tradeoffs.
- docs/development/governance-delivery-2026-10-06.md: this handoff.

## What remains

This milestone has configuration APIs, not an operator-facing governance UI or case-processing system. The immediate continuation is the operator interface: personal grants, administrative proposals/independent approval, scoped queue configuration and coverage warnings. Then implement case assignment and conflicts, independent appeal duties, jurisdiction policy versions, participation authorization, safeguarded evidence access, reporting and privacy fulfillment. Do not mistake a configured queue for a reviewed consent case or proof of legal compliance.

Automated fallback routing and escalation, audit tamper resistance, bootstrap/recovery procedures, production infrastructure/offsite recovery and signed native verification remain open. Existing Claude MFA remains intact; native MFA on Android/iOS is still not claimed as verified. Voting and publication remain outside this change. Security review is required before merge, as stated in AGENTS.md.
