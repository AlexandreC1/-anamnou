# Phase 0 repository audit

## Existing architecture

The repository https://github.com/AlexandreC1/-anamnou was cloned into
`C:\Users\charl\-anamnou`. It has no commits and no application files.
There is no package manager configuration, lockfile, TypeScript configuration,
ESLint configuration, formatting configuration, environment file, Docker file,
CI workflow, test, database configuration, Prisma schema, README, or product Bible.
No root AGENTS.md was found in the parent workspace.

## Existing dependencies

No project dependencies exist. Installed tools observed during this audit:

- Node v26.4.0
- npm 11.17.0
- Git 2.51.0.windows.1
- Docker 29.3.1
- Docker Compose v5.1.1

Version commands establish installation only. Docker daemon availability,
container startup, port availability, and package compatibility are unverified.

## Existing useful code

None. The Git origin is already configured correctly. Main has no commits.

## Existing problems

PROJECT_BIBLE.md is missing. The user's instructions explicitly require reading
it in full before writing code. The master build instructions are not a substitute
for the missing authoritative product specification.

The Windows sandbox process launcher fails with
`SetTokenInformation(TokenDefaultDacl) failed: 1344`. Read-only audit commands
and cloning succeeded with approved execution outside the sandbox.

## Recommended target architecture

Subject to checking the Bible, use the user-requested modular monorepo:
React, TypeScript, and React Router in apps/web; a NestJS REST modular monolith
in apps/api; PostgreSQL and Prisma; local S3-compatible MinIO storage.
Run applications as host Node processes and infrastructure in Docker Compose.
Use web port 3000, API port 4000, PostgreSQL port 5432, and MinIO ports 9000/9001,
subject to checking availability. Keep business features out of Phase 0.

Use npm workspaces with a committed lockfile. Create shared packages only for
actual shared code or configuration. Pin and verify a supported Node LTS version
before dependency installation; the installed Node version is not a project pin.

## Files to preserve

Preserve Git metadata, origin, and the supplied engineering contract. Preserve
the authoritative Bible unchanged when supplied.

## Files to replace

None.

## Risks

- Product fidelity cannot be established until the Bible is available.
- Local infrastructure and builds have not been exercised.
- No application security behavior exists or has been tested.
- Phase 0 is not complete.

## Open decisions

- Obtain and read the authoritative PROJECT_BIBLE.md.
- Select supported dependency versions and document concrete reasons for each.
- Confirm Phase 0 database migration and infrastructure seed strategy without
  implementing business entities or identity prematurely.

## Commands and results

- Initial sandboxed repository inspection: failed before process startup.
- `git ls-remote https://github.com/AlexandreC1/-anamnou.git`: exit 0, no refs.
- `git clone https://github.com/AlexandreC1/-anamnou.git C:\Users\charl\-anamnou`:
  exit 0, empty repository warning.
- `git status --short --branch`: no commits on main.
- `git remote -v`: expected GitHub origin for fetch and push.
- `rg --files --hidden -g '!.git/**'`: no application files.
- `node --version`, `npm.cmd --version`, `git --version`, `docker --version`,
  `docker compose version`: versions recorded above.

No install, lint, typecheck, tests, migrations, build, or manual application
verification has run. No commits or pushes have been performed.

## Audit follow-up

The creator supplied the Bible from Downloads. It was read in full and copied
byte-for-byte to PROJECT_BIBLE.md; SHA-256 is
42fc3dbac6ca88f9e33dd6acfa0a173543e0c3d1008fad379aa4a425f4083e39.
The initial missing-document blocker is resolved. See phase-0-report.md for
current implementation and verification status.
