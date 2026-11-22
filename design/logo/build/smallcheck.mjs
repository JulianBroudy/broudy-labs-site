// Render logo.svg and logo-small.svg at 16/32/48 (square, 94% fill), upscale x8 nearest, side by side.
import sharp from 'sharp';
import fs from 'fs';
const D = process.argv[2];
const out = process.argv[3];
function squareOf(file) {
  const t = fs.readFileSync(file, 'utf8');
  const [, , w, h] = t.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const S = h / 0.94 * (1 - 80 / h * 0.94 * 0) ; // pad already in viewBox; recentre into square
  const vx = -(S - w) / 2, vy = -(S - h) / 2;
  return t.replace(/viewBox="[^"]+"/, `viewBox="${vx} ${vy} ${S} ${S}"`);
}
const rows = [];
for (const file of ['logo.svg', 'logo-small.svg']) {
  const sv = squareOf(`${D}/${file}`);
  const tiles = [];
  for (const s of [16, 32, 48]) {
    const png = await sharp(Buffer.from(sv), { density: 72 * s / 100 }).resize(s, s).flatten({ background: '#fff' }).png().toBuffer();
    tiles.push(await sharp(png).resize(s * 8, s * 8, { kernel: 'nearest' }).png().toBuffer());
    tiles.push(await sharp(png).png().toBuffer());
  }
  rows.push(tiles);
}
const comp = []; let y = 10;
for (const r of rows) { let x = 10; for (const t of r) { const m = await sharp(t).metadata(); comp.push({ input: t, left: x, top: y }); x += m.width + 20; } y += 48 * 8 + 20; }
await sharp({ create: { width: 1800, height: y, channels: 3, background: '#ddd' } }).composite(comp).png().toFile(out);
