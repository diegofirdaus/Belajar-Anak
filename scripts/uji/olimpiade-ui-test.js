// Uji tampilan level olimpiade/tantangan di form, layar memuat, mengerjakan, dan hasil. Layar 390px.
// Butuh Firebase Emulator, server Claude tiruan, dan build emulator di port 3100.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };

(async () => {
  const email = `olui${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  const T = idp.idToken;
  const raka = (await (await fetch(BASE + '/api/pemain', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + T }, body: JSON.stringify({ name: 'Raka', kelas: 5, theme: 'blok' }) })).json()).player;

  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const galat = [];
  p.on('pageerror', (e) => galat.push(String(e)));
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL('**/pemain');
  await p.goto(`${BASE}/main/${raka.id}`);
  await p.getByText(/Riwayat latihan/).waitFor();
  await p.waitForTimeout(300);

  const seg = (t) => p.locator('.seg label', { hasText: t });
  ok(await seg('🏆 Olimpiade').isVisible(), 'Matematika: pilihan "Olimpiade" tampil');
  await p.getByLabel('Mata pelajaran').selectOption('Bahasa Indonesia');
  ok(await seg('⚡ Soal Tantangan').isVisible() && (await seg('Olimpiade').count()) === 0, 'Bahasa Indonesia: berganti jadi "Soal Tantangan"');
  await seg('⚡ Soal Tantangan').click();
  ok(await p.getByLabel('Materi (boleh dikosongkan)').isVisible(), 'tantangan: label materi boleh kosong');
  ok((await p.getByText('Jumlah soal').count()) === 0, 'tantangan: pilihan jumlah soal disembunyikan');
  ok(await p.locator('#form-soal .note').innerText().then((t) => t.includes('versi paling sulit untuk Bahasa Indonesia')), 'tantangan: keterangan');
  await p.getByLabel('Mata pelajaran').selectOption('Matematika');
  ok(await p.locator('#form-soal .note').innerText().then((t) => t.includes('KSN SD')), 'olimpiade Matematika: keterangan KSN SD');
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'tanpa geser horizontal');
  await p.locator('#form-soal').screenshot({ path: `${out}/ol-form.png` });

  // Materi kosong → langsung dibuat
  await p.locator('#form-soal button[type=submit]').click();
  await p.getByText(/sekitar 1–2 menit/).waitFor();
  ok(true, 'layar memuat: keterangan waktu lebih lama');
  await p.locator('.qtext').waitFor();
  ok(await p.locator('.tag').first().innerText().then((t) => t.includes('olimpiade') && t.includes('Campuran')), 'mengerjakan: tag "olimpiade · Campuran"');
  await p.screenshot({ path: `${out}/ol-kerja.png` });
  for (let i = 0; i < 5; i++) {
    await p.locator('.opts .opt').filter({ hasText: /^[A-D]Benar/ }).click();
    await p.locator('.fb').waitFor();
    if (i === 0) ok(await p.locator('.fb').innerText().then((t) => t.includes('+2 permata')), 'umpan balik: +2 permata');
    await p.locator('.fb .btn').click();
  }
  await p.locator('.result').waitFor();
  const teks = await p.locator('.result').innerText();
  ok(teks.includes('level olimpiade') && teks.includes('Soal olimpiade pun bisa kamu taklukkan'), 'hasil: label & pesan olimpiade');
  ok(teks.includes('+10 permata'), 'hasil: total hadiah 10 permata', teks.match(/\+\d+ \w+/g)?.join());
  ok((await p.getByRole('button', { name: /Coba level/ }).count()) === 0 && (await p.getByRole('button', { name: 'Soal baru, level sama' }).isVisible()), 'hasil: tidak ada level di atas olimpiade');
  await p.screenshot({ path: `${out}/ol-hasil.png`, fullPage: true });
  await p.getByRole('button', { name: 'Kembali ke markas' }).click();
  await p.getByText(/Riwayat latihan/).waitFor();
  ok(await p.getByText(/Matematika · olimpiade/).first().waitFor({ timeout: 8000 }).then(() => true, () => false), 'riwayat: Matematika · olimpiade');

  ok(galat.length === 0, 'tanpa error di konsol', galat.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})();
