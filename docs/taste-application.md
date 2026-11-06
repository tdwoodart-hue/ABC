# Applying Taste Skill to ABC

Kind: existing private consumer app for a couple. Main action: write a journal entry. Real material: existing pixel characters, authorized profiles, journals, finance and nutrition data.

Upstream: Leonxlnx/taste-skill, tasteskill 2.5.0, commit 9b4bf937a1f69348126959c15d2f99a73e65699b. The core skill and relevant unmodified references are vendored in .agents/skills/taste-skill; the complete package is installed in the workspace for its tools.

## Rules applied

- One neutral interface and one action accent. White surfaces, neutral canvas, shared strawberry action token. No feature-specific decorative mint, blue or yellow backgrounds.
- One inline UI icon set. Taste's icons reference specifies Lucide for interface glyphs. Journal, nutrition, finance and achievements use the same glyph on Home and in navigation. Brand icons keep their real colors (Google sign-in).
- Remove painted utility illustrations, decorative heading badges and duplicated sun/emoji icons in one control.
- One primary filled Home action, with the wake-up action rendered as a secondary control.
- Plain category copy, equal edges, shared radius and spacing, fine-pointer hover lift of 2px, button press and photo zoom. No hover rotation.
- Preserve existing assets and actual data. Character gestures remain user initiated and reduced-motion aware.

## App-specific adaptations

The upstream skill primarily targets company marketing pages. Its full-screen sections, footer/marketing recipes, brand-integration icon grids and mock contact rules do not apply to this authenticated utility app. Applying those would hide daily tools behind unnecessary scrolling or alter real profile data.

The existing user-controlled memory carousel remains a functional browsing control; it never advances on a timer. Character names identify interactive people and remain visible. Existing auth startup, persistent journal tree, iOS keyboard handling and security rules are preserved. The existing locally hosted Vietnamese font is retained rather than replacing it with a randomly dealt marketing pairing.

The full upstream checker is run unmodified. Marketing-specific findings are reported as non-applicable, not silently removed or described as a clean marketing-site certification. Browser interaction checks from the preceding pass remain separate evidence.

## Review corrections

The first upstream scan caught low-contrast character hints and selected navigation text. The hint color was darkened, the shared action shade adjusted within the same rose family, and slate-400 text increased to a readable neutral. This is a contrast correction, not an additional accent color.

## Upstream checker results

Unmodified consistency.mjs was run against the isolated app fixture at 1440, 1024, 768 and 390px. Initial result: 82 FAIL, 31 WARN. It caught genuine text-contrast issues, corrected as described above.

A subsequent 390px quick scan reported no text-contrast findings; result 20 FAIL, 8 WARN. It also reports that its rhythm module expects a desktop baseline before a phone-only scan. This is not a clean upstream certification.

Remaining findings are retained: container-edges/split-pair measure the marketing wrapper rather than this app's sidebar/content layout; hero-fill/hero-screen/section-height/one-section/one-heading require full-screen marketing sections; cta/button-styles compare navigation, inline utility controls and primary actions as marketing CTAs; heading-scale expects the marketing type hierarchy; no-visual/text-only expects marketing product frames rather than the existing animated sprite nodes; section-gaps requires marketing-screen spacing. Compact app density, navigation semantics and existing functional browsing controls intentionally remain.

Idle sprite loops were stopped; tap-triggered waves and heart feedback remain. This avoids an endless decorative animation without adding more icon controls.

Raw review artifacts in the workspace: /workspace/artifacts/taste-consistency.json and /workspace/artifacts/taste-recheck.json. Screenshots were captured using the skill's shoot.mjs. Its stitched output can suppress fixed navigation, so final review screenshots use a single tall viewport (1440×1200 and 390×1680) to keep the app navigation visible. Normal device widths/heights were checked separately in the consistency runs.
