# Haitian Digital Yearbook Platform — Project Bible v1.0

This is the source of truth for product, UX, architecture, engineering, security, QA, monetization, and AI-assisted development.

## 1. Product Constitution

### Vision

Create the definitive digital yearbook platform for graduating classes, starting in Haiti and capable of expanding internationally. The yearbook is the commercial core and first product experience, then evolves into a living alumni memory space.

### Mission

Make the story of a graduating class easy to create, fun to explore, meaningful to preserve, and useful for reconnecting years later.

### North-star rule

Every major feature must preserve a memory, strengthen a class connection, or increase the value of the yearbook at graduation.

### Anti-goals

Do not become a generic social network. Do not optimize for addictive engagement. Do not depend on constant posting. Do not let novelty features overwhelm the yearbook.

### Primary users

Student/graduate; class president or class administrator; teacher/staff contributor; school administrator; invited family/guest; platform administrator.

## 2. Product Model

### Hierarchy

Platform → School → Graduating Class → Yearbook → Members → Content/Sections → Alumni Space.

### Class ownership

A class representative creates a class workspace and becomes an initial class administrator. Additional administrators can be assigned.

### Multi-school

One app serves many schools and many graduating classes. Data is isolated by authorization rules.

### Lifecycle

Draft → Collecting → Review → Published → Graduation Mode → Archived Snapshot + Living Alumni Space.

### Snapshot rule

The published graduation yearbook is an immutable historical snapshot. Post-graduation changes happen in the living alumni space, not by silently rewriting history.

### Invitations

Join by link, code, QR, or direct invitation. Joining requires explicit acceptance.

### Privacy

Private by default. The class controls visibility to classmates, guests, staff, and public visitors. Sensitive personal information is never required.

## 3. MVP Scope

### Goal

Prove that a class can collaboratively create a useful yearbook with minimal friction.

### Must include

Account creation/login; school/class creation; class admin role; invite link/code/QR; member directory; student profile; graduation photo; short bio; personal quote; class photo; basic theme; yearbook preview; basic superlative voting; admin moderation; responsive web.

### Exclude initially

Full messaging, complex social feed, live ceremony operations, advanced video editing, AI-generated biographies, marketplace, school ERP integration, native apps unless the web MVP proves demand.

### Success condition

A class representative can create a class, invite classmates, get meaningful profile completion, and publish a polished yearbook without developer intervention.

## 4. Feature System

### Class creation

School, graduation year, class name, motto, colors/theme, administrators, invite tools.

### Member profiles

Display name, graduation photo, optional nickname, short bio, quote, interests/activities, optional future aspiration, optional contact/social fields.

### Yearbook sections

Cover; class message; class photo; member pages; teacher/staff pages; superlatives; memorable quotes; galleries; acknowledgements; graduation details.

### Superlatives

Admin creates categories or templates. Members vote under configured rules. Results may be private, class-only, or published. Categories must not target protected classes, encourage harassment, sexualize minors, or humiliate members.

### Memory prompts

First-day photo, funniest class moment, favorite teacher quote, thing the class will miss, advice to future students, message to future self.

### Graduation mode

Ceremony-optimized yearbook, QR entry, roster, announcements, guest viewing, digital guestbook, optional slideshow.

### Alumni mode

Annual memory reminders, anniversary resurfacing, reunion planning, profile updates, class milestones, future-self time capsules, optional life updates.

### Media

Photos first. Video/audio later. Object storage, image processing, size limits, moderation, signed access URLs.

### Notifications

Sparse, meaningful notifications: invitations, completion reminders, vote lifecycle, publication, graduation anniversary, reunion invitations.

## 5. Retention Design

### Loop

Graduation creates the artifact → alumni receive meaningful memory resurfacing → members optionally update milestones → class plans reunions → the yearbook becomes more valuable.

### Annual memory moment

On the graduation anniversary, surface the historical yearbook and selected memories, with optional participation.

### Time capsule

Members can record future messages with explicit consent and clear retention/unlock rules.

### Reunions

Poll dates, attendance, venue details, RSVP, shared memories, optional event photos.

### No-feed principle

Do not require a TikTok-style infinite feed. The value is shared history, not endless scrolling.

## 6. UX / UI Direction

### Design language

Modern, warm, editorial, celebratory, premium. Avoid a childish school-app aesthetic.

### Metaphor

Digital publication + class archive + ceremony experience.

### Navigation

Home; My Class; Yearbook; Memories; Events/Reunions; Profile. Admins additionally get Manage.

### Core screens

Onboarding; Create Class; Join Class; Class Home; Member Directory; Member Profile; Yearbook Editor; Preview; Superlatives; Voting; Media Gallery; Publish; Graduation Mode; Alumni Home; Reunion Event; Notifications; Settings; Admin.

### Interaction

Obvious feedback, autosave where appropriate, recoverable errors, clear loading/empty states.

### Accessibility

Keyboard navigation, semantic labels, contrast, scalable text, reduced motion, descriptive media text, accessible forms.

### Mobile-first

Responsive web is mandatory. Graduation and profile experiences must be excellent on phones.

## 7. Recommended Stack

### Web

React + TypeScript + React Router. Vite is the default unless the repository has a sound reason to use another build system.

### Backend

NestJS + TypeScript.

### Database

PostgreSQL + Prisma migrations.

### Storage

S3-compatible object storage for photos/media; metadata stays in PostgreSQL.

### Cache/jobs

Redis only when a concrete need exists.

### API

REST + OpenAPI.

### Testing

Unit/integration + Playwright E2E.

### CI/CD

GitHub Actions for install, lint, typecheck, tests, build, and security checks.

### Observability

Structured logs, error tracking, health endpoints, request IDs, minimal product analytics.

## 8. Architecture Rules

### Domains

auth, users, schools, classes, memberships, yearbooks, profiles, voting, media, notifications, events, admin.

### Separation

UI must not contain database logic. Controllers/routes should delegate business rules to services/use-cases.

### Authorization

Deny by default. Every protected resource checks tenant and role permissions server-side.

### Ownership

Every class-owned entity has a clear ownership path back to a class/school.

### Idempotency

Invitation acceptance, publishing, notifications, and future payment operations must be retry-safe.

### Auditability

Log role changes, publishing, deletion, moderation, and critical configuration changes.

### Deletion

Document archival/soft-delete and permanent deletion rules explicitly.

## 9. Initial Data Model

### User

id, email, passwordHash/identity reference, displayName, avatar, status, createdAt, updatedAt.

### School

id, name, slug, logo, coarse location, status, timestamps.

### Class

id, schoolId, name, graduationYear, motto, themeConfig, status, createdBy, publishedAt.

### ClassMembership

id, classId, userId, role, status, joinedAt, visibility settings.

### Profile

id, membershipId, photoAssetId, nickname, bio, quote, activities, aspirations, visibility settings.

### Yearbook

id, classId, version, status, configuration, publishedSnapshotId, timestamps.

### YearbookSection

id, yearbookId, type, title, order, configuration.

### VoteCategory

id, classId, title, description, rules, status, opensAt, closesAt.

### Vote

id, categoryId, voterMembershipId, candidateMembershipId, createdAt; unique per category/voter.

### MediaAsset

id, ownerType, ownerId, storageKey, mimeType, size, width, height, status, createdAt.

### Invitation

id, classId, tokenHash, type, role, expiresAt, maxUses, usedCount, createdBy.

### Notification

id, userId, type, payload, readAt, createdAt.

### Event

id, classId, type, title, description, startsAt, location/details, createdBy.

### AuditLog

id, actorUserId, classId/schoolId, action, targetType, targetId, metadata, createdAt.

## 10. Core API Surface

### Auth

POST /auth/register; /login; /logout; /forgot-password; /reset-password; /verify-email.

### Users

GET /me; PATCH /me; POST /me/avatar.

### Schools

POST /schools; GET/PATCH /schools/:id; GET /schools/:id/classes.

### Classes

POST /classes; GET/PATCH /classes/:id; POST /classes/:id/invitations; GET /classes/:id/members; PATCH /classes/:id/members/:memberId.

### Profiles

GET /classes/:id/members/:memberId/profile; PATCH /classes/:id/members/me/profile.

### Yearbook

GET/PATCH /classes/:id/yearbook; POST /classes/:id/yearbook/publish; GET /classes/:id/yearbook/snapshot.

### Superlatives

POST/GET /classes/:id/superlatives; POST /superlatives/:id/vote; POST /superlatives/:id/close.

### Media

POST /media/upload-intent; POST /media/:id/complete; DELETE /media/:id.

### Events

POST/GET /classes/:id/events; POST /events/:id/rsvp.

### Admin

GET /admin/audit; GET /admin/moderation; POST /admin/moderation/:id/action.

## 11. Security & Privacy

### Authentication

Use Argon2id or appropriately configured bcrypt. Protect sessions/tokens against theft and replay.

### Authorization

Explicitly test cross-class and cross-school access and IDOR scenarios.

### Uploads

Validate file type/signature, size, dimensions, storage key, and processing status. Never execute uploaded content.

### Abuse controls

Rate-limit login, invitations, voting, uploads, and public endpoints. Add reporting and moderation.

### Minors

School-age users may be minors. Review consent, visibility, moderation, retention, and applicable law before launch.

### Data minimization

Collect only necessary data; optional fields must be visibly optional.

### Backups

Automated database backups plus restoration tests; redundant media storage.

### Secrets

Never commit secrets. Use environment variables or managed secret storage.

### Threat model

Review auth, authorization, IDOR, XSS, CSRF, SSRF, injection, upload abuse, privacy leakage, rate limits, account recovery.

## 12. AI Agent Operating System

### Rule 1

Every coding agent reads PROJECT_BIBLE.md before touching code.

### Rule 2

Inspect the existing repository before creating files or changing architecture.

### Rule 3

Make the smallest coherent change that satisfies the task.

### Rule 4

Do not add dependencies without a concrete reason.

### Rule 5

Add/update tests for behavior changed.

### Rule 6

Run lint, typecheck, tests, and build before declaring completion.

### Rule 7

Report changed files, decisions, tests, and known risks.

### Rule 8

If requirements conflict with the Bible, stop and flag the conflict.

### Rule 9

No hidden TODO/fake implementation in production paths.

### Rule 10

Security-sensitive changes receive explicit review before merge.

## 13. Agent Roles

### Architect

Architecture, boundaries, dependency decisions, ADRs, consistency.

### Backend

NestJS modules, services, APIs, validation, authorization, persistence, backend tests.

### Frontend

React routes, screens, components, state, forms, API integration, responsive UI, frontend tests.

### Database

Prisma schema, migrations, indexes, constraints, seed data, query performance.

### UX/UI

Flows, design system, accessibility, responsive behavior, information architecture.

### QA

Test strategy, E2E, regression, edge cases, release gates.

### Security

Auth, authorization, uploads, secrets, abuse controls, privacy, dependency risk, threat model.

### Release

CI/CD, environments, migrations, health checks, rollback, release notes.

### Reviewer

Correctness, scope creep, maintainability, tests, security, Bible adherence.

## 14. Master Build Roadmap

### Phase 0

Foundation: repository, constitution, ADR template, CI, environments, lint/typecheck/test/build, UI base.

### Phase 1

Identity: auth, profile, sessions, verification, password recovery, roles.

### Phase 2

School/Class: school, class, memberships, roles, invite links/codes/QR.

### Phase 3

Profile + Yearbook: directory, photos, profiles, class photo, sections, preview.

### Phase 4

Superlatives: categories, voting, duplicate prevention, results, moderation.

### Phase 5

Publish: review, publish snapshot, historical lock, sharing/QR.

### Phase 6

Graduation: Graduation Mode, guestbook, announcements, presentation.

### Phase 7

Memories: albums, prompts, time capsules, anniversary resurfacing.

### Phase 8

Alumni: reunions, RSVP, optional updates, milestones.

### Phase 9

Monetization: packages, themes, storage, print, school plans, payments.

### Phase 10

Scale: native apps if justified, analytics, integrations, multi-country expansion.

## 15. Monetization

### Primary

Paid digital yearbook packages per class.

### Premium

Premium themes, storage, ceremony features, custom sharing page/domain.

### Print

Physical yearbook ordering from the digital artifact.

### School plans

Schools can sponsor/purchase packages for multiple graduating classes.

### Ceremony services

Optional event presentation, QR programs, slideshow, guestbook, support.

### Alumni

Optional premium reunion/archive services without aggressively paywalling core memories.

### Partnerships

Carefully selected graduation-related partnerships, clearly labeled.

### Rule

Do not depend on advertising before product-market fit. A yearbook is a trust product.

## 16. Metrics

### Activation

% of class admins who create a class and invite members.

### Profile completion

% of invited members who complete a meaningful profile.

### Yearbook completion

% of required sections completed before publication.

### Publish rate

% of created classes that publish.

### Graduation value

Guest/graduate engagement during the graduation period.

### Retention

% of graduates returning at 6, 12, and 24 months.

### Referral

Classes created from invitations/referrals.

### Revenue

Revenue per class, upgrade rate, print attachment, school contract value.

### Quality

Crash-free sessions, API error rate, upload failure rate, moderation incidents, support tickets.

## 17. Definition of Done

### Product

Acceptance criteria satisfied; end-to-end flow works; empty/loading/error states exist.

### Engineering

Type-safe; lint clean; tests pass; build succeeds; dependency changes explained.

### Security

Authorization verified; inputs validated; sensitive operations logged; no secrets committed.

### UX

Responsive; accessible; clear feedback; no dead ends.

### Operations

Logging/monitoring hooks; reproducible migrations; deployment/rollback documented.

### AI delivery

Agent reports changed files, tests, assumptions, unresolved risks, and reviewer checks.

## 18. First AI Coding Prompt

### Prompt

You are the Lead Engineer for the Haitian Digital Yearbook Platform. Read PROJECT_BIBLE.md completely before changing code. Inspect the repository, package manager, dependencies, scripts, environment, CI, tests, and docs. Do not assume the repository is empty. Report contradictions before architectural changes.

Implement Phase 0 only: engineering foundation. Establish TypeScript conventions; React + React Router frontend foundation; NestJS backend foundation only if needed; PostgreSQL/Prisma preparation; environment validation; lint/format/typecheck/test/build; CI; backend health endpoint; minimal accessible frontend shell; one frontend smoke test; one backend health/integration test; setup documentation. Do not implement business features. Do not add unnecessary libraries.

Before completion, run lint, typecheck, tests and build. Report: summary, files changed, architecture decisions, commands/results, risks, and exact next task. Do not declare completion if checks fail.

## 19. Naming Direction

### Naming brief

The name should work in Haitian Creole, French and English; be easy to pronounce; avoid literal “Souvni,” “Yearbook,” or “Memory”; imply transition, achievement, future, chapter, legacy, or belonging.

### Process

Generate 30–50 candidates; remove generic names; check pronunciation; check domain/social availability; check trademark conflicts; test with students, alumni, teachers and parents.

### Rule

Do not hard-code the final brand name into package names, database identifiers, URLs, or infrastructure until selected.

## 20. First Release Acceptance Test

### 1

Class president registers, creates a school and graduating class, and reaches the class dashboard.

### 2

President generates invitation link and QR code.

### 3

Student joins, creates profile, uploads graduation photo, adds quote.

### 4

Dashboard shows member completion without exposing private fields.

### 5

Admin creates a superlative and opens voting.

### 6

Student casts one vote and cannot vote twice in the same category.

### 7

Admin closes voting and publishes results according to visibility.

### 8

Class previews and publishes the yearbook.

### 9

Published snapshot cannot be silently changed by ordinary profile edits.

### 10

Member can later see historical yearbook and separate living alumni space.

