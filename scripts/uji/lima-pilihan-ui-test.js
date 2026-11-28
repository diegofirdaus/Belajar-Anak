// Uji tampilan soal 5 pilihan (A–E) di editor & layar anak, dan peringatan soal yang dilewati. Layar 390px.
// Butuh emulator, mock-claude, build emulator di 3100.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };

(async () => {
  const email = `limaui${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }) })).json();
  const api = (path, body) => fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + idp.idToken }, body: JSON.stringify(body) }).then((r) => r.json());
  await api('/api/admin/pin', { pin: '1234' });
  const bima = (await api('/api/pemain', { name: 'Bima', kelas: 8, theme: 'blok' })).player;

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
  await p.getByLabel('Kelas', { exact: true }).selectOption('8');
  await p.getByLabel('Mata pelajaran').selectOption('Pendidikan Jasmani (PJOK)');
  await p.getByLabel('Soal', { exact: true }).fill('limapilihan');
  await p.getByRole('button', { name: 'Rapikan soal' }).click();
  await p.getByRole('heading', { name: 'Cek dulu sebelum simpan' }).waitFor();
  ok((await p.locator('.pv-q').nth(0).locator('.pv-opt').count()) === 5 && (await p.locator('.pv-q').nth(1).locator('.pv-opt.key').innerText()).startsWith('E.'), 'editor: 5 pilihan, kunci E');
  ok((await p.locator('.form-msg').innerText()).includes('1 soal belum bisa dimasukkan karena tidak terbaca utuh: "Soal yang pilihannya tidak terbaca"'), 'editor: peringatan soal yang dilewati', await p.locator('.form-msg').innerText());
  await p.getByLabel('Judul paket').fill('Bola');
  await p.screenshot({ path: `${out}/lima-editor.png`, fullPage: true });
  await p.getByRole('button', { name: 'Simpan soal pilihan' }).click();
  await p.getByRole('button', { name: '+ Tambah soal pilihan' }).waitFor();

  await p.goto(`${BASE}/main/${bima.id}`);
  await p.getByText(/Riwayat latihan/).waitFor();
  await p.waitForTimeout(400);
  await p.getByLabel('Mata pelajaran').selectOption('Pendidikan Jasmani (PJOK)');
  await p.locator('.seg label', { hasText: '★ Soal pilihan' }).click();
  await p.locator('.set-card', { hasText: 'Bola' }).getByRole('button', { name: 'Kerjakan' }).click();
  await p.locator('.qtext').waitFor();
  ok((await p.locator('.opts .opt').count()) === 5 && (await p.locator('.opts .opt').nth(4).locator('.k').innerText()) === 'E', 'anak: 5 pilihan, huruf E tampil');
  await p.screenshot({ path: `${out}/lima-anak.png`, fullPage: true });
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'tanpa geser horizontal');
  ok(galat.length === 0, 'tanpa error di konsol', galat.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})();
