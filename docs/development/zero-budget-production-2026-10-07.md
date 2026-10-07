# Zero-budget deployment progress

The user set the hosting budget to $0. No paid Cloudflare plan was activated.
Cloudflare Containers rejected access because Workers Paid is required.

Created `anamnou-production` in Neon, project `green-hat-16572053`, branch
`br-still-mountain-b8fe2u3r`, database `yearbook`, PostgreSQL 17, AWS US East 1
(N. Virginia). This is a separate new project; the existing `kadolakay` project
was not modified. Schema migrations and application credentials are not connected
yet. Resend is signed in but has no verified domains. Cloudflare lists only
`gidyo.com`, with status pending. The user authorized domain selection; the chosen
email domain is `mail.anamnou.gidyo.com`, registered in Resend as
`23ea869f-6cdf-4c83-9694-0413dc1ebbfb` in North Virginia. Verification has not
started. The intended sender is `accounts@mail.anamnou.gidyo.com`.

Public DNS identifies `ns1.veridyen.com` and `ns2.veridyen.com` as the authoritative
nameservers for `gidyo.com`. Adding records to the pending Cloudflare zone would
not publish them. Preserve the current nameservers and existing mail routing.
Veridyen access currently stops at its browser security verification page; the
user has been asked to complete the check and sign in. No DNS records were added.

Required records below use names relative to `gidyo.com`. The TXT value is a
public DKIM verification key, not an application credential.

| Type  | Name                             | Value                                                                                                                                                                                                                        |
| ----- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TXT   | `resend._domainkey.mail.anamnou` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCcGQbg4RgfrBvAtBp4wGcxy8W8+RdsP7MvAbIGqCv3u9mzc1w2PHrkP+DfPPbipwLnGi5rMfjaMu0mWI/BTNZgsk4aDgn2ZSAtc4eZey3mjTZo0pn4z96SLjN3fag/LdlRYvB0sBA0xvlbDz1MOJRVRKQWe5+TzDi36Wqun60kLwIDAQAB` |
| CNAME | `rsend.mail.anamnou`             | `rsend.forge.rmta.net`                                                                                                                                                                                                       |
| CNAME | `send.mail.anamnou`              | `send.forge.rmta.net`                                                                                                                                                                                                        |

After publication, verify public resolution and Resend domain status before
configuring production sending. Live password recovery is still unverified.

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
