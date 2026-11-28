// Uji tampilan teks bersama (kutipan untuk beberapa soal): editor (tampil sekali per kelompok, edit berlaku ke kelompok)
// dan layar anak (kartu bacaan di soal 1-2, tidak di soal 3). Layar 390px. Butuh emulator, mock-claude, build emulator di 3100.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };

(async () => {
  const email = `tbui${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }) })).json();
  const api = (path, body, method = 'POST', sesi) => fetch(BASE + path, { method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + idp.idToken, ...(sesi ? { 'x-admin-sesi': sesi } : {}) }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());
  const sesi = (await api('/api/admin/pin', { pin: '1234' })).token;
  const raka = (await api('/api/pemain', { name: 'Raka', kelas: 7, theme: 'blok' })).player;

  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const galat = [];
  p.on('pageerror', (e) => galat.push(String(e)));
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL(/\/(pemain|kenalan)/);
  await p.goto(BASE + '/admin');
  await p.getByLabel('PIN admin', { exact: true }).fill('1234');
  await p.getByRole('button', { name: 'Masuk' }).click();
  await p.locator('.tab', { hasText: 'Soal pilihan' }).click();
  await p.getByRole('button', { name: '+ Tambah soal pilihan' }).click();
  await p.getByLabel('Untuk jenjang').selectOption('SMP');
  await p.getByLabel('Mata pelajaran').selectOption('Pendidikan Pancasila');
  await p.getByLabel('Soal', { exact: true }).fill('Perhatikan kutipan berita berikut! ... 3. Toleransi ... 4. Berdasarkan kutipan ... 5. Lambang sila');
  await p.getByRole('button', { name: 'Rapikan soal' }).click();
  await p.getByRole('heading', { name: 'Cek dulu sebelum simpan' }).waitFor();

  const stim = p.locator('.stimulus-edit textarea');
  ok((await stim.count()) === 1 && (await p.getByText('Teks bersama untuk soal 1–2 (tampil di atas soal)').isVisible()), 'editor: teks bersama tampil sekali untuk soal 1–2');
  ok(await p.locator('.pv-q').nth(1).getByText('Memakai teks bersama di atas.').isVisible() && (await p.locator('.pv-q').nth(2).locator('.stimulus-edit').count()) === 0, 'soal 2 memakai teks di atas; soal 3 tanpa teks bersama');
  await stim.fill('Perhatikan kutipan berita berikut!\n\nPemuda lintas agama di Timika menjaga shalat Id. (diperbaiki)');
  await p.getByLabel('Judul paket').fill('Toleransi');
  await p.screenshot({ path: `${out}/teks-bersama-editor.png`, fullPage: true });
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'editor: tanpa geser horizontal');
  await p.getByRole('button', { name: 'Simpan soal pilihan' }).click();
  await p.getByRole('button', { name: '+ Tambah soal pilihan' }).waitFor();
  const paket = (await api('/api/admin/soal-pilihan', null, 'GET', sesi)).paket.find((x) => x.title === 'Toleransi');
  ok(paket.questions[0].stimulus.endsWith('(diperbaiki)') && paket.questions[1].stimulus === paket.questions[0].stimulus && !paket.questions[2].stimulus, 'edit teks bersama berlaku untuk soal 1 dan 2 sekaligus');

  // Anak
  await p.goto(`${BASE}/main/${raka.id}`);
  await p.getByText(/Riwayat latihan/).waitFor();
  await p.waitForTimeout(400);
  await p.getByLabel('Mata pelajaran').selectOption('Pendidikan Pancasila');
  await p.locator('.seg label', { hasText: '★ Soal pilihan' }).click();
  await p.locator('.set-card', { hasText: 'Toleransi' }).getByRole('button', { name: 'Kerjakan' }).click();
  await p.locator('.qtext').waitFor();
  ok(await p.locator('details.bacaan[open]').isVisible() && (await p.locator('.bacaan-teks').innerText()).includes('(diperbaiki)'), 'anak soal 1: kartu bacaan berisi kutipan, terbuka');
  await p.screenshot({ path: `${out}/teks-bersama-anak.png`, fullPage: true });
  const lanjut = async () => { await p.locator('.opts .opt').first().click(); await p.locator('.fb').waitFor(); await p.locator('.fb .btn').click(); await p.waitForTimeout(150); };
  await lanjut();
  ok(await p.locator('details.bacaan').isVisible() && (await p.locator('.qtext').innerText()).startsWith('Berdasarkan kutipan'), 'soal 2: kartu bacaan tetap ada');
  await lanjut();
  ok((await p.locator('details.bacaan').count()) === 0, 'soal 3 (tanpa teks bersama): kartu bacaan hilang');

  ok(galat.length === 0, 'tanpa error di konsol', galat.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})();
