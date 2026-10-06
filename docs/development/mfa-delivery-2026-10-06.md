# MFA milestone and compliance review, October 6, 2026

Continues `security-hardening-delivery-2026-10-06.md` and step 1 of the
[universal governance standard](universal-governance-standard.md). Baseline: `dcc6f4c`
on `feat/phase-3-yearbook`. This is a hardening milestone, not production
certification. It requires the security review mandated by AGENTS.md before merge.

## 1. Compliance and leak review of the baseline

Performed before any change. "Clean" means nothing was found by the checks listed,
not a guarantee of absence.

| Check                                                                                                              | Result                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| GitHub CI on `dcc6f4c`                                                                                             | Success (run 37479892839)                                                                                           |
| Full local `npm run check` on `dcc6f4c`, pinned Node 24.20.0                                                       | Passed: lint, format, types, 15 API unit, 28 UI, 35 integration, builds, 16 browser tests                           |
| All commits on all branches scanned for GitHub, AWS, OpenAI, Slack and Google token formats and private key blocks | None found                                                                                                          |
| Every file path ever committed scanned for `.env`, keys, keystores, dumps                                          | Only `.env.example` (blank secrets) and the backup script                                                           |
| Tracked files scanned for hardcoded password, secret, token or API key literals                                    | Only UI labels                                                                                                      |
| `.env`, `.env.test`, `.tools/` (backup key, dumps, demo credentials) ignored                                       | Confirmed with `git check-ignore`                                                                                   |
| Local service ports                                                                                                | PostgreSQL, MinIO and Mailpit bind to 127.0.0.1 only                                                                |
| Local API/web logs under `.tools/` scanned for 64-hex tokens, email addresses and password fields                  | None found; HTTP logs record method, status and duration only                                                       |
| API responses                                                                                                      | User shape excludes hashes; sessions omit token hashes; private profiles and contacts filtered server-side          |
| Web and native clients                                                                                             | No tokens in localStorage; native cookies stay in the platform store; Android backup disabled; cleartext debug-only |
| Error handling                                                                                                     | Fixed safe messages with request IDs; no stack traces or Prisma errors returned                                     |

Findings that remain open and are not leaks: no Content-Security-Policy is defined for
the web front end (its production host is not chosen); Capacitor `loggingBehavior:
'debug'` must be verified as silent in signed release builds; the GitHub credential
exposure from tooling history (gate 1) is outside the repository and still needs
revocation by the owner.

### Defect found and fixed

`IdentityService.login` incremented a per-account failure counter but never blocked
a correct guess: after ten failures the response became 429, and the correct password
still signed in. Online guessing was bounded only by the 60-per-minute per-address
request limit. Fixed as described below and covered by the updated integration test.

## 2. Changes

- TOTP MFA (RFC 6238) with QR and manual-key enrollment, ten one-use recovery codes,
  replay protection, five guesses per sign-in challenge and ten per account per
  15 minutes. Secrets sealed with AES-256-GCM bound to the user ID. No new dependency.
- Platform administrator privileges apply only on MFA-verified sessions; otherwise the
  account acts as an ordinary user and can enroll. School verification requires password
  plus factor.
- Login attempts counted per account and client address before password hashing; an
  attacking address cannot confirm a correct guess after ten attempts, while the owner
  signing in elsewhere is unaffected. Password reauthentication is limited per account.
- Password reset keeps MFA enrolled and deletes pending challenges. Enabling or disabling
  MFA signs out other sessions. All transitions audited without secrets or codes.
- Maintenance purges expired challenges and abandoned enrollments in bounded batches.
- Four-language sign-in code step and Account security panel.
- `setup:env` adds `MFA_ENCRYPTION_KEY` to existing `.env` files without changing others.

Design and trade-offs: [ADR 0011](../adr/0011-mfa-and-login-throttling.md).

## 3. Schema rollout

Migration `202610060003_mfa` is additive: nullable `User` MFA columns with consistency
check constraints, `Session.mfaVerifiedAt`, and new `MfaRecoveryCode` and `MfaChallenge`
tables. Applied to the local development and test databases. No existing rows change.
After rollout, existing platform administrators lose platform privileges until they
enroll and sign in with MFA; this is intended. Back up `MFA_ENCRYPTION_KEY` with the
database backup key; restoring a database without it disables enrolled factors.

## 4. Verification

Commands used pinned Node 24.20.0. Results are in section 6. New tests: five unit tests (RFC 6238 vectors, drift and
replay window, sealed-secret owner binding and tamper rejection, recovery code
normalization, enrollment URI) and one integration scenario covering enrollment,
stale-session revocation, challenge cookies, enrollment-code replay, used-step replay,
one-use recovery codes, challenge exhaustion, platform-role gating, school verification
step-up, disabling, and absence of secrets and codes in storage and audit rows. The
lockout test now proves an attacking address is refused even with the correct password
while the owner signs in from another address. Two UI tests cover enrollment and the
sign-in code step.

## 5. Remaining gates (unchanged unless noted)

1. Revoke the GitHub credential exposed in tooling history.
2. MFA: implemented for all accounts and required for platform administrators.
   Still open: whether school and class administrators must enroll (a governance
   decision), WebAuthn for privileged roles, and an audited administrator-assisted
   recovery process.
3. Governance step 1 continues: scoped role grants with expiry, review queues with
   primary and backup assignment, and access audits. Then steps 2 to 5.
4. Production infrastructure, monitoring, recovery and signed native releases.
5. Voting and publication remain out of scope.

## 6. Final verification results

`npm run check` passed on the final tree: lint, formatting, type checks, 20 API unit
tests, 30 UI tests, 36 integration tests, builds and 16 desktop/mobile browser tests.
The migration applied cleanly to the development and test databases, and
`prisma migrate diff` shows no drift from this schema change.

`npm audit` now reports one new high-severity advisory published after the hardening
run: `sharp` below 0.35.5 (bundled librsvg, SVG decoding). Uploads must carry JPEG,
PNG or WebP magic bytes before reaching `sharp`, so the SVG loader is not reachable
through the reviewed upload path. The exact pin is still raised to 0.35.5 in a
separate commit so the CI audit gate stays green.

Not verified: native Android/iOS MFA sign-in on a device, and production deployment.
