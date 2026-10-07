# Gmail account email delivery

Current state: project `anamnou-account-mail` is created, Gmail API is enabled,
and OAuth app configuration is created. The user selected their existing Gmail
address as sender. OAuth client and offline authorization remain pending.
Full `npm run check` passed with 125 tests; dependency audit found zero
vulnerabilities. These checks use mocked Gmail responses and local Mailpit,
not real Gmail inbox delivery.

Use a dedicated Anamnou Gmail account, separate from personal and Gidyo accounts.
Set `MAIL_TRANSPORT=gmail` and `MAIL_FROM` to that account's Gmail address.
Set `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN` only in
backend secret storage. Never paste tokens into chat or commit them.

Enable the Gmail API in a separate Google Cloud project. Configure an OAuth web
client and obtain offline authorization from the dedicated sender with only
`https://www.googleapis.com/auth/gmail.send`. No mailbox-reading scope is needed.
Keep the authorization callback controlled; use state protection and PKCE in the
provisioning flow. Sender authorization and refresh credentials are not provisioned.

Google OAuth testing-mode credentials can expire after seven days. Confirm
production consent settings and applicable verification requirements before launch.
Gmail sending limits and account suspension can interrupt recovery; this is a
low-volume option, not unlimited transactional email infrastructure.

The adapter refreshes an access token over HTTPS for each delivery, composes MIME
with the existing Nodemailer library, and sends through Gmail's HTTPS API. Both
requests reject redirects and have bounded timeouts. Provider errors are redacted.
The existing durable mail queue retries failed deliveries. Gmail has no equivalent
to Resend's idempotency key: ambiguous timeouts can cause duplicate messages.
Reset tokens retain their existing expiration and single-use rules.

Live delivery remains unverified until an actual inbox receives the message and
the full verification and password reset flow passes on the deployed application.

References: [Gmail sending](https://developers.google.com/workspace/gmail/api/guides/sending),
[OAuth scopes](https://developers.google.com/workspace/gmail/api/auth/scopes),
[OAuth refresh tokens](https://developers.google.com/identity/protocols/oauth2#expiration),
[Gmail limits](https://support.google.com/mail/answer/22839).
