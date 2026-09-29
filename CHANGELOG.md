# Changelog

All notable changes to this project are recorded here.

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (`X.0.0`) for breaking changes.
- **MINOR** (`0.X.0`) for backwards-compatible features.
- **PATCH** (`0.0.X`) for backwards-compatible fixes.

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

