// Big review images for the merged brow-pupil joint (22 Nov 2026), one screen each.
// Usage (in build/): node jointimages.mjs ../options
// Writes <out>/brow-D2.svg, <out>/brow-F2.svg and <out>/joint/*.png, and checks each merged eye for
// holes (light pixels cut off from the outside) and loose ink pieces.
import sharp from 'sharp';
import fs from 'fs';
import { fullPath, tightSvg, squareSvg, shareFor } from './geom.mjs';

const OUT = process.argv[2] || '../options';
const J = `${OUT}/joint`;
fs.mkdirSync(J, { recursive: true });
const eyes = JSON.parse(fs.readFileSync('eyes.json')).sort((a, b) => a.pupil.cx - b.pupil.cx);
const V = {
  D: { before: {}, after: { merge: {} } },
  F: { before: { grow: { max: 1.5 } }, after: { grow: { max: 1.5 }, merge: {} } },
};
fs.writeFileSync(`${OUT}/brow-D2.svg`, tightSvg(V.D.after, null));
fs.writeFileSync(`${OUT}/brow-F2.svg`, tightSvg(V.F.after, null));

const FONT = 'Segoe UI, Arial, sans-serif';
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const txt = (x, y, t, size, fill = '#222', anchor = 'start') => `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${esc(t)}</text>`;
async function page(W, H, bg, layers, texts) {
  const t = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${texts.join('')}</svg>`);
  return sharp({ create: { width: W, height: H, channels: 3, background: bg } }).composite([...layers, { input: t, left: 0, top: 0 }]).png();
}
// One eye (the left one) in source space, window relative to the pupil centre.
const EW = [-140, -118, 75, 72]; // x0, y0, x1, y1
async function eyeImg(opts, width, ring) {
  const e = eyes[0], [x0, y0, x1, y1] = [EW[0] + e.pupil.cx, EW[1] + e.pupil.cy, EW[2] + e.pupil.cx, EW[3] + e.pupil.cy];
  const w = x1 - x0, h = y1 - y0, H = Math.round(width * h / w);
  const mark = ring ? `<circle cx="${e.pupil.cx + 40}" cy="${e.pupil.cy - 42}" r="30" fill="none" stroke="#e0301e" stroke-width="0.8" stroke-dasharray="3 2"/>` : '';
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" width="${width}" height="${H}"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#fff"/><path d="${fullPath(0, 0, opts)}"/>${mark}</svg>`;
  return { buf: await sharp(Buffer.from(s)).png().toBuffer(), H };
}

// 1, 2: before / after, one eye per half.
for (const id of ['D', 'F']) {
  const W = 1600, H = 1000, PW = 740;
  const b = await eyeImg(V[id].before, PW, true), a = await eyeImg(V[id].after, PW, true);
  const top = 130;
  const thick = id === 'D' ? 'current thickness' : 'brow 1.5x thicker';
  const texts = [
    txt(40, 52, `${id}: the right end of the brow (${thick}). Left eye, about 3.5x the 1024 px logo.`, 30),
    txt(40, 92, 'Red dashed circle: the joint. Before: the brow tip runs on past the pupil as a hook, with a light slit under it. After: the brow grows out of the pupil.', 19, '#444'),
    txt(40 + PW / 2, top + b.H + 46, `Before: ${id}`, 30, '#222', 'middle'),
    txt(40 + PW + 40 + PW / 2, top + a.H + 46, `After: ${id}2`, 30, '#222', 'middle'),
  ];
  const layers = [{ input: b.buf, left: 40, top }, { input: a.buf, left: 40 + PW + 40, top }];
  await (await page(W, H, '#eeeeee', layers, texts)).toFile(`${J}/joint-${id}-before-after.png`);
}

// 3: the whole new logo, black on white and white on black.
for (const id of ['D', 'F']) {
  const W = 1600, H = 1000, PH = 860, PW = 780;
  const make = async (ink, bg) => {
    const s = tightSvg(V[id].after, ink).replace('<svg ', `<svg width="${Math.round(PH * 1015 / 1138)}" height="${PH}" `);
    const logo = await sharp(Buffer.from(s)).png().toBuffer();
    const m = await sharp(logo).metadata();
    return sharp({ create: { width: PW, height: PH + 60, channels: 3, background: bg } }).composite([{ input: logo, left: Math.round((PW - m.width) / 2), top: 30 }]).png().toBuffer();
  };
  const layers = [{ input: await make('#000', '#ffffff'), left: 13, top: 60 }, { input: await make('#fff', '#000000'), left: 13 + 780 + 14, top: 60 }];
  await (await page(W, H, '#cccccc', layers, [txt(20, 42, `${id}2: the whole logo with the new joint. Black on white, white on black.`, 28)])).toFile(`${J}/full-${id}.png`);
}

// 4: small sizes, true size and 8x.
{
  const SIZES = [64, 48, 32], W = 1600, ROWH = 590, top0 = 90;
  const layers = [], texts = [txt(30, 50, 'D2 and F2 at 64, 48 and 32 px. Each at true size (left), then the same pixels at 8x.', 28)];
  let y = top0;
  for (const id of ['D', 'F']) {
    texts.push(txt(30, y + 34, `${id}2`, 34, '#000'));
    let x = 110;
    const small = {};
    for (const s of SIZES) {
      small[s] = await sharp(Buffer.from(squareSvg(shareFor(s), V[id].after, '#000', null)), { density: 72 * s / 100 }).resize(s, s).flatten({ background: '#fff' }).png().toBuffer();
      layers.push({ input: small[s], left: x, top: y }); texts.push(txt(x, y + s + 22, `${s} px`, 16, '#333'));
      x += s + 24;
    }
    x += 16;
    for (const s of SIZES) {
      layers.push({ input: await sharp(small[s]).resize(s * 8, s * 8, { kernel: 'nearest' }).png().toBuffer(), left: x, top: y });
      texts.push(txt(x, y + s * 8 + 24, `${id}2, ${s} px at 8x`, 18, '#333'));
      x += s * 8 + 24;
    }
    y += ROWH;
  }
  await (await page(W, y + 10, '#f2f2f2', layers, texts)).toFile(`${J}/small-D-F.png`);
}

// Checks on each merged eye at 8x: light pixels not connected to the outside (holes) and ink pieces.
for (const id of ['D', 'F']) {
  for (const [k, opts] of Object.entries(V[id])) {
    for (const e of eyes) {
      const K = 8, x0 = e.pupil.cx - 150, y0 = e.pupil.cy - 130, w = 240, h = 210;
      // Only the eye: drop the 2 body subpaths.
      const d = fullPath(0, 0, opts).split(/(?=M)/).slice(2).join('');
      const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" width="${w * K}" height="${h * K}"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#fff"/><path d="${d}"/></svg>`;
      const px = await sharp(Buffer.from(s)).greyscale().raw().toBuffer();
      const W = w * K, H = h * K;
      const comps = (want) => {
        const seen = new Uint8Array(W * H), sizes = [];
        for (let i = 0; i < W * H; i++) {
          if (seen[i] || (px[i] < 128) !== want) continue;
          let n = 0, border = false; const st = [i]; seen[i] = 1;
          while (st.length) {
            const j = st.pop(), x = j % W, yy = (j - x) / W; n++;
            if (x === 0 || yy === 0 || x === W - 1 || yy === H - 1) border = true;
            for (const q of [j - 1, j + 1, j - W, j + W]) {
              if (q < 0 || q >= W * H || seen[q]) continue;
              if (Math.abs((q % W) - x) > 1) continue;
              if ((px[q] < 128) === want) { seen[q] = 1; st.push(q); }
            }
          }
          sizes.push({ n, border, at: `${((i % W) / K - 150).toFixed(1)},${(Math.floor(i / W) / K - 130).toFixed(1)}` });
        }
        return sizes;
      };
      const ink = comps(true), light = comps(false).filter(c => !c.border);
      console.log(`${id}${k === 'after' ? '2' : ''} eye at x ${Math.round(e.pupil.cx)}: ink pieces ${ink.length} (${ink.map(c => c.n).join(', ')}), enclosed light areas ${light.length}${light.length ? ' (' + light.map(c => c.n + "px@" + c.at).join(', ') + ')' : ''}`);
    }
  }
}
