# Local operations and recovery

## Start and stop

npm run infra:up starts PostgreSQL and MinIO and waits for their health checks.
npm run infra:down stops the project infrastructure while preserving volumes.
Ctrl+C stops host application processes. Application shutdown closes database
and storage clients. Do not terminate unrelated Node or PostgreSQL processes.

Changing POSTGRES_PASSWORD after a volume is initialized does not change the
existing database role password. Preserve the original .env or perform a deliberate
database credential rotation. Do not silently delete the volume.

## Migrations

npm run db:migrate deploys committed migrations. npm run db:dev is for authoring a
new development migration, followed by review and tests. Do not edit an applied
migration. Back up real data before schema changes and prefer forward fixes.

The seed is development-only, deterministic and idempotent. It creates one
operational row, not student accounts. Run it twice to verify idempotency.

## Backup and rollback considerations

The Docker volumes are persistence, not backups. No automated backup service is
installed in Phase 0. Before production, provide scheduled PostgreSQL backups,
object backups and verified restoration into an isolated environment.

To revert an application release, use the previously tested source revision and
rebuild it. Database rollback is not automatically safe: check schema compatibility
and restore or apply a reviewed forward migration. Do not infer a reversible
database change from a successful git checkout.

## Production boundary

The compiled web build belongs behind a static server with SPA fallback and an
/api reverse proxy. NestJS currently binds loopback for host-based deployment;
TLS and production proxy configuration are not shipped in this local-only phase.
Do not use Vite preview as a public production server.
