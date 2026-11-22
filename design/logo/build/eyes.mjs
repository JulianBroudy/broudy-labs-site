// Fit pupil circle and brow crescent (two circles) for each eye component.
import fs from 'fs';
const { W, H, comps } = JSON.parse(fs.readFileSync('comps.json'));
const lab = new Int32Array(fs.readFileSync('comps.json.lab').buffer.slice(0));
const eyes = comps.filter(c => c.area < 20000);

function boundary(pred) {
  const pts = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!pred(x, y)) continue;
    if (!pred(x - 1, y) || !pred(x + 1, y) || !pred(x, y - 1) || !pred(x, y + 1)) pts.push([x + 0.5, y + 0.5]);
  }
  return pts;
}
// Kasa algebraic circle fit
function fitCircle(pts) {
  let sx = 0, sy = 0, n = pts.length; for (const [x, y] of pts) { sx += x; sy += y; }
  const mx = sx / n, my = sy / n;
  let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
  for (const [x, y] of pts) { const u = x - mx, v = y - my; suu += u * u; svv += v * v; suv += u * v; suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u; }
  const a = suu, b = suv, c = suv, d = svv, e = 0.5 * (suuu + suvv), f = 0.5 * (svvv + svuu);
  const det = a * d - b * c; const uc = (e * d - b * f) / det, vc = (a * f - e * c) / det;
  const r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / n);
  const cx = uc + mx, cy = vc + my;
  let rms = 0; for (const [x, y] of pts) rms += (Math.hypot(x - cx, y - cy) - r) ** 2;
  return { cx, cy, r, rms: Math.sqrt(rms / n) };
}
const res = [];
for (const e of eyes) {
  const inC = (x, y) => lab[y * W + x] === e.id;
  const bpts = boundary(inC);
  // pupil: boundary points in lower part (below the bbox centre-ish)
  let c0 = { cx: e.cx, cy: e.bbox[3] - 52, r: 52 };
  let pup;
  for (let it = 0; it < 6; it++) {
    const sel = bpts.filter(([x, y]) => Math.abs(Math.hypot(x - c0.cx, y - c0.cy) - c0.r) < 6 && y > c0.cy - c0.r * 0.6);
    pup = fitCircle(sel); c0 = pup;
  }
  // brow pixels = component minus dilated pupil disk
  const inBrow = (x, y) => inC(x, y) && Math.hypot(x + 0.5 - pup.cx, y + 0.5 - pup.cy) > pup.r + 3;
  const browPts = boundary(inBrow).filter(([x, y]) => Math.hypot(x - pup.cx, y - pup.cy) > pup.r + 5);
  // split outer (upper/left) vs inner edge: fit one circle to all, then split by radius from that centre
  const all = fitCircle(browPts);
  const outer = fitCircle(browPts.filter(([x, y]) => Math.hypot(x - all.cx, y - all.cy) > all.r));
  const inner = fitCircle(browPts.filter(([x, y]) => Math.hypot(x - all.cx, y - all.cy) <= all.r));
  // endpoints: brow pixels farthest apart
  let bp = []; for (let y = e.bbox[1]; y <= e.bbox[3]; y++) for (let x = e.bbox[0]; x <= e.bbox[2]; x++) if (inBrow(x, y)) bp.push([x + 0.5, y + 0.5]);
  const leftTip = bp.reduce((m, p) => (p[0] - p[1] * 0.3 < m[0] - m[1] * 0.3 ? p : m));
  // right tip: brow point with largest angle clockwise from top of outer circle, i.e. max x among those near the pupil top
  const rightTip = bp.reduce((m, p) => (p[0] > m[0] ? p : m));
  let thick = 0; // max thickness along radius from 'all' centre
  const byAng = {};
  for (const [x, y] of bp) { const a = Math.round(Math.atan2(y - all.cy, x - all.cx) * 180 / Math.PI); const d = Math.hypot(x - all.cx, y - all.cy); (byAng[a] ||= []).push(d); }
  const prof = Object.entries(byAng).map(([a, ds]) => [+a, Math.max(...ds) - Math.min(...ds) + 1]).sort((p, q) => p[0] - q[0]);
  res.push({ id: e.id, pupil: pup, all, outer, inner, leftTip, rightTip, prof });
  console.log('eye', e.id, 'pupil', JSON.stringify(pup));
  console.log('  outer', JSON.stringify(outer), '\n  inner', JSON.stringify(inner));
  console.log('  tips', leftTip, rightTip);
  console.log('  profile', prof.map(p => p.join(':')).join(' '));
}
fs.writeFileSync('eyes.json', JSON.stringify(res, null, 1));
