# Zero-budget deployment progress

The user set the hosting budget to $0. No paid Cloudflare plan was activated.
Cloudflare Containers rejected access because Workers Paid is required.

Created `anamnou-production` in Neon, project `green-hat-16572053`, branch
`br-still-mountain-b8fe2u3r`, database `yearbook`, PostgreSQL 17, AWS US East 1
(N. Virginia). This is a separate new project; the existing `kadolakay` project
was not modified. Schema migrations and application credentials are not connected
yet. Resend is signed in but has no verified sending domain for Anamnou.
Gidyo is a separate project and its domain must not be used for Anamnou.
The mistakenly registered, unverified Resend entry was removed. No DNS records,
nameservers or existing mail routing were changed, and no emails were sent.
Anamnou retains its separate Pages address, namnou-preview.pages.dev.
The user selected Gmail API delivery to avoid buying a domain, and specified
`charlesalexandrenick@gmail.com` as the sender. A separate Google Cloud project,
`anamnou-account-mail` (Anamnou Account Mail), was created and its Gmail API enabled.
OAuth client credentials, sender authorization and live recovery remain pending.
The Gmail adapter uses HTTPS with send-only OAuth, bounded timeouts and safe errors.
The Render configuration now selects Gmail; storage region must be supplied from
the actual storage connection rather than assuming R2's `auto` region.
See [Gmail setup](gmail-delivery.md) for authorization and delivery limitations.

Render Free is the proposed backend host. The user signed in; its deployment form
is prepared for `anamnou-api`, Docker, Virginia, the feature branch and the Free
plan, with auto-deploy off and `/ready` health checks. Deployment was not submitted
without production credentials.
`render.yaml` describes a free Docker service with automatic deploy disabled,
runtime-injected secrets and an explicit startup migration step. No service has
been provisioned or connected to the public frontend yet.

Render Free blocks SMTP ports and sleeps after inactivity. The application now
supports Resend HTTPS delivery (`MAIL_TRANSPORT=resend`, `RESEND_API_KEY`,
`MAIL_FROM`) as an alternative to SMTP. Existing local/test SMTP stays unchanged.
The durable delivery queue remains authoritative; stable hashed idempotency keys
reduce duplicate mail on retries, timeouts are bounded, redirects are rejected,
and provider errors are replaced by safe generic errors. Verification/reset links
continue to put tokens in URL fragments. Provider acceptance is not proof of inbox
delivery; real sending and password reset still need end-to-end verification.

Sources: [Render free limits](https://render.com/docs/free),
[Resend send API](https://resend.com/docs/api-reference/emails/send-email),
[Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

The free setup is subject to quotas, cold starts and suspension. No payment method
or paid upgrade should be added under the $0 instruction. R2 bucket listing was
rejected because R2 is not enabled on the account (Cloudflare code 10042).
Its activation/billing requirements remain unverified. A verified sending domain, scoped email
credential, free backend account access, durable storage and consent restrictions
remain required before real enrollment. To avoid R2 billing activation, a private
`yearbook-media` bucket was created on the new Neon production branch. Neon's Free
plan includes 5 GB of S3-compatible object storage per project; adapter compatibility
and credentials still need live verification. No existing project data was changed.
The live frontend still returns 503 for
account services; no claim of working live recovery is made.

## Verification

`npm run check` passed with 23 API unit tests, 39 frontend tests, 3 proxy tests,
37 database/HTTP integration tests and 20 desktop/mobile browser tests (122 total),
plus lint, formatting, type checks and builds. `npm audit --audit-level=high`
reported zero vulnerabilities. HTTPS adapter tests verify localized fragment-based
links, stable retry keys, safe provider/network failure handling and required
configuration. Real Resend sending is not yet verified. The live preview and its
closed account gate have not been changed in this milestone.
