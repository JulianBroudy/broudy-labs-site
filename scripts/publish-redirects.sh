#!/usr/bin/env bash
# Writes redirect pages for the old site and pushes them to JulianBroudy/skedaddle-site.
# The old site (https://julianbroudy.github.io/skedaddle-site/) held the game pages before 21 Nov 2026.
# Installed builds and old store links still point at it, so its pages stay and send people to labs.broudy.io.
# Usage: bash scripts/publish-redirects.sh            (clone, write, commit, push)
#        bash scripts/publish-redirects.sh --dry DIR  (only write the pages into DIR)
set -euo pipefail
NEW=https://labs.broudy.io
# old path in skedaddle-site | new path on labs.broudy.io
MAP='index.html|/skedaddle/
privacy.html|/skedaddle/privacy/
terms.html|/skedaddle/terms/
budge/index.html|/budge/
budge/privacy.html|/budge/privacy/
budge/terms.html|/budge/terms/
plonk/index.html|/plonk/
plonk/privacy.html|/plonk/privacy/
plonk/terms.html|/plonk/terms/
whackayou/index.html|/whackayou/
whackayou/privacy.html|/whackayou/privacy/
whackayou/terms.html|/whackayou/terms/'

page() {
  local url="$1"
  cat <<EOF
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=$url">
<link rel="canonical" href="$url">
<title>This page moved</title>
<script>location.replace("$url");</script>
</head>
<body style="font-family: system-ui, sans-serif; margin: 2rem;">
<p>This page moved to <a href="$url">$url</a>.</p>
</body>
</html>
EOF
}

write_all() {
  local dir="$1"
  while IFS='|' read -r old new; do
    mkdir -p "$dir/$(dirname "$old")"
    page "$NEW$new" > "$dir/$old"
  done <<< "$MAP"
}

if [ "${1:-}" = "--dry" ]; then
  write_all "${2:?give a folder}"
  echo "Wrote the redirect pages to $2."
  exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
git clone -q https://github.com/JulianBroudy/skedaddle-site.git "$tmp/site"
write_all "$tmp/site"
cd "$tmp/site"
git add -A
if git diff --cached --quiet; then
  echo "The redirect pages are already up to date."
  exit 0
fi
git commit -q -m "${MSG:-Redirect every page to labs.broudy.io}"
git push -q
echo "Published. GitHub Pages updates in about a minute."
