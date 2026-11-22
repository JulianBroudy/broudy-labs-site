// Curvature check of the merged upper edge: lists angles where the outline is not convex.
// Usage: node convex.mjs [growMax]  (finite differences with step h degrees, wider than F's sample spacing)
import { mergedEdge } from './geom.mjs';
const opts = process.argv[2] ? { grow: { max: +process.argv[2] }, merge: {} } : { merge: {} };
const { r, ta, tb } = mergedEdge(opts);
const D = Math.PI / 180;
for (const hDeg of [0.01, 0.5, 1]) {
  const e = hDeg * D, bad = [];
  let minRc = 1e9;
  for (let t = ta - 20 * D; t < tb; t += 0.25 * D) {
    const r0 = r(t), r1 = (r(t + e) - r(t - e)) / (2 * e), r2 = (r(t + e) - 2 * r0 + r(t - e)) / (e * e);
    const den = r0 * r0 + 2 * r1 * r1 - r0 * r2;
    if (den <= 0) bad.push((t / D).toFixed(1)); else minRc = Math.min(minRc, Math.pow(r0 * r0 + r1 * r1, 1.5) / den);
  }
  console.log(`step ${hDeg} deg: min radius of curvature ${minRc.toFixed(1)}, non-convex at`, bad.length ? bad.join(' ') : 'none');
}
