# Intent preloading and responsive feedback

Anamnou now warms the page someone is likely to open when they hover, focus,
or touch an internal link. Identity, class tools, profiles, reader, editor, and
security settings load as separate modules. Repeated intent shares a preload;
failed preloads are removed so subsequent intent can retry. Data-saving mode
and 2G connections skip speculative loading. This uses the browser's module
cache and makes no speculative API requests or persistent copies of private data.

Navigation retains the site shell while a page downloads, and retains the
class workspace navigation during nested page downloads. Localized status text
and reserved loading space make pending work visible. Chunk failures have an
accessible error and reload action. Document titles update after delayed pages
render, and existing keyboard focus handling remains in place.

Shared resource forms announce saves immediately, disable their submitted fields
until completion, preserve values after failure, and remove stale success text
when someone edits again. Success remains server-confirmed, particularly for
roles, invitations, and other security-sensitive changes. Appearance settings
already update immediately on the device.

## Measurements

Production Vite builds on the same pinned Node 24.20 runtime:

| Gzip JavaScript                               |    Before |     After |
| --------------------------------------------- | --------: | --------: |
| Main entry                                    | 120.23 kB |  93.30 kB |
| Entry plus static module-preload dependencies | 120.23 kB | 109.09 kB |

The startup sum includes every JavaScript dependency explicitly referenced by
the generated HTML, rather than counting only the smaller entry. It is about
9.3% smaller. Page-specific code downloads on navigation or intent. Fonts,
CSS, platform-specific dynamic imports, and subsequent page downloads are
outside this sum. These are build measurements, not claims about measured
Core Web Vitals or production user latency.

## Verification and limits

`npm run check` passed: lint, formatting, type checks, 20 API unit tests,
34 frontend tests, 37 integration tests, production builds, and 20 desktop/mobile
browser tests. `npm audit --audit-level=high` reported zero vulnerabilities.
The initial browser run exposed an incorrect new assertion about anonymous
account navigation; after checking the expected sign-in redirect, the complete
suite was run again successfully. Local web and API readiness both returned 200.

Tests cover route selection, connection constraints, preload deduplication and
retry, no private fetch during speculative loading, and save failure recovery.
Desktop and Pixel 7 browser journeys exercise keyboard intent preloading and
a deliberately held page download, including loading feedback, available
navigation, eventual title updates, and normal real-server flows.

No database, server authorization, or cookie changes are required. Native apps
share this frontend, but this delivery does not claim a new device installation
or an iOS build. Production latency and field Core Web Vitals still need
measurement on an actual deployed pilot.
