# Identity development

Run the normal README setup and migrations. Compose now includes Mailpit 1.31.1
alongside PostgreSQL and MinIO. The SMTP port is 1025; the inbox is
http://localhost:8025. Both bind to loopback. Mailpit is a local testing inbox;
do not expose it to the network or use it as a production mail relay.

Existing .env files can use the local SMTP defaults. New .env.example fields:
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and MAIL_FROM. Production must
set credentials and a real sender. Never commit these values.

## Try the flow

1. Open http://localhost:3000/register and choose a language.
2. Register with a fictional email address and your own 15–128 character password.
3. Open http://localhost:8025 and follow the verification link, then confirm.
4. Sign in. Change your display name and preferred email language on My account.
5. Sign out; opening /profile returns you to sign-in.
6. Request recovery, follow its email link, and set a different password.
7. Sign in with the new password; the old one and all prior sessions stop working.

There are no seeded users or shared development passwords. Account email is
private to /me. Avatar upload remains with the authorized media/profile phase.
UI language persists in the browser. Preferred email language persists in the
account, independently of the device's UI choice.

## Testing

Root test commands first run npm run test:setup, which creates/migrates a separate
local database with the development database name plus _test, and writes its
connection URL to ignored .env.test. No existing database is dropped or reset.
The setup refuses production mode and non-loopback database hosts. Direct
Playwright invocations require npm run test:setup first.

Identity integration tests start real NestJS servers and use this migrated database
and Mailpit SMTP/API. Each test creates uniquely named fictional users and removes
its own database users/audits. E2E creates fictional accounts retained in the
test database for inspection; CI databases are disposable.
Mailpit retains local messages until its container is removed. Do not publish
test traces or inbox contents: they can contain test-only credentials and links.

## Browser CLI

The user-requested Microsoft Playwright CLI is pinned as a dev dependency.
After npm ci, use `npx --no-install playwright-cli --help`, then
`npx --no-install playwright-cli open http://localhost:3000/register`.
Use `snapshot`, `click`, `select`, and `screenshot` to inspect the live app;
use `close` when finished. CLI output is ignored under .playwright-cli because
snapshots and browser state can contain private data. Automated acceptance tests
continue to use npm run test:e2e.

## Operations

Migration 202609090002_identity is additive. Back up before applying migrations.
Rollback application code only if identity traffic is stopped; dropping identity
tables loses accounts and is not an automatic rollback strategy.

Expired sessions and tokens are rejected at read time even before cleanup.
Periodically delete expired Session, IdentityToken and AuthThrottle rows via a
reviewed database maintenance job; never delete audit records as part of that job.
Audit retention, password breach screening, MFA for future
privileged administration, and production ingress limits remain release work.

The /ready endpoint checks PostgreSQL and storage; it does not claim SMTP health.
Email delivery runs from the durable IdentityEmailJob table; failures emit
identity.delivery_failed without recipients/tokens and retry after one minute.
Monitor job age/attempts, and verify delivery in the target production mail system
before release. Migration 202609090003_identity_delivery adds this queue. Sending
and committing cannot be atomic across SMTP and PostgreSQL; after a worker crash,
use the newest received link.
