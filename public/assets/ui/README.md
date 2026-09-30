# UI assets

Keep visual assets grouped by screen/feature so future redesigns stay easy to manage.

Current structure:

- `home/approved/`: user-approved final Home artwork used in production.
- Add future groups as sibling folders, for example `nutrition/`, `journal/`, `finance/`, `profile/`.

Naming rules:

- lowercase kebab-case
- name by purpose, not by temporary component name
- keep approved raster artwork as WebP/PNG; do not redraw it as a substitute SVG
- keep previews, drafts, and experiments out of the production asset registry

All app code should reference assets through `src/config/uiAssets.ts` instead of scattering hard-coded asset paths across components.
