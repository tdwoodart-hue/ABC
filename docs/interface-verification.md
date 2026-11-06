# Bright Us interface verification

Checked 2026-11-06.

## Delivered

- Open Home layout with free-standing characters, a single strawberry action accent and neutral surfaces and locally hosted Be Vietnam Pro (Latin and Vietnamese subsets).
- Tap either character to replay its existing wave. The heart triggers a local burst and both waves; it does not claim to send a notification.
- Four functional shortcuts, direct journal creation, a swipeable recent-memory carousel, and an accessible journey dialog.
- Proper calendar-day relationship counting, a 100-day milestone tracker, explicit setup for missing/invalid dates and countdowns for future starts.
- Finance overview with separate balances/actions and desktop overview columns; nutrition energy/macros side by side with meals below; refreshed profile and journal headings.
- Keyboard focus trapping/restoration for the journey and More dialogs, safe-area navigation, and reduced motion.

## Checks

- TypeScript (`npm run lint`): passed.
- Production build (`npm run build`): passed. Existing large entry chunks remain a separate optimization concern.
- Node test suite: 13/13 passed. Calendar tests also passed under America/New_York for DST coverage.
- Updated two stale baseline assertions: More uses its actual “Lời nhắn” label; version validation accepts semantic versions while still checking the dynamic package-version display.
- Chromium visual checks: 360×800, 390×844, 768×1024 and 1440×1050, no horizontal overflow or uncaught page errors.
- Exercised heart burst, individual waves, carousel buttons and drag, opening a memory, creating a journal callback, journey dialog Tab/Escape, More dialog Escape, and reduced motion.
- Reviewed empty memories, long Vietnamese names, unset anniversary, login, and real Finance/Nutrition/Profile components with isolated fixture props.
- Rechecked desktop nutrition alignment after correcting grid placement.

## Limits and preview data

Browser review used empty couple IDs and blocked external Firebase requests. It did not authenticate or write production data. Journal creation/opening callbacks were checked in the component harness; production persistence still requires an authorized session.

The images, names, dates and counters in these screenshots are illustrative fixtures, not the user's stored memories. Preview photography: Unsplash (photo-1476514525535-07fb3b4ae5f1 and photo-1509042239860-f550ce710b93). The preview harness is local only and is not part of the production app.

[Mobile screenshot](design/home-mobile.webp) · [Desktop screenshot](design/home-desktop.webp)

## Taste Skill pass

Taste Skill 2.5.0 was installed with provenance and made the primary visual guide in AGENTS.md. The icon system, neutral shortcut group, secondary wake-up control and contrast corrections follow its system/icons/motion references. See taste-application.md for raw checker counts, remaining findings and app-specific adaptations; the marketing checker is not reported as fully passing. Existing 13 Node tests remain passing.
