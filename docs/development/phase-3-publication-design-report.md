# Phase 3 milestone: publication composition

## Result

The class workspace now opens around the edition itself. The desktop dashboard
shows a two-page spread with a cover and the saved class message, or a linked
section index when there is no message. Phones read those pages in sequence.
Shared student portraits and a quote follow the edition, using the existing
class-authorized reader endpoint with a three-profile limit.

The large navigation rail has been replaced by compact class navigation. The
reader gives cover images, section numbers, portraits and quotes their own layouts.
Portrait pages use staggered columns on desktop and one column on phones. The
editor's live cover uses the same component as the reader and dashboard, including
the uploaded cover/class photo. A clickable section index opens the selected
section, moves focus to its heading and scrolls it into view.

The default cover theme is terracotta; its translated display labels now match
the visible color. Stored theme identifiers remain compatible with saved editions.
Existing fonts are retained. The changed layout, stronger scale and actual shared
content carry the design. No stock people, invented class activity or decorative
symbols were introduced.

## Changed files

- `.impeccable.md`: record rejection of the prior sidebar design and the new direction.
- `apps/web/src/EditionCover.tsx`: shared cover rendering with actual title, year,
  school, theme and optional uploaded image.
- `apps/web/src/ClassDashboard.tsx`: opening spread, shared portraits/quote, visible
  loading and failure handling, and limited shared-profile retrieval.
- `apps/web/src/YearbookEditor.tsx`: shared live cover and accessible section index.
- `apps/web/src/YearbookReader.tsx`: shared cover, composed section headings and
  chapter-anchor scrolling after an edition loads.
- `apps/web/src/yearbook.css`: compact workspace navigation, book spread, shared
  profiles, editor index, reader typography and responsive layouts.
- `apps/web/src/styles.css`: light neutral canvas and terracotta action color.
- `apps/web/src/yearbook-copy.ts`: default theme names in all four languages.
- `tests/e2e/classes.spec.ts`: select the member-directory link within class navigation.
- `tests/e2e/yearbook.spec.ts`: section index interaction, saved class message,
  chapter deep links, dashboard shared content and private-contact assertions.
- `docs/development/phase-3-publication-design-report.md`: this report.

## Verification

- `npm run check`: lint, formatting, type checks, 14 API unit tests, 19 web tests,
  29 integration tests and production build passed. The browser run passed 15 of
  16 journeys; the mobile class journey timed out waiting for the local test inbox.
- `npx playwright test tests/e2e/classes.spec.ts --project=mobile-chromium`:
  the failed journey passed on an isolated recheck, with no code or timeout changes.
  All 78 test cases therefore have passing results for this implementation, across
  the full run and targeted recheck. The aggregate check command itself exited 1
  because of that inbox timeout; its log is `.tools/publication-verified-check.log`.
- `npm audit --audit-level=high`: zero vulnerabilities.
- `npm run format:check` and `git diff --check`: passed after documentation updates.
- Demo-class browser review on the running app: dashboard, profile, reader and
  editor checked; all three cover themes inspected. Zero page errors and no phone
  document overflow in the preview script. Theme exploration was not saved.
- Browser journeys verify saving and previewing real uploads, opening editor
  sections from the index, chapter deep links, private-contact exclusion from the
  dashboard, and navigation at 320 pixels in all four supported languages.
- Latest production assets are served at `http://localhost:3000/classes`. Web
  returns HTTP 200; direct and proxied API readiness return `status: ok`.

Review screenshots of the existing fictional demo class are saved at
`.tools/publication-dashboard-desktop.png`, `.tools/publication-dashboard-mobile.png`,
`.tools/publication-editor-desktop.png` and `.tools/publication-reader-mobile.png`.
The local demo has no uploaded photographs, so these screenshots show initials;
the isolated browser journeys exercise the photographic layouts using test uploads.

## Scope and limits

No backend, database, dependency or publication lifecycle changes were needed.
Shared profiles continue to use the server's existing visibility filtering. The
spotlight shows up to three profiles from the first reader page and does not claim
to show every classmate. Long class messages are excerpted on the dashboard with
a link to the full reader. Empty classes remain explicit about missing content.
Previous uncommitted work is preserved. Voting and publication remain outside scope.
