# Broudy Labs site

The public site of Broudy Labs, Julian Broudy's game studio. It holds a home page, a page for each game, and each game's privacy policy and terms of use. Google Play, AdMob and the games link to these pages.

- Now: https://julianbroudy.github.io/broudy-labs-site/
- Later (phase 2, after DNS works): https://labs.broudy.io/

Plain static HTML. No framework, no build step, no trackers, no cookies, no external scripts. The fonts (Figtree, Lilita One, SIL Open Font License) are in `assets/fonts/`. Colours and fonts come from the games' house look (`game-template/src/ui/app.css`), light and dark.

## Pages

| Path | What |
|---|---|
| `/` | Home: one card per game, contact |
| `/<game>/` | Game page: name, one line, screenshots, links |
| `/<game>/privacy/` | Privacy policy |
| `/<game>/terms/` | Terms of use |
| `/app-ads.txt` | The AdMob seller line |
| `/404.html` | Page not found |

Games: `skedaddle`, `budge`, `plonk`, `whackayou`. Hoopwood has no pages yet.

All links are relative (`../privacy/`, never `/budge/privacy/` and never `.html`), so the site works on the github.io path and on the custom domain. The only exception is `404.html`: GitHub shows it at any depth, so it has inline style and a small inline script that finds the site root.

## How to change a page

1. Edit the HTML file.
2. Run `node scripts/check-links.mjs`. It checks every internal link and file, that each game has privacy and terms, that `app-ads.txt` has the AdMob line, and that no page loads an outside script, style or font.
3. Commit and push to `main`. GitHub Pages publishes in about a minute. The same check runs on GitHub on every push.

The legal texts were made true to each game's code (21 Nov 2026). When a game's data use changes, change its privacy page here, and the date at its top.

When a game is public on Google Play, replace its "Coming soon" span with the Google Play link. The link is in a comment next to the span, on the home page and on the game page.

## Add a game

1. Make `<game>/index.html`, `<game>/privacy/index.html` and `<game>/terms/index.html` (copy another game's).
2. Put a 176 px icon in `assets/<game>/icon.png`, and screenshots (540 px wide, WebP) as `shot-1.webp` and on.
3. Add a card to `index.html`, and the game to `GAMES` in `scripts/check-links.mjs`.

## Pre-mortem

"It is 2 weeks later and this failed. Why?"

1. Most likely: links broke. Installed builds, the store listings or AdMob pointed at labs.broudy.io before it worked with HTTPS, or the old skedaddle-site pages went away before every link was changed. Google Play can flag an app whose privacy link does not open.
2. A page moved but its text changed on the way, so a legal page no longer matches what the game does.
3. A link that works on one address breaks on the other (an absolute `/path` works on labs.broudy.io but not on the github.io path), or a missing page shows the 404 with broken styles.

What we do about it:

1. Two phases. Phase 1 (now) builds this site on github.io only. Nothing points at it yet, and the old site stays as it is. Phase 2 starts only after `https://labs.broudy.io/` opens with a valid certificate. Then the old pages become redirects (they never go away), and the games, Play Console and AdMob change one by one. Plan: `PHASE2.md`.
2. The legal pages were copied by a script that keeps the text inside `<main>` and changes only the 2 links between privacy and terms. A second script compared the text of every old and new page: all 8 are the same.
3. Relative links only, checked by `scripts/check-links.mjs` on every push. The 404 page has no relative links.
