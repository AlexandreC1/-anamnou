# Homepage direction, November 23, 2026

The creator supplied Plug's Black Friday collection as inspiration and clarified
that it should not be reproduced literally. They also rejected decorative
multicolor text, italics, repeated actions and unnecessary marketing information.

## Current result

The homepage contains a plain product heading, one explanatory sentence, Create
Class and Join Class actions, and the existing interactive sample yearbook. Photo
attribution and the sample label remain to identify the source and illustrated
nature of the book. Existing class, account, language and appearance navigation
remain available.

Removed the hanging gift tags, campaign contours, sale-style typography, colored
heading emphasis, decorative note, slogans, repeated feature sections and closing
call to action. The reference informs visual hierarchy and spacing; Anamnou keeps
its own warm palette and yearbook composition. Interface heading and body text
use the same ink color and normal font style. Existing appearance preferences
continue to affect the book.

The language selector now uses the same Public Sans typography as navigation,
fits its selected label and retains a 44-pixel touch target. English measured
approximately 78 pixels wide. Native selection and four-language persistence
remain intact. The book cover now has front and reverse faces on a hinged leaf;
opening reveals a connected two-page spread with the cover lining, spine and
page edges visible. Closing reverses the same transition. Reduced motion skips
the animation without changing the open/closed states.

## Implementation

- `apps/web/src/LandingPage.tsx`: concise four-language copy and focused actions.
- `apps/web/src/collection.css`: scoped responsive styling and readable preview.
- `apps/web/src/App.tsx`: direct homepage component and no marketing footer there.
- `apps/web/src/main.tsx`: removed the extra font weight from the initial pass.
- `.impeccable.md`: creator corrections recorded for future design work.
- Existing frontend/browser checks updated for the actual labels and navigation.

The earlier duplicate Back to my classes fix remains in place. These changes do
not alter authentication, authorization or deployment configuration.

## Verification

Lint, all 42 frontend tests, frontend type checking and production build passed.
The browser confirmed normal heading font style, identical heading/body ink,
zero emphasis elements, a single My Class navigation link and no horizontal
overflow at 320 pixels in all four languages. All 12 desktop/mobile navigation
and visual tests passed, including page loading, preloading without private-data
requests, route recovery, keyboard access and reduced motion.

The application's outstanding release blockers remain in the
[release work record](release-work-2026-11-23.md).
