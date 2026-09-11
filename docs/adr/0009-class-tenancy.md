# ADR 0009: Schools, class permissions and invitation acceptance

Status: Accepted for Phase 2.

School and class slugs are generated on creation when omitted. The UI asks for
names, not internal address identifiers. API callers may explicitly supply a
validated slug. Names remain editable without changing these stable identifiers.

The Phase 1 repository is a working React/NestJS modular monolith with opaque
sessions, PostgreSQL/Prisma and local SMTP. Preserve it and add a class module.
No yearbook/profile/media implementation belongs in this phase.

A verified user may create a school workspace and becomes its school
administrator. This creates a private workspace; it does not verify an official
relationship with a real school. Existing school workspaces may only be changed,
or have classes added, by their school administrators. A class creator becomes
its first class administrator. School administrators may manage classes within
their school. Platform administrators have explicitly checked administrative
access. School memberships and class memberships are distinct.

Class roles are MEMBER, CLASS_ADMIN, STAFF and GUEST. Active non-guest members may
read the directory; guests may read class metadata only. Directory responses
contain display names, membership IDs, roles and membership dates, never account
emails or private account fields. Administrators may also view removed memberships.
Removal disables access; an invitation cannot reactivate a removed member. Only
an administrator can restore membership. The last active class admin cannot be
removed or demoted. School-admin transfer is deferred; no endpoint modifies it.

Invitations grant MEMBER, STAFF or GUEST, never administrator privileges. Link and
QR encode the same random 128-bit hex code in a URL fragment. Only its SHA-256 hash
is persisted. The raw code is shown once at creation. Links require explicit
acceptance by a verified signed-in account. Expiration, revocation and maximum
uses are enforced in a transaction; class and invitation rows are locked in that
order. A unique acceptance record makes retries idempotent even after expiration.
An existing member is never promoted by accepting a different invitation.

Class mutations serialize on the class row and recheck current roles while holding
the lock. Reads use a transaction with a shared class lock to prevent membership
revocation racing the authorization check. School writes lock the school row.
Database constraints enforce unique memberships, acceptance, school/class slugs,
foreign keys and bounded invitation counters. Audit entries are committed in the
same transaction with school/class references, actor, action and target. No tokens
or email addresses enter metadata.

Lists use page (default 1) and pageSize (default 20, maximum 50), with bounded page
numbers, stable ID ordering and hasMore. No unbounded directory or invitation API.
There is no delete endpoint; membership removal and invitation revocation are
explicit status changes. School/class archival and erasure need a later retention
decision; foreign keys restrict accidental destructive deletion.

Local verification screens link to Mailpit only when built for non-production
with the local SMTP host/port. Verification is never bypassed. External mailbox
delivery requires an explicitly configured SMTP server; no SaaS is required locally.
