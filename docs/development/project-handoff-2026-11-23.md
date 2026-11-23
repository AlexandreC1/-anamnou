# Product and engineering handoff, November 23, 2026

Workspace: `C:\Users\charl\-anamnou`. Branch: `feat/phase-3-yearbook`.
Repository: <https://github.com/AlexandreC1/-anamnou>.

## What the product does

Anamnou is a private digital yearbook platform for graduating classes, beginning
in Haiti. A representative creates a school and class, invites classmates by
link/code/QR, and coordinates profiles, graduation photos, quotes and class
content. Members help assemble a shared yearbook and read it on their phones.
The longer-term plan is to preserve an immutable graduation edition alongside a
separate living alumni space for later updates and reunions. Those later features
must not be described as delivered.

This is a collaborative publication and memory archive, not a general social
feed, school management system or shopping service.

## Existing implementation

- React/TypeScript/Vite web interface; NestJS API; PostgreSQL/Prisma migrations.
- Accounts, verification/recovery code paths, MFA, sessions, scoped authorization.
- Schools, classes, memberships, roles and invitation acceptance.
- Profiles, quotes, validated photo uploads, yearbook sections, editing and reader.
- Four interface languages: English, French, Haitian Creole and Spanish.
- Settings at `/settings` groups device language, appearance and account controls.
  Profile at `/profile` shows the verified email and saves the display name and
  preferred email language through the authenticated account API.
- Governance grants/queues, independent participation policy approval, assigned
  participation reviews, withdrawal and production content restrictions.
- Responsive interface and mobile packaging work; store-release readiness still
  needs verification.

Actual reader: `/classes/:id/yearbook`, reached through My Class, then a class's
Yearbook navigation. It requires appropriate class access. The homepage book is
an explicitly labeled sample, not a public class edition. It now toggles when
the book itself is clicked/tapped, with keyboard support and a hinged reverse
cover. One preview instruction sits below the illustration. My Class in the
main navigation leads to real class yearbooks.

## Actual deployment state

- Dedicated Neon project `anamnou-production`, database `yearbook`: 14 migrations
  applied, restricted runtime role separate from migration owner.
- Private Neon object storage bucket `yearbook-media`: live adapter round-trip
  verified. No Gidyo resources should be reused.
- Cloudflare Pages preview exists; backend connection is not enabled for launch.
- Render Free backend is a draft, not a deployed service. A local Linux container
  passed production-resource readiness at 512 MB / 0.1 CPU limits.
- Gmail sender was selected by the user. Its saved OAuth refresh credential
  currently fails with `invalid_grant`. Live recovery does not work yet.
  Once a provider accepts a message, a failure recording its receipt retries
  the database write without immediately revoking the delivered link. A longer
  database interruption can still cause a new link after the delivery lease
  expires. This change does not renew provider credentials.
- Budget is $0. Do not silently enable paid hosting, R2 or purchase a domain.

## Release blockers

1. Complete notices, reviewed participation rules and real operational coverage.
   The operator name supplied by the user is Anamomou org. The user volunteered
   as primary reviewer; an independent backup remains unfilled. Do not fabricate
   people, evidence or legal approval. Minors are included in scope.
2. Complete safeguarding reports, protected evidence/retention, independent
   appeals and subject-scoped privacy export/erasure fulfillment.
3. Finish durable email authorization and deploy the API. Verify real inbox
   delivery and registration, verification, reset and uploads end to end.
4. Finish safe voting/moderation and publication approval with an immutable
   historical snapshot. The current reader/editor does not establish publication
   readiness. Alumni/reunion features remain future work.
5. Verify production monitoring, automated backups/restoration, security review,
   accessibility/performance and mobile release packaging.

## Creator's design constraints

Use references as inspiration. The literal Plug campaign treatment was rejected.
No hanging retail tags, multicolor heading emphasis, italic slogans, repetitive
actions or filler copy. Keep plain, useful text, compact controls, clear create/
join/read paths and a book interaction that behaves like a book on phones.
Do not confuse a visual mockup with working data or launch readiness.

## Instructions for the next reviewer

Read `AGENTS.md`, `PROJECT_BIBLE.md`, `docs/ASTRA_ENGINEERING_CONTRACT.md`,
`.impeccable.md`, the release work record and ADR 0013 before changing code.
Inspect the actual repository and test results; independently verify each claim.
Separate release-critical work from future roadmap items. Preserve existing
security boundaries and the $0 budget. Do not weaken minors restrictions to
produce a working-looking demo. Security-sensitive work requires review before
merge. Never commit `.env`, `.tools`, credentials or generated output.

The product name is under discussion. The user prefers a simple direction such
as Playbook, Journal or Alumni. Do not mass-rename infrastructure until a name
is chosen and availability has been assessed.
