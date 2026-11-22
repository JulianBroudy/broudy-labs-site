# Broudy Labs logo (vector)

Vector rebuild of `design/logo-source-chatgpt.png` (22 Nov 2026).

## Files

- `logo.svg`: black, tight viewBox (40 px padding at 1015 x 1138). One path, no transforms.
- `logo-white.svg`: white, for dark backgrounds.
- `logo-currentcolor.svg`: takes the CSS `color` of its parent (inline SVG).
- `favicon.svg`: square, main geometry, black on light tabs and white on dark tabs. Not in use yet: `assets/favicon.svg` (the red block) is still the site favicon.
- `png/logo-<size>.png` and `png/logo-white-<size>.png`: 16, 32, 48, 64, 180, 192, 512, 1024. Square, transparent, mark centred. All sizes use the main geometry (the small variant was removed on 22 Nov 2026).
- `png/avatar-800-light.png`, `png/avatar-800-dark.png`: solid background, safe for a round crop (all ink inside 86% of the circle radius).
- `options/`: brow options for the main logo (A, B, C, D = current), waiting for Julian to pick. `options/brow-options.png` is the comparison sheet, `options/options.json` the numbers.
- `contact-sheet.png`: source vs vector, diff, sizes, colourways, circle crop.
- `check/diff-overlay.png`, `check/diff-stats.json`: fidelity check at source size.

## How it was made

1. `analyse.mjs`: threshold the source and split it into parts (the "b", the ")", 2 eyes).
2. `eyes.mjs`: fit true circles to each pupil and 2 circles to each brow (a brow is the area inside one circle and outside the other).
3. `trace.mjs`: trace the 2 big strokes with potrace from a lightly blurred mask (20 and 10 cubic segments, all joins smooth).
4. `geom.mjs`: the shared geometry (body, eyes, brow options). `final.mjs`: build the SVGs, PNGs and the diff. The 2 eyes use the average of the 2 measured eyes.
5. `sheet.mjs`: the contact sheet.
6. `options.mjs`: the brow options and their sheet.
7. `hole.mjs`: check that no eye shape cuts a hole in another one.

Run in `build/` after `npm install`: `node analyse.mjs ../../logo-source-chatgpt.png comps.json`, `node eyes.mjs`, `node trace.mjs 2.5 0.6`, `node final.mjs ../../logo-source-chatgpt.png ..`, `node sheet.mjs ../../logo-source-chatgpt.png ..`, `node options.mjs ../options`, `node hole.mjs ../logo-white.svg`.

## Fix of 22 Nov 2026: hole where the brow meets the pupil

The brow path runs clockwise and the pupil ran anticlockwise. The right tip of each brow overlaps the pupil by about 1 px (as in the source). Under the nonzero fill rule, opposite directions cancel, so the overlap was a hole: a hairline gap at the top right of each pupil. On white logos it shows as a dark notch in the pupil. The pupil now runs clockwise too, so the brow joins the pupil as in the source. Fidelity improved a little (mismatch 0.656% to 0.649% of ink).
