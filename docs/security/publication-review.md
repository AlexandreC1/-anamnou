# Phase 3 security review

Scope is private profiles, normalized images and mutable yearbook drafts. The
existing session, Origin/CSRF, rate limiting and tenant locking architecture remains.

- Composite foreign keys tie profile→membership, profile→photo, section→yearbook and
  section→media to the same class. Database checks bound image metadata, draft themes,
  positive versions and section positions. A member has one profile per membership.
- Every service revalidates class access under the class row lock. Own-profile writes
  explicitly allow members while ordinary class/yearbook mutations retain admin checks.
  Guests are excluded; removed memberships lose read/write access.
- Private profile content is not readable by admins; progress is aggregate. Optional
  contacts are separately private and excluded from draft/directory projections.
- The API authorizes before image buffering, validates declared size, signatures and
  decoded dimensions, rejects animation (including APNG container detection), strips
  metadata and re-encodes. It never accepts URLs, arbitrary keys or original filenames.
  SVG/HTML are rejected; renderers use escaped React text and no raw HTML insertion.
- Four upload requests and two image decoders can run concurrently in one process.
  Request/account limits, body bounds and a 60-second upload deadline bound abuse.
  These are local-process limits; horizontal deployment requires a reviewed shared
  edge limit or equivalent before release.
- Versions and class locks prevent stale profile/draft writes and media detach races.
  Owner deletion can include the expected profile version. Storage failures propagate;
  cleanup retries orphaned objects using database metadata, never filesystem paths.
- Audit entries include scope, actor, operation and version/status metadata. No profile
  text, contact details, tokens or bytes are logged. Operational cleanup is identified
  as `media.cleanup` with a null actor and prior status.

Tests cover authorization bypass, guest/removed access, cross-class/school IDs,
private contact leakage, forbidden member draft writes, stale updates, CSRF, unknown
properties, mismatched/forged/oversized images, expired uploads, database isolation
constraints, immutable READY bytes, reference detachment and safe audit metadata.
Browser tests use literal HTML attack text to verify safe rendering. This adds no
URL ingestion surface, so no media-fetch SSRF route exists.

Production release is not claimed. Deployment still needs the broader Bible gate:
independent security review, backups/restore, operational monitoring, measured resource
budgets and immutable snapshot retention. Before Phase 5, deletion/cleanup must learn
about published references and corrections must create new publications.

## Studio milestone: profile photo metadata

Profile reads and saves now include selected photo metadata (`id`, `alt`, `width`,
`height`). The existing class, member and profile visibility checks still run before
returning a profile. No storage key or media ownership field is selected. Integration
coverage checks the exact photo shape and confirms private contact and internal media
fields are absent from a classmate response. Directory links do not bypass private
profile visibility; inaccessible pages continue to return the existing unavailable state.
