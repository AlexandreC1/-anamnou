# Haitian graduation demo photography

The landing page's illustrated yearbook uses real institutional photographs
instead of the previous generic stock photograph. These are presentation assets,
not student accounts, user uploads, or evidence of an Anamnou partnership.
No fictional names or profile biographies are attached to the people pictured.

| Asset                          | Source page              | Original image                          | Optimized size            |
| ------------------------------ | ------------------------ | --------------------------------------- | ------------------------- |
| `haitian-graduates-chcl.webp`  | https://chcl.ueh.edu.ht/ | https://chcl.ueh.edu.ht/image/img7.jpg  | 1600 × 577; 211,928 bytes |
| `haitian-graduation-unah.webp` | https://unah.edu.ht/     | https://unah.edu.ht/images/MG_1316.webp | 1200 × 800; 143,874 bytes |

Retrieved October 6, 2026. The former suggested UNAH `slide-3.webp` URL returned
404; the current site provided the ceremony photograph above. The UNAH image
shows ceremony participants, including academic officials, and is not labeled
as a student portrait. Visible credits link to both institutions in all four
supported interface languages. Institutional publication establishes provenance,
not the nationality, age, consent status, or identity of every pictured person.

Sharp was used only to downsize and encode WebP, without changing faces or
inventing scene elements. Same-origin local files avoid third-party image
requests and upstream link failures. The combined 355,802 bytes are smaller
than the previous 429,516-byte stock image. Explicit dimensions reserve space.

## Rights status

The user authorized use for the demo after being told reuse licenses were
unconfirmed. No explicit reusable license or model releases were found. Credit
is not a substitute for permission. Before a public/commercial launch, obtain
permission covering the intended use, or replace these photographs with
licensed or participant-approved assets. These photographs do not acquire the
repository's source-code license; copyright remains with the respective owners.

## Delivery verification

Changed `apps/web/src/LandingPage.tsx`, `apps/web/src/prism.css`, the two
optimized assets in `apps/web/public/images`, and this document. Removed the
unused `apps/web/public/images/graduation-friends.jpg` stock asset.

`npm run check` passed: lint, formatting, type checks, production builds,
20 API unit tests, 34 frontend tests, 37 integration tests, and 20 desktop/mobile
browser tests. `npm audit --audit-level=high` reported zero vulnerabilities.
The in-app browser confirmed both images decoded, readable source credits,
working book controls, and no horizontal overflow on the phone layout. Local
image delivery and API readiness returned 200. No database or student records
were changed.
