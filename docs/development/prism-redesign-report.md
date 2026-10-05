# Anamnou Prism redesign

## Scope and decisions

The October 4 request replaces the former restrained editorial UI with colorful
3D graphics and selective glass surfaces. The redesign preserves the existing
Phase 3 routes, API contracts, permissions, data, and publication themes.

- New landing composition, interactive perspective yearbook, three selectable
  cover colors, opening/closing cover, and direct create/join class links.
- Peach canvas, coral/lilac/sage objects, frosted navigation, and coordinated
  account, class, profile, editor, and reader surfaces.
- Bricolage Grotesque is served locally with Fontsource. Public Sans remains the
  body font; Literata remains available to the publication itself.
- CSS perspective and gradients provide the 3D objects without a WebGL runtime.
- English, Haitian Creole, French, and Spanish copy; semantic controls, visible
  focus, reduced-motion handling, and phone layouts.
- The existing graduation photograph is reused in an explicitly illustrative
  cover. Authenticated class screens continue to use their existing real data.

## Files changed by this task

- `apps/web/src/LandingPage.tsx`: landing content, localized copy, cover controls.
- `apps/web/src/prism.css`: visual system and responsive styles.
- `apps/web/src/App.tsx`: landing component and stylesheet integration.
- `apps/web/src/main.tsx`: locally served display font imports.
- `apps/web/src/App.test.tsx`: color selection, cover opening, and CTA regression.
- `apps/web/package.json`, `package-lock.json`: display-font dependency.
- `.impeccable.md`: latest creator direction.
- This report.

The repository had extensive uncommitted work before this task. It was preserved;
the full Git diff includes changes from earlier work and is not this task's diff.
Temporary screenshots, preview scripts, and validation logs are under ignored
`.tools/`. No commit, push, or deployment was performed.

## Preview

Local app: <http://127.0.0.1:3010>. API: <http://127.0.0.1:4000/ready>.
Port 3000 was occupied by another application. Existing Docker services were
started, and the API's preview origin was set to port 3010 for this process only.

## Validation

- Local Playwright inspection: 320, 390, 768, and 1440 pixels; four languages;
  cover interactions; no uncaught browser errors. The 320px decorative orbit
  overflow was found and fixed, then checked at 320px document width.
- Existing local demo account: login, dashboard, profile, editor, and reader
  screenshots on desktop/mobile. No demo content was changed.
- `npm run check`: all stages passed on the final run. Lint, formatting, type checking,
  14 backend unit tests, 20 frontend tests, 32 integration tests, production
  builds, and all 16 desktop/mobile E2E tests passed. E2E includes actual
  registration, email verification, invitation acceptance, photo upload,
  yearbook editing/reading, keyboard navigation, and reduced motion. The first
  run exposed the corrected narrow-screen orbit overflow; the yearbook timeout
  from the system pause did not recur.
- Shell reporting caveat: the PowerShell wrapper returned 1 despite the log
  ending in `16 passed` and every npm stage completing. Redirected native stderr
  contains Prisma informational messages wrapped as `NativeCommandError`.
  The pass counts above come from each test runner's actual output; this report
  does not characterize the wrapper exit code as zero.
- `npm audit --audit-level=high`: six findings, two high and four moderate.
  High: existing `brace-expansion` and `nodemailer`. Moderate: `fast-uri`,
  `ip-address`, `multer`, and its `@nestjs/platform-express` dependency path.
  Backend/dependency upgrades were not forced into the visual redesign.

## References and limits

Visual research included
[Pinterest 3D glass UI](https://id.pinterest.com/pin/3d-glassmorphism-ui-website--1079526973162474859/)
and the Google Fonts Bricolage Grotesque catalog. The composition and graphics
are implemented specifically for Anamnou, not copied page assets.

Appearance is now available at `/settings/appearance`, through the main
navigation and the preview's customization link. Coral, Lilac and Sage change
the app accents and illustrated book cover. The choice persists on the device
under `anamnou-theme`; it is separate from class edition settings.
Verification uses Chromium; Safari and Firefox have not been visually checked.
The dependency audit is not clean, so this report does not certify production
security or the entire foundation.

## Native apps and appearance follow-up

- Added Capacitor Android and iOS projects sharing the web UI, native API
  transport, authenticated photo handling, Android back navigation and safe
  area spacing. Native build commands are `mobile:sync`, `mobile:android`,
  and `mobile:run`; USB development uses `--local`.
- `node scripts/mobile.mjs install --local`: web TypeScript and Vite build
  passed; both platform projects synchronized; Android Gradle build passed;
  installation returned `Success` and launch returned `Status: ok` on the
  connected Tecno BG6. USB detection was intermittent after installation.
- Final web unit suite: 4 files, 27 tests passed, including appearance
  persistence, preview navigation and native transport. Repository lint and
  staged whitespace checks passed.
- The iOS project is generated and synchronized. Native compilation and
  device verification require macOS with Xcode and have not been performed.
- The Android installation uses USB forwarding to the local development
  server. A production native build requires `NATIVE_API_ORIGIN` set to the
  deployed HTTPS origin and platform signing.
