// Cek kontras WCAG AA token kelima tema (brief 12, 15). Membaca nilai token langsung dari app/globals.css.
// Jalankan: node scripts/uji/kontras-test.mjs
import fs from 'node:fs';
const css = fs.readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');

function blok(selektor) {
  const i = css.indexOf(selektor);
  if (i < 0) throw new Error('tidak ada ' + selektor);
  const a = css.indexOf('{', i), b = css.indexOf('}', a);
  const o = {};
  for (const m of css.slice(a + 1, b).matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) o[m[1]] = m[2].trim();
  return o;
}
const dasar = blok(':root {');
const tema = {
  'dasar terang': dasar,
  'dasar gelap': { ...dasar, ...blok(':root:not([data-theme="light"]) {') },
  blok: { ...dasar, ...blok('.t-blok {') },
  pahlawan: { ...dasar, ...blok('.t-pahlawan {') },
  antariksa: { ...dasar, ...blok('.t-antariksa {') },
  dino: { ...dasar, ...blok('.t-dino {') },
};

const hex = (v) => { const m = /#([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(v); if (!m) return null; let h = m[1]; if (h.length === 3) h = [...h].map((c) => c + c).join(''); return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16)); };
const semuaHex = (v) => [...v.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)].map((m) => hex(m[0]));
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const rasio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const campur = (a, b, t) => a.map((c, i) => Math.round(c * t + b[i] * (1 - t)));
function nilai(t, nama) {
  let v = t[nama];
  for (let k = 0; k < 5 && v && v.startsWith('var('); k++) v = t[/var\(--([\w-]+)\)/.exec(v)[1]];
  return v;
}

let gagal = 0;
const hasil = [];
for (const [namaTema, t] of Object.entries(tema)) {
  const w = (n) => hex(nilai(t, n));
  const cek = (label, depan, belakang, min = 4.5) => {
    const r = rasio(depan, belakang);
    const lulus = r >= min;
    if (!lulus) gagal++;
    hasil.push(`${lulus ? 'LULUS' : 'GAGAL'}  ${namaTema.padEnd(13)} ${label.padEnd(38)} ${r.toFixed(2)} (min ${min})`);
  };
  const card = w('card'), bg = w('bg'), soft = w('soft'), field = w('field-bg'), opt = w('opt-bg');
  cek('teks di latar halaman', w('fg'), bg);
  cek('teks di kartu', w('fg'), card);
  cek('teks redup di kartu', w('muted'), card);
  cek('teks redup di latar halaman', w('muted'), bg);
  cek('teks redup di kotak soft', w('muted'), soft);
  cek('teks di kolom isian', w('fg'), field);
  cek('placeholder di kolom isian', w('muted'), field);
  cek('teks pilihan jawaban', w('fg'), opt);
  cek('segmen terpilih (accent-fg/accent)', w('accent-fg'), w('accent'));
  for (const [i, c] of semuaHex(nilai(t, 'btn-bg')).entries()) cek(`tombol utama (warna ${i + 1})`, w('btn-fg'), c);
  cek('judul benar (good-text di kartu)', w('good-text'), card);
  if (namaTema === 'pahlawan') cek('teks aksen di kartu (lambang rank)', w('accent'), card, 3);
  cek('pesan galat (bad di kartu)', w('bad'), card);
  cek('teks hadiah (reward-fg di kartu)', hex(nilai(t, 'reward-fg')), card);
  cek('banner menang di kartu', hex(nilai(t, 'banner-win')), card);
  cek('pilihan benar: teks di latar hijau', w('fg'), campur(w('good'), card, 0.18));
  cek('pilihan salah: teks di latar merah', w('fg'), campur(w('bad'), card, 0.15));
  cek('huruf di kotak benar', w('on-good'), w('good-text'));
  cek('huruf di kotak salah / tombol hapus', w('on-bad'), w('bad'));
  cek('toast (bg di fg)', bg, w('fg'));
  cek('garis kolom isian (non-teks)', w('field-line'), field, 3);
  cek('garis kolom isian vs kartu (non-teks)', w('field-line'), card, 3);
}
console.log(hasil.join('\n'));
console.log(gagal ? `\n${gagal} GAGAL` : '\nSemua lulus');
process.exit(gagal ? 1 : 0);
