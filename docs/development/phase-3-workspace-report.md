# Phase 3 milestone: class workspace navigation

## Visible changes

Class and school names now appear on separate lines, with the graduation year beside
the school. The class-list label links back to the user's classes. The privacy note
is separated from the class identity and navigation.

The active destination has a restrained background, underline and stronger text,
while React Router continues to provide its accessible current-page marker. On
phones, navigation uses two columns with wrapping labels and at least 44-pixel-high
touch targets. Desktop links remain in a compact row that can wrap when needed.
The navigation landmark is named in all four supported languages.

This completes the previously unstyled class-workspace shell using the existing
editorial theme. Permissions, routes, API behavior, voting and publication are unchanged.

## Changed files

- `apps/web/src/ClassWorkspace.tsx`: semantic context header, separate class/school text,
  class-list link and translated navigation label.
- `apps/web/src/yearbook.css`: context hierarchy, active/hover navigation treatment,
  wrapping names and responsive touch targets.
- `apps/web/src/yearbook-copy.ts`: navigation landmark label in English, French,
  Haitian Creole and Spanish.
- `tests/e2e/yearbook.spec.ts`: active-route checks and 320-pixel navigation checks
  across all four languages, including visible link bounds and touch target heights.
- `docs/development/phase-3-workspace-report.md`: this milestone record.

The existing branch changes are preserved. No dependencies, commit, push or deployment
were added for this milestone.

## Verification and review

- `npm run check`: passed (exit 0): lint, formatting, type checks, 14 API unit tests,
  19 web tests, 29 integration tests, build and 16 desktop/mobile browser tests.
- `npm audit --audit-level=high`: passed, zero vulnerabilities.
- Desktop editor and narrow French/Haitian Creole screenshots visually inspected.
  All four locales passed the 320-pixel link-bound and touch-target checks in both
  desktop and mobile Chromium projects.
- Both local servers restarted with the verified build. Web returned HTTP 200;
  direct API and web-proxy readiness both returned `status: ok`.

Review copies of the screenshots are saved as `.tools/workspace-desktop.png`,
`.tools/workspace-mobile-fr.png` and `.tools/workspace-mobile-ht.png`.

Open <http://localhost:3000/classes> and select your class. Review the class details
and navigation above the dashboard, profile or yearbook. The browser tests also
capture localized narrow-phone navigation under `test-results/workspace-*.png`.

This is a local Phase 3 milestone. The existing production and independent security
review requirements still apply before release.
