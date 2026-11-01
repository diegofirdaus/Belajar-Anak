// Uji tampilan & alur mode admin (tahap 8): PIN, daftar, editor, rapikan (AI & manual), simpan, ubah, hapus.
// Butuh Firebase Emulator, server Claude tiruan, dan build emulator di port 3100. Layar 390px.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };

(async () => {
  const email = `adminui${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  const raka = (await (await fetch(BASE + '/api/pemain', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + idp.idToken }, body: JSON.stringify({ name: 'Raka', kelas: 5, theme: 'blok' }) })).json()).player;

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const galatKonsol = [];
  p.on('pageerror', (e) => galatKonsol.push(String(e)));
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL('**/pemain');
  await p.evaluate((id) => localStorage.setItem('ml:pemain', id), raka.id);
  // Menunggu toast dengan teks tertentu (toast sebelumnya bisa masih tampil).
  const toast = async (teks) => { try { await p.locator('.toast', { hasText: teks }).waitFor({ timeout: 8000 }); return teks; } catch { return p.locator('.toast').innerText().catch(() => ''); } };
  const lebar = () => p.evaluate(() => document.documentElement.scrollWidth);
  const pin = (label) => p.getByLabel(label, { exact: true });

  // ---------- Buat PIN ----------
  await p.goto(BASE + '/admin');
  await p.getByRole('heading', { name: 'Masuk mode admin' }).waitFor();
  ok(await p.locator('.admin-badge').innerText().then((t) => t.toUpperCase()) === 'MODE ADMIN', 'badge "MODE ADMIN"');
  ok(await p.getByText('Buat PIN 4 angka untuk mode admin. Simpan baik-baik dan jangan beri tahu anak-anak, ya.').isVisible(), 'pertama kali: teks buat PIN');
  ok(await pin('PIN baru').getAttribute('inputmode') === 'numeric' && await pin('PIN baru').getAttribute('type') === 'password', 'input PIN: password + numeric');
  await pin('PIN baru').fill('12');
  await p.getByRole('button', { name: 'Simpan PIN' }).click();
  ok(await p.locator('.form-msg').innerText() === 'PIN harus 4 angka.', 'galat: PIN harus 4 angka');
  await pin('PIN baru').fill('1234'); await pin('Ulangi PIN').fill('1235');
  await p.getByRole('button', { name: 'Simpan PIN' }).click();
  ok(await p.locator('.form-msg').innerText() === 'PIN yang diulang belum sama. Coba ketik lagi.', 'galat: PIN diulang beda');
  await pin('PIN baru').fill('1234'); await pin('Ulangi PIN').fill('1234');
  await p.screenshot({ path: `${out}/t8-pin-buat.png` });
  await p.getByRole('button', { name: 'Simpan PIN' }).click();
  ok(await toast('PIN admin tersimpan.') === 'PIN admin tersimpan.', 'toast PIN tersimpan');
  await p.getByRole('heading', { name: 'Soal pilihan' }).waitFor();
  await p.locator('.note').waitFor();
  ok(await p.getByText('Belum ada soal pilihan. Tekan "Tambah soal pilihan" untuk membuat yang pertama.').isVisible(), 'daftar kosong');

  // ---------- Editor: rapikan dengan AI ----------
  await p.getByRole('button', { name: '+ Tambah soal pilihan' }).click();
  await p.getByRole('heading', { name: 'Tambah soal pilihan' }).waitFor();
  ok(await p.getByLabel('Untuk jenjang').inputValue() === 'SD' && await p.getByLabel('Kelas', { exact: true }).inputValue() === '5', 'kelas bawaan mengikuti pemain di HP ini (Kelas 5 SD)');
  ok((await p.getByLabel('Soal', { exact: true }).getAttribute('placeholder')).startsWith('Ketik atau tempel soal di sini. Tidak harus rapi.'), 'placeholder textarea');
  await p.getByRole('button', { name: 'Simpan soal pilihan' }).click();
  ok(await p.locator('.form-msg').innerText() === 'Tekan "Rapikan soal" dulu supaya soalnya bisa dicek sebelum disimpan.', 'simpan sebelum dirapikan ditolak');
  await p.getByRole('button', { name: 'Rapikan soal' }).click();
  ok(await p.locator('.form-msg').innerText() === 'Ketik atau tempel soalnya dulu, ya.', 'rapikan tanpa teks');
  await p.getByLabel('Soal', { exact: true }).fill('1. Hasil dari 3/4 + 1/4 adalah...\nA. 1/2\nB. 1\nC. 4/8\nD. 2\nKunci: B\n\n2. Ibu punya 12 kue, lalu dibagi rata ke 4 anak. Tiap anak dapat berapa kue?');
  await p.getByRole('button', { name: 'Rapikan soal' }).click();
  await p.getByRole('heading', { name: 'Cek dulu sebelum simpan' }).waitFor();
  ok(await p.getByText('2 soal', { exact: true }).isVisible(), 'kartu cek: 2 soal');
  ok((await p.locator('.pv-q.warn').count()) === 1 && await p.getByText('Kunci dipilih AI. Mohon dicek.').isVisible(), 'kunci tebakan AI ditandai');
  ok(await p.getByText('Sebagian pilihan jawaban ditambahkan AI.').isVisible(), 'catatan pilihan ditambahkan AI');
  ok(await p.locator('.pv-q').nth(0).locator('.pv-opt[aria-pressed="true"]').innerText().then((t) => t.includes('1') && t.startsWith('B')), 'kunci soal 1 = B (aria-pressed)');
  await p.screenshot({ path: `${out}/t8-editor-cek.png`, fullPage: true });
  await p.locator('.pv-q').nth(1).locator('.pv-opt').nth(2).click();
  ok((await p.locator('.pv-q.warn').count()) === 0 && await p.locator('.pv-q').nth(1).locator('.pv-opt').nth(2).getAttribute('aria-pressed') === 'true', 'mengetuk pilihan: jadi kunci, label AI hilang');
  await p.getByLabel('Soal', { exact: true }).fill('1. Hasil dari 3/4 + 1/4 adalah...\nA. 1/2\nB. 1\nKunci: B\n2. Ibu punya 12 kue');
  await p.getByRole('button', { name: 'Simpan soal pilihan' }).click();
  ok(await p.locator('.form-msg').innerText() === 'Teks soal berubah setelah dirapikan. Tekan "Rapikan soal" lagi supaya hasilnya ikut diperbarui.', 'teks berubah setelah dirapikan');
  await p.getByRole('button', { name: 'Rapikan soal' }).click();
  await p.locator('.pv-q.warn').waitFor();
  await p.locator('.pv-q').nth(0).getByRole('button', { name: 'Hapus soal ini' }).click();
  ok((await p.locator('.pv-q').count()) === 1, 'hapus soal sebelum simpan');
  await p.getByRole('button', { name: 'Simpan soal pilihan' }).click();
  ok(await toast('Tersimpan. Muncul untuk Kelas 5 SD di pelajaran Matematika.') === 'Tersimpan. Muncul untuk Kelas 5 SD di pelajaran Matematika.', 'toast simpan');
  await p.locator('.set-card').first().waitFor();
  ok(await p.locator('.set-card b').first().innerText() === 'Matematika Kelas 5 SD' && await p.getByText('Kelas 5 SD · Matematika · 1 soal').isVisible(), 'kartu paket: judul bawaan & ringkasan');

  // ---------- Cadangan tanpa AI (kunci Claude ditolak) ----------
  await p.getByRole('button', { name: '+ Tambah soal pilihan' }).click();
  await p.getByLabel('Untuk jenjang').selectOption('SMP');
  const opsiKelas = await p.getByLabel('Kelas', { exact: true }).locator('option').allInnerTexts();
  ok(opsiKelas.join('|') === 'Kelas 7 (kelas 1 SMP)|Kelas 8 (kelas 2 SMP)|Kelas 9 (kelas 3 SMP)', 'opsi kelas SMP', opsiKelas.join('|'));
  ok((await p.getByLabel('Mata pelajaran').locator('option').allInnerTexts()).includes('Informatika'), 'mapel ikut jenjang SMP');
  await p.getByLabel('Judul paket').fill('Latihan UTS Bilangan');
  await p.getByLabel('Soal', { exact: true }).fill('1. kuncisalah −3 + 5 = ...\nA. 2\nB. −2\nKunci: A\n2. Tanpa kunci\nA. x\nB. y');
  await p.getByRole('button', { name: 'Rapikan soal' }).click();
  await p.getByRole('heading', { name: 'Cek dulu sebelum simpan' }).waitFor();
  ok((await p.locator('.form-msg').innerText()).startsWith('AI belum bisa dipakai, jadi soal dibaca dari format nomor, pilihan, dan "Kunci: ...".') && (await p.locator('.form-msg').innerText()).includes('Soal nomor 2 belum punya baris "Kunci: ...".'), 'AI gagal → pembaca manual + galat per nomor');
  ok(await p.getByText('Tulis setiap soal dengan nomor, pilihan A sampai D, dan baris "Kunci: ..." supaya bisa dibaca.').isVisible(), 'catatan berganti ke format manual');
  ok((await p.locator('.pv-q').count()) === 1, 'soal valid tetap tampil');
  await p.getByRole('button', { name: 'Simpan soal pilihan' }).click();
  ok(await toast('Tersimpan. Muncul untuk Kelas 7 SMP di pelajaran Matematika.') === 'Tersimpan. Muncul untuk Kelas 7 SMP di pelajaran Matematika.', 'simpan paket SMP');
  await p.locator('.set-card').nth(1).waitFor();
  ok((await p.locator('.set-card b').allInnerTexts()).join('|') === 'Matematika Kelas 5 SD|Latihan UTS Bilangan', 'urut berdasarkan kelas');
  await p.screenshot({ path: `${out}/t8-daftar.png`, fullPage: true });

  // ---------- Ubah ----------
  await p.locator('.set-card').nth(1).getByRole('button', { name: 'Ubah' }).click();
  await p.getByRole('heading', { name: 'Ubah soal pilihan' }).waitFor();
  ok(await p.getByLabel('Judul paket').inputValue() === 'Latihan UTS Bilangan' && await p.getByLabel('Kelas', { exact: true }).inputValue() === '7' && (await p.locator('.pv-q').count()) === 1, 'editor ubah terisi data lama');
  ok((await lebar()) <= 390, 'editor tanpa gulir ke samping');
  await p.getByLabel('Judul paket').fill('UTS Bilangan Bulat');
  await p.getByRole('button', { name: 'Simpan soal pilihan' }).click();
  await toast('Tersimpan.');
  await p.getByText('UTS Bilangan Bulat').waitFor();
  ok((await p.locator('.set-card').count()) === 2, 'ubah tidak menambah paket baru');

  // ---------- Hapus ----------
  await p.locator('.set-card').nth(1).getByRole('button', { name: 'Hapus' }).click();
  ok(await p.getByText('Hapus "UTS Bilangan Bulat"?').isVisible() && await p.getByText('Soal ini tidak akan muncul lagi untuk anak.').isVisible(), 'konfirmasi hapus di dalam kartu');
  await p.getByRole('button', { name: 'Batal' }).click();
  ok((await p.locator('.set-card').count()) === 2, 'batal hapus');
  await p.locator('.set-card').nth(1).getByRole('button', { name: 'Hapus' }).click();
  await p.getByRole('button', { name: 'Ya, hapus' }).click();
  ok(await toast('Soal pilihan dihapus.') === 'Soal pilihan dihapus.', 'toast hapus');
  await p.waitForFunction(() => document.querySelectorAll('.set-card').length === 1, null, { timeout: 5000 }).catch(() => {});
  ok((await p.locator('.set-card').count()) === 1, 'paket terhapus dari daftar');

  // ---------- Ganti PIN, keluar, masuk lagi ----------
  await p.getByRole('button', { name: 'Ganti PIN admin' }).click();
  await p.getByRole('heading', { name: 'Ganti PIN admin' }).waitFor();
  await pin('PIN baru').fill('5678'); await pin('Ulangi PIN').fill('5678');
  await p.getByRole('button', { name: 'Simpan PIN' }).click();
  ok(await toast('PIN admin sudah diganti.') === 'PIN admin sudah diganti.', 'ganti PIN');
  await p.getByRole('button', { name: 'Keluar' }).click();
  await p.waitForURL(`**/main/${raka.id}`);
  ok(true, 'Keluar: kembali ke markas pemain aktif');
  await p.getByRole('heading', { name: 'Raka', exact: true }).waitFor();
  await p.getByRole('link', { name: 'Mode admin' }).click();
  await p.getByText('Masukkan PIN admin untuk mengatur soal pilihan.').waitFor();
  await pin('PIN admin').fill('1234');
  await p.getByRole('button', { name: 'Masuk' }).click();
  await p.locator('.form-msg').waitFor();
  ok(await p.locator('.form-msg').innerText() === 'PIN salah. Coba lagi.' && await pin('PIN admin').inputValue() === '', 'PIN lama salah, kolom dikosongkan');
  await p.getByRole('button', { name: 'Lupa PIN?' }).click();
  ok(await p.getByRole('button', { name: 'Masuk ulang dengan Google' }).isVisible(), 'lupa PIN: tombol masuk ulang Google');
  await p.screenshot({ path: `${out}/t8-pin-masuk.png`, fullPage: true });
  await p.getByRole('button', { name: 'Batal' }).click();
  await pin('PIN admin').fill('5678');
  await p.getByRole('button', { name: 'Masuk' }).click();
  await p.getByRole('heading', { name: 'Soal pilihan' }).waitFor();
  await p.locator('.set-card').first().waitFor();
  ok((await p.locator('.set-card').count()) === 1, 'masuk dengan PIN baru, paket tersimpan');

  // PIN diminta lagi setiap membuka mode admin
  await p.goto(BASE + '/admin');
  await p.getByText('Masukkan PIN admin untuk mengatur soal pilihan.').waitFor();
  ok(true, 'membuka ulang /admin: PIN diminta lagi');

  // Tema gelap
  await p.emulateMedia({ colorScheme: 'dark' });
  await p.screenshot({ path: `${out}/t8-pin-gelap.png` });
  await p.setViewportSize({ width: 360, height: 780 });
  ok((await lebar()) <= 360, '360px: tanpa gulir ke samping', await lebar());

  ok(galatKonsol.length === 0, 'tanpa error JavaScript', galatKonsol.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
