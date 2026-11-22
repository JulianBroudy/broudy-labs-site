// Report tangent breaks at cubic joins in body.json paths.
import fs from 'fs';
const body = JSON.parse(fs.readFileSync(process.argv[2] || 'body.json'));
for (const [k, d] of Object.entries(body)) {
  const nums = d.match(/-?\d+\.?\d*/g).map(Number);
  const start = [nums[0], nums[1]]; const segs = []; let p = start;
  for (let i = 2; i + 5 < nums.length + 1; i += 6) { const s = [p, [nums[i], nums[i + 1]], [nums[i + 2], nums[i + 3]], [nums[i + 4], nums[i + 5]]]; segs.push(s); p = s[3]; }
  const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  segs.forEach((s, i) => {
    const n = segs[(i + 1) % segs.length];
    const tin = ang(s[2], s[3]), tout = ang(n[0], n[1]);
    let dlt = Math.abs(tin - tout) * 180 / Math.PI; if (dlt > 180) dlt = 360 - dlt;
    if (dlt > 1) console.log(k, 'joint', i, 'at', s[3].map(v => v.toFixed(1)).join(','), 'break', dlt.toFixed(1), 'deg');
  });
  console.log(k, 'segments', segs.length);
}
