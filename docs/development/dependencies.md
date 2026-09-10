# Dependency decisions

The exact dependency graph is committed in package-lock.json. Reproduce it with
npm ci, not a fresh unconstrained resolution.

| Dependency family                                                      | Concrete reason                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| React / React DOM / React Router                                       | Required frontend and route architecture                                             |
| Vite / React plugin                                                    | Bible-default build system and development proxy                                     |
| NestJS common / core / platform-express                                | Required modular backend and HTTP adapter                                            |
| NestJS Swagger                                                         | Generated OpenAPI for the real operations endpoints                                  |
| TypeScript / type definitions                                          | Strict type checking and decorator-aware API compilation                             |
| Prisma / Prisma Client / PostgreSQL adapter / pg                       | Required migrations and real PostgreSQL persistence                                  |
| AWS SDK S3 client                                                      | S3 protocol access to local MinIO without provider-specific business logic           |
| Zod                                                                    | Validates environment values with safe failure messages                              |
| class-validator / class-transformer                                    | Nest's global validation pipeline for future explicit DTOs                           |
| reflect-metadata / rxjs                                                | Nest framework runtime dependencies                                                  |
| Helmet / express-rate-limit                                            | Standard security headers and bounded public requests                                |
| dotenv                                                                 | Root CLI configuration loading; app startup uses Node's env-file support             |
| tsc-watch                                                              | Restart compiled API on successful development builds, preserving decorator metadata |
| tsx                                                                    | Execute seed and infrastructure scripts without a separate build artifact            |
| ESLint / typescript-eslint / hooks and accessibility plugins / globals | Consistent source checks without disabling rules                                     |
| Prettier                                                               | Deterministic formatting                                                             |
| Node built-in test runner                                              | API tests with no additional backend test framework                                  |
| Vitest / jsdom / Testing Library                                       | Browser component behavior and accessible queries                                    |
| Playwright                                                             | Real compiled-app desktop/mobile journeys and diagnostic traces                      |
| Fontsource Literata / Public Sans                                      | Local font assets; no runtime CDN or third-party font requests                       |

No shared package, Redux, UI component framework, analytics SaaS, Redis, queue,
authentication provider or extra microservice has been introduced.

## Security overrides

Initial npm audit reported 8 high-severity dependency entries. Pinned transitive
updates to multer 2.3.0, deepmerge-ts 8.0.2 and mysql2 3.24.4 resolve the reported
issues without changing the selected NestJS/Prisma major versions. Deepmerge's
major override is exercised by Prisma generate and migrate/seed commands.
Remove overrides once the upstream dependency graph selects safe versions.

The npm advisory checker is one source of evidence, not a complete security review.

## Infrastructure images

PostgreSQL uses the 17.11 maintenance release. MinIO is built from the pinned
October 2025 upstream security-release source using Go 1.26.7, then runs as a
non-root user in Alpine. See ADR 0007 for the source and maintenance boundary.
