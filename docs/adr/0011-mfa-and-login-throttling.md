# ADR 0011: authenticator MFA, MFA-gated platform privileges and per-address login limits

Status: Implemented on `feat/phase-3-yearbook`, October 6, 2026. Awaiting the
security review required by AGENTS.md before merge. First item of step 1 in the
[universal governance standard](../development/universal-governance-standard.md).

## Context

The hardening report listed MFA as launch gate 2. The governance standard requires
MFA and recent reauthentication for sensitive work. A review of `IdentityService.login`
also found that the per-account failure counter never prevented a correct guess:
after ten failures the response became 429, yet the correct password still signed
in. Online guessing was therefore bounded only by per-address request limits.

## Decision

**Factor.** RFC 6238 TOTP (HMAC-SHA1, six digits, 30-second steps), the profile
common authenticator apps support. Implemented in `apps/api/src/auth/mfa.ts` on
`node:crypto` instead of adding a dependency; unit tests use the RFC reference
vectors. One step of clock drift is accepted either way. The last accepted step
is stored and a code is accepted only if its step is newer, so a code cannot be
replayed, including the one used at enrollment.

**Secret storage.** 160-bit secrets are sealed with AES-256-GCM under
`MFA_ENCRYPTION_KEY` (base64, 32 bytes, required configuration). The user ID is
authenticated associated data: a sealed value copied onto another account fails
to open. Pending enrollments use a distinct context and expire after ten minutes;
maintenance clears abandoned ones. Database check constraints keep secret and
enabled state consistent. Losing the key makes enrolled factors unusable (users
fall back to recovery codes or administrator-assisted recovery), so the key must be
backed up with the database backup key and rotated through a re-enrollment plan.

**Recovery codes.** Ten one-use codes of 80 random bits each, shown once.
Only SHA-256 digests are stored; high entropy makes a slow hash unnecessary.
Use is audited (`auth.mfa_recovery_used`).

**Sign-in.** A correct password for an MFA account returns `{ mfaRequired: true }`
and an HttpOnly, SameSite=Strict `yearbook_mfa` cookie holding a random challenge
token (hash stored, five-minute lifetime, five guesses, counted atomically before
checking). A session is created only when `POST /auth/mfa` succeeds. An account-wide
counter also limits factor guesses to ten per 15 minutes across challenges.
Password reset deletes outstanding challenges but keeps MFA enrolled, so control
of the email inbox alone does not bypass the second factor.

**Enrollment and changes.** Setup requires the current password. Enabling requires
a current code, signs out every other session and marks the current one as
MFA-verified. Disabling or regenerating recovery codes requires the password and
a factor. All transitions are audited without secrets or codes.

**Platform privileges.** `Session.mfaVerifiedAt` records whether a session proved a
second factor. `authenticate()` returns a `PLATFORM_ADMIN` as an ordinary `USER`
unless the account has MFA enabled and the session is MFA-verified. Every existing
authorization check reads `user.role`, so platform-wide access is gated in one place.
An administrator without MFA can still sign in and enroll. `requirePlatformAdmin`
additionally requires `mfaEnabledAt`. School verification now requires the password
and a factor (step-up) on an MFA-verified session.

**Scope of the requirement.** MFA is mandatory for platform administrators only.
It is available to every account but not yet required for school or class
administrators, many of whom may be students. Making it mandatory for those roles
is a governance decision for the scoped role-grant work, not a silent default here.

**Login throttling.** Every attempt for an account from a client address is counted
before password hashing. After ten attempts in 15 minutes that address is refused
for that account, including a correct guess; the owner signing in from another
address is unaffected. This replaces account-wide blocking, which would let anyone
lock out a known email. Correct sign-in clears both counters. Password reauthentication
for sensitive operations is limited to ten attempts per account per 15 minutes.

## Consequences

- Production deployments behind a proxy must set `TRUST_PROXY_CIDRS`; otherwise every
  client shares the proxy address and the per-address limit becomes account-wide.
- Distributed guessing remains possible at ten attempts per address per account per
  15 minutes. The 15-character password minimum and MFA are the primary controls.
- MFA is phishable in real time (TOTP is not origin-bound). WebAuthn/passkeys are the
  stronger follow-up for privileged roles.
- No administrator-assisted MFA reset exists yet. It belongs in the governance case
  workflow with identity proofing and two-person approval, not a support shortcut.
- Existing `.env` files gain a generated key via `npm run setup:env`.
