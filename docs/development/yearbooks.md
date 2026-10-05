# Phase 3: profiles, photos and yearbook drafts

Use the existing README first-start commands. No new environment variables or Docker
services are needed. Run `npm ci`, `npm run db:generate`, and `npm run db:migrate`
after pulling this branch. The new migration adds profiles, normalized media metadata,
yearbooks and ordered sections; it does not rewrite existing accounts/classes.

`npm run db:seed:demo` adds fictional shared profiles and a sample draft to the existing
development demo school/class. It preserves existing records and passwords. Local
credentials remain in ignored `.tools/demo-credentials.json`. No photos are fabricated
as user uploads; use a local JPEG/PNG/WebP through the normal UI to exercise uploads.

## Try it

1. Sign in and open **My Class**, then select your class.
2. A class/school admin sees contribution counts and actions for editing, inviting,
   and member management. Counts are aggregate; admins cannot read private profiles.
3. Open **Edit your page**. Add optional biography, quote, activities and aspirations.
   Describe a photo, then select the image. Upload and saving are separate actions:
   the photo only joins the profile when you save. Only the display name is required.
4. Choose **My class** to include the profile in the draft. Contacts have a separate
   visibility setting and never appear in the yearbook or member directory.
5. As an admin, open **Edit the yearbook**. Set the title/theme, edit and reorder
   sections, and add class/gallery photos. Every image requires descriptive text.
6. Choose **Save & preview** in either editor to save and open the draft in one step.
   A failed save keeps the editor open with your input intact. **Save changes** still
   saves without leaving the editor. Member/staff/quote pages use current shared profiles.
   This is a mutable draft, explicitly labeled; there is no publish button yet.

Both editors keep input on failure and show saved/error states. While a save is pending, editing and photo uploads are disabled so the saved confirmation matches the submitted content. Controls become available again after success or failure. Concurrent changes
return a conflict: copy your unsaved work before choosing **Reload latest version**.
Save before navigating away. No implicit autosave is used for privacy changes.
Saving and previewing preserves your selected privacy settings; it does not share
a private profile. When a required section field is empty, saving opens its collapsed
section so you can correct the field using the keyboard or touch.

## Media operations

JPEG, PNG and WebP only, still images, 8 MiB maximum; source dimensions at least
128×128, at most 8192 on either side and 16 million pixels total. The API fully
decodes and re-encodes to WebP at maximum 2400×2400 without enlargement or EXIF.
Bytes are private in MinIO and served by authenticated API routes, never public URLs.

`npm run media:cleanup` processes at most 100 abandoned/deleted assets per invocation.
It deletes objects for expired 15-minute unfinished intents and unattached READY
assets older than 24 hours, retaining metadata tombstones. Attached images are
preserved. It retries deletion tombstones in oldest-update order; repeat/schedule
the command for larger installations. A failure exits nonzero; investigate storage
availability before retrying. It does not delete profiles or yearbook text.

Deleting a profile photo is explicit and confirmed. Deletion detaches references
and increments affected versions before object deletion. A storage error is surfaced,
and subsequent cleanup or DELETE retries remove the inaccessible object. The editor
sends its profile version to avoid overwriting concurrent edits when deleting photos.

## Verification

`npm run check` includes image normalization unit tests, UI failure/conflict tests,
PostgreSQL/MinIO API security tests and desktop/mobile Playwright journeys. The
yearbook E2E registers and verifies two real accounts, creates a school/class and
invitation, uploads member/class photos, saves a shared profile and draft, reads
the preview, checks literal XSS text, contact exclusion and four-language navigation.

No SaaS, Vercel integration, Redis, video editing, voting, publication or alumni
features are added by this phase. A private published media retention policy must
be added with immutable snapshots in Phase 5 before enabling publication.
