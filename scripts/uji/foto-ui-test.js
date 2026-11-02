// Uji tampilan "Foto / upload soal" di editor soal pilihan (mode admin).
const { chromium } = require('playwright');
const fs = require('node:fs');
const out = process.argv[2] || '.';
const LOG = process.argv[3];
const BASE = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };
const terakhir = () => { const b = fs.readFileSync(LOG, 'utf8').trim().split('\n'); return JSON.parse(b[b.length - 1]).body; };

(async () => {
  const email = `fotoui${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  await fetch(BASE + '/api/admin/pin', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + idp.idToken }, body: JSON.stringify({ pin: '1234' }) });

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const galatKonsol = [];
  p.on('pageerror', (e) => galatKonsol.push(String(e)));
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL(/\/(pemain|kenalan)$/);

  // Foto "kamera" besar (3000×2000 PNG berisi noise) dibuat di browser.
  const pngBesar = Buffer.from(await p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 3000; c.height = 2000;
    const g = c.getContext('2d'); const d = g.createImageData(3000, 2000);
    for (let i = 0; i < d.data.length; i += 4) { const v = (i * 2654435761) % 255; d.data[i] = v; d.data[i + 1] = 255 - v; d.data[i + 2] = (v * 7) % 255; d.data[i + 3] = 255; }
    g.putImageData(d, 0, 0); return c.toDataURL('image/png').split(',')[1];
  }), 'base64');
  const kecil = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
  const berkas = (n, buf = kecil) => Array.from({ length: n }, (_, k) => ({ name: `lks-${k + 1}.png`, mimeType: 'image/png', buffer: buf }));

  await p.goto(BASE + '/admin');
  await p.getByLabel('PIN admin', { exact: true }).fill('1234');
  await p.getByRole('button', { name: 'Masuk' }).click();
  await p.locator('.tab', { hasText: 'Soal pilihan' }).click();
  await p.getByRole('button', { name: '+ Tambah soal pilihan' }).click();
  const tombol = p.locator('label.foto-btn');
  ok(await tombol.isVisible() && (await tombol.innerText()).includes('Foto / upload soal'), 'tombol Foto / upload soal');
  ok(await p.getByText('Foto hanya dibaca untuk mengambil soal, lalu dibuang (tidak disimpan).', { exact: false }).isVisible(), 'catatan privasi foto');
  ok(await p.locator('input[type=file]').getAttribute('accept') === 'image/*' && await p.locator('input[type=file]').getAttribute('multiple') !== null, 'input foto: gambar, bisa banyak');
  ok(Math.round((await tombol.boundingBox()).height) >= 44, 'tombol foto ≥ 44px');
  await p.screenshot({ path: `${out}/t14-foto-tombol.png`, fullPage: true });

  // Dua foto (satu besar) ke editor kosong
  await p.locator('input[type=file]').setInputFiles([...berkas(1, pngBesar), ...berkas(1)]);
  await p.locator('.toast', { hasText: '3 soal terbaca dari 2 foto.' }).waitFor({ timeout: 20000 });
  ok(true, 'toast: 3 soal terbaca dari 2 foto');
  ok((await p.getByLabel('Soal', { exact: true }).inputValue()).startsWith('1. Hasil dari 1/2 + 1/4 adalah...'), 'teks hasil bacaan masuk ke kolom soal (bisa diedit)');
  ok((await p.locator('.pv-q').count()) === 3 && (await p.locator('.pv-q', { hasText: 'Perhatikan gambar' }).locator('.potong').count()) === 1, 'kartu cek: 3 soal, soal bergambar langsung menampilkan usulan potongan gambar');
  const kirim = terakhir().messages[0].content;
  ok(kirim.length === 3 && kirim.every((x, k) => (k < 2 ? x.type === 'image' && x.media_type === 'image/jpeg' : x.type === 'text')), 'foto PNG dikirim sebagai JPEG, sebelum teks');
  ok(kirim[0].panjang < 1_600_000 && kirim[1].panjang < 5000, 'foto besar diperkecil sebelum dikirim', `${kirim[0].panjang} / ${kirim[1].panjang}`);
  await p.screenshot({ path: `${out}/t14-foto-hasil.png`, fullPage: true });

  // Hapus soal bergambar, simpan
  await p.locator('.pv-q', { hasText: 'Perhatikan gambar' }).getByRole('button', { name: 'Hapus soal ini' }).click();
  await p.getByRole('button', { name: 'Simpan soal pilihan' }).click();
  await p.locator('.toast', { hasText: 'Tersimpan.' }).waitFor();
  await p.locator('.set-card').first().waitFor();
  ok(await p.getByText('Kelas 5 SD · Matematika · 2 soal', { exact: false }).isVisible() || (await p.locator('.set-card').innerText()).includes('2 soal'), 'paket dari foto tersimpan (2 soal)');

  // Teks diketik dulu (belum dirapikan) + foto: diminta Rapikan
  await p.getByRole('button', { name: '+ Tambah soal pilihan' }).click();
  await p.getByLabel('Soal', { exact: true }).fill('1. Soal ketikan?\nA. ya\nB. tidak\nKunci: A');
  await p.locator('input[type=file]').setInputFiles(berkas(1));
  await p.locator('.form-msg').waitFor({ timeout: 20000 });
  ok((await p.locator('.form-msg').innerText()).includes('Tekan "Rapikan soal" supaya soal yang Anda ketik ikut dirapikan.'), 'teks ketikan + foto: diminta rapikan lagi');
  ok((await p.getByLabel('Soal', { exact: true }).inputValue()).startsWith('1. Soal ketikan?') && (await p.getByLabel('Soal', { exact: true }).inputValue()).includes('1. Hasil dari 1/2'), 'teks foto ditambahkan di belakang teks ketikan');

  // Lebih dari 5 foto
  await p.getByRole('button', { name: 'Batal' }).click();
  await p.getByRole('button', { name: '+ Tambah soal pilihan' }).click();
  await p.locator('input[type=file]').setInputFiles(berkas(7));
  await p.locator('.toast', { hasText: 'terbaca dari 5 foto' }).waitFor({ timeout: 20000 });
  ok((await p.locator('.form-msg').innerText()).includes('Maksimal 5 foto sekali unggah; 2 foto lainnya tidak dibaca.'), '7 foto: hanya 5 dibaca, ada pemberitahuan');
  ok(terakhir().messages[0].content.filter((x) => x.type === 'image').length === 5, 'yang terkirim 5 foto');

  // Bukan foto
  await p.locator('input[type=file]').setInputFiles([{ name: 'catatan.txt', mimeType: 'text/plain', buffer: Buffer.from('halo') }]);
  ok((await p.locator('.form-msg').innerText()) === 'File itu bukan foto. Pilih foto soal, ya.', 'file bukan foto ditolak');

  await p.setViewportSize({ width: 360, height: 780 });
  ok((await p.evaluate(() => document.documentElement.scrollWidth)) <= 360, '360px tanpa gulir ke samping');
  ok(galatKonsol.length === 0, 'tanpa error JavaScript', galatKonsol.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
