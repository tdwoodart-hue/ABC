# Us interface direction

A shared little home for two people, with the existing pixel characters as its signature. Left-aligned greetings, a single illustrated scene, and quieter daily tools below. Preserve real names and content; never invent relationship history.

## Tokens

- Canvas #fff8fb, surface #ffffff, ink #302638, muted #776a7d, plum #85416a, soft pink #f6e8ef.
- System rounded sans for Vietnamese body and headings; large expressive relationship count, regular sentence case elsewhere.
- Content: mobile 16–24px gutters, desktop 32–40px, max 1320px; 8/12/16/24/32px spacing.
- Corners: 28px hero, 20px cards, 14px controls. Shadows only for floating navigation and dialogs.

## Layout

Greeting → character scene and relationship counter → memory and daily tools.
Mobile stacks naturally; desktop uses a main column and a narrow utility column. Avoid nested cards around cards.

## Motion

Use existing Motion library. Navigation indicator answers tab selection with a spring; page changes fade in over 180ms without remounting the journal. Buttons have a brief press response. Avoid looping decorative motion; the characters already provide life. Respect prefers-reduced-motion globally and in MotionConfig. Preserve scroll positions and fixed-position overlays.

## Review

The signature is the pixel couple, not a generic gradient hero or marketing dashboard. Keep their sprites unchanged. Test empty content, long Vietnamese names, 390px mobile, desktop, keyboard focus, and reduced motion. Authenticated data flows require a real authorized session; use isolated local fixtures for visual review.
