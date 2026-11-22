// Shared geometry for the Broudy Labs mark: body strokes from body.json, eyes from eyes.json.
// Used by final.mjs (deliverables) and options.mjs (brow options).
import fs from 'fs';

const eyes = JSON.parse(fs.readFileSync(new URL('./eyes.json', import.meta.url)));
const body = JSON.parse(fs.readFileSync(new URL('./body.json', import.meta.url)));
export const f = (n) => { const v = Math.round(n * 10) / 10; return (Object.is(v, -0) ? 0 : v).toString(); };

const avg = (g) => eyes.reduce((s, e) => s + g(e), 0) / eyes.length;
export const BASE = {
  R: avg(e => e.pupil.r),
  O: { dx: avg(e => e.outer.cx - e.pupil.cx), dy: avg(e => e.outer.cy - e.pupil.cy), r: avg(e => e.outer.r) },
  I: { dx: avg(e => e.inner.cx - e.pupil.cx), dy: avg(e => e.inner.cy - e.pupil.cy), r: avg(e => e.inner.r) },
};
// Brow thickness at its middle (top of the arc), source px.
const midThick = (O, I) => (I.dy - I.r) - (O.dy - O.r);
export const BROW_T0 = midThick(BASE.O, BASE.I);

const [eL, eR] = [...eyes].sort((a, b) => a.pupil.cx - b.pupil.cx);
function circleInter(c1, r1, c2, r2) {
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1], d = Math.hypot(dx, dy);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(r1 * r1 - a * a);
  const mx = c1[0] + a * dx / d, my = c1[1] + a * dy / d;
  return [[mx + h * dy / d, my - h * dx / d], [mx - h * dy / d, my + h * dx / d]];
}

// Brow options (all optional):
//   scale: grow both brow circles about the pupil centre (moves the brow out and makes it longer)
//   lift:  move the brow up, source px
//   thick: brow middle thickness as a multiple of the approved thickness; the outer edge moves up,
//          the lower edge stays where it is, so the gap to the pupil does not shrink
export function browCircles(opts = {}) {
  const s = opts.scale || 1, lift = opts.lift || 0, k = opts.thick || 1;
  const O = { dx: BASE.O.dx * s, dy: BASE.O.dy * s - lift, r: BASE.O.r * s };
  const I = { dx: BASE.I.dx * s, dy: BASE.I.dy * s - lift, r: BASE.I.r * s };
  O.dy -= k * BROW_T0 - midThick(O, I);
  return { O, I };
}

// Grown brows (options E, F, G of 22 Nov 2026). Julian picked D because its brows are joined to the
// pupils. So these keep D exactly where the brow meets the pupil, and only grow the brow away from it.
// The lower edge is D's inner circle, so the light gap does not change. The upper edge is D's upper
// edge moved outwards: at each angle around the inner circle's centre, the thickness is D's thickness
// times g, where g = thick over the left and middle of the brow and falls smoothly to 1 before the
// brow reaches the pupil. From there to the right tip the brow is D's brow. The upper edge is drawn
// as smooth cubic curves through samples (Catmull-Rom), so it has no corners.
// opts.grow = { max: wanted max thickness as a multiple of D's (or thick: the factor g directly),
// from: where the fade starts and to: where it ends, both as a share of the brow from the left tip (0)
// to the right tip (1); the pupil contact runs from 0.76 to 0.88 }.
const at = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
// Thickness = distance from the inner circle, sampled along the upper edge: [[x, thickness], ...].
function thickness(pts) {
  const I = BASE.I;
  return pts.map(p => [p[0], Math.hypot(p[0] - I.dx, p[1] - I.dy) - I.r]);
}
const arcPts = (c, r, a0, a1, n = 240) => [...Array(n + 1)].map((_, i) => at(c, r, a0 + (a1 - a0) * i / n));
export function browProfile(opts = {}) {
  if (opts.grow) return thickness(growEdge(opts.grow, 240));
  const { O, I } = browCircles(opts);
  const [pL, pR] = circleInter([O.dx, O.dy], O.r, [I.dx, I.dy], I.r).sort((p, q) => p[0] - q[0]);
  const a0 = Math.atan2(pL[1] - O.dy, pL[0] - O.dx), a1 = Math.atan2(pR[1] - O.dy, pR[0] - O.dx);
  return thickness(arcPts([O.dx, O.dy], O.r, a0, a1));
}
export const BROW_MAX0 = Math.max(...browProfile({}).map(p => p[1]));
// D's tips and the angles of the tips around the inner circle's centre.
function dFrame() {
  const { O, I } = BASE;
  const [pL, pR] = circleInter([O.dx, O.dy], O.r, [I.dx, I.dy], I.r).sort((p, q) => p[0] - q[0]);
  const ang = (p) => Math.atan2(p[1] - I.dy, p[0] - I.dx);
  return { O, I, pL, pR, fL: ang(pL), fR: ang(pR) };
}
// Share of the brow (0 = left tip, 1 = right tip) at a point given by its angle round the inner centre.
export function browShare(p) { const { I, fL, fR } = dFrame(); return (Math.atan2(p[1] - I.dy, p[0] - I.dx) - fL) / (fR - fL); }
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// Upper edge points from the left tip to the right tip (n + 1 points). With max (a multiple of D's
// max thickness) instead of thick, thick is solved so the brow's max thickness is max x D's.
export function growEdge(gr = {}, n = 16) {
  if (gr.max) {
    let lo = 1, hi = 4;
    const maxOf = (k) => Math.max(...thickness(growEdge({ ...gr, max: 0, thick: k }, 240)).map(p => p[1]));
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (maxOf(m) < gr.max * BROW_MAX0) lo = m; else hi = m; }
    return growEdge({ ...gr, max: 0, thick: lo }, n);
  }
  const { thick = 1, from = 0.4, to = 0.9 } = gr;
  const { O, I, fL, fR } = dFrame();
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, phi = fL + (fR - fL) * s, u = [Math.cos(phi), Math.sin(phi)];
    // D's thickness along this ray: where the ray from the inner centre leaves the outer circle.
    const fx = I.dx - O.dx, fy = I.dy - O.dy, b = fx * u[0] + fy * u[1], c = fx * fx + fy * fy - O.r * O.r;
    const tD = Math.max(0, -b + Math.sqrt(b * b - c) - I.r);
    const g = 1 + (thick - 1) * (1 - smooth((s - from) / (to - from)));
    pts.push([I.dx + (I.r + tD * g) * u[0], I.dy + (I.r + tD * g) * u[1]]);
  }
  return pts;
}
function growEyePath(px, py, ox, oy, gr) {
  const P = (p) => `${f(p[0] + px + ox)} ${f(p[1] + py + oy)}`;
  const pts = growEdge(gr, 24), I = BASE.I, R = BASE.R, n = pts.length - 1;
  // Catmull-Rom through the samples, as cubic curves. The end tangents use the next point only.
  let d = `M${P(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${P(c1)} ${P(c2)} ${P(p2)}`;
  }
  // Clockwise like D: upper edge left to right, then back along the inner circle.
  return d + `A${f(I.r)} ${f(I.r)} 0 0 0 ${P(pts[0])}Z` +
    `M${P([-R, 0])}a${f(R)} ${f(R)} 0 1 1 ${f(2 * R)} 0a${f(R)} ${f(R)} 0 1 1 ${f(-2 * R)} 0Z`;
}

// Merged joint (D2, F2 of 22 Nov 2026). In D the brow's right tip runs past the point where it touches
// the pupil, as a small hook with a light slit under it. Julian wants the brow to grow out of the pupil
// instead, as in the source. So brow and pupil are now one closed outline, clockwise:
//   1. the brow's upper edge from the left tip (D's outer circle, or the grown edge of E/F/G),
//   2. from angle a to angle b (degrees round the pupil centre, 0 = right, -90 = top) the distance from
//      the pupil centre falls from the upper edge to the pupil radius with a C2 smootherstep, so the
//      outline leaves the upper edge with the same tangent and curvature and meets the pupil circle
//      tangentially (no corner on either side),
//   3. the pupil circle, clockwise, from b to the point where the brow's lower edge (D's inner circle)
//      first meets it,
//   4. the lower edge back to the left tip.
// Everything right of that meeting point is filled: no hook, no slit. The light gap between brow and
// pupil is unchanged up to that point, where it ends in the same point as before.
// opts.merge = { a, b } in degrees. Default -65 to 20: a fit to the source (joint.mjs fit) is flat
// (about 1% between candidates), so a and b were picked by eye. A narrower blend (-60 to 0) leaves a
// flat shoulder on the right of the pupil; -65 to 20 is convex all the way (convex.mjs) and ends near
// the pupil's right side, as in the source. a must stay right of the lower edge's meeting point (-72.7).
export const MERGE_DEFAULT = { a: -65, b: 20 };
const DEG = Math.PI / 180;
const sstep2 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (6 * x - 15) + 10));
// Distance from the pupil centre to D's outer circle along the ray at angle t.
function rOuter(t) {
  const O = BASE.O, u0 = Math.cos(t), u1 = Math.sin(t);
  const b = u0 * O.dx + u1 * O.dy, c = O.dx * O.dx + O.dy * O.dy - O.r * O.r;
  return b + Math.sqrt(b * b - c);
}
// The upper edge as r(t) round the pupil centre. Past the right tip it continues on D's outer circle
// (the grown edges equal D's edge near the right tip, so this is continuous).
function upperPolar(opts) {
  if (!opts.grow) return rOuter;
  const pol = growEdge(opts.grow, 720).map(p => {
    let t = Math.atan2(p[1], p[0]); if (t > Math.PI - 0.5) t -= 2 * Math.PI;
    return [t, Math.hypot(p[0], p[1])];
  });
  const tEnd = pol[pol.length - 1][0];
  return (t) => {
    if (t >= tEnd) return rOuter(t);
    let i = pol.findIndex(q => q[0] >= t); if (i <= 0) i = 1;
    const [t0, r0] = pol[i - 1], [t1, r1] = pol[i];
    return r0 + (r1 - r0) * (t - t0) / (t1 - t0);
  };
}
// Angle (round the pupil centre) of the first point where the lower edge meets the pupil, going
// clockwise over the top of the pupil, and of the left tip.
export function mergeFrame() {
  const { O, I, R } = BASE;
  const [pL] = circleInter([O.dx, O.dy], O.r, [I.dx, I.dy], I.r).sort((p, q) => p[0] - q[0]);
  const ci = circleInter([0, 0], R, [I.dx, I.dy], I.r).map(p => [p, Math.atan2(p[1], p[0])]).sort((p, q) => p[1] - q[1]);
  let tL = Math.atan2(pL[1], pL[0]); if (tL > Math.PI - 0.5) tL -= 2 * Math.PI;
  return { pL, tL, c1: ci[0][0], tC1: ci[0][1] };
}
// Outline points of the merged upper edge, left tip to angle b, plus 2 guide points on the pupil
// circle after b (for the end tangent only).
export function mergedEdge(opts = {}, step = 1.5) {
  const m = { ...MERGE_DEFAULT, ...(opts.merge || {}) };
  const ta = m.a * DEG, tb = m.b * DEG, R = BASE.R, rU = upperPolar(opts);
  const { pL, tL } = mergeFrame();
  const r = (t) => (t <= ta ? rU(t) : R + (rU(t) - R) * (1 - sstep2((t - ta) / (tb - ta))));
  const n = Math.max(8, Math.ceil((tb - tL) / (step * DEG)));
  const pts = [pL];
  for (let i = 1; i <= n + 2; i++) { const t = tL + (tb - tL) * i / n; const rr = i > n ? R : r(t); pts.push([rr * Math.cos(t), rr * Math.sin(t)]); }
  return { pts, n, r, ta, tb };
}
function mergedEyePath(px, py, ox, oy, opts) {
  const P = (p) => `${f(p[0] + px + ox)} ${f(p[1] + py + oy)}`;
  const { pts, n, tb } = mergedEdge(opts);
  const { I, R } = BASE, { c1, tC1, pL } = mergeFrame();
  let d = `M${P(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
    const c1_ = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2_ = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${P(c1_)} ${P(c2_)} ${P(p2)}`;
  }
  // Pupil clockwise from b to c1 (the long way round, over the bottom), then the lower edge back.
  let span = tC1 - tb; while (span < 0) span += 2 * Math.PI;
  return d + `A${f(R)} ${f(R)} 0 ${span > Math.PI ? 1 : 0} 1 ${P(c1)}A${f(I.r)} ${f(I.r)} 0 0 0 ${P(pL)}Z`;
}

function eyePath(px, py, ox, oy, opts) {
  if (opts && opts.merge) return mergedEyePath(px, py, ox, oy, opts);
  if (opts && opts.grow) return growEyePath(px, py, ox, oy, opts.grow);
  const { O, I } = browCircles(opts);
  const oc = [px + O.dx, py + O.dy], ic = [px + I.dx, py + I.dy];
  let [p1, p2] = circleInter(oc, O.r, ic, I.r);
  if (p1[0] > p2[0]) [p1, p2] = [p2, p1];
  const ang = (p, c) => Math.atan2(p[1] - c[1], p[0] - c[0]);
  const span = (a1, a2) => { let s = a2 - a1; while (s < 0) s += 2 * Math.PI; return s; };
  const so = span(ang(p1, oc), ang(p2, oc)), si = span(ang(p1, ic), ang(p2, ic));
  const P = (p) => `${f(p[0] + ox)} ${f(p[1] + oy)}`;
  const R = BASE.R;
  // The brow runs clockwise. The pupil must run clockwise too (sweep flag 1): where the brow tip
  // overlaps the pupil, opposite directions cancel under the nonzero fill rule and leave a hole.
  return `M${P(p1)}A${f(O.r)} ${f(O.r)} 0 ${so > Math.PI ? 1 : 0} 1 ${P(p2)}A${f(I.r)} ${f(I.r)} 0 ${si > Math.PI ? 1 : 0} 0 ${P(p1)}Z` +
    `M${P([px - R, py])}a${f(R)} ${f(R)} 0 1 1 ${f(2 * R)} 0a${f(R)} ${f(R)} 0 1 1 ${f(-2 * R)} 0Z`;
}
function bodyPath(ox, oy) {
  return Object.keys(body).sort().map(k => {
    let i = 0;
    const d = body[k].replace(/-?\d+\.?\d*/g, (m) => f(+m + (i++ % 2 === 0 ? ox : oy)));
    return d.replace(/\s*,\s*/g, ' ').replace(/\s*([MCLZ])\s*/g, '$1').trim() + 'Z';
  }).join('');
}
export function fullPath(ox, oy, opts) {
  return bodyPath(ox, oy) + eyePath(eL.pupil.cx, eL.pupil.cy, ox, oy, opts) + eyePath(eR.pupil.cx, eR.pupil.cy, ox, oy, opts);
}

// Mark bbox in source space (from analysis): x 138..1072, y 107..1164. Options that lift or
// grow the brows stay well inside it (the brows sit inside the "b" bowl).
export const BX0 = 138, BY0 = 107, BX1 = 1073, BY1 = 1165;
export const MW = BX1 - BX0, MH = BY1 - BY0;
export const svg = (vb, d, fill, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${extra}<path${fill ? ` fill="${fill}"` : ''} d="${d}"/></svg>\n`;
export const PAD = 40;
export function tightSvg(opts, fill) {
  return svg(`0 0 ${MW + 2 * PAD} ${MH + 2 * PAD}`, fullPath(PAD - BX0, PAD - BY0, opts), fill);
}
// Square version, mark centred. fillShare = share of the square the mark height takes.
export function squareSvg(fillShare, opts, color, bg) {
  const S = MH / fillShare;
  const sx = (S - MW) / 2 - BX0, sy = (S - MH) / 2 - BY0;
  const r = (n) => Math.round(n * 10) / 10;
  const bgRect = bg ? `<rect width="${r(S)}" height="${r(S)}" fill="${bg}"/>` : '';
  return svg(`0 0 ${r(S)} ${r(S)}`, fullPath(sx, sy, opts), color, bgRect);
}
// Share used for the square PNG exports at each size.
export const shareFor = (s) => (s <= 48 ? 0.94 : s <= 64 ? 0.9 : 0.8);
