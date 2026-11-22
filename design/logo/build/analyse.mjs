// Threshold the source, label connected components, print stats, save per-component masks.
import sharp from 'sharp';
import fs from 'fs';
const src = process.argv[2];
const { data, info } = await sharp(src).flatten({ background: '#fff' }).greyscale().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
console.log('size', W, H);
const ink = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) ink[i] = data[i] < 128 ? 1 : 0;
const lab = new Int32Array(W * H).fill(0);
let n = 0; const comps = [];
for (let i = 0; i < W * H; i++) {
  if (!ink[i] || lab[i]) continue;
  n++; const st = [i]; lab[i] = n;
  let c = { id: n, area: 0, sx: 0, sy: 0, x0: W, y0: H, x1: 0, y1: 0, pix: [] };
  while (st.length) {
    const p = st.pop(); const x = p % W, y = (p / W) | 0;
    c.area++; c.sx += x; c.sy += y; c.pix.push(p);
    if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
    for (const q of [p - 1, p + 1, p - W, p + W]) {
      if (q < 0 || q >= W * H) continue;
      if (ink[q] && !lab[q]) { lab[q] = n; st.push(q); }
    }
  }
  comps.push(c);
}
const big = comps.filter(c => c.area > 50).sort((a, b) => a.x0 - b.x0);
const out = [];
for (const c of big) {
  const cx = c.sx / c.area, cy = c.sy / c.area;
  console.log(`comp ${c.id} area ${c.area} bbox ${c.x0},${c.y0}-${c.x1},${c.y1} centroid ${cx.toFixed(1)},${cy.toFixed(1)} rEq ${Math.sqrt(c.area / Math.PI).toFixed(2)}`);
  out.push({ id: c.id, area: c.area, bbox: [c.x0, c.y0, c.x1, c.y1], cx, cy });
}
console.log('small comps', comps.filter(c => c.area <= 50).length);
fs.writeFileSync(process.argv[3] || 'comps.json', JSON.stringify({ W, H, comps: out }));
// Save label map for later
fs.writeFileSync((process.argv[3] || 'comps.json') + '.lab', Buffer.from(lab.buffer));
