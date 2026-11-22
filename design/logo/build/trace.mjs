// Trace the two big strokes with potrace from a lightly smoothed mask. Writes body.json with path d strings (source px space).
import sharp from 'sharp';
import potrace from 'potrace';
import fs from 'fs';
const { W, H, comps } = JSON.parse(fs.readFileSync('comps.json'));
const lab = new Int32Array(fs.readFileSync('comps.json.lab').buffer.slice(0));
const blur = +(process.argv[2] || 2.5);
const optTol = +(process.argv[3] || 0.6);
const bigs = comps.filter(c => c.area > 20000);
const out = {};
for (const c of bigs) {
  const buf = Buffer.alloc(W * H, 255);
  for (let i = 0; i < W * H; i++) if (lab[i] === c.id) buf[i] = 0;
  const png = await sharp(buf, { raw: { width: W, height: H, channels: 1 } }).blur(blur).png().toBuffer();
  const d = await new Promise((res, rej) => potrace.trace(png, { threshold: 128, turdSize: 50, alphaMax: 1.3, optCurve: true, optTolerance: optTol }, (e, svg) => e ? rej(e) : res(svg.match(/ d="([^"]+)"/)[1])));
  const nodes = (d.match(/C/g) || []).length + (d.match(/L/g) || []).length;
  console.log('comp', c.id, 'segments', nodes, 'len', d.length);
  out[c.id] = d;
}
fs.writeFileSync('body.json', JSON.stringify(out));
