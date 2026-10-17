import { ALGO, fmt } from './matcher.js';

const cover = (x, src, dx, dy, size) => {
  const w = src.naturalWidth || src.width, h = src.naturalHeight || src.height, s = Math.min(w, h);
  x.drawImage(src, (w - s) / 2, (h - s) / 2, s, s, dx, dy, size, size);
};

// Draws a shareable 1200x630 PNG card for the current match
export function downloadCard({ edited, person, score, band, parts, name }) {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 630;
  const x = c.getContext('2d');
  x.fillStyle = '#141414'; x.fillRect(0, 0, 1200, 630);
  x.fillStyle = band.color; x.fillRect(0, 0, 16, 630);
  x.fillStyle = '#fff'; x.font = '800 30px Unbounded, sans-serif'; x.fillText('Image Matching Software', 50, 70);
  cover(x, edited, 50, 120, 320); cover(x, person.img, 400, 120, 320);
  x.font = '600 20px Manrope, sans-serif'; x.fillStyle = '#bbb';
  x.fillText('Uploaded: ' + name.slice(0, 26), 50, 480); x.fillText(person.name + ' (database)', 400, 480);
  x.fillStyle = band.color; x.font = '800 120px Unbounded, sans-serif'; x.fillText(fmt(score) + '%', 760, 230);
  x.fillStyle = '#fff'; x.font = '800 34px Manrope, sans-serif'; x.fillText(band.name, 764, 285);
  ALGO.forEach((m, i) => {
    const y = 345 + i * 56;
    x.fillStyle = '#bbb'; x.font = '600 20px Manrope, sans-serif'; x.fillText(m.label, 764, y);
    x.fillStyle = '#333'; x.fillRect(764, y + 12, 380, 12);
    x.fillStyle = band.color; x.fillRect(764, y + 12, 3.8 * parts[m.key], 12);
  });
  x.fillStyle = '#777'; x.font = '400 18px Manrope, sans-serif'; x.fillText(new Date().toLocaleString(), 50, 590);
  c.toBlob((b) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'match-card.png'; a.click(); URL.revokeObjectURL(a.href);
  });
}
