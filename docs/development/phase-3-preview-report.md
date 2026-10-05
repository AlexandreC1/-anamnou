# Phase 3 milestone: save and preview

## User-visible changes

Both profile and yearbook editors now offer **Save & preview**. The action submits
the current form and opens the draft only after the API confirms the save. A conflict
or server failure leaves the editor and unsaved input in place. **Save changes**
continues to save without navigating. Neither action changes the selected privacy
settings implicitly. The new action is translated into English, French, Haitian
Creole and Spanish.

If a required field inside a collapsed yearbook section is empty, the section opens
during native form validation so the browser can focus the field. This removes a
dead end in which saving appeared unresponsive while an invalid input stayed hidden.

The existing warm editorial layout, backend authorization, storage and draft
architecture are preserved. No dependencies, voting or publication features were added.

## Changed files

- `apps/web/src/MemberProfile.tsx`: save-and-preview submit action and successful-save navigation.
- `apps/web/src/YearbookEditor.tsx`: equivalent action and disclosure of invalid section fields.
- `apps/web/src/yearbook-copy.ts`: action label in all four locales.
- `apps/web/src/Yearbook.test.tsx`: six persistence/navigation regression cases.
- `tests/e2e/yearbook.spec.ts`: real browser validation, focus and save-and-preview journey.
- `docs/development/yearbooks.md`: updated usage instructions.
- `docs/development/phase-3-preview-report.md`: this milestone record.

Existing branch changes were preserved. No commit, push or deployment was requested.

## Verification

- Web unit tests: 19 passed, including all six new regression cases.
- Full `npm run check`: passed (exit 0): lint, formatting, type checks, 14 API unit
  tests, 19 web tests, 29 integration tests, build and 16 desktop/mobile browser tests.
- `npm audit --audit-level=high`: passed, zero vulnerabilities.
- Both local servers refreshed with the verified build. Web returned HTTP 200;
  API and web-proxy readiness both returned `status: ok`.

The browser journey captures desktop/mobile editor images in
`test-results/editor-desktop-chromium.png` and `test-results/editor-mobile-chromium.png`.
These show fictional test data. Interactive browser control was unavailable earlier
in this session; the repository's Playwright suite verifies the real app flow.
Both screenshots were visually inspected. Review copies are preserved in
`.tools/save-preview-desktop.png` and `.tools/save-preview-mobile.png`.

## Review and limits

Open <http://localhost:3000/classes>, select a class, and open **Edit your page** or
**Edit the yearbook**. Change some text and choose **Save & preview**. The saved
draft appears immediately after a successful save. A private profile remains private.

Navigation through other links still requires saving first, as documented. This
milestone is not a general unsaved-navigation guard. Production and independent
security review gates from the Project Bible remain unchanged.
