// Uji tampilan tahap 9: "★ Soal pilihan" di markas, kerjakan, hasil, soal mirip (AI), ulangi.
// Butuh Firebase Emulator, server Claude tiruan, dan build emulator di port 3100. Layar 390px.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };

(async () => {
  const email = `pilihanui${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  const T = idp.idToken;
  const post = async (path, body, sesi) => (await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + T, ...(sesi ? { 'x-admin-sesi': sesi } : {}) }, body: JSON.stringify(body) })).json();
  const sesi = (await post('/api/admin/pin', { pin: '1234' })).token;
  const q = (teks, opsi, kunci) => ({ q: teks, options: opsi, answer: kunci, explain: 'Penjelasan dari orang tua.', keyGuessed: false, optionsAdded: false });
  await post('/api/admin/soal-pilihan', { title: 'UTS Pecahan', kelas: 5, subject: 'Matematika', sourceText: '', questions: [q('Hasil 1/2 + 1/2?', ['1', '2', '1/4'], 0), q('Hasil 3/4 - 1/4?', ['1/2', '1', '2/4', '0'], 0)] }, sesi);
  await post('/api/admin/soal-pilihan', { title: 'Ulangan IPAS', kelas: 5, subject: 'IPAS', sourceText: '', questions: [q('Planet terdekat dari Matahari?', ['Merkurius', 'Venus'], 0)] }, sesi);
  const raka = (await post('/api/pemain', { name: 'Raka', kelas: 5, theme: 'blok' })).player;
  const nadia = (await post('/api/pemain', { name: 'Nadia', kelas: 8, theme: 'antariksa' })).player;

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const galatKonsol = [];
  p.on('pageerror', (e) => galatKonsol.push(String(e)));
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL('**/pemain');
  const buka = async (pl) => { await p.goto(`${BASE}/main/${pl.id}`); await p.getByRole('heading', { name: pl.name, exact: true }).waitFor(); await p.locator('.hist, #riwayat-judul + p').first().waitFor(); await p.waitForTimeout(300); };
  const segPilihan = () => p.locator('.seg label', { hasText: '★ Soal pilihan' });
  const opsi = () => p.locator('.opts .opt');
  const lanjut = () => p.locator('.fb .btn').click();

  // ---------- Tidak ada paket untuk kelas ini ----------
  await buka(nadia);
  ok((await segPilihan().count()) === 0, 'kelas tanpa soal pilihan: tombol ★ Soal pilihan tidak muncul');

  // ---------- Markas Raka ----------
  await buka(raka);
  ok(await segPilihan().isVisible(), 'tombol ★ Soal pilihan muncul untuk kelas 5');
  const lebarSeg = await segPilihan().evaluate((e) => e.getBoundingClientRect().width);
  const lebarMudah = await p.locator('.seg label', { hasText: /^Mudah$/ }).evaluate((e) => e.getBoundingClientRect().width);
  ok(lebarSeg > lebarMudah * 2.5, 'segmen soal pilihan selebar penuh di bawah ketiga level');
  await segPilihan().click();
  ok(await p.locator('.seg input[value="pilihan"]').isChecked() && (await segPilihan().evaluate((e) => getComputedStyle(e, '::before').content)).includes('✓'), 'soal pilihan terpilih: tanda ✓');
  ok((await p.getByLabel('Materi atau tema').count()) === 0 && (await p.getByText('Jumlah soal').count()) === 0 && (await p.getByRole('button', { name: 'Mulai menambang soal' }).count()) === 0, 'materi, jumlah soal, tombol utama disembunyikan');
  ok(await p.getByText('Pilih paket soal').isVisible() && await p.getByText('UTS Pecahan').isVisible() && await p.getByText('2 soal · Matematika').isVisible(), 'kartu paket untuk Matematika');
  await p.screenshot({ path: `${out}/t9-markas-pilihan.png`, fullPage: true });
  await p.getByLabel('Mata pelajaran').selectOption('Bahasa Indonesia');
  ok(await p.getByText('Belum ada soal pilihan untuk Bahasa Indonesia. Ada soal pilihan untuk pelajaran ini:').isVisible(), 'mapel tanpa paket: pesan');
  const chip = await p.locator('#form-soal .chip').allInnerTexts();
  ok(chip.join('|') === 'IPAS|Matematika', 'chip mapel yang punya paket', chip.join('|'));
  await p.locator('#form-soal .chip', { hasText: 'IPAS' }).click();
  ok(await p.getByLabel('Mata pelajaran').inputValue() === 'IPAS' && await p.getByText('Ulangan IPAS').isVisible(), 'mengetuk chip mengganti mapel');
  await p.getByLabel('Mata pelajaran').selectOption('Matematika');

  // ---------- Kerjakan ----------
  await p.getByRole('button', { name: 'Kerjakan' }).click();
  await p.locator('.qtext').waitFor();
  ok(await p.locator('.qtop .tag').innerText() === 'soal pilihan · UTS Pecahan' && await p.getByText('Soal 1 dari 2').isVisible(), 'tag "soal pilihan · UTS Pecahan"');
  ok((await opsi().count()) === 3 && (await opsi().first().innerText()).replace(/\s+/g, '') === 'A1', 'soal 3 pilihan, urutan asli');
  await opsi().nth(0).click(); await p.locator('.fb').waitFor();
  ok(await p.locator('.fb .reward-pop').innerText() === '+1 batu' && await p.getByText('Penjelasan dari orang tua.').isVisible(), 'benar: +1 batu (setara sedang), penjelasan orang tua');
  await lanjut();
  await opsi().nth(1).click(); await p.locator('.fb.bad').waitFor();
  ok(await p.locator('.fb .key').innerText() === 'Jawaban yang benar: A. 1/2', 'salah: kunci tampil');
  await lanjut(); await p.locator('.banner').waitFor();
  ok(await p.getByText('50% benar · UTS Pecahan · soal pilihan').isVisible(), 'hasil: "soal pilihan"');
  ok(await p.getByText('Tidak apa-apa, Raka. Baca lagi penjelasannya, lalu ulangi soal ini.').isVisible(), 'pesan soal pilihan <60%');
  const tombol = await p.locator('.res-actions .btn').allInnerTexts();
  ok(tombol.join('|') === 'Buat soal mirip (AI)|Ulangi soal pilihan ini|Kembali ke markas', 'tombol hasil soal pilihan', tombol.join('|'));
  await p.screenshot({ path: `${out}/t9-hasil-pilihan.png`, fullPage: true });

  // ---------- Buat soal mirip ----------
  await p.getByRole('button', { name: 'Buat soal mirip (AI)' }).click();
  await p.getByText('Biasanya butuh 10–40 detik.').waitFor({ timeout: 3000 }).catch(() => {});
  await p.locator('.qtext').waitFor();
  ok(await p.locator('.qtop .tag').innerText() === 'soal pilihan · UTS Pecahan' && await p.getByText('Soal 1 dari 5').isVisible(), 'soal mirip: 5 soal');
  ok((await opsi().count()) === 4, 'soal mirip: 4 pilihan');
  for (let i = 0; i < 5; i++) { await opsi().filter({ hasText: /^[A-D]Benar/ }).click(); await p.locator('.fb').waitFor(); if (i < 4) await lanjut(); }
  await lanjut(); await p.locator('.banner').waitFor();
  ok(await p.getByText('Kerja bagus, Raka! Soal pilihan ini sudah kamu kuasai.').isVisible() && await p.locator('.result .reward-pop').innerText() === '+5 batu', 'hasil soal mirip 100%: pesan & +5 batu');
  await p.getByRole('button', { name: 'Ulangi soal pilihan ini' }).click();
  await p.locator('.qtext').waitFor();
  ok(await p.getByText('Soal 1 dari 2').isVisible() && await p.getByText('Hasil 1/2 + 1/2?').isVisible(), 'ulangi: kembali ke soal pilihan asli');
  await p.getByRole('button', { name: 'Berhenti dan kembali ke markas' }).click();
  await p.locator('.hist li').first().waitFor();
  const rw = await p.locator('.hist li').allInnerTexts();
  ok(rw.length === 2 && rw.every((t) => t.includes('UTS Pecahan') && t.includes('soal pilihan')), 'riwayat: dua sesi soal pilihan', rw.map((t) => t.replace(/\n/g, ' / ')).join(' | '));
  ok(await p.locator('.seg input[value="pilihan"]').isChecked(), 'kembali ke markas: pilihan form tetap');

  await p.setViewportSize({ width: 360, height: 780 });
  ok((await p.evaluate(() => document.documentElement.scrollWidth)) <= 360, '360px: tanpa gulir ke samping');
  ok(galatKonsol.length === 0, 'tanpa error JavaScript', galatKonsol.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
