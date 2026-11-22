// Uji tampilan "Buat soal dari bacaan" (editor admin → simpan → anak mengerjakan dengan bacaan)
// dan tampilan huruf Arab (Pendidikan Agama Islam). Layar 390px. Butuh emulator, mock-claude, build emulator di 3100.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };
const BASMALAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

(async () => {
  const email = `bcui${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  const T = idp.idToken;
  const api = (path, body, sesi) => fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + T, ...(sesi ? { 'x-admin-sesi': sesi } : {}) }, body: JSON.stringify(body) }).then((r) => r.json());
  const sesiAdmin = (await api('/api/admin/pin', { pin: '1234' })).token;
  const raka = (await api('/api/pemain', { name: 'Raka', kelas: 5, theme: 'blok' })).player;

  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const galat = [];
  p.on('pageerror', (e) => galat.push(String(e)));
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL('**/pemain');
  await p.goto(BASE + '/admin');
  await p.getByLabel('PIN admin', { exact: true }).fill('1234');
  await p.getByRole('button', { name: 'Masuk' }).click();
  await p.locator('.tab', { hasText: 'Soal pilihan' }).click();
  await p.getByRole('button', { name: '+ Tambah soal pilihan' }).click();
  await p.getByRole('heading', { name: 'Tambah soal pilihan' }).waitFor();

  // ---------- Editor: mode bacaan ----------
  await p.locator('.seg label', { hasText: 'Buat dari bacaan' }).click();
  ok(await p.getByLabel('Bacaan atau materi').isVisible() && await p.getByText('Foto / upload bacaan').isVisible(), 'mode bacaan: kolom bacaan & tombol upload bacaan');
  ok(await p.getByRole('button', { name: 'Buat soal dari bacaan' }).isVisible() && (await p.getByRole('button', { name: 'Rapikan soal' }).count()) === 0, 'tombol utama: Buat soal dari bacaan');
  await p.getByLabel('Mata pelajaran').selectOption('IPAS');
  await p.getByRole('button', { name: 'Buat soal dari bacaan' }).click();
  ok((await p.locator('.form-msg').innerText()).includes('terlalu pendek'), 'bacaan kosong/pendek: pesan jelas');
  const pdf = Buffer.from(`%PDF-1.4\n% bacaan\n${'x'.repeat(300)}\n%%EOF`);
  await p.locator('.foto-soal input[type=file]').setInputFiles([{ name: 'materi.pdf', mimeType: 'application/pdf', buffer: pdf }]);
  await p.locator('.toast', { hasText: 'Bacaan dari PDF sudah masuk' }).waitFor();
  ok((await p.getByLabel('Bacaan atau materi').inputValue()).startsWith('Fotosintesis'), 'PDF disalin ke kolom bacaan (belum membuat soal)');
  ok((await p.locator('.pv-q').count()) === 0, 'belum ada soal sebelum tombol ditekan');
  await p.locator('.seg label', { hasText: /^5 soal$/ }).click();
  await p.getByLabel('Soal esai di antaranya').selectOption('1');
  await p.getByRole('button', { name: 'Buat soal dari bacaan' }).click();
  await p.getByRole('heading', { name: 'Cek dulu sebelum simpan' }).waitFor();
  ok((await p.locator('.pv-q').count()) === 5 && (await p.locator('.tag-esai').count()) === 1, 'cek dulu: 5 soal, 1 esai');
  ok(await p.getByText('Soal dibuat AI dari bacaan.', { exact: false }).isVisible(), 'catatan: soal dibuat AI dari bacaan');
  ok(await p.getByRole('button', { name: 'Buat ulang soal dari bacaan' }).isVisible(), 'tombol berubah: Buat ulang');
  await p.getByLabel('Judul paket').fill('Fotosintesis');
  await p.screenshot({ path: `${out}/bacaan-editor.png`, fullPage: true });
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'editor: tanpa geser horizontal');
  await p.getByRole('button', { name: 'Simpan soal pilihan' }).click();
  await p.getByRole('button', { name: '+ Tambah soal pilihan' }).waitFor();
  await p.getByText('Fotosintesis').first().click().catch(() => {});

  // ---------- Paket PAI dengan huruf Arab (lewat API) ----------
  await api('/api/admin/soal-pilihan', {
    title: 'Doa harian', kelas: 5, subject: 'Pendidikan Agama Islam', sourceText: `Doa sebelum makan dimulai dengan ${BASMALAH}. Artinya: Dengan nama Allah Yang Maha Pengasih lagi Maha Penyayang.\n\nSetelah makan kita mengucapkan hamdalah: الْحَمْدُ لِلَّهِ`, dariBacaan: true, acakPilihan: false,
    questions: [
      { q: `Bacaan ${BASMALAH} diucapkan ketika ...`, options: ['Akan makan', 'Selesai makan', 'Tidur', 'Bangun tidur'], answer: 0, explain: `Sebelum makan kita membaca ${BASMALAH}.`, keyGuessed: false, optionsAdded: false },
      { q: 'Ucapan setelah makan adalah ...', options: ['الْحَمْدُ لِلَّهِ', 'سُبْحَانَ اللَّهِ', 'اللَّهُ أَكْبَرُ', 'أَسْتَغْفِرُ اللَّهَ'], answer: 0, explain: '', keyGuessed: false, optionsAdded: false },
      { q: 'Arti basmalah adalah ...', options: ['Dengan nama Allah', 'Segala puji bagi Allah', 'Allah Maha Besar', 'Maha Suci Allah'], answer: 0, explain: '', keyGuessed: false, optionsAdded: false },
    ],
  }, sesiAdmin);

  // ---------- Anak: mengerjakan paket bacaan ----------
  await p.goto(`${BASE}/main/${raka.id}`);
  await p.getByText(/Riwayat latihan/).waitFor();
  await p.waitForTimeout(400);
  await p.getByLabel('Mata pelajaran').selectOption('IPAS');
  await p.locator('.seg label', { hasText: '★ Soal pilihan' }).click();
  await p.locator('.set-card', { hasText: 'Fotosintesis' }).getByRole('button', { name: 'Kerjakan' }).click();
  await p.locator('.qtext').waitFor();
  ok(await p.locator('details.bacaan[open]').isVisible() && (await p.locator('.bacaan-teks p').count()) === 3, 'anak: bacaan tampil terbuka di atas soal, per paragraf');
  await p.screenshot({ path: `${out}/bacaan-anak.png`, fullPage: true });
  await p.locator('details.bacaan summary').click();
  ok(!(await p.locator('details.bacaan').evaluate((d) => d.open)) && await p.getByText('Buka bacaan').isVisible(), 'bacaan bisa ditutup');
  await p.locator('.opts .opt').filter({ hasText: /^[A-D]Benar/ }).click();
  await p.locator('.fb').waitFor();
  await p.locator('.fb .btn').click();
  ok(!(await p.locator('details.bacaan').evaluate((d) => d.open)), 'pilihan tutup bertahan di soal berikutnya');
  await p.getByRole('button', { name: 'Berhenti dan kembali ke markas' }).click();
  await p.getByText(/Riwayat latihan/).waitFor();

  // ---------- Anak: huruf Arab ----------
  await p.waitForTimeout(400);
  await p.getByLabel('Mata pelajaran').selectOption('Pendidikan Agama Islam');
  await p.locator('.seg label', { hasText: '★ Soal pilihan' }).click();
  await p.locator('.set-card', { hasText: 'Doa harian' }).getByRole('button', { name: 'Kerjakan' }).click();
  await p.locator('.qtext').waitFor();
  const ar = p.locator('.qtext .ar');
  ok(await ar.count() === 1 && (await ar.innerText()) === BASMALAH && (await ar.evaluate((e) => getComputedStyle(e).direction)) === 'rtl' && (await ar.getAttribute('lang')) === 'ar', 'soal: basmalah utuh dalam satu potongan Arab (rtl)');
  const font = await ar.evaluate((e) => getComputedStyle(e).fontFamily);
  ok(/Naskh|font-arab|__Noto/i.test(font), 'huruf Arab memakai font Naskh', font);
  const ukuran = await ar.evaluate((e) => parseFloat(getComputedStyle(e).fontSize) / parseFloat(getComputedStyle(e.parentElement).fontSize));
  ok(ukuran > 1.2, 'huruf Arab lebih besar dari teks biasa', ukuran.toFixed(2));
  ok((await p.locator('.bacaan-teks .ar').count()) === 2, 'bacaan: dua potongan Arab');
  await p.locator('.opts .opt').first().click();
  await p.locator('.fb').waitFor();
  await p.locator('.fb .btn').click();
  ok((await p.locator('.opts .opt .ar').count()) === 4 && (await p.locator('.opts .opt span[dir=auto]').first().evaluate((e) => getComputedStyle(e).direction)) === 'rtl', 'pilihan berhuruf Arab: rtl');
  await p.screenshot({ path: `${out}/arab-anak.png`, fullPage: true });
  ok((await p.locator('.qtext').evaluate((e) => getComputedStyle(e).direction)) === 'ltr', 'soal berbahasa Indonesia tetap kiri-ke-kanan');
  ok(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, 'anak: tanpa geser horizontal');

  ok(galat.length === 0, 'tanpa error di konsol', galat.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})();
