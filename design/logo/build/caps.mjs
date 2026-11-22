// Fit circles to the stroke end caps of an image (source or render). node caps.mjs img.png
import sharp from 'sharp';
const img = process.argv[2];
const { data, info } = await sharp(img).flatten({ background: '#fff' }).greyscale().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const ink = (x, y) => x >= 0 && y >= 0 && x < W && y < H && data[y * W + x] < 128;
const bpts = [];
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (ink(x, y) && (!ink(x - 1, y) || !ink(x + 1, y) || !ink(x, y - 1) || !ink(x, y + 1))) bpts.push([x + 0.5, y + 0.5]);
function fitCircle(pts) {
  let sx = 0, sy = 0, n = pts.length; for (const [x, y] of pts) { sx += x; sy += y; }
  const mx = sx / n, my = sy / n; let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
  for (const [x, y] of pts) { const u = x - mx, v = y - my; suu += u * u; svv += v * v; suv += u * v; suuu += u ** 3; svvv += v ** 3; suvv += u * v * v; svuu += v * u * u; }
  const e = 0.5 * (suuu + suvv), f = 0.5 * (svvv + svuu), det = suu * svv - suv * suv;
  const uc = (e * svv - suv * f) / det, vc = (suu * f - e * suv) / det; const r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / n);
  const cx = uc + mx, cy = vc + my; let rms = 0, mx2 = 0; for (const [x, y] of pts) { const d = Math.abs(Math.hypot(x - cx, y - cy) - r); rms += d * d; mx2 = Math.max(mx2, d); }
  return { cx, cy, r, rms: Math.sqrt(rms / n), max: mx2, n };
}
const caps = { bTop: [560, 180, 62, -0.3, -1], bBottom: [385, 1105, 58, 0, 1], arm: [645, 595, 40, 1, 0], pTop: [790, 480, 70, -0.5, -1], pBottom: [815, 1105, 55, 0, 1] };
for (const [name, [cx0, cy0, r0, dx, dy]] of Object.entries(caps)) {
  let c = { cx: cx0, cy: cy0, r: r0 };
  const dl = Math.hypot(dx, dy);
  for (let it = 0; it < 8; it++) {
    const sel = bpts.filter(([x, y]) => Math.abs(Math.hypot(x - c.cx, y - c.cy) - c.r) < 4 && ((x - c.cx) * dx + (y - c.cy) * dy) / dl / c.r > 0.1);
    if (sel.length < 10) break; c = fitCircle(sel);
  }
  console.log(name, Object.fromEntries(Object.entries(c).map(([k, v]) => [k, +v.toFixed(2)])));
}
