# Broudy Labs logo (vector)

Main logo: option F2 (Julian's pick, 22 Nov 2026): brow 1.5x thicker than D, brow and pupil one outline. `MAIN` in `build/geom.mjs` is F2, and `final.mjs` builds every file below from it, so a rebuild gives the same files.

Vector rebuild of `design/logo-source-chatgpt.png` (22 Nov 2026).

## Files

- `logo.svg`: black, tight viewBox (40 px padding at 1015 x 1138). One path, no transforms.
- `logo-white.svg`: white, for dark backgrounds.
- `logo-currentcolor.svg`: takes the CSS `color` of its parent (inline SVG).
- `favicon.svg`: square, main geometry, black on light tabs and white on dark tabs. Copied to `assets/favicon.svg` (the site favicon since 22 Nov 2026).
- `png/logo-<size>.png` and `png/logo-white-<size>.png`: 16, 32, 48, 64, 180, 192, 512, 1024. Square, transparent, mark centred. All sizes use the main geometry (the small variant was removed on 22 Nov 2026).
- `png/avatar-800-light.png`, `png/avatar-800-dark.png`: solid background, safe for a round crop (all ink inside 86% of the circle radius).
- `options/`: brow options for the main logo (A, B, C, D = current), waiting for Julian to pick. `options/brow-options.png` is the comparison sheet, `options/options.json` the numbers.
- Round 2 (22 Nov 2026, after Julian picked D because its brows are joined to the pupils): E, F, G are 1.25x, 1.5x and 1.75x thicker at the widest point. The lower edge and the joint with the pupil are exactly D's. The upper edge is D's, pushed out by a factor that fades back to 1 before the brow reaches the pupil. Sheet: `options/brow-options-2.png` (rows D, E, F, G, plus the left eye at 512 px next to the source eye). Numbers: `options/options-2.json`. Script: `build/options2.mjs` (`node options2.mjs ../options ../../logo-source-chatgpt.png`).
- Round 3 (22 Nov 2026), the joint: in D the right end of each brow runs on past the pupil as a small hook, with a light slit under it. D2 and F2 (D and F thickness) make brow and pupil one outline. The upper edge leaves the brow's arc between -65 and 20 degrees round the pupil centre and meets the pupil circle tangentially (C2 blend, convex all the way). The lower edge stops where it first meets the pupil. The left tip and the light gap are unchanged. Files: `options/brow-D2.svg`, `options/brow-F2.svg`. Big review images, one screen each: `options/joint/joint-D-before-after.png`, `joint-F-before-after.png`, `full-D.png`, `full-F.png`, `small-D-F.png`. Geometry: `opts.merge` in `build/geom.mjs`. Scripts: `node jointimages.mjs ../options` (files, images, hole and loose-ink check per eye), `node joint.mjs score` (mismatch vs source), `node convex.mjs [1.5]` (curvature). `logo.svg` is not changed until Julian picks.
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

Run in `build/` after `npm install`: `node analyse.mjs ../../logo-source-chatgpt.png comps.json`, `node eyes.mjs`, `node trace.mjs 2.5 0.6`, `node final.mjs ../../logo-source-chatgpt.png ..`, `node sheet.mjs ../../logo-source-chatgpt.png ..`, `node options.mjs ../options`, `node hole.mjs ../logo-white.svg`, `node site.mjs ../../../assets` (site icons).

## Fix of 22 Nov 2026: hole where the brow meets the pupil

The brow path runs clockwise and the pupil ran anticlockwise. The right tip of each brow overlaps the pupil by about 1 px (as in the source). Under the nonzero fill rule, opposite directions cancel, so the overlap was a hole: a hairline gap at the top right of each pupil. On white logos it shows as a dark notch in the pupil. The pupil now runs clockwise too, so the brow joins the pupil as in the source. Fidelity improved a little (mismatch 0.656% to 0.649% of ink).

## On the site (22 Nov 2026)

- `build/site.mjs` writes to `assets/`: `favicon.svg` (copy), `logo-mark.svg` (no padding), `apple-touch-icon.png` (180 px, opaque, ink #14211F on paper #E7EEEA), `favicon-32.png` (32 px, opaque fallback).
- Header: `.brand i` in `assets/site.css` draws `logo-mark.svg` as a CSS mask in the text colour, 21.2 x 24 px. It follows dark mode. The header height is unchanged (48 px).
- `404.html` has the mark as inline SVG (it cannot use relative URLs).
- Screenshots: `check/site/` (home, skedaddle and 404; 412 and 1280 px; light and dark; plus a header zoom of each).
