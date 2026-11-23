# Plug collection reference, November 23, 2026

The creator requested the design of
[Plug's Black Friday collection](https://www.plug.tech/collections/black-friday-deals).
This adapts its visual composition to Anamnou's existing yearbook product.

## Delivered design

- Compact white homepage navigation with all existing account, class, language
  and appearance destinations retained.
- Full-width dark hero, orange atmospheric background, curved contour lines,
  bold uppercase purple/white heading and pill-shaped primary action.
- Existing interactive 3D yearbook, original Anamnou copy and credited Haitian
  graduation photography. Opening the cover reveals a readable sample page;
  the decorative note moves out of the way.
- Four hanging illustrated tags: three navigate to the corresponding feature
  explanation; the fourth opens the actual invitation-acceptance screen.
- Clean image-led feature cards and a dark closing invitation/footer.
- Phone layouts, visible keyboard focus and reduced-motion support. Essential
  hero content renders immediately rather than starting transparent.

No Plug logo, commercial copy, product images, shopping functionality, invented
prices, testimonials or class data were introduced. The homepage continues to
identify the book as an illustrated edition. Authentication, participation
restrictions, API deployment and launch status are unchanged.

## Source files

- `.impeccable.md`: updated creator direction.
- `apps/web/src/App.tsx`: homepage-specific shell and stylesheet import.
- `apps/web/src/LandingPage.tsx`: contour artwork, semantic category navigation,
  section targets and accessible spacing in the headline.
- `apps/web/src/collection.css`: scoped responsive design and preview treatment.
- `apps/web/src/main.tsx`: locally served Public Sans 800 from the existing font
  package; no new dependency or remote font request.
- `apps/web/src/ClassCommon.tsx` and `apps/web/src/Classes.tsx`: follow-up fix for
  the creator's reported duplicate back link. Pages that already provide their
  own return link suppress the shared error panel's copy. A 401 shows one sign-in
  action; retry remains available for actual load failures.

## Verification record

Manual browser checks verified tag-to-section navigation, the invitation
destination, cover open/close state, readable sample-page contrast and no
horizontal overflow at 320 pixels in English, French, Haitian Creole and Spanish.
Desktop and phone compositions were inspected visually.

`npm run check` passed all 129 tests, lint, formatting, type checks and build.
After final preview-contrast refinements and the reported duplicate-link fix,
lint, frontend type checks, all 42 frontend tests, frontend build and both
desktop/mobile visual journeys passed again. `npm audit --audit-level=high`
reported zero vulnerabilities. Local web and API readiness returned 200.

The browser confirmed one back link, one sign-in action and no retry button on
the signed-out Create Class screen. The same duplicate-link composition was
corrected in School Manage and Class Home. No server authorization changed.

The service's outstanding release blockers remain in the
[release work record](release-work-2026-11-23.md).
