# ADR 0002: operational database foundation before business entities

Status: Accepted

Phase 0 expressly excludes business features. Creating users, memberships or
published snapshots now would preempt later phase design.

Use Prisma 7 with the PostgreSQL driver adapter and committed migrations.
SystemMetadata has a primary key and timestamp and proves that migration plus
seed setup has completed. The development seed inserts foundation_version=1
idempotently and refuses production mode.

The API owns one small connection pool. Readiness queries real persisted metadata.
Business entities, tenant foreign keys, ownership and domain uniqueness rules
will be implemented in their respective authorized phases. The current schema
must not be mistaken for the completed Bible data model.
