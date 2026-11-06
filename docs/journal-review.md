# Journal interface refresh

The Journal tab now has one reading column and a desktop month index. The newest day is expanded; older days with several posts show a small summary instead of a second large photo collage. Single-post days remain visible. Choosing a month opens its newest day, and notification/deep-link targets still expand their day and scroll to the correct post.

The composer exposes the optional title beside the main text, keeps its date visible and groups camera, upload, location, people, voice and extras in one toolbar. Optional panels and day/comment content use short opacity transitions, with no animation under reduced motion. Photo hover zoom is limited to fine pointers. Existing author restrictions, upload/GPS handlers, two-person deletion approval, music and voice memo callbacks remain.

Photos use a single borderless gallery grid. The selected cover displays first while retaining every original media index for the lightbox and image comments. Missing thumbnails show a usable open-media fallback. Comments open on demand, show the latest three first, and expand to the complete thread without an inner scrolling box. Comment submission has a pending state and does not clear the draft itself; the existing callback remains responsible for persistence and clearing on success.

Taste Skill and the existing Motion stack were sufficient; no additional runtime library or design skill was installed. Icons, neutrals and the single accent match the current Home.

## Validation

- TypeScript and production build passed; the existing large bundle warning remains.
- Node tests: 17/17 passed. New behavioral tests cover grouping order, missing dates, cover reordering, invalid cover indices and duplicate media URLs.
- Headless browser interaction checks at 360, 390, 768 and 1440px found no horizontal overflow or uncaught page errors.
- Exercised day expand/collapse; desktop month filtering; search and no-results reset; filter dialog keyboard focus/Escape; comment submission; compose with location and expenses; edit; deletion request/cancel; old-day deep links; empty mobile composer; reduced motion.
- Taste shoot.mjs provides the visual review screenshots. App interaction checks use the documented Playwright adaptation in taste-application.md.

## Limits

Browser checks used local React fixtures, empty couple IDs and blocked remote Firebase requests. No production data was written. Actual authenticated persistence, camera, microphone, GPS and real media uploads still require an authorized device session. Map/location tracking components and Firestore rules were not changed.

The preview photos, dates, names and counts are illustrative fixture data. The local fixture harness is not shipped with the app.
