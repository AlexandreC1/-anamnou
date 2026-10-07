# Review team operator interface

The governance APIs now have an interface at `/settings/governance`, linked
from the signed-in account page. English, Haitian Creole, French and Spanish
copy is included. Code participates in intent preloading; private data remains
uncached. Existing authorization rules are preserved. School list responses now include a live permission summary; no database records or schema were changed.

## Behavior

- Personal history shows pending, active, expired and revoked grants, with
  shortcuts into the school scope and periodically refreshed expiry labels.
- MFA platform administrators can propose, independently approve and revoke
  school-scoped grants. Approval is hidden for the proposer and recipient;
  existing server checks remain authoritative. Decisions require a reason.
- Scoped queue managers can create queues and reassign primary/backup reviewers.
  Updates send the displayed version. Reviewer suggestions use the current grant
  page; known IDs can also be entered. Platform status alone does not manage queues.
- Coverage distinguishes missing primary and backup authorization and explicitly
  does not establish online/on-call presence. School grant and queue lists support
  separate cursor pagination and refresh.
- Each change requires password and second-factor confirmation. Credential
  fields clear after every submission, including rejection; they never enter
  React state or persistent storage. Non-secret drafts survive failure. Forms
  prevent duplicate submissions, cancel on unmount, show errors and conflict
  refresh, and announce success only after the server confirms the change.

No real administrators were provisioned or role grants assigned. Initial
independent administrators and MFA enrollment require the existing reviewed
provisioning procedure. Security review remains required before merge.

## Verification

Frontend tests cover expired history, self/recipient approval suppression,
independent approval visibility, platform/queue privilege separation, cleared
credentials after denial, retry, and stale queue version handling. Real-server
desktop/mobile identity journeys visit personal history and check that an
ordinary account has no queue creation controls. Existing HTTP/database tests
continue to cover governance authorization and tenant isolation.

`npm run check` passed with 20 API unit tests, 39 frontend tests, 37 integration
tests, 20 desktop/mobile browser tests, lint, formatting, type checks and builds.
After the final account-ID label was added, frontend tests, lint, formatting and
the frontend build were repeated. `npm audit --audit-level=high` reported zero
vulnerabilities. Local web and proxied API readiness returned 200 after restart.

## Limits and next work

This configures review teams; it is not consent case processing or proof of
legal compliance. Operators currently need known school/account/grant IDs.
Human-friendly lookup needs a separately authorized scoped directory design;
no global person search was added. Personal history is limited to the latest
fifty grants by the existing API; school lists are paginated. No presence or
automated fallback routing is claimed.

Queue controls use the server-computed `permissions.manageQueues` summary, so management does not depend on an older grant appearing in the bounded personal history. The existing session, MFA, school scope and expiry checks are applied before this summary is returned. Backend permission checks still run on every mutation.
Privileged operator behavior is covered by frontend behavior tests and real
HTTP/database integration tests; the browser journey covers an ordinary account.
Native-device governance behavior has not been verified in this milestone.

Next: immutable jurisdiction-policy versions, case assignment and conflicts,
participation authorization with server-enforced restrictions, independent
appeals, protected evidence and privacy fulfillment. The minors pilot is not
launch-ready while these requirements remain open.

Changed: `apps/web/src/GovernanceSettings.tsx`, `governance-copy.ts`,
`GovernanceSettings.test.tsx`, `App.tsx`, `Identity.tsx`, `route-preload.ts`,
`prism.css`, `tests/e2e/identity.spec.ts`, and this report. No database migration
or backup is required for this change. Additional files: `apps/api/src/governance/service.ts`, `apps/api/test/governance.integration.ts`, and `docs/api/governance.md`.
