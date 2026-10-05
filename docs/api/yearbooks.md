# Profile, media and draft API

OpenAPI at `/openapi.json` is generated from the same Zod input shapes. All routes
require a verified active session. Mutations require the configured web Origin,
reject cross-site fetch metadata, and require JSON except binary upload content.
Errors use the existing safe envelope and request IDs.

| Method and route                             | Behavior                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| GET `/classes/:id/members/:memberId/profile` | Owner (`me`) or active class-visible profile; excludes private contacts                      |
| PATCH `/classes/:id/members/me/profile`      | Owner only; strict complete editable payload with expected version                           |
| GET `/classes/:id/profile-progress`          | Class/school admin only; member, profile, photo and quote totals                             |
| GET `/classes/:id/yearbook`                  | Draft configuration, ordered sections/media, class context, edit permission                  |
| PATCH `/classes/:id/yearbook`                | Admin only; expected version, title, theme, 1–20 ordered sections                            |
| GET `/classes/:id/yearbook/members`          | Shared profiles, no contacts; page/pageSize ≤50; optional kind MEMBERS/STAFF/QUOTES          |
| POST `/media/upload-intent`                  | Scope/purpose, declared MIME/size, descriptive alt; returns opaque ID and expiry             |
| POST `/media/:id/content`                    | Authorized owner sends exact declared bytes as application/octet-stream                      |
| POST `/media/:id/complete`                   | Empty JSON body; makes normalized uploaded asset READY; idempotent                           |
| GET `/media/:id/content`                     | Authorized READY image; image/webp, no-store, no provider URL                                |
| DELETE `/media/:id`                          | Owner or class admin; JSON body with optional expected profileVersion; detach, audit, delete |

Versions begin at 0 for an unsaved profile/draft and 1 on first save. Stale writes
return 409. PATCH yearbook returns the new version and ordered stable section IDs.
Profile optional strings accept null. Visibility/contactVisibility accept PRIVATE
or CLASS. Themes are PAPER, INK and GARDEN. Text is plain text, never rich HTML.

Section types: COVER, MESSAGE, CLASS_PHOTO, MEMBERS, STAFF, QUOTES, GALLERY,
ACKNOWLEDGEMENTS and GRADUATION. Each has title, body and at most 12 distinct READY
YEARBOOK media IDs belonging to that class. Existing section IDs must belong to
the draft; new sections omit IDs. Omitted draft sections are removed transactionally.

Intent status: PENDING → UPLOADED → READY; DELETED is inaccessible. Only the owner
uploads/completes an intent. Class admins may remove scoped media. Guest/removed
members and other tenants cannot read images or drafts. Pending/unattached profile
media is creator-private. Shared profile images inherit active-profile visibility;
yearbook images become visible to the class when attached to draft sections.

Upload intent limits: 10 per account per 15 minutes and 10 active unfinished intents
per owner/class. Existing IP limits also apply. Four concurrent binary requests and
two decoders per API process cap memory demand; ingestion expires after 60 seconds.
Bodies are capped at 8 MiB for binary images, 128 KiB for yearbook PATCH, and 16 KiB
for ordinary JSON requests. The API validates membership before buffering images.

There is no snapshot/publication API in Phase 3. Future historical data must be
copied into immutable versioned snapshots and retain its original media assets.
