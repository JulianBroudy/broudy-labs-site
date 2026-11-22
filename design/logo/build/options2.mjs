// Second round of brow options (22 Nov 2026): D (reference) and E, F, G, thicker brows that keep D's
// joint with the pupil. Same layout as options.mjs, plus one 512 px crop of the left eye per option.
// Usage (in build/): node options2.mjs ../options ../../logo-source-chatgpt.png
// Writes <out>/brow-<id>.svg (tight, black), <out>/brow-options-2.png and <out>/options-2.json.
import sharp from 'sharp';
import fs from 'fs';
import { tightSvg, squareSvg, shareFor, browProfile, BROW_MAX0, PAD, BX0, BY0 } from './geom.mjs';

const OUT = process.argv[2] || '../options';
const SRC = process.argv[3] || '../../logo-source-chatgpt.png';
fs.mkdirSync(OUT, { recursive: true });

export const OPTIONS = [
  { id: 'D', name: 'D: current approved brows (reference)', opts: {} },
  { id: 'E', name: 'E: brow 1.25x thicker at its widest, joint with the pupil as in D', opts: { grow: { max: 1.25 } } },
  { id: 'F', name: 'F: brow 1.5x thicker at its widest, joint with the pupil as in D', opts: { grow: { max: 1.5 } } },
  { id: 'G', name: 'G: brow 1.75x thicker at its widest, joint with the pupil as in D', opts: { grow: { max: 1.75 } } },
];

const SMALL = [64, 48, 32, 16];
const THEMES = [
  { id: 'light', ink: '#000', bg: '#ffffff', text: '#333' },
  { id: 'dark', ink: '#fff', bg: '#111111', text: '#ddd' },
];
const png = (svgText, s, bg) => sharp(Buffer.from(svgText), { density: 72 * s / 100 }).resize(s, s).flatten({ background: bg }).png().toBuffer();
const nearest = (buf, s) => sharp(buf).resize(s, s, { kernel: 'nearest' }).png().toBuffer();
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function tabMock(icon16, theme) {
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
// The left eye, 240 x 240 source px around the pupil, drawn at 512 px.
const EYE = { x: 333, y: 595, s: 240 }; // in tight-SVG space (source minus BX0 - PAD, BY0 - PAD)
async function eyeCrop(opts, theme, size = 512) {
  const t = tightSvg(opts, theme.ink).replace(/viewBox="[^"]+"/, `viewBox="${EYE.x} ${EYE.y} ${EYE.s} ${EYE.s}" width="${size}" height="${size}"`);
  return sharp(Buffer.from(t)).flatten({ background: theme.bg }).png().toBuffer();
}
async function sourceEye(size = 512) {
  const left = EYE.x + BX0 - PAD, top = EYE.y + BY0 - PAD;
  return sharp(SRC).flatten({ background: '#fff' }).extract({ left, top, width: EYE.s, height: EYE.s }).resize(size, size, { kernel: 'lanczos3' }).png().toBuffer();
}

const layers = [], texts = [];
const put = (input, left, top) => layers.push({ input, left: Math.round(left), top: Math.round(top) });
const label = (x, y, t, size = 18, fill = '#333') => texts.push(`<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" fill="${fill}">${esc(t)}</text>`);

const W = 2760;
const ROW = 512, GAP = 24;
let y = 20;
label(30, y + 30, 'Broudy Labs logo: brow options, round 2. E, F, G keep D\'s joint with the pupil and grow the brow upwards. Pupils are the same in every option.', 30);
label(30, y + 62, 'Each option: 2 rows as in round 1 (512 px, then 64, 48, 32, 16 px at true size, the same sizes zoomed 8x, a 16 px browser tab and a 48 px round crop), then the left eye at 512 px (light, dark) next to the source eye.', 18);
y += 90;
const report = [];
const srcEye = await sourceEye();
for (const o of OPTIONS) {
  const svgText = tightSvg(o.opts, null);
  if (o.id !== 'D') fs.writeFileSync(`${OUT}/brow-${o.id}.svg`, svgText);
  const prof = browProfile(o.opts), mx = prof.reduce((a, b) => (b[1] > a[1] ? b : a));
  report.push({ id: o.id, ...o.opts, browMaxThicknessSrcPx: +mx[1].toFixed(1), browMaxVsD: +(mx[1] / BROW_MAX0).toFixed(2), widestAtXFromPupilCentre: +mx[0].toFixed(1) });
  label(30, y + 30, `${o.name} (widest ${mx[1].toFixed(1)} source px, ${(mx[1] / BROW_MAX0).toFixed(2)}x D)`, 26, '#000');
  y += 44;
  for (const th of THEMES) {
    texts.push(`<rect x="20" y="${y}" width="${W - 40}" height="${ROW + 40}" fill="${th.bg}" stroke="#bbb"/>`);
    let x = 40;
    put(await png(squareSvg(shareFor(512), o.opts, th.ink, null), 512, th.bg), x, y + 20);
    x += 512 + GAP;
    const smalls = {};
    for (const s of SMALL) {
      smalls[s] = await png(squareSvg(shareFor(s), o.opts, th.ink, null), s, th.bg);
      put(smalls[s], x, y + 20); label(x, y + 20 + s + 20, `${s}`, 14, th.text);
      x += s + GAP;
    }
    for (const s of SMALL) {
      put(await nearest(smalls[s], s * 8), x, y + 20);
      label(x, y + 20 + s * 8 + 18, `${s} at 8x`, 14, th.text);
      x += s * 8 + GAP;
    }
    const icon = await sharp(Buffer.from(squareSvg(shareFor(16), o.opts, th.ink, null)), { density: 72 * 16 / 100 }).resize(16, 16).png().toBuffer();
    const tab = await tabMock(icon, th);
    put(tab, x, y + 20); label(x, y + 80, 'tab, 16 px', 14, th.text);
    put(await sharp(tab).extract({ left: 0, top: 0, width: 130, height: 40 }).resize(390, 120, { kernel: 'nearest' }).png().toBuffer(), x, y + 100);
    label(x, y + 240, 'tab at 3x (left part)', 14, th.text);
    const rc = await roundCrop(o.opts, th);
    const grey = (n) => sharp({ create: { width: n, height: n, channels: 3, background: '#8a8a8a' } }).png().toBuffer();
    put(await grey(64), x, y + 262); put(rc, x + 8, y + 270); label(x + 76, y + 300, '48 round', 14, th.text);
    put(await grey(208), x + 180, y + 262); put(await nearest(rc, 192), x + 188, y + 270); label(x + 180, y + 492, '48 round at 4x', 14, th.text);
    y += ROW + 40 + 12;
  }
  // Eye panel: the left eye at 512 px, light and dark, and the source eye for comparison.
  texts.push(`<rect x="20" y="${y}" width="${W - 40}" height="${ROW + 60}" fill="#ffffff" stroke="#bbb"/>`);
  let x = 40;
  for (const th of THEMES) {
    put(await eyeCrop(o.opts, th), x, y + 20); label(x, y + 20 + ROW + 26, `${o.id}: left eye at 512 px (${th.id})`, 16, '#333');
    x += ROW + GAP;
  }
  put(srcEye, x, y + 20); label(x, y + 20 + ROW + 26, 'source drawing, same crop', 16, '#333');
  y += ROW + 60 + 12;
  y += 20;
}
const H = y + 10;
const base = sharp({ create: { width: W, height: H, channels: 3, background: '#f4f4f4' } });
const textLayer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${texts.filter(t => t.startsWith('<rect')).join('')}</svg>`);
const labelLayer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${texts.filter(t => !t.startsWith('<rect')).join('')}</svg>`);
await base.composite([{ input: textLayer, left: 0, top: 0 }, ...layers, { input: labelLayer, left: 0, top: 0 }]).png().toFile(`${OUT}/brow-options-2.png`);
fs.writeFileSync(`${OUT}/options-2.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report), 'sheet', W, H);
