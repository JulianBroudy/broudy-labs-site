// Make a 2x2 grid of zoomed crops from an image: node crops.mjs in.png out.png x,y,w x,y,w ...
import sharp from 'sharp';
const [inp, out, ...boxes] = process.argv.slice(2);
const tiles = [];
const T = 500;
for (const b of boxes) {
  const [x, y, w] = b.split(',').map(Number);
  tiles.push(await sharp(inp).extract({ left: x, top: y, width: w, height: w }).resize(T, T, { kernel: 'nearest' }).png().toBuffer());
}
const cols = 2, rows = Math.ceil(tiles.length / cols);
await sharp({ create: { width: cols * T + (cols - 1) * 8, height: rows * T + (rows - 1) * 8, channels: 3, background: '#888' } })
  .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * (T + 8), top: Math.floor(i / cols) * (T + 8) })))
  .png().toFile(out);
