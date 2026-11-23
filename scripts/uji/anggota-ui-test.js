// Uji tampilan "Anggota keluarga" (Mode admin → Pengaturan): pemilik mengundang & mencabut, anggota hanya melihat,
// tombol hapus semua data hanya untuk pemilik. Layar 390px. Butuh emulator dan build emulator di 3100.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };
const s = Date.now();
const AYAH = `ayahui${s}@contoh.id`;
const IBU = `ibuui${s}@contoh.id`;

async function masuk(b, email) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.galat = [];
  p.on('pageerror', (e) => p.galat.push(String(e)));
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL(/\/(pemain|kenalan)/);
  return p;
}
async function pengaturan(p, buatPin) {
  await p.goto(BASE + '/admin');
  if (buatPin) {
    await p.getByLabel('PIN baru', { exact: false }).first().fill('1234').catch(() => {});
  }
  await p.getByLabel('PIN admin', { exact: true }).fill('1234');
  await p.getByRole('button', { name: 'Masuk' }).click();
  await p.locator('.tab', { hasText: 'Pengaturan' }).click();
  await p.getByRole('heading', { name: 'Anggota keluarga' }).waitFor();
  await p.locator('.anggota-list').waitFor();
}

(async () => {
  // Siapkan keluarga Ayah lewat API (PIN + anak)
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: AYAH, email: AYAH, email_verified: true })) }) })).json();
  const api = (path, body) => fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + idp.idToken }, body: JSON.stringify(body) }).then((r) => r.json());
  await api('/api/admin/pin', { pin: '1234' });
  await api('/api/pemain', { name: 'Raka', kelas: 5, theme: 'blok' });

  const b = await chromium.launch();
  const ayah = await masuk(b, AYAH);
  await pengaturan(ayah);
  ok(await ayah.getByText(AYAH).isVisible() && await ayah.getByText('Pemilik (Anda)').isVisible(), 'pemilik tampil dengan label "Pemilik (Anda)"');
  await ayah.getByRole('button', { name: 'Tambah anggota' }).click();
  ok((await ayah.locator('.form-msg').innerText()).includes('Tulis alamat email'), 'email kosong: pesan jelas');
  await ayah.getByLabel('Email Google anggota baru').fill(IBU);
  await ayah.getByRole('button', { name: 'Tambah anggota' }).click();
  await ayah.locator('.anggota-list li', { hasText: IBU }).waitFor();
  ok(await ayah.locator('.anggota-list li', { hasText: IBU }).getByText('Menunggu masuk').isVisible(), 'undangan tampil "Menunggu masuk"');
  ok(await ayah.getByRole('button', { name: 'Hapus semua data keluarga' }).isVisible(), 'pemilik: tombol hapus semua data ada');
  await ayah.screenshot({ path: `${out}/anggota-pemilik.png`, fullPage: true });
  ok(await ayah.evaluate(() => document.documentElement.scrollWidth) <= 390, 'tanpa geser horizontal');

  // Ibu masuk dengan akunnya sendiri → langsung melihat anak keluarga Ayah
  const ibu = await masuk(b, IBU);
  ok(await ibu.getByText('Raka').first().waitFor({ timeout: 8000 }).then(() => true, () => false) && ibu.url().includes('/pemain'), 'Ibu login: langsung melihat Raka (keluarga Ayah)', ibu.url());
  await pengaturan(ibu);
  ok(await ibu.locator('.anggota-list li', { hasText: IBU }).getByText('Anggota').isVisible(), 'Ibu tampil sebagai Anggota');
  ok((await ibu.getByLabel('Email Google anggota baru').count()) === 0 && (await ibu.getByRole('button', { name: /Cabut/ }).count()) === 0, 'anggota: tanpa form undang & tombol cabut');
  ok((await ibu.getByRole('button', { name: 'Hapus semua data keluarga' }).count()) === 0 && await ibu.getByRole('button', { name: 'Unduh semua data' }).isVisible(), 'anggota: tanpa tombol hapus semua data (unduh tetap ada)');
  await ibu.goto(BASE + '/admin');
  await ibu.getByLabel('PIN admin', { exact: true }).fill('1234');
  await ibu.getByRole('button', { name: 'Masuk' }).click();
  await ibu.locator('.tab', { hasText: 'Pengaturan' }).click();
  await ibu.getByRole('button', { name: 'Unduh semua data' }).waitFor();
  ok((await ibu.getByRole('button', { name: 'Hapus semua data keluarga' }).count()) === 0, 'selama daftar anggota dimuat: tombol hapus tidak muncul');
  await ibu.screenshot({ path: `${out}/anggota-ibu.png`, fullPage: true });

  // Ayah mencabut Ibu
  await ayah.reload();
  await pengaturan(ayah);
  await ayah.getByRole('button', { name: `Cabut ${IBU}` }).click();
  await ayah.locator('.toast', { hasText: 'tidak lagi menjadi anggota' }).waitFor();
  ok((await ayah.locator('.anggota-list li', { hasText: IBU }).count()) === 0, 'setelah dicabut: hilang dari daftar');

  ok([...ayah.galat, ...ibu.galat].length === 0, 'tanpa error di konsol', [...ayah.galat, ...ibu.galat].join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})();
