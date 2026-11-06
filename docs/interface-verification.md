# Interface refresh verification

Checked 2026-11-06.

- TypeScript (`npm run lint`) and production build passed. Vite reports large existing entry chunks (>500 kB).
- Chromium at 390×844 and 1440×1000: isolated Home fixtures render without horizontal overflow or uncaught page errors.
- Mobile navigation updates aria-current; More opens; reduced motion is respected; login fields have associated labels.
- Home fixtures used an empty couple ID and blocked remote Firebase requests to prevent automatic check-in writes. Relationship dates/counts in screenshots are sample data.
- Authenticated journal, finance, nutrition, and profile flows require an authorized session. Their shared palette changes in this pass; their individual layouts remain for the next pass.

## Existing test failures

Node test suite: 6 passed, 2 failed. Both failures are present at base commit 3e754a2:

- scheduled-messages-ui.test.mjs expects “Đôi lời muốn nói”; the unchanged MoreMenuSheet uses “Lời nhắn”.
- version-display.test.mjs asserts 0.3.19; the unchanged package version is 0.3.22.

Neither test was modified to conceal these baseline failures.
