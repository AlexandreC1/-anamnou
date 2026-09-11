# Phase 2 local walkthrough

Start with the README setup. Apply `npm run db:migrate`, then run the API and web
processes. Open `http://localhost:3000/register`. Create your account; open the test
inbox from the resulting screen, find your email and follow its verification link.
If a link expired, request a fresh one at `/resend-verification`. In this local
environment emails stay in Mailpit; they do not reach Gmail or another personal
mailbox. Production SMTP requires real configuration and TLS as described in the
identity documentation. Build the web app with APP_ENV=production for deployment
so the local inbox link is absent.

After signing in, choose My Class, create a school workspace, then create your
class. Choose Manage to create an invitation. Save its link/code immediately;
only a hash is persisted and the secret cannot be retrieved later. The QR image
encodes the same link. Open another browser session, register and verify a second
account, then use `/join` or the invitation link. Acceptance is explicit.

Members can view the directory. Class admins can change roles, remove/restore
members and revoke invitations. A removed member loses class access. The final
class administrator cannot be demoted or removed. School administrators can
manage all classes in the school workspace they administer. This is private
workspace ownership, not official accreditation of a school.

## Optional fictional demonstration data

Run `npm run db:seed:demo` on the local development database. This creates one
fictional school, one class, a president, two students and a staff contributor.
IDs/names are deterministic; rerunning preserves existing account passwords,
names and class edits. The generated password is stored only in ignored
`.tools/demo-credentials.json`, together with the fictional login addresses.
The command never prints passwords. These explicit demo accounts are verified
fixtures; normal registration still requires email verification. The command
refuses production/test environments and non-loopback databases. It never deletes
records or resets existing passwords. Keep that credentials file private.

The normal `npm run db:seed` remains operational metadata only, including in CI.
Demo yearbook profiles/content are deferred to their authorized phases.

## Checks and limits

Run `npm run check` and `npm audit --audit-level=high`. Class integration tests
exercise real PostgreSQL constraints, concurrent acceptance, tenant isolation,
guest access, last-admin protection and audit persistence. E2E creates and verifies
real accounts through SMTP before class creation and joining, on desktop/mobile.
Tests run on the separate `_test` database. No tests skip authentication to make
browser screens appear functional.

The local web server binds to loopback. A QR containing localhost opens this
installation only on this machine; cross-device sharing requires an accessible
deployment URL. Never expose the unauthenticated local Mailpit inbox publicly.
There is no school-admin transfer, school/class deletion or archival endpoint yet.
No profile photos, yearbook content or voting behavior is included in Phase 2.

Migrations are additive. Back up before applying them to valued data. Roll back
application code while leaving the extra tables in place; do not drop tenant data
to undo a release. Destructive schema rollback needs a separate reviewed migration.
