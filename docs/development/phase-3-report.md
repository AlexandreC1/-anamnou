# Phase 3 milestone follow-up - 2026-09-14

## Scope and decisions

Continued the existing uncommitted Phase 3 branch, preserving its profiles,
private photo storage, class dashboard, editor and draft reader implementation.
The repository's authorized scope remains Phase 3; voting and immutable publication
are later milestones.

Fixed a save-state race: profile fields, privacy choices, photo uploads and yearbook
settings could change while the submitted save was pending. The response could then
label newer, unsent content as saved. These controls now remain disabled until the
request settles, with input preserved on failure. New edits clear the saved message.
Yearbook photo completion also explicitly clears it. No dependencies or backend
security rules changed in this follow-up.

Regression tests exercise pending saves, successful and failed profile requests,
input preservation, upload availability and reuse of returned section IDs on a
second yearbook save. Browser tests select the exact member-navigation link and
wait for photo decoding, rather than checking intrinsic width immediately after
an image element becomes visible.

## Files changed in this follow-up

- `AGENTS.md`: persist the user's requirement to run the app after each milestone.
- `apps/web/src/MemberProfile.tsx`: lock edits and uploads while saving/deleting.
- `apps/web/src/PhotoUpload.tsx`: accept the parent editor's disabled state.
- `apps/web/src/YearbookEditor.tsx`: lock settings during saves and reset saved state after uploads.
- `apps/web/src/Yearbook.test.tsx`: three additional save-lifecycle regression cases.
- `apps/web/src/App.tsx`: format existing Phase 3 changes.
- `apps/web/src/ClassWorkspace.tsx`: format the existing Phase 3 component.
- `tests/e2e/classes.spec.ts`: distinguish navigation from the dashboard member-count link.
- `tests/e2e/yearbook.spec.ts`: await actual portrait decoding.
- `docs/development/yearbooks.md`: document pending-save behavior.
- `docs/development/phase-3-report.md`: this delivery record.

The other changes present on the branch predate this follow-up.

## Verification

Pinned runtime: Node 24.20.0 and npm 11.

- `npm run check`: passed (exit 0). This includes lint, formatting, type checks,
  14 API unit tests, 13 web tests, 29 integration tests, build and 16 desktop/mobile
  browser tests, all passing. Earlier runs passed the checks through build and exposed the
  browser selector and image-readiness issues corrected above.
- `npm audit --audit-level=high`: passed, zero vulnerabilities.
- `git diff --check`: passed.

Initial browser runs also encountered local SMTP delivery failures. A local outbox
retry with the application environment defaults succeeded, and registration and
recovery passed in the subsequent browser run. The transient SMTP root cause was
not established; no production mail behavior was changed to bypass it.

## Local run and remaining limits

Restarted both local servers with the verified build. The web page returns HTTP 200;
API readiness and readiness through the web proxy both return `status: ok`.
Web URL: <http://localhost:3000>. Local email inbox:
<http://localhost:8025>. Development accounts and data remain separate from the
isolated test database.

Interactive browser control was unavailable in this session, and a direct browser
launch was blocked by execution policy. The working link is provided for review.
Browser verification
uses the repository's Playwright desktop/mobile journeys. This is a local milestone,
not a production release or independent security approval. The existing Phase 3
security review and the Project Bible's deployment gates still apply before merge
or production release. No commit, push or deployment is part of this follow-up.
