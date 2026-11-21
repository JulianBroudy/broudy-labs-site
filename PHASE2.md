# Phase 2: move every link to labs.broudy.io

Written 21 Nov 2026 at the end of phase 1. Do not start this until the gate below passes.

## Gate (check first, stop if it fails)

1. `nslookup labs.broudy.io` gives a CNAME to `julianbroudy.github.io` (Julian adds it at Hostinger).
2. `https://broudy.io/app-ads.txt` returns the AdMob line (Julian uploads it at Hostinger).
3. After step 1 of the plan: `https://labs.broudy.io/budge/privacy/` opens with a valid certificate, and `http://` redirects to `https://`.

If 3 fails, do not change any link anywhere. The old site keeps working on its own.

## Plan, in this order

1. Custom domain and HTTPS in this repo.
   - Add a file `CNAME` with the one line `labs.broudy.io`, and run `gh api -X PUT repos/JulianBroudy/broudy-labs-site/pages -f cname=labs.broudy.io`.
   - Wait for the certificate (`gh api repos/JulianBroudy/broudy-labs-site/pages --jq .https_certificate.state` is `approved`), then `gh api -X PUT repos/JulianBroudy/broudy-labs-site/pages -F https_enforced=true`.
   - Check every page on `https://labs.broudy.io/` (the screenshot check of phase 1 can take a base URL). The github.io address then redirects to the custom domain by itself.
   - Change the 404 page script: the root is `/` on the custom domain, so it already works. Keep the github.io branch for safety.
2. Redirect pages on the old site (`JulianBroudy/skedaddle-site`). Never delete the old pages: installed builds and old store links keep pointing at them. Replace each file with a small page that has `<meta http-equiv="refresh" content="0; url=NEW">`, `<link rel="canonical" href="NEW">`, `<meta name="robots" content="noindex">` and a plain link "This page moved to NEW". Map:

   | Old (https://julianbroudy.github.io/skedaddle-site/...) | New (https://labs.broudy.io/...) |
   |---|---|
   | `index.html` (and `/`) | `/skedaddle/` |
   | `privacy.html` | `/skedaddle/privacy/` |
   | `terms.html` | `/skedaddle/terms/` |
   | `budge/privacy.html` | `/budge/privacy/` |
   | `budge/terms.html` | `/budge/terms/` |
   | `plonk/privacy.html` | `/plonk/privacy/` |
   | `plonk/terms.html` | `/plonk/terms/` |
   | `whackayou/privacy.html` | `/whackayou/privacy/` |
   | `whackayou/terms.html` | `/whackayou/terms/` |

   Also add `budge/index.html`, `plonk/index.html` and `whackayou/index.html` redirects to the game pages (Budge's `BRAND.site` points at `skedaddle-site/budge/`). Keep a small publish script for these redirects (in Skedaddle `scripts/`, or move it to this repo as `scripts/publish-redirects.sh`). Check each old URL in a browser after GitHub publishes.
3. Change the links in each game: one branch and one pull request per repo, as each game's AGENTS.md says. Run each game's tests and `node scripts/audit-data.mjs --write` where the game has it.
4. Retire Skedaddle's `site/` folder and `scripts/publish-site.sh`: delete them in the Skedaddle PR, and point the docs at this repo. Keep only the redirect publish (step 2).
5. Julian, in Play Console, for each app: App content, Privacy policy: the new privacy URL. Store settings (Store listing contact details), Website: `https://labs.broudy.io/`. Note: AdMob reads app-ads.txt from the root of the website domain, `labs.broudy.io/app-ads.txt` (this repo serves it). `broudy.io/app-ads.txt` covers the case that AdMob crawls the parent domain.
6. Julian, in AdMob, for each app: App settings, check that the app is linked to its Play listing, then use "Check for updates" on app-ads.txt.

## Every place that holds an old URL

Found on 21 Nov 2026 with a search for `skedaddle-site`, `julianbroudy.github.io`, `privacy.html`, `terms.html`, `site/<game>` and `publish-site` in `X:\otium\projects\games\*` (not node_modules, dist, android) and `X:\otium\notes`. Search again before you start: other chats change these repos.

### Skedaddle (`X:\otium\projects\games\skedaddle`)

- `index.html:368` in-app links on the welcome screen: `skedaddle-site/terms.html`, `skedaddle-site/privacy.html`. Change to `https://labs.broudy.io/skedaddle/terms/` and `.../privacy/`.
- `tests/e2e/consent.spec.ts:32-33` checks `href$="terms.html"` and `href$="privacy.html"`. Change to `terms/` and `privacy/`.
- `src/main.ts:75` comment: "(site/terms.html)". Point at this repo's `skedaddle/terms/index.html`.
- `docs/STORE_LISTING.md:67-68` privacy URL and website.
- `docs/PLAY_FORMS.md:16-17` privacy URL and how to publish.
- `docs/DATA_FACTS.md:13-14` (generated: run `node scripts/audit-data.mjs --write` after the code change).
- `docs/UI_SPEC.md:348` "Terms: site/terms.html".
- `docs/ADS.md:52` "updated in site/privacy.html".
- `STATE.md:12`, `STATE.md:21`, `STATE.md:69` (the publish step).
- `scripts/publish-site.sh` and `site/` (retire, step 4).

### Budge (`X:\otium\projects\games\budge`)

- `src/brand.ts:12` `site: 'https://julianbroudy.github.io/skedaddle-site/budge/'`. Change to `https://labs.broudy.io/budge/`.
- `src/main.ts:1812` builds the link as `${BRAND.site}${page}.html`. Change to `${BRAND.site}${page}/`, or the new links end in `.html` and give a 404.
- `scripts/new-game.mjs:74` replaces `/skedaddle-site/<id>/`. Change the pattern to the new site.
- `docs/STORE_LISTING.md:50-51`, `docs/PLAY_FORMS.md:17-18`, `docs/DATA_FACTS.md:13` (generated).
- `docs/TEMPLATE.md:234` "in Skedaddle's site/<game>/, published to skedaddle-site".
- `AGENTS.md:114` "check ... Skedaddle's site/budge/ pages".
- `STATE.md:16`, `STATE.md:45` (the publish step).

### Plonk (`X:\otium\projects\games\plonk`)

- `index.html:148` (settings links) and `index.html:168` (welcome screen): `skedaddle-site/plonk/terms.html` and `privacy.html`.
- `docs/STORE_LISTING.md:60-61`.
- `AGENTS.md:20`.

### Whack-a-You (`X:\otium\projects\games\whackayou`)

- `index.html:233` (settings links) and `index.html:252` (welcome screen).
- `docs/STORE_LISTING.md:55-56`.
- `AGENTS.md:25`.

### Game template and Hoopwood

- `game-template/src/brand.ts:12` and `hoopwood/src/brand.ts:12`: `skedaddle-site/template/` and `skedaddle-site/hoopwood/` (pages that do not exist yet). Change to `https://labs.broudy.io/<game>/`.
- `game-template/scripts/new-game.mjs:74`, `hoopwood/scripts/new-game.mjs:74`: the replace pattern.
- `game-template/docs/TEMPLATE.md:234`, `hoopwood/docs/TEMPLATE.md:234`: where the legal pages live. New text: "in the Broudy Labs site repo, `<game>/privacy/` and `<game>/terms/`".
- `game-template/src/main.ts:682` and `hoopwood/src/main.ts:682` build links as `${BRAND.site}${page}.html`, like Budge. Change to `${BRAND.site}${page}/`.

### Notes (`X:\otium\notes`), history: leave as they are

These are dated reports. Do not rewrite them. Mention the move in a new note if needed.

- `games-audit-2026-11-20/budge.md:128, 172, 238`
- `games-audit-2026-11-20/plonk.md:152`
- `games-audit-2026-11-20/skedaddle.md:172, 175, 176`
- `games-audit-2026-11-20/whackayou.md:119`
- `games-audit-2026-11-20/ROADMAP.md:35` (app-ads.txt needs a root domain: phase 1 solves it)
- `research/game-app-template.md:232`
- `research/agent-reports/2026-11-20-path-inventory.md:56`

### Outside the files

- Play Console, each app: App content, Privacy policy; Store settings, Website (Julian).
- AdMob, each app: app-ads.txt check (Julian).
- Builds already installed on phones keep the old URLs. That is why the old pages become redirects and never go away.

## Pre-mortem for phase 2

1. A link changes before `https://labs.broudy.io` works: the gate above.
2. Budge's `${page}.html` pattern (and any copy of it) makes links to `/budge/privacy.html`, which is a 404 on the new site. Fix: change the pattern, and test the built app's links.
3. The redirect pages replace the old ones before the new site has the page: publish redirects only after step 1 checks every new URL.
