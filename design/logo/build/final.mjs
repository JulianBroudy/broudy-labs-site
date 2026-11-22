// Generate all deliverables (main geometry only; no small variant since 22 Nov 2026) into <worktree>/design/logo from body.json + eyes.json.
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
const SRC = process.argv[2];
const DEST = process.argv[3];
fs.mkdirSync(DEST, { recursive: true });
const { W, H } = JSON.parse(fs.readFileSync('comps.json'));
import { fullPath, tightSvg, squareSvg, shareFor, MH, MW, BX0, BY0 } from './geom.mjs';

// ---------- 1. logo SVGs: tight viewBox, 40px padding (~3.5% of height) ----------
fs.writeFileSync(`${DEST}/logo.svg`, tightSvg({}, null));
fs.writeFileSync(`${DEST}/logo-white.svg`, tightSvg({}, '#fff'));
fs.writeFileSync(`${DEST}/logo-currentcolor.svg`, tightSvg({}, 'currentColor'));
// favicon.svg: prefers-color-scheme aware (black on light tabs, white on dark tabs). Main geometry.
{
  const S = MH / 0.94; const sx = (S - MW) / 2 - BX0, sy = (S - MH) / 2 - BY0; const r = (n) => Math.round(n * 10) / 10;
  const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r(S)} ${r(S)}"><style>path{fill:#000}@media(prefers-color-scheme:dark){path{fill:#fff}}</style><path d="${fullPath(sx, sy, {})}"/></svg>
`;
  fs.writeFileSync(`${DEST}/favicon.svg`, fav);
}
if (fs.existsSync(`${DEST}/logo-small.svg`)) fs.unlinkSync(`${DEST}/logo-small.svg`);

// ---------- 2. PNG exports ----------
fs.mkdirSync(`${DEST}/png`, { recursive: true });
const sizes = [16, 32, 48, 64, 180, 192, 512, 1024];
for (const s of sizes) {
  const share = shareFor(s);
  const sv = squareSvg(share, {}, null, null);
  await sharp(Buffer.from(sv), { density: 72 * s / 100 }).resize(s, s).png().toFile(`${DEST}/png/logo-${s}.png`);
  await sharp(Buffer.from(squareSvg(share, {}, '#fff', null)), { density: 72 * s / 100 }).resize(s, s).png().toFile(`${DEST}/png/logo-white-${s}.png`);
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
