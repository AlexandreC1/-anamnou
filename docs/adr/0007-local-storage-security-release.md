# ADR 0007: build the MinIO security release locally

Status: Accepted

The published September 2025 MinIO image predates the October 2025 service-account
policy security fix. Build the upstream RELEASE.2025-10-15T17-29-55Z source tag in
a multi-stage Dockerfile, as upstream recommends for containers. Go is confined
to the build stage; developers need only Docker. Run the resulting container as
UID/GID 10001 with a persistent data volume.

Source:
https://github.com/minio/minio/releases/tag/RELEASE.2025-10-15T17-29-55Z

The upstream open-source repository is archived. This remains a local,
single-node development service, not a production storage recommendation.
The later ReadMultiple advisory explicitly excludes single-node standalone
deployments, which do not register the affected route:
https://github.com/minio/minio/security/advisories/GHSA-xh8f-g2qw-gcm7

Retain the cloud-independent S3 port. Before production, select a maintained
storage deployment and perform the full image/dependency security review.
No cloud account or commercial license is introduced into local setup.

The first container build is slower than pulling the old prebuilt image.
Docker caches subsequent builds. Existing local volume ownership must match
UID/GID 10001 when upgrading from the earlier development image.
