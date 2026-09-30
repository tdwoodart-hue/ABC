# UI assets

Keep visual assets grouped by screen/feature so future redesigns stay easy to manage.

Current structure:

- `home/`: illustrations used only on the Home screen.
- Add future groups as sibling folders, for example `nutrition/`, `journal/`, `finance/`, `profile/`.

Naming rules:

- lowercase kebab-case
- name by purpose, not by temporary component name
- prefer SVG for small UI illustrations/icons
- use WebP/PNG only when the artwork cannot be represented cleanly as SVG

All app code should reference assets through `src/config/uiAssets.ts` instead of scattering hard-coded asset paths across components.
