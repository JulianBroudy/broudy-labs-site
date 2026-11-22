// Generate all deliverables into <worktree>/design/logo from body.json + eyes.json.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
const SRC = process.argv[2];
const DEST = process.argv[3];
fs.mkdirSync(DEST, { recursive: true });
const { W, H } = JSON.parse(fs.readFileSync('comps.json'));
const eyes = JSON.parse(fs.readFileSync('eyes.json'));
const body = JSON.parse(fs.readFileSync('body.json'));
const f = (n) => { const v = Math.round(n * 10) / 10; return (Object.is(v, -0) ? 0 : v).toString(); };

// ---------- geometry ----------
const avg = (g) => eyes.reduce((s, e) => s + g(e), 0) / eyes.length;
const BASE = {
  R: avg(e => e.pupil.r),
  O: { dx: avg(e => e.outer.cx - e.pupil.cx), dy: avg(e => e.outer.cy - e.pupil.cy), r: avg(e => e.outer.r) },
  I: { dx: avg(e => e.inner.cx - e.pupil.cx), dy: avg(e => e.inner.cy - e.pupil.cy), r: avg(e => e.inner.r) },
};
const [eL, eR] = [...eyes].sort((a, b) => a.pupil.cx - b.pupil.cx);
function circleInter(c1, r1, c2, r2) {
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1], d = Math.hypot(dx, dy);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(r1 * r1 - a * a);
  const mx = c1[0] + a * dx / d, my = c1[1] + a * dy / d;
  return [[mx + h * dy / d, my - h * dx / d], [mx - h * dy / d, my + h * dx / d]];
}
// opts.thick: extra brow thickness (px, source scale); opts.lift: move brow up (px)
function eyePath(px, py, ox, oy, opts = {}) {
  const t = opts.thick || 0, lift = opts.lift || 0;
  const O = BASE.O, I = BASE.I;
  const oc = [px + O.dx, py + O.dy - lift], ic = [px + I.dx, py + I.dy - lift + t];
  let [p1, p2] = circleInter(oc, O.r, ic, I.r);
  if (p1[0] > p2[0]) [p1, p2] = [p2, p1];
  const ang = (p, c) => Math.atan2(p[1] - c[1], p[0] - c[0]);
  const span = (a1, a2) => { let s = a2 - a1; while (s < 0) s += 2 * Math.PI; return s; };
  const so = span(ang(p1, oc), ang(p2, oc)), si = span(ang(p1, ic), ang(p2, ic));
  const P = (p) => `${f(p[0] + ox)} ${f(p[1] + oy)}`;
  const R = BASE.R;
  return `M${P(p1)}A${f(O.r)} ${f(O.r)} 0 ${so > Math.PI ? 1 : 0} 1 ${P(p2)}A${f(I.r)} ${f(I.r)} 0 ${si > Math.PI ? 1 : 0} 0 ${P(p1)}Z` +
    `M${P([px - R, py])}a${f(R)} ${f(R)} 0 1 0 ${f(2 * R)} 0a${f(R)} ${f(R)} 0 1 0 ${f(-2 * R)} 0Z`;
}
function bodyPath(ox, oy) {
  return Object.keys(body).sort().map(k => {
    let i = 0;
    const d = body[k].replace(/-?\d+\.?\d*/g, (m) => f(+m + (i++ % 2 === 0 ? ox : oy)));
    return d.replace(/\s*,\s*/g, ' ').replace(/\s*([MCLZ])\s*/g, '$1').trim() + 'Z';
  }).join('');
}
function fullPath(ox, oy, opts) {
  return bodyPath(ox, oy) + eyePath(eL.pupil.cx, eL.pupil.cy, ox, oy, opts) + eyePath(eR.pupil.cx, eR.pupil.cy, ox, oy, opts);
}
// mark bbox in source space (from analysis): x 138..1072, y 107..1164
const BX0 = 138, BY0 = 107, BX1 = 1073, BY1 = 1165;
const MW = BX1 - BX0, MH = BY1 - BY0;
const svg = (vb, d, fill, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${extra}<path${fill ? ` fill="${fill}"` : ''} d="${d}"/></svg>\n`;

// ---------- 1. logo SVGs: tight viewBox, 40px padding (~3.5% of height) ----------
const PAD = 40;
const ox = PAD - BX0, oy = PAD - BY0;
const vbTight = `0 0 ${MW + 2 * PAD} ${MH + 2 * PAD}`;
const dMain = fullPath(ox, oy);
fs.writeFileSync(`${DEST}/logo.svg`, svg(vbTight, dMain, null));
fs.writeFileSync(`${DEST}/logo-white.svg`, svg(vbTight, dMain, '#fff'));
fs.writeFileSync(`${DEST}/logo-currentcolor.svg`, svg(vbTight, dMain, 'currentColor'));

// square versions (mark centred). fill = share of the square the mark height takes.
function squareSvg(fillShare, opts, color, bg) {
  const S = MH / fillShare;
  const sx = (S - MW) / 2 - BX0, sy = (S - MH) / 2 - BY0;
  const r = (n) => Math.round(n * 10) / 10;
  const bgRect = bg ? `<rect width="${r(S)}" height="${r(S)}" fill="${bg}"/>` : '';
  return svg(`0 0 ${r(S)} ${r(S)}`, fullPath(sx, sy, opts), color, bgRect);
}
// small-size variant: thicker brows lifted clear of the pupils
const SMALL = { thick: 28, lift: 34 };
// favicon.svg: prefers-color-scheme aware (black on light tabs, white on dark tabs)
{
  const S = MH / 0.94; const sx = (S - MW) / 2 - BX0, sy = (S - MH) / 2 - BY0; const r = (n) => Math.round(n * 10) / 10;
  const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(S)} ${r(S)}"><style>path{fill:#000}@media(prefers-color-scheme:dark){path{fill:#fff}}</style><path d="${fullPath(sx, sy, SMALL)}"/></svg>\n`;
  fs.writeFileSync(`${DEST}/favicon.svg`, fav);
}
fs.writeFileSync(`${DEST}/logo-small.svg`, svg(vbTight, fullPath(ox, oy, SMALL), null));

// ---------- 2. PNG exports ----------
fs.mkdirSync(`${DEST}/png`, { recursive: true });
const sizes = [16, 32, 48, 64, 180, 192, 512, 1024];
for (const s of sizes) {
  const small = s <= 48;
  const share = s <= 48 ? 0.94 : s <= 64 ? 0.9 : 0.8;
  const sv = squareSvg(share, small ? SMALL : {}, null, null);
  await sharp(Buffer.from(sv), { density: 72 * s / 100 }).resize(s, s).png().toFile(`${DEST}/png/logo-${s}.png`);
  await sharp(Buffer.from(squareSvg(share, small ? SMALL : {}, '#fff', null)), { density: 72 * s / 100 }).resize(s, s).png().toFile(`${DEST}/png/logo-white-${s}.png`);
}
// avatar 800x800: round-crop safe. Find the farthest ink point from the square centre for a given share.
async function maxRadius(share) {
  const sv = squareSvg(share, {}, null, '#fff');
  const N = 800;
  const { data } = await sharp(Buffer.from(sv)).resize(N, N).greyscale().raw().toBuffer({ resolveWithObject: true });
  let m = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (data[y * N + x] < 200) m = Math.max(m, Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2));
  return m / (N / 2);
}
let share = 0.8; while (await maxRadius(share) > 0.86) share -= 0.01;
console.log('avatar share', share.toFixed(2), 'max radius', (await maxRadius(share)).toFixed(3));
await sharp(Buffer.from(squareSvg(share, {}, '#000', '#fff'))).resize(800, 800).png().toFile(`${DEST}/png/avatar-800-light.png`);
await sharp(Buffer.from(squareSvg(share, {}, '#fff', '#000'))).resize(800, 800).png().toFile(`${DEST}/png/avatar-800-dark.png`);
fs.writeFileSync('avatar-share.json', JSON.stringify({ share }));

// ---------- 3. fidelity check (source space) ----------
const srcSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#fff"/><path d="${fullPath(0, 0)}"/></svg>`;
const mine = await sharp(Buffer.from(srcSvg)).greyscale().raw().toBuffer();
const src = await sharp(SRC).flatten({ background: '#fff' }).greyscale().raw().toBuffer();
const ov = Buffer.alloc(W * H * 3); let a = 0, b = 0, both = 0;
for (let i = 0; i < W * H; i++) {
  const s = src[i] < 128, m = mine[i] < 128; let c;
  if (s && m) { both++; c = [70, 70, 70]; } else if (s) { a++; c = [235, 30, 30]; } else if (m) { b++; c = [0, 180, 240]; } else c = [255, 255, 255];
  ov.set(c, i * 3);
}
const stats = { sourceOnlyPx: a, vectorOnlyPx: b, sharedPx: both, mismatchPctOfSourceInk: +((a + b) / (a + both) * 100).toFixed(3), mismatchPctOfCanvas: +((a + b) / (W * H) * 100).toFixed(3), iou: +(both / (both + a + b)).toFixed(4) };
console.log(JSON.stringify(stats));
fs.mkdirSync(`${DEST}/check`, { recursive: true });
await sharp(ov, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${DEST}/check/diff-overlay.png`);
fs.writeFileSync(`${DEST}/check/diff-stats.json`, JSON.stringify(stats, null, 2) + '\n');
fs.writeFileSync('srcspace-render.svg', srcSvg);
console.log('sizes', fs.readdirSync(DEST).filter(n => n.endsWith('.svg')).map(n => n + ' ' + fs.statSync(path.join(DEST, n)).size).join(', '));
