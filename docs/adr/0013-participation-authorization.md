# Participation authorization before production content access

Status: implemented foundation, pending release review. November 23, 2026.

## Problem

An invitation and class membership did not establish a reviewed basis for
participation. Review-team configuration alone did not restrict class content,
profiles or media. This was a launch blocker for the intended mixed-age pilot.

## Decision

Production class authorization now additionally requires an unexpired APPROVED
participation authorization under an independently approved, unexpired school
policy. Platform and school administration do not bypass this content gate.
Policy proposals and independent approvals require platform authority, MFA and
password/second-factor step-up. Approved policy content cannot be updated in the
database; changes require a new version. Existing authorizations are pinned to
their version until expiry or withdrawal rather than silently changing consent.

Members read the institution's notice and request a review through their own
account. This is a request, not automatic consent or an assertion of adulthood.
Requests are assigned to a consent queue with distinct, currently authorized
primary and backup reviewers. Only current reviewers for that assigned queue can
inspect its requests or decide them. Reviewing one's own participation is denied.
Policy reference, authorization basis, reviewer, expiry, version and withdrawal
are recorded. A decision records SELF, GUARDIAN, INSTITUTION or COMBINED basis.
The reviewer must independently verify which authorization is required and the
protected institutional evidence; the software does not infer law or age.

Class row locks serialize participation changes against profile edits, media
finalization and class reads. School locks serialize decisions with reviewer
grant revocation and queue changes. Versions reject stale/concurrent decisions.
Withdrawal needs no reviewer approval, password re-entry or MFA escalation.
It immediately denies subsequent class content access and excludes the subject's
profile and owned media from sharing. Downloads recheck after storage I/O.
This cannot revoke previously downloaded copies or remove people depicted in
someone else's group photo; those require the reporting/privacy process.

Separate participation events retain previous request/decision/withdrawal versions,
including protected review references. Routine audit metadata omits those references.
No endpoint serves evidence files or arbitrary URLs. No legal documents or exact
birth dates are collected by this milestone. Evidence remains in the institution's
protected review system; arbitrary remote URLs are rejected as record references.

Development/test fixture classes without authorization records retain their
existing behavior. Production always enables the gate through both class and
publication module composition. Explicit pending, denied, expired and withdrawn
records are restricted in development too. No runtime production bypass switch
was introduced.

## Limits

This is not the complete universal safeguarding standard. It does not verify
guardian identity, supply jurisdiction rules, conduct institutional legal review,
provide independent appeals, store protected evidence, fulfill erasure requests,
schedule absent-reviewer escalation or establish legal compliance. Policy and
queue provisioning must precede real enrollment; no live operator or reviewer
was invented or provisioned. A policy's review reference is an auditable human
attestation, not evidence that this software verified a jurisdiction's law.

Account creation, class creation, membership acceptance and own participation
status remain available before approval; class content and uploads do not.
These preliminary records also need an appropriate notice and operator-approved
processing basis before public enrollment. Retention and deletion processes must
be completed before the minors pilot is considered ready.

## Verification

Real HTTP/database integration runs application composition in production mode
against the isolated test database. It covers denied class/admin/platform access,
uploads before approval, independent policy approval, immutable policies,
cross-subject/cross-school denial, concurrent reviewer decisions, withdrawal,
hidden profiles and reader entries, membership-reactivation bypass attempts,
expired backup coverage and retained decision events. Frontend behavior tests
cover reviewed-policy selection, withdrawal acknowledgement/failure and missing
policy states. See the release work report for final command results.
