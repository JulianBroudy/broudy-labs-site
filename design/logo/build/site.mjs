// Site icons for labs.broudy.io from the main logo (MAIN = F2). Run after final.mjs.
// Usage: node site.mjs ../../../assets
// Writes: favicon.svg (copy of design/logo/favicon.svg), logo-mark.svg (no padding, used as a CSS mask
// for the header mark), apple-touch-icon.png (180 px, opaque, ink on the site's paper colour) and
// favicon-32.png (32 px, opaque, the fallback for browsers without SVG icons).
import sharp from 'sharp';
import fs from 'fs';
import { svg, fullPath, squareSvg, MAIN, MW, MH, BX0, BY0 } from './geom.mjs';

const OUT = process.argv[2];
if (!OUT || !fs.existsSync(OUT)) { console.error('usage: node site.mjs <site assets folder>'); process.exit(1); }
const PAPER = '#E7EEEA', INK = '#14211F'; // light tokens in assets/site.css

fs.copyFileSync(new URL('../favicon.svg', import.meta.url), `${OUT}/favicon.svg`);
fs.writeFileSync(`${OUT}/logo-mark.svg`, svg(`0 0 ${MW} ${MH}`, fullPath(-BX0, -BY0, MAIN), null));
const png = (share, s, file) => sharp(Buffer.from(squareSvg(share, MAIN, INK, PAPER)), { density: 72 * s / 100 })
  .resize(s, s).flatten({ background: PAPER }).png().toFile(`${OUT}/${file}`);
// iOS rounds the corners of the touch icon, so the mark keeps a wider margin there.
await png(0.72, 180, 'apple-touch-icon.png');
await png(0.9, 32, 'favicon-32.png');
console.log('site icons written to', OUT);
