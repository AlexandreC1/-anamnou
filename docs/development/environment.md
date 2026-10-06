# Environment variables

Only .env.example is committed. setup:env creates the private .env.
No session secret exists yet because Phase 0 has no session implementation.

| Variable           | Consumer / purpose                                              |
| ------------------ | --------------------------------------------------------------- |
| APP_ENV            | API validation; seed and storage setup reject production writes |
| API_PORT           | Nest listener                                                   |
| WEB_PORT           | Vite development and preview listener                           |
| PUBLIC_WEB_URL     | API's allowed CORS origin                                       |
| API_BASE_URL       | Server-side Vite /api proxy target                              |
| POSTGRES_PORT      | Compose host port, default 5432                                 |
| POSTGRES_DB        | PostgreSQL container initialization                             |
| POSTGRES_USER      | PostgreSQL container initialization                             |
| POSTGRES_PASSWORD  | PostgreSQL container initialization, generated locally          |
| DATABASE_URL       | Prisma CLI, API PostgreSQL adapter, seed                        |
| STORAGE_ENDPOINT   | S3 protocol endpoint                                            |
| STORAGE_REGION     | S3 request signing region                                       |
| STORAGE_BUCKET     | Private bucket name                                             |
| STORAGE_ACCESS_KEY | Local MinIO root user and S3 credential                         |
| STORAGE_SECRET_KEY | Local MinIO root password and S3 credential                     |
| MFA_ENCRYPTION_KEY | Base64 32-byte key sealing TOTP secrets (ADR 0011); back it up  |

Rerunning `npm run setup:env` on an existing .env adds a generated
MFA_ENCRYPTION_KEY if it is missing and leaves every other value unchanged.
Changing the key makes enrolled authenticators unusable; users then need recovery codes.

Keep DATABASE_URL consistent with the POSTGRES_* settings.
Local CLI scripts read root .env. API commands explicitly use ../../.env from the
API workspace. Existing process environment variables take precedence, which lets
E2E isolate application ports without copying credentials.

No VITE_* secret is used. The frontend build must not contain the database URL,
storage credentials or operator configuration.
