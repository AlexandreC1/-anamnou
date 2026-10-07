# Cloudflare shipping preparation

The existing Vite frontend can deploy to Cloudflare Pages. The Pages Function
proxies same-origin `/api/*` requests to a fixed HTTPS backend origin. Account
services return 503 unless both `API_ENABLED=true` and `API_ORIGIN` are configured.
Public previews must keep this gate closed until production services and consent
protections are ready. No local database or local API is exposed.

Run the workspace build, then `node scripts/prepare-cloudflare-preview.mjs`.
From `deploy/cloudflare`, deploy the absolute `.tools/cloudflare-site` directory
with Wrangler Pages. This adds a visible preview notice; it does not change the
source application or claim to implement a backend.

The API image builds with `docker build -f deploy/Dockerfile.api -t anamnou-api .`.
It runs as an unprivileged user on port 4000 with `API_HOST=0.0.0.0`. Local
development still defaults to loopback. Inject secrets at runtime, never into the
image. Run Prisma migrations as a separate controlled release step.

Production needs a hosted Node.js API, Neon database, private R2 bucket and
verified Resend sending domain. Keep the existing authentication for now. Use
the existing S3 and SMTP adapters, verify TLS and least-privilege credentials,
schedule media maintenance, and test backups/restoration before enabling access.
Set `PUBLIC_WEB_URL` to the final Pages custom origin. The proxy preserves Origin
and cookies, strips incoming forwarding headers, refuses redirects, and marks
all API responses no-store. Account data must not enter CDN caches.

Cloudflare CLI access is available. Neon and Resend currently show sign-in pages
in the available browser; no production credentials or backend-host account are
configured. Automated account creation may require user authentication or legal
terms acceptance. A frontend preview is not a completed production release.

Photo reuse permission and minors launch requirements remain unresolved.
Do not enable real enrollment based solely on a successful deployment.

## Verified delivery

`npm run check` passed: 20 API unit, 39 frontend, 3 proxy, 37 database/HTTP
integration and 20 desktop/mobile browser tests (119 total), plus lint,
formatting, type checks and builds. Dependency audit reported zero vulnerabilities.
The Docker image built successfully; its unprivileged runtime returned liveness
200 and readiness 503 with unavailable dependencies, as expected. The test
container was removed. Refreshed local API readiness returned 200.

The production-mode frontend was built separately and deployed to
https://anamnou-preview.pages.dev using the existing Cloudflare account.
Immutable deployment: https://2c4a4b60.anamnou-preview.pages.dev.
Live home, direct governance route and graduation image returned 200;
API readiness and registration returned 503 with no-store. Browser inspection
confirmed the preview notice, rendered home and working appearance navigation.
This is a live design preview, not a shipped backend or opened minors pilot.
