// Image matching algorithm (runs fully in the browser, no libraries).
// Each image is centre-cropped to a square, then four fingerprints are compared:
//   dHash (edge pattern), aHash (brightness pattern), colour histogram, pixel structure.
export const ALGO = [
  { key: 'dhash', label: 'Edge pattern (dHash)', hint: 'Which neighbouring pixels get brighter or darker' },
  { key: 'ahash', label: 'Brightness pattern (aHash)', hint: 'Light and dark areas compared with the average' },
  { key: 'colour', label: 'Colour histogram', hint: 'How much of each colour the image contains' },
  { key: 'structure', label: 'Pixel structure', hint: 'Layout correlation on a 16x16 grayscale grid' },
];
export const DEFAULT_WEIGHTS = { dhash: 30, ahash: 10, colour: 35, structure: 25 };

// Score bands from the analysis panel
export const BANDS = [
  { id: 'exact', label: '100%', name: 'Exact match', min: 97, color: '#14935f' },
  { id: 'high', label: '80%', name: 'High match', min: 85, color: '#2f7de1' },
  { id: 'low', label: '20%', name: 'Low match', min: 60, color: '#e39b12' },
  { id: 'none', label: '<60%', name: 'Possible match', min: 0, color: '#d64545' },
];
export const bandOf = (score) => BANDS.find((b) => score >= b.min);
export const fmt = (n) => (n >= 99.95 ? '100' : n.toFixed(1));

export const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = src;
  });

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

function sample(img, w, h) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.min(iw, ih), sx = (iw - s) / 2, sy = (ih - s) / 2;
  canvas.width = w; canvas.height = h;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, s, s, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}
function gray(d) {
  const g = new Float32Array(d.length / 4);
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  return g;
}

export function features(img) {
  const g9 = gray(sample(img, 9, 8)), dhash = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) dhash.push(g9[y * 9 + x] > g9[y * 9 + x + 1] ? 1 : 0);
  const g8 = gray(sample(img, 8, 8));
  const mean = g8.reduce((a, b) => a + b, 0) / g8.length;
  const ahash = Array.from(g8, (v) => (v > mean ? 1 : 0));
  const p = sample(img, 64, 64), hist = new Float32Array(64);
  for (let i = 0; i < 4096; i++) hist[(p[i * 4] >> 6) * 16 + (p[i * 4 + 1] >> 6) * 4 + (p[i * 4 + 2] >> 6)] += 1 / 4096;
  return { dhash, ahash, hist, pixels: gray(sample(img, 16, 16)) };
}

const hashSim = (a, b) => {
  let ham = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) ham++;
  return Math.max(0, 1 - (2 * ham) / a.length); // 50% differing bits (random) = 0
};

// Raw 0-100 similarity for each of the four fingerprints
export function compareParts(a, b) {
  let inter = 0;
  for (let i = 0; i < 64; i++) inter += Math.min(a.hist[i], b.hist[i]);
  const ma = a.pixels.reduce((s, v) => s + v, 0) / 256, mb = b.pixels.reduce((s, v) => s + v, 0) / 256;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < 256; i++) { const x = a.pixels[i] - ma, y = b.pixels[i] - mb; num += x * y; da += x * x; db += y * y; }
  return {
    dhash: 100 * hashSim(a.dhash, b.dhash),
    ahash: 100 * hashSim(a.ahash, b.ahash),
    colour: 100 * Math.min(1, Math.max(0, (inter - 0.25) / 0.75)),
    structure: 100 * (da && db ? Math.max(0, num / Math.sqrt(da * db)) : 0),
  };
}

// Weighted total (weights are renormalised so they always add up to 100%)
export function scoreFrom(parts, w) {
  const sum = ALGO.reduce((s, m) => s + w[m.key], 0) || 1;
  return ALGO.reduce((s, m) => s + (w[m.key] / sum) * parts[m.key], 0);
}

// Apply the Edit lab settings (rotate, flip, brightness, contrast, grayscale) and return a canvas
export function applyEdit(img, e) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const k = Math.min(1, 640 / Math.max(iw, ih)), w = Math.round(iw * k), h = Math.round(ih * k), swap = e.rot % 180 !== 0;
  const c = document.createElement('canvas');
  c.width = swap ? h : w; c.height = swap ? w : h;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.translate(c.width / 2, c.height / 2); x.rotate((e.rot * Math.PI) / 180); if (e.flip) x.scale(-1, 1);
  x.filter = `brightness(${e.bright}%) contrast(${e.contrast}%) grayscale(${e.gray ? 100 : 0}%)`;
  x.drawImage(img, -w / 2, -h / 2, w, h);
  return c;
}

// Red heatmap (data URL) showing where two images differ, on the same centre-cropped square used for matching
export function diffMap(a, b, n = 48) {
  const da = sample(a, n, n).slice(), db = sample(b, n, n);
  const c = document.createElement('canvas'); c.width = n; c.height = n;
  const x = c.getContext('2d'), out = x.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const d = (Math.abs(da[i * 4] - db[i * 4]) + Math.abs(da[i * 4 + 1] - db[i * 4 + 1]) + Math.abs(da[i * 4 + 2] - db[i * 4 + 2])) / 765;
    out.data[i * 4] = 255; out.data[i * 4 + 1] = 40; out.data[i * 4 + 2] = 70; out.data[i * 4 + 3] = Math.min(255, d * 2.6 * 255);
  }
  x.putImageData(out, 0, 0);
  return c.toDataURL();
}
