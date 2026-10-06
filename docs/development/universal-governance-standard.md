# Anamnou universal governance and safeguarding standard

Status: architecture and implementation requirements, October 6, 2026. This supersedes the single-system-administrator review model in the earlier delivery report. Haiti remains the first pilot, not the boundary of the product. These controls are planned unless explicitly identified as already implemented in the hardening report. This is an internal product standard, not an international certification or a declaration of worldwide legal compliance.

## Universal foundation with jurisdiction-specific policies

Apply privacy, safety, accessibility, tenant isolation and user rights throughout the product, across schools, universities, alumni groups and other approved educational organizations. Support adults, minors, guardians, staff, guests, administrators and mixed-age cohorts. Organization type must not weaken the baseline safeguards.

Every deployment requires an accountable organization, assigned operational teams and reviewed jurisdiction profiles. Profiles specify applicable ages and authorization rules, notices and translations, lawful processing grounds, retention, transfer/residency requirements, rights deadlines, reporting duties and escalation contacts. Do not assume consent is the legal basis for every purpose or that school approval replaces guardian authorization. Unknown or conflicting jurisdiction requirements pause the affected processing or feature while a qualified reviewer resolves them; they must never silently choose the easiest policy. The platform safety floor cannot be weakened by an organization administrator.

## Responsibilities and separation of duties

| Role                                  | Scope and responsibility                                                         | Boundary                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Accountable platform operator         | Own policy, resources, contracts and service-level commitments                   | Accountability belongs to an organization, not an unattended administrator account |
| Organization administrators           | Verify institutional affiliation and manage approved staff and workspaces        | No automatic access to guardian evidence or platform-wide user data                |
| Consent/participation reviewers       | Review authorization evidence and purpose-specific participation requests        | Cannot approve their own submission or a case in which they have a conflict        |
| Safeguarding and moderation team      | Triage reports, protect users and handle escalations                             | Access only assigned cases and necessary evidence                                  |
| Privacy team                          | Validate and fulfill access, export, correction, withdrawal and erasure requests | Cannot use requests to export an entire unrelated class                            |
| Security and operations team          | Handle incidents, keys, service health and recovery                              | Infrastructure privileges do not grant routine access to student content           |
| Independent appeals reviewers         | Review challenged decisions                                                      | Must differ from the original decision maker                                       |
| Auditors                              | Review access, decisions and policy adherence                                    | Read-only, minimized evidence; no ability to approve or alter cases                |
| Students, adult members and guardians | Submit requests, control permitted sharing and exercise their respective rights  | Guardian authority is verified and scoped, not unrestricted surveillance           |

Assign at least a primary and backup authorized responder to each operational queue. A small organization can use a shared service or contracted reviewers; it must still supply independent reviewers when required. The same person may hold compatible roles, but conflicting roles cannot be exercised on the same case. Shared passwords and generic shared administrator identities are prohibited.

Routine cases need an authorized reviewer. Elevated access grants, policy exceptions, sensitive bulk exports and irreversible administrative operations require two distinct authorized people. Do not impose two-person approval on every routine withdrawal or deletion request: it must not become a barrier to user rights or cause missed deadlines. Urgent protective restrictions may happen immediately with a recorded reason, expiry and subsequent independent review. Emergency access is temporary, narrowly scoped and audited.

## Requests and case handling

Use a common case framework with separate workflows for institutional verification, participation/authorization, abuse reports, privacy requests, appeals and security incidents. Cases belong to tenant-scoped queues with assignment, backup coverage, priority, conflict checks, time limits, escalation and reassignment. Every action uses the actual actor identity; queue ownership never expands data permissions.

Typical flow: submitted → triaged → assigned → evidence requested/reviewed → decision or fulfillment → notification → appeal where applicable → closure. Withdrawals, immediate safety restrictions and rights requests have purpose-specific transitions. A closed case cannot silently be rewritten; corrections create a new recorded event.

Participation authorization must record purpose, policy/notice version, subject, authorized party where required, evidence reference, reviewer, dates, expiry and withdrawal. Student assent, guardian authorization and institutional authorization are distinct records where applicable. An invitation is not consent. Pending authorization must block the affected content access, upload and sharing operations server-side. Ordinary class administrators cannot reactivate a restricted participant to bypass review. Adult participation and reaching adulthood require appropriate policy transitions, not an arbitrary universal age assumption.

Report handling supports confidential submissions, anti-retaliation measures, evidence preservation and restricted access. Clearly explain limits on confidentiality. Automated tools may prioritize cases or impose reversible protective limits; significant disputed decisions need human review and an independent appeal. External reporting follows the reviewed jurisdiction profile and approved operational procedures.

## Privacy, permissions and resilience

- Private defaults; separate profile, contact, photo, guest and public-sharing permissions. Explain changes in accessible, age-appropriate language.
- Minimize age and identity information. Do not routinely collect exact birth dates or identity-document images when less intrusive assurance meets the assessed need.
- Role grants include organization/class/case scope, expiry and grantor. Combine roles with resource attributes and case state; deny access by default. Tenant membership alone does not grant review privileges.
- Require MFA and recent reauthentication for sensitive work. Revoke access promptly after role loss, affiliation loss or incidents. Perform periodic access and conflict reviews.
- Encrypt sensitive evidence separately, isolate storage access, log evidence reads and downloads, prohibit public links and prevent personal data appearing in ordinary logs.
- Export only the validated subject's data. Erasure covers live databases, media, derivatives and downstream systems; retained audit evidence, backups and legal holds follow reviewed policies and explicit user communication.
- Maintain append-only decision/access events with controlled retention and tamper detection. Evidence must not be copied into every audit entry.
- Define monitored response targets, escalation coverage, incident procedures, backup recovery objectives and independently tested restoration. Timeouts route work to another responder rather than leaving it attached to an absent person.
- Test localized notices, accessible forms, keyboard/touch support, limited bandwidth and support alternatives. Include affected users in risk and usability assessments.

## Backend implementation plan

Keep the NestJS modular monolith. Add authorization, governance, safeguarding and privacy modules with explicit transaction boundaries and durable workers. Keep user authentication separate from governance permissions.

Proposed entities: Organization, JurisdictionPolicyVersion, RoleGrant, ReviewQueue, QueueMembership, Case, CaseAssignment, CaseEvent, EvidenceReference, ParticipationAuthorization, Approval, Appeal and PrivacyFulfillment. Reuse existing School/Class relationships with explicit migration mappings; do not introduce parallel tenants without an approved migration design.

Enforce foreign keys and tenant ownership, unique active assignments, idempotent submissions, valid state transitions, distinct reviewers for required approvals and optimistic concurrency. Store policy versions as immutable records. Changing policy creates a version and a reviewed migration/re-authorization plan. Evidence references must resolve through authorized private storage, not arbitrary remote URLs.

Implement in order:

1. Scoped roles, MFA, queue membership, assignment, backup coverage and access audits.
2. Versioned jurisdiction policies and participation authorization with enforced pending/withdrawn restrictions.
3. Reporting, safety actions, conflict checks and independent appeals.
4. Subject-scoped export, erasure, retention/hold handling and durable fulfillment jobs.
5. Operational dashboards, alerting, audit review, recovery drills and organization onboarding gates.

Acceptance tests must include cross-tenant/case access, self-approval, same-person dual approval, conflict-driven reassignment, absent reviewers, expired role grants, concurrent decisions, guardian authority mismatch, mixed-age cohorts, policy changes, withdrawal during upload, bulk-export restrictions, erasure retries, independent appeals and outage recovery. Verify the full browser/API/database/storage flow. Existing PLATFORM_ADMIN alone must not be treated as fulfillment of this design.

## Standards references and interpretation

This design draws on the [NIST Privacy Framework](https://www.nist.gov/privacy-framework/using-privacy-framework-11) for organizational responsibilities and risk governance, [UNICEF industry guidance](https://www.unicef.org/documents/guidelines-industry-child-online-protection) for child online protection, and the [ICO Children's Code](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/) as a privacy-by-design reference. The ICO code is UK-specific; citing it does not make it applicable law in Haiti or every country. The role matrix, approval thresholds and rollout order above are Anamnou design decisions, not claims that these sources prescribe one worldwide implementation.
