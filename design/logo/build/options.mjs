// Brow options for the main logo, and a comparison sheet.
// Usage (in build/): node options.mjs ../options
// Writes <out>/brow-<id>.svg (tight, black) and <out>/brow-options.png.
import sharp from 'sharp';
import fs from 'fs';
import { tightSvg, squareSvg, shareFor, BROW_T0, browCircles, BASE } from './geom.mjs';

const OUT = process.argv[2] || '../options';
fs.mkdirSync(OUT, { recursive: true });

export const OPTIONS = [
  { id: 'A', name: 'A: brows 1.4x thicker', opts: { thick: 1.4 } },
  { id: 'B', name: 'B: brows 1.8x thicker', opts: { thick: 1.8 } },
  { id: 'C', name: 'C: 1.8x thicker, 6% larger, a small gap above the pupil', opts: { thick: 1.8, scale: 1.06, lift: 4 } },
  { id: 'D', name: 'D: current approved brows (reference)', opts: {} },
];

// Gap between brow lower edge (inner circle) and pupil, source px. Negative = they overlap.
function gap(opts) {
  const { I } = browCircles(opts);
  return I.r - (Math.hypot(I.dx, I.dy) + BASE.R);
}

const SMALL = [64, 48, 32, 16];
const THEMES = [
  { id: 'light', ink: '#000', bg: '#ffffff', text: '#333' },
  { id: 'dark', ink: '#fff', bg: '#111111', text: '#ddd' },
];
const png = (svgText, s, bg) => sharp(Buffer.from(svgText), { density: 72 * s / 100 }).resize(s, s).flatten({ background: bg }).png().toBuffer();
const nearest = (buf, s) => sharp(buf).resize(s, s, { kernel: 'nearest' }).png().toBuffer();
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function tabMock(icon16, theme) {
  // A browser tab strip at 1x: tab with the 16 px icon and a title.
  const bar = theme.id === 'light' ? '#dee1e6' : '#202124', tab = theme.id === 'light' ? '#ffffff' : '#35363a', fg = theme.id === 'light' ? '#1f1f1f' : '#e8eaed';
  const w = 240, h = 40;
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bar}"/><path d="M8 ${h}V12a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8V${h}Z" fill="${tab}"/><text x="46" y="27" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="${fg}">Broudy Labs</text><text x="178" y="27" font-family="Segoe UI, Arial, sans-serif" font-size="12" fill="${fg}">x</text></svg>`;
  return sharp(Buffer.from(s)).composite([{ input: icon16, left: 22, top: 14 }]).png().toBuffer();
}
async function roundCrop(opts, theme, s = 48) {
  const sq = await sharp(Buffer.from(squareSvg(0.77, opts, theme.ink, theme.bg)), { density: 72 * s / 100 }).resize(s, s).png().toBuffer();
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}"/></svg>`);
  return sharp(sq).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

const layers = [], texts = [];
const put = (input, left, top) => layers.push({ input, left: Math.round(left), top: Math.round(top) });
const label = (x, y, t, size = 18, fill = '#333') => texts.push(`<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" fill="${fill}">${esc(t)}</text>`);

const W = 2760;
const ROW = 512, GAP = 24;
let y = 20;
label(30, y + 30, 'Broudy Labs logo: brow options for the main logo. Pupils are the same in every option.', 30);
label(30, y + 62, `Each row: 512 px, then 64, 48, 32, 16 px at true size, then the same 4 sizes zoomed 8x (nearest neighbour), then a 16 px browser tab (1x and 3x) and a 48 px round crop (1x and 4x).`, 18);
y += 90;
const report = [];
for (const o of OPTIONS) {
  const svgText = tightSvg(o.opts, null);
  fs.writeFileSync(`${OUT}/brow-${o.id}.svg`, svgText);
  const g = gap(o.opts);
  report.push({ id: o.id, ...o.opts, browMidThicknessSrcPx: +(BROW_T0 * (o.opts.thick || 1)).toFixed(1), gapToPupilSrcPx: +g.toFixed(1) });
  label(30, y + 30, o.name, 26, '#000');
  y += 44;
  for (const th of THEMES) {
    texts.push(`<rect x="20" y="${y}" width="${W - 40}" height="${ROW + 40}" fill="${th.bg}" stroke="#bbb"/>`);
    let x = 40;
    // 512
    put(await png(squareSvg(shareFor(512), o.opts, th.ink, null), 512, th.bg), x, y + 20);
    x += 512 + GAP;
    // true sizes
    const smalls = {};
    for (const s of SMALL) {
      smalls[s] = await png(squareSvg(shareFor(s), o.opts, th.ink, null), s, th.bg);
      put(smalls[s], x, y + 20); label(x, y + 20 + s + 20, `${s}`, 14, th.text);
      x += s + GAP;
    }
    // 8x zooms
    for (const s of SMALL) {
      put(await nearest(smalls[s], s * 8), x, y + 20);
      label(x, y + 20 + s * 8 + 18, `${s} at 8x`, 14, th.text);
      x += s * 8 + GAP;
    }
    // tab mock 1x and 3x
    const icon = await sharp(Buffer.from(squareSvg(shareFor(16), o.opts, th.ink, null)), { density: 72 * 16 / 100 }).resize(16, 16).png().toBuffer();
    const tab = await tabMock(icon, th);
    put(tab, x, y + 20); label(x, y + 80, 'tab, 16 px', 14, th.text);
    put(await sharp(tab).extract({ left: 0, top: 0, width: 130, height: 40 }).resize(390, 120, { kernel: 'nearest' }).png().toBuffer(), x, y + 100);
    label(x, y + 240, 'tab at 3x (left part)', 14, th.text);
    // round crop 48 and 4x
    const rc = await roundCrop(o.opts, th);
    // round crops sit on a mid-grey square so the circle edge shows on both themes
    const grey = (n) => sharp({ create: { width: n, height: n, channels: 3, background: '#8a8a8a' } }).png().toBuffer();
    put(await grey(64), x, y + 262); put(rc, x + 8, y + 270); label(x + 76, y + 300, '48 round', 14, th.text);
    put(await grey(208), x + 180, y + 262); put(await nearest(rc, 192), x + 188, y + 270); label(x + 180, y + 492, '48 round at 4x', 14, th.text);
    y += ROW + 40 + 12;
  }
  y += 20;
}
const H = y + 10;
const base = sharp({ create: { width: W, height: H, channels: 3, background: '#f4f4f4' } });
const textLayer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${texts.filter(t => t.startsWith('<rect')).join('')}</svg>`);
const labelLayer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${texts.filter(t => !t.startsWith('<rect')).join('')}</svg>`);
await base.composite([{ input: textLayer, left: 0, top: 0 }, ...layers, { input: labelLayer, left: 0, top: 0 }]).png().toFile(`${OUT}/brow-options.png`);
fs.writeFileSync(`${OUT}/options.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report), 'sheet', W, H);
