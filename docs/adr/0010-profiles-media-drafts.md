# ADR 0010: Private profiles, normalized media and editable yearbook drafts

Status: Accepted for Phase 3.

Preserve the existing React/NestJS monolith, sessions, class permissions, PostgreSQL,
MinIO adapter and four-language UI. The Phase 2 working tree was clean at bc53ede.
The main UX gap is a sparse class landing page without clear contribution/reading
actions; this phase adds a publication-oriented overview and contextual navigation.

Profiles belong to class memberships. Only their owner can edit them; class admins
cannot edit another person's profile. Profile visibility defaults PRIVATE and can
be explicitly changed to CLASS. Optional contact text has an independent PRIVATE
default and is excluded from directory/yearbook responses. Class admins receive
aggregate contribution counts, never private profile text. Guests cannot read
drafts, member profiles or media. Removed memberships lose access immediately.

Uploads use authenticated intent → bounded binary content → completion. The API
authorizes the intent before reading bytes, accepts only JPEG/PNG/WebP, checks
signatures and decoded metadata, rejects animation, enforces 8 MiB / 16 MP / 8192px
limits and a 128px minimum, and re-encodes to WebP without EXIF. Original bytes are
never stored. Generated keys remain behind the storage adapter. Media bytes are
served through the API with fresh tenant/profile visibility authorization and
no-store headers. No public bucket or provider-specific application logic.

Intent expiry is 15 minutes. Uploads cannot overwrite a ready asset; changed photos
create new IDs/keys. Pending uploads are private to their creator. Completion is
idempotent. Deletion first hides/detaches an asset in a transaction, then deletes
its object; retrying deletion repeats storage cleanup if necessary. The API never
pretends object deletion succeeded. Abandoned intents are bounded by per-account
limits and can be cleaned with the documented maintenance command. No autonomous
background worker or extra service is needed for this phase.

Yearbooks are editable drafts with version-based optimistic concurrency. Sections
have stable IDs, ordered positions, validated types, plain text and scoped image
references. Initial section types support cover, class message/photo, member/staff
pages, quotes, galleries, acknowledgements and graduation details. Voting-generated
superlatives arrive in Phase 4. Preview reads current CLASS-visible profile content
in paginated batches; it is explicitly not a historical artifact. No published
boolean, publication endpoint or snapshot is introduced now. Phase 5 must copy
content and preserve immutable media references in a versioned publication.

UI edits use explicit save with visible status and conflict recovery. A save button
is preferable to implicit autosave for privacy changes and section reordering.
Photo upload has progress/error feedback and preserves the old photo on failure.
The application uses the existing typefaces and warm palette, with clearer action
hierarchy and a responsive editorial reader rather than blank dashboard space.
