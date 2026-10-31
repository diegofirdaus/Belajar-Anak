// Alur tahap 3 di browser, memakai login Google tiruan dari Firebase Emulator.
const { chromium } = require('playwright');
const out = process.argv[2];
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x ? '  ' + x : ''}`); if (!c) fail++; };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const shot = (n) => p.screenshot({ path: `${out}/t3-${n}.png`, fullPage: true });

  await p.goto('http://localhost:3100/');
  await p.getByRole('link', { name: 'Ayo Mulai!' }).click({ force: true });
  await p.waitForURL('**/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  ok(true, 'belum login: kartu login tampil');
  await shot('1-login');

  // Popup Google asli butuh apis.google.com (diblokir di sandbox); pakai login tiruan emulator.
  await p.evaluate(() => window.__masukUji('orangtua@contoh.id'));

  await p.waitForURL('**/kenalan', { timeout: 15000 });
  ok(true, 'akun baru tanpa pemain → perkenalan');

  // Token untuk akun Google tiruan yang sama, langsung dari emulator
  const idp = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true,
      postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: 'orangtua@contoh.id', email: 'orangtua@contoh.id', email_verified: true })) }),
  }).then((r) => r.json());
  const token = idp.idToken;
  const seed = (body) => p.evaluate(([t, b]) => fetch('/api/pemain', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` }, body: JSON.stringify(b) }).then((r) => r.json()), [token, body]);
  const raka = (await seed({ name: 'Raka', kelas: 5, theme: 'blok' })).player;
  await seed({ name: 'Nadia', kelas: 8, theme: 'pahlawan' });
  await seed({ name: 'Bima', kelas: 11, theme: 'antariksa' });

  await p.goto('http://localhost:3100/mulai');
  await p.waitForURL('**/pemain');
  await p.getByRole('heading', { name: 'Siapa yang mau main?' }).waitFor();
  await p.getByText('Kelas 5 SD · Dunia Blok').waitFor();
  const names = await p.locator('.pl-card b').allTextContents();
  ok(names.join(',') === 'Raka,Nadia,Bima', 'akun punya pemain → daftar pemain, urut', names.join(','));
  ok(await p.getByText('Tersimpan di akun orangtua@contoh.id.').isVisible(), 'status penyimpanan tampil');
  await shot('2-pemain');

  await p.locator('.pl-card', { hasText: 'Raka' }).click();
  await p.waitForURL(`**/main/${raka.id}`);
  await p.getByRole('heading', { name: 'Raka' }).waitFor();
  ok(await p.evaluate(() => document.body.classList.contains('t-blok')), 'markas Raka memakai tema Dunia Blok');
  ok(await p.getByText('Kelas 5 SD · Fase C Kurikulum Merdeka').isVisible(), 'subjudul kelas dan fase');
  await shot('3-markas');

  // HP mengingat pemain: buka app lagi → langsung ke markas Raka
  await p.goto('http://localhost:3100/');
  await p.getByRole('link', { name: 'Ayo Mulai!' }).click({ force: true });
  await p.waitForURL(`**/main/${raka.id}`);
  ok(true, 'HP yang sama langsung masuk ke markas Raka');

  await p.getByRole('button', { name: 'Ganti pemain' }).click();
  await p.waitForURL('**/pemain');
  await p.goto('http://localhost:3100/mulai');
  await p.waitForURL('**/pemain');
  ok(true, 'setelah Ganti pemain, app kembali ke daftar pemain');

  // Login bertahan setelah browser ditutup-buka (state disimpan)
  const state = await ctx.storageState({ indexedDB: true });
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, storageState: state });
  const p2 = await ctx2.newPage();
  await p2.goto('http://localhost:3100/pemain');
  await p2.getByRole('heading', { name: 'Siapa yang mau main?' }).waitFor();
  ok(true, 'login orang tua bertahan setelah app dibuka ulang');

  await p.getByRole('button', { name: 'Keluar dari akun orang tua' }).click();
  await p.waitForURL('http://localhost:3100/');
  await p.goto('http://localhost:3100/pemain');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  ok(true, 'setelah keluar, daftar pemain meminta login lagi');

  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  ok(sw === 390, 'tanpa scroll horizontal', sw);
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})().catch(async (e) => { console.error('ERROR', e.message); process.exit(1); });
