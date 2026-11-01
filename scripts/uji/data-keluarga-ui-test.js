// Uji tampilan "Data keluarga" di mode admin: unduh semua data, hapus semua data (login ulang + HAPUS).
const { chromium } = require('playwright');
const fs = require('node:fs');
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };

(async () => {
  const email = `dataui${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  const post = async (path, body) => (await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + idp.idToken }, body: JSON.stringify(body) })).json();
  await post('/api/admin/pin', { pin: '1234' });
  const raka = (await post('/api/pemain', { name: 'Raka', kelas: 5, theme: 'blok' })).player;

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const galatKonsol = [];
  p.on('pageerror', (e) => galatKonsol.push(String(e)));
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL('**/pemain');
  await p.evaluate((id) => localStorage.setItem('ml:pemain', id), raka.id);
  // Tunggu lebih dari batas uji login ulang? Tidak perlu: login ulang selalu membuat token baru.
  await p.goto(BASE + '/admin');
  await p.getByLabel('PIN admin', { exact: true }).fill('1234');
  await p.getByRole('button', { name: 'Masuk' }).click();
  await p.getByRole('heading', { name: 'Data keluarga' }).waitFor();
  ok(await p.getByText('Keduanya meminta Anda masuk ulang dengan akun Google orang tua.', { exact: false }).isVisible(), 'kartu Data keluarga di mode admin');

  const [unduhan] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Unduh semua data' }).click()]);
  const isi = JSON.parse(fs.readFileSync(await unduhan.path(), 'utf8'));
  ok(/^markas-latihan-data-\d{4}-\d{2}-\d{2}\.json$/.test(unduhan.suggestedFilename()), 'nama file unduhan', unduhan.suggestedFilename());
  ok(isi.akun.email === email && isi.keluarga.koleksi.players[0].data.name === 'Raka', 'isi file: akun & pemain');
  await p.locator('.toast', { hasText: 'Data keluarga sudah diunduh.' }).waitFor();

  await p.getByRole('button', { name: 'Hapus semua data keluarga' }).click();
  ok(await p.getByText('Hapus semua data keluarga?').isVisible() && await p.getByText('terhapus permanen dan tidak bisa dikembalikan', { exact: false }).isVisible(), 'peringatan hapus');
  const tombol = p.getByRole('button', { name: 'Masuk ulang dengan Google lalu hapus' });
  ok(await tombol.isDisabled(), 'tombol hapus nonaktif sebelum mengetik HAPUS');
  await p.getByLabel('Ketik HAPUS untuk melanjutkan').fill('hapu');
  ok(await tombol.isDisabled(), 'ketikan belum lengkap: tetap nonaktif');
  await p.getByRole('button', { name: 'Batal' }).click();
  ok((await p.getByLabel('Ketik HAPUS untuk melanjutkan').count()) === 0, 'Batal menutup panel hapus');
  await p.screenshot({ path: `${out}/t11-data-keluarga.png`, fullPage: true });
  await p.getByRole('button', { name: 'Hapus semua data keluarga' }).click();
  await p.getByLabel('Ketik HAPUS untuk melanjutkan').fill('hapus');
  ok(await tombol.isEnabled(), 'ketik "hapus" (huruf kecil) diterima');
  await p.screenshot({ path: `${out}/t11-hapus-konfirmasi.png`, fullPage: true });
  await tombol.click();
  await p.waitForURL(BASE + '/');
  await p.locator('.toast', { hasText: 'Semua data keluarga sudah dihapus.' }).waitFor();
  ok(true, 'setelah hapus: kembali ke halaman pembuka dengan toast');
  ok(await p.evaluate(() => localStorage.getItem('ml:pemain')) === null, 'HP tidak lagi mengingat pemain');
  await p.goto(BASE + '/pemain');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  ok(true, 'orang tua sudah keluar: diminta login lagi');

  ok(galatKonsol.length === 0, 'tanpa error JavaScript', galatKonsol.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
