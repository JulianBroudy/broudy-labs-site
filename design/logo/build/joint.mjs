// Merged brow-pupil joint (D2, F2 of 22 Nov 2026): fit and fidelity.
// Usage (in build/): node joint.mjs fit     -> grid search for merge {a, b} against the source
//                    node joint.mjs score   -> mismatch vs source for D, D2, F, F2 (joint window, whole eye)
import sharp from 'sharp';
import fs from 'fs';
import { fullPath, MERGE_DEFAULT } from './geom.mjs';

const SRC = '../../logo-source-chatgpt.png';
const eyes = JSON.parse(fs.readFileSync('eyes.json')).sort((a, b) => a.pupil.cx - b.pupil.cx);
const K = 4; // render scale
const src = await sharp(SRC).flatten({ background: '#fff' }).greyscale().raw().toBuffer({ resolveWithObject: true });
// Windows relative to each pupil centre: the joint (top right of the pupil) and the whole eye.
const WIN = { joint: [-10, -95, 75, 20], eye: [-135, -100, 75, 60] };
async function mismatch(opts, win) {
  let bad = 0, ink = 0;
  for (const e of eyes) {
    const [x0, y0, x1, y1] = win.map((v, i) => Math.round(v + (i % 2 ? e.pupil.cy : e.pupil.cx)));
    const w = x1 - x0, h = y1 - y0;
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" width="${w * K}" height="${h * K}"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#fff"/><path d="${fullPath(0, 0, opts)}"/></svg>`;
    const r = await sharp(Buffer.from(s)).greyscale().raw().toBuffer();
    for (let yy = 0; yy < h * K; yy++) for (let xx = 0; xx < w * K; xx++) {
      const sx = x0 + (xx + 0.5) / K, sy = y0 + (yy + 0.5) / K;
      // bilinear sample of the source
      const ix = Math.floor(sx - 0.5), iy = Math.floor(sy - 0.5), fx = sx - 0.5 - ix, fy = sy - 0.5 - iy, W = src.info.width;
      const g = (a, b) => src.data[b * W + a];
      const v = (1 - fy) * ((1 - fx) * g(ix, iy) + fx * g(ix + 1, iy)) + fy * ((1 - fx) * g(ix, iy + 1) + fx * g(ix + 1, iy + 1));
      const a = r[yy * w * K + xx] < 128, b = v < 128;
      if (b) ink++;
      if (a !== b) bad++;
    }
  }
  return { bad: bad / K / K, pct: +(100 * bad / ink).toFixed(3) };
}

const mode = process.argv[2] || 'score';
if (mode === 'fit') {
  let best = null;
  for (let a = -80; a <= -30; a += 5) for (let b = a + 15; b <= 25; b += 5) {
    const m = await mismatch({ merge: { a, b } }, WIN.joint);
    if (!best || m.bad < best.bad) best = { a, b, ...m };
  }
  console.log('coarse', best);
  const c = best;
  for (let a = c.a - 4; a <= c.a + 4; a += 1) for (let b = c.b - 4; b <= c.b + 4; b += 1) {
    if (b < a + 10) continue;
    const m = await mismatch({ merge: { a, b } }, WIN.joint);
    if (m.bad < best.bad) best = { a, b, ...m };
  }
  console.log('fine', best);
} else {
  const rows = [];
  for (const [id, o] of [['D', {}], ['D2', { merge: {} }], ['F', { grow: { max: 1.5 } }], ['F2', { grow: { max: 1.5 }, merge: {} }]]) {
    rows.push({ id, joint: await mismatch(o, WIN.joint), eye: await mismatch(o, WIN.eye) });
  }
  console.log(JSON.stringify({ merge: MERGE_DEFAULT, rows }, null, 1));
}
