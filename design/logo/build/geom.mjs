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

function eyePath(px, py, ox, oy, opts) {
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
