// Contact sheet: source vs vector, diff, eye zoom, sizes, colourways, circle crop.
import sharp from 'sharp';
import fs from 'fs';
const [SRC, D] = process.argv.slice(2);
const uri = async (buf) => 'data:image/png;base64,' + (await sharp(buf).png().toBuffer()).toString('base64');
const file = (p) => fs.readFileSync(p);
const nearest = async (p, s) => uri(await sharp(p).resize(s, s, { kernel: 'nearest' }).toBuffer());
const els = [];
const label = (x, y, t, size = 22) => els.push(`<text x="${x}" y="${y}" font-family="Segoe UI, Arial, sans-serif" font-size="${size}" fill="#333">${t}</text>`);
const img = async (x, y, w, h, buf) => els.push(`<image x="${x}" y="${y}" width="${w}" height="${h}" href="${await uri(buf)}"/>`);
const W = 2520;
label(40, 50, 'Broudy Labs logo: vector rebuild check sheet', 32);
const stats = JSON.parse(fs.readFileSync(`${D}/check/diff-stats.json`));
// Row 1
let y = 90;
const T = 580;
await img(40, y, T, T, file(SRC)); label(40, y + T + 30, 'Source PNG (AI, 1254 px)');
const vecRender = await sharp(fs.readFileSync('srcspace-render.svg')).png().toBuffer();
await img(660, y, T, T, vecRender); label(660, y + T + 30, 'Vector (logo.svg) at source size');
await img(1280, y, T, T, file(`${D}/check/diff-overlay.png`)); label(1280, y + T + 30, `Diff: red = source only, blue = vector only. Mismatch ${stats.mismatchPctOfSourceInk}% of ink, IoU ${stats.iou}`, 18);
const eyeZoom = await sharp(`${D}/check/diff-overlay.png`).extract({ left: 440, top: 620, width: 400, height: 260 }).resize(T, Math.round(T * 260 / 400), { kernel: 'nearest' }).toBuffer();
await img(1900, y, T, Math.round(T * 260 / 400), eyeZoom); label(1900, y + Math.round(T * 260 / 400) + 30, 'Eyes, diff zoom: both eyes made identical', 18);
// Row 2: sizes
y = 760; label(40, y, 'PNG exports (transparent, shown on light grey). 16 to 48 px use the thick-brow small variant.', 22);
y += 20;
els.push(`<rect x="30" y="${y}" width="${W - 60}" height="330" fill="#eee"/>`);
let x = 50;
for (const s of [16, 32, 48, 64, 180, 192, 512, 1024]) {
  const show = Math.min(s, 256);
  await img(x, y + 20, show, show, file(`${D}/png/logo-${s}.png`)); label(x, y + 300, `${s}${show !== s ? ' (scaled)' : ''}`, 18);
  x += show + 30;
}
els.push(`<image x="${x}" y="${y + 20}" width="128" height="128" href="${await nearest(`${D}/png/logo-16.png`, 128)}"/>`); label(x, y + 170, '16 at 8x', 18);
els.push(`<image x="${x + 150}" y="${y + 20}" width="256" height="256" href="${await nearest(`${D}/png/logo-32.png`, 256)}"/>`); label(x + 150, y + 300, '32 at 8x', 18);
// Row 3: colourways + circle crop
y = 1150; label(40, y, 'Colourways and round avatar crop (800 x 800)', 22); y += 20;
const logoSvg = fs.readFileSync(`${D}/logo.svg`, 'utf8');
const toPng = async (svgText, bg, w = 340) => sharp(Buffer.from(svgText)).resize({ height: w - 40 }).flatten(bg ? { background: bg } : undefined).extend({ top: 20, bottom: 20, left: 20, right: 20, background: bg || '#ffffff' }).png().toBuffer();
await img(40, y, 300, 340, await toPng(logoSvg, '#ffffff')); label(40, y + 370, 'logo.svg', 18);
await img(370, y, 300, 340, await toPng(fs.readFileSync(`${D}/logo-white.svg`, 'utf8'), '#111111')); label(370, y + 370, 'logo-white.svg', 18);
await img(700, y, 300, 340, await toPng(logoSvg.replace('<path', '<path fill="#C23C2B"'), '#fff6f0')); label(700, y + 370, 'currentColor, e.g. site red', 18);
await img(1030, y, 300, 340, await toPng(fs.readFileSync(`${D}/logo-small.svg`, 'utf8'), '#ffffff')); label(1030, y + 370, 'logo-small.svg (thick brows)', 18);
for (const [i, n] of ['avatar-800-light', 'avatar-800-dark'].entries()) {
  const cx = 1360 + i * 380;
  els.push(`<defs><clipPath id="c${i}"><circle cx="${cx + 170}" cy="${y + 170}" r="170"/></clipPath></defs>`);
  els.push(`<rect x="${cx}" y="${y}" width="340" height="340" fill="#ccc"/>`);
  els.push(`<image x="${cx}" y="${y}" width="340" height="340" clip-path="url(#c${i})" href="${await uri(file(`${D}/png/${n}.png`))}"/>`);
  els.push(`<circle cx="${cx + 170}" cy="${y + 170}" r="170" fill="none" stroke="#e33" stroke-width="2"/>`);
  label(cx, y + 370, `${n}.png in circle mask`, 18);
}
const H = y + 400;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#fff"/>${els.join('')}</svg>`;
await sharp(Buffer.from(svg)).png().toFile(`${D}/contact-sheet.png`);
console.log('ok', W, H);
