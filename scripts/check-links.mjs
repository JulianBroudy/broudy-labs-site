#!/usr/bin/env node
// Checks the site: every internal link and image points to a file that exists, every game has privacy and terms,
// app-ads.txt has the AdMob line, and no page loads an external script, style or font.
// Usage: node scripts/check-links.mjs   (no dependencies; exit code 1 on any problem)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['.git', '.github', 'scripts', 'node_modules']);
const GAMES = ['skedaddle', 'budge', 'plonk', 'whackayou', 'hoopwood'];
const ADS_LINE = 'google.com, pub-7183780147802828, DIRECT, f08c47fec0942fa0';
const problems = [];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const files = walk(ROOT);
const pages = files.filter((f) => f.endsWith('.html'));

// Where a relative URL lands, as a file in the repo. A folder URL means its index.html.
function target(fromFile, url) {
  const clean = url.split('#')[0].split('?')[0];
  if (clean === '') return fromFile;
  let p = path.resolve(path.dirname(fromFile), decodeURIComponent(clean));
  if (clean.endsWith('/') || (fs.existsSync(p) && fs.statSync(p).isDirectory())) p = path.join(p, 'index.html');
  return p;
}

let links = 0;
for (const page of pages) {
  const html = fs.readFileSync(page, 'utf8');
  const is404 = rel(page) === '404.html';
  const attrs = [...html.matchAll(/\s(href|src)="([^"]*)"/g)];
  for (const [, attr, url] of attrs) {
    if (/^(https?:)?\/\//.test(url)) {
      // External: allowed only as a plain link, never as a script, style, font or image.
      const tag = html.slice(0, html.indexOf(url)).split('<').pop().split(/\s/)[0];
      if (tag !== 'a') problems.push(`${rel(page)}: external ${tag} ${attr}="${url}" (only links may go outside the site)`);
      continue;
    }
    if (/^(mailto:|tel:)/.test(url)) continue;
    if (url.startsWith('/')) {
      // Absolute paths break on the github.io project path. Only the 404 page may use one (its script fixes it).
      if (!is404) problems.push(`${rel(page)}: absolute link "${url}" (use a relative link)`);
      continue;
    }
    if (url.endsWith('.html')) problems.push(`${rel(page)}: link "${url}" ends in .html (link to the folder instead)`);
    links++;
    if (!fs.existsSync(target(page, url))) problems.push(`${rel(page)}: broken ${attr}="${url}"`);
  }
  if (/<script[^>]+src=/i.test(html)) problems.push(`${rel(page)}: loads a script file`);
  if (/<script/i.test(html) && !is404) problems.push(`${rel(page)}: has a script (only 404.html may)`);
}

// Fonts and other urls inside CSS files.
for (const css of files.filter((f) => f.endsWith('.css'))) {
  for (const [, url] of fs.readFileSync(css, 'utf8').matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
    if (/^(https?:)?\/\//.test(url)) { problems.push(`${rel(css)}: external url(${url})`); continue; }
    if (url.startsWith('data:')) continue;
    links++;
    if (!fs.existsSync(target(css, url))) problems.push(`${rel(css)}: broken url(${url})`);
  }
}

for (const g of GAMES) {
  for (const p of [`${g}/index.html`, `${g}/privacy/index.html`, `${g}/terms/index.html`]) {
    if (!fs.existsSync(path.join(ROOT, p))) problems.push(`missing ${p}`);
  }
}
for (const p of ['index.html', '404.html', 'app-ads.txt', '.nojekyll']) {
  if (!fs.existsSync(path.join(ROOT, p))) problems.push(`missing ${p}`);
}
if (fs.existsSync(path.join(ROOT, 'app-ads.txt'))) {
  const lines = fs.readFileSync(path.join(ROOT, 'app-ads.txt'), 'utf8').split(/\r?\n/).map((l) => l.trim());
  if (!lines.includes(ADS_LINE)) problems.push(`app-ads.txt does not have the line: ${ADS_LINE}`);
}

if (problems.length) {
  console.error(`${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`OK: ${pages.length} pages, ${links} internal links and files, ${GAMES.length} games with privacy and terms, app-ads.txt.`);
