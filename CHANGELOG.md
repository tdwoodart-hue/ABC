# Changelog

All notable changes to this project are recorded here.

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (`X.0.0`) for breaking changes.
- **MINOR** (`0.X.0`) for backwards-compatible features.
- **PATCH** (`0.0.X`) for backwards-compatible fixes.

## [0.3.20] - 2026-10-12

### Added

- Desktop-first application shell with a persistent left navigation sidebar from 1024px upward.
- Direct desktop access to Home, Journal, Nutrition, Finance, Achievements, Profile and Scheduled Messages.
- Desktop Home dashboard layout with greeting header, two-column couple/day hero area and a secondary utility rail.
- Current app version shown in the desktop sidebar.

### Changed

- The mobile bottom navigation now stays mobile-only while the desktop layout uses the available horizontal space.
- Desktop content expands up to 1320px instead of remaining constrained to the mobile-width column.
- Home keeps the existing mobile experience while receiving a dedicated desktop composition.

## [0.3.1] - 2026-09-29

### Added

- Encrypted scheduled messages in **Đôi lời muốn nói**.
- Timed server key release for messages opened in the app.

### Configuration

- Production requires `SCHEDULED_MESSAGES_KEY_SECRET` and Firebase Admin credentials in Vercel.
- Vercel Hobby does not run the background push cron; upgrade to Pro to enable timed background notifications.

## [0.2.0] - 2026-09-29

### Added

- Display the current app version in Account & Profile settings.

## [0.1.0] - 2026-09-29

### Added

- Established the first stable, recoverable release baseline.
- Added a changelog and Semantic Versioning policy.

