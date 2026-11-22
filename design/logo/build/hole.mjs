// Winding check: draws the 4 eye shapes as one path and as separate paths, and counts pixels that
// the single path leaves empty (a hole where two shapes overlap with opposite direction).
// Usage: node hole.mjs ../logo.svg [crop.png] [source.png]  (expect only a few edge pixels)
import sharp from 'sharp';
import fs from 'fs';
const svgTxt = fs.readFileSync(process.argv[2], 'utf8');
const d = svgTxt.match(/ d="([^"]+)"/)[1];
const vb = svgTxt.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
const subs = d.split(/(?=M)/);
const eyeSubs = subs.slice(-4); // brow L, pupil L, brow R, pupil R
const render = async (paths, rule) => {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${vb[2]*4}" height="${vb[3]*4}"><rect width="100%" height="100%" fill="#fff"/>${paths.map(p => `<path fill-rule="${rule}" d="${p}"/>`).join('')}</svg>`;
  return sharp(Buffer.from(s)).greyscale().raw().toBuffer();
};
const one = await render([eyeSubs.join('')], 'nonzero');
const sep = await render(eyeSubs, 'nonzero');
let holes = 0; for (let i = 0; i < one.length; i++) if (sep[i] < 128 && one[i] >= 128) holes++;
console.log('pixels inked when drawn separately but empty in the single path (at 4x):', holes);
const W = vb[2]*4, H = vb[3]*4; let x0=W,y0=H,x1=0,y1=0;
for (let i = 0; i < one.length; i++) if (sep[i] < 128 && one[i] >= 128) { const x=i%W,y=Math.floor(i/W); x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y); }
console.log('hole bbox (4x)', x0,y0,x1,y1);
if (process.argv[3]) { const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${vb[2]*4}" height="${vb[3]*4}"><rect width="100%" height="100%" fill="#000"/><path fill="#fff" d="${eyeSubs.join('')}"/></svg>`;
await sharp(Buffer.from(s)).extract({left: 1700, top: 2380, width: 1200, height: 560}).png().toFile(process.argv[3]); }
if (process.argv[4]) { // source PNG: ink share inside hole pixels
  const src = await sharp(process.argv[4]).flatten({ background: '#fff' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  let ink = 0, n = 0;
  for (let i = 0; i < one.length; i++) if (sep[i] < 128 && one[i] >= 128) { const x = (i % W) / 4 + 98, y = Math.floor(i / W) / 4 + 67; n++; if (src.data[Math.floor(y) * src.info.width + Math.floor(x)] < 128) ink++; }
  console.log('source ink share in hole', (ink / n).toFixed(3));
}
