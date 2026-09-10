# ADR 0003: private local S3-compatible storage

Status: Accepted

Use a small ObjectStorage port and an AWS S3 protocol adapter targeting local
MinIO. This SDK implements the S3 protocol; no AWS account or cloud connection is
required. Endpoint, region, bucket and credentials come from validated configuration.

Use generated object keys in tests. Reject filesystem-style and traversal keys.
No upload routes are exposed in Phase 0. Read/write/delete operations are internal
infrastructure primitives, not a replacement for the future secure media pipeline.

Local bootstrap uses generated MinIO administrative credentials for convenience.
Production must provision a restricted bucket identity, TLS, backups and a reviewed
object retention policy. The local root identity is not production authorization.
