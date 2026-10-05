# Phase 3 milestone: editorial studio design

## Visible changes

The class workspace now has a deep green navigation rail on desktop and a compact,
wrapping navigation block on phones. Warm paper surfaces, restrained ochre accents,
stronger book typography and clearer spacing give the dashboard, profile editor,
yearbook editor and reader a consistent identity.

The dashboard cover uses the saved edition title and an uploaded cover or class photo
when available. The edition editor shows a live typographic cover sample as its title
and theme change. Numbered section disclosures, quieter secondary actions and grouped
privacy controls make the editing hierarchy clearer. The home cover uses the same ink
palette. Existing locally hosted fonts remain in use.

Active student names in the member directory open their pages. Saved profile responses
include the selected photo description and dimensions so accessible descriptions survive
reloads. Private profiles and contact details still follow their existing access rules.

## Files changed in this milestone

- `AGENTS.md`: retain the creator's design and copy preferences.
- `.impeccable.md` (local design context): record the updated visual direction.
- `apps/web/src/App.tsx`: workspace layout class and plain title/label punctuation.
- `apps/web/src/Classes.tsx`: plain class links and document-title punctuation.
- `apps/web/src/ClassDashboard.tsx`: actual edition cover title/photo and simpler links.
- `apps/web/src/ClassManage.tsx`: active student profile links in the directory.
- `apps/web/src/MemberProfile.tsx`: preserve uploaded photo metadata in editor and reader.
- `apps/web/src/YearbookEditor.tsx`: live cover sample and numbered section headings.
- `apps/web/src/yearbook-api.ts`: profile photo metadata type.
- `apps/web/src/styles.css`: paper/green/ochre tokens, controls, header and home cover.
- `apps/web/src/yearbook.css`: responsive studio, profile, editor and reader composition.
- `apps/api/src/publication/profiles.ts`: select safe photo metadata in profile responses.
- `apps/api/test/publication.integration.ts`: metadata and private-field assertions.
- `apps/web/src/Yearbook.test.tsx`: match the new section summary structure.
- `tests/e2e/yearbook.spec.ts`: profile description reload and directory journey checks;
  retain editor/reader, locale, navigation and phone-width checks; capture profile views.
- `docs/development/phase-3-studio-report.md`: this milestone record.
- `docs/security/publication-review.md`: photo response review note.

Existing uncommitted Phase 3 work is preserved. No dependencies were added.

## Verification

- `npm run check`: passed, exit 0. Lint, formatting, type checks, 14 API unit tests,
  19 web unit tests, 29 integration tests, production build and 16 browser tests.
- `npm audit --audit-level=high`: passed, zero vulnerabilities.
- After the final profile label/nickname refinement: lint, format check, all 19 web
  tests and production build passed again. Both desktop and phone yearbook journeys
  passed again with `npx playwright test tests/e2e/yearbook.spec.ts`.
- Desktop dashboard/profile/editor and phone reader/navigation screenshots were
  visually inspected. The four supported locales pass navigation target and overflow
  checks at 320 pixels. Final profile screenshots confirm the compact optional labels.
- The running API was refreshed through its normal npm start script. The web preview
  serves the latest production build at `http://localhost:3000/classes`. Web returns
  HTTP 200, and direct/proxied API readiness returns `status: ok`.
- Review screenshots: `.tools/studio-dashboard.png`, `.tools/studio-editor.png`,
  `.tools/studio-profile-mobile.png`, `.tools/studio-reader-mobile.png`, and
  `.tools/studio-navigation-ht.png`. These use explicitly fictional browser-test
  content, including solid-color images used to verify uploads.

A separate hidden preview helper launch was rejected by automatic approval review
with only "blocked by policy" given as the reason. Visual review was completed using
screenshots from the existing browser test workflow; the normal API start script and
existing web preview remain running successfully.

## Decisions and limits

The new presentation uses actual class data. Empty photo states remain explicit.
Copy avoids decorative symbols, emoticons and em dashes. Voting and publication remain
outside this milestone. Changes to profile responses select only photo ID, description
and dimensions, never storage keys or ownership fields. Independent security review
remains required before merge.
