// Uji tampilan & alur tahap 7: memuat, mengerjakan (HUD per dunia), hasil, riwayat, saran, soal contoh.
// Butuh Firebase Emulator, server Claude tiruan, dan build emulator di port 3100. Layar 390px.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };

(async () => {
  const email = `latihan${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  const T = idp.idToken;
  const buat = async (name, kelas, theme) => (await (await fetch(BASE + '/api/pemain', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + T }, body: JSON.stringify({ name, kelas, theme }) })).json()).player;
  const raka = await buat('Raka', 5, 'blok');
  const nadia = await buat('Nadia', 8, 'pahlawan');
  const bima = await buat('Bima', 11, 'antariksa');
  const sekar = await buat('Sekar', 2, 'dino');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const galatKonsol = [];
  p.on('pageerror', (e) => galatKonsol.push(String(e)));
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL('**/pemain');

  const buka = async (pl) => { await p.goto(`${BASE}/main/${pl.id}`); await p.getByRole('heading', { name: pl.name, exact: true }).waitFor(); await p.getByText(/Riwayat latihan/).waitFor(); await p.waitForTimeout(300); };
  const isi = async (topik, level = 'Mudah', jumlah = '5 soal') => {
    await p.getByLabel('Materi atau tema').fill(topik);
    await p.locator('.seg label', { hasText: new RegExp(`^${level}$`) }).click();
    await p.locator('.seg label', { hasText: jumlah }).click();
  };
  const pilihan = () => p.locator('.opts .opt');
  const klikBenar = () => pilihan().filter({ hasText: /^[A-D]Benar/ }).click();
  const klikSalah = () => pilihan().filter({ hasText: /^[A-D]Salah/ }).first().click();
  const tungguFb = () => p.locator('.fb').waitFor();
  const lanjut = () => p.locator('.fb .btn').click();
  const lebar = () => p.evaluate(() => document.documentElement.scrollWidth);

  // ---------- Dunia Blok: memuat + batal ----------
  await buka(raka);
  await isi('pecahan lambat');
  await p.getByRole('button', { name: 'Mulai menambang soal' }).click();
  await p.getByText('Biasanya butuh 10–40 detik.').waitFor();
  ok(await p.locator('.loading h2').innerText() === 'Menambang soal…', 'memuat: teks dunia Blok pertama');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.spinner')).borderRadius) === '0px', 'memuat Blok: spinner kotak');
  await p.screenshot({ path: `${out}/t7-memuat-blok.png` });
  await p.waitForTimeout(2800);
  ok(await p.locator('.loading h2').innerText() === 'Menggali bahan materi…', 'memuat: teks berganti setelah 2,6 detik');
  await p.getByRole('button', { name: 'Batal' }).click();
  await p.getByRole('heading', { name: 'Ambil misi baru' }).waitFor();
  ok(await p.getByLabel('Materi atau tema').inputValue() === 'pecahan lambat', 'batal: kembali ke markas, isian form tetap');
  ok((await p.locator('#form-soal .form-msg').count()) === 0, 'batal: tanpa pesan error');
  await p.waitForTimeout(1600);
  ok(await p.getByRole('heading', { name: 'Ambil misi baru' }).isVisible() && (await p.locator('.qtext').count()) === 0, 'balasan yang datang setelah batal diabaikan');

  // ---------- Pesan error di form ----------
  await isi('tolak');
  await p.getByRole('button', { name: 'Mulai menambang soal' }).click();
  await p.locator('#form-soal .form-msg').waitFor();
  ok((await p.locator('#form-soal .form-msg').innerText()).startsWith('Materi itu tidak bisa dibuatkan soal.'), 'error AI menolak tampil di form');

  // ---------- Dunia Blok: mengerjakan ----------
  await isi('pecahan');
  await p.getByRole('button', { name: 'Mulai menambang soal' }).click();
  await p.locator('.qtext').waitFor();
  ok(await p.locator('.qtop .tag').innerText() === 'mudah · pecahan' && await p.getByText('Soal 1 dari 5').isVisible(), 'tag "mudah · pecahan" dan "Soal 1 dari 5"');
  ok((await p.locator('.dots i').count()) === 5 && (await p.locator('.dots i.now').count()) === 1, 'indikator 5 titik, satu aktif');
  ok(await p.getByText('Hasil tambang misi ini').isVisible(), 'HUD Blok');
  ok(await p.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(191, 226, 243)', 'layar mengerjakan memakai tema Blok');
  ok((await pilihan().count()) === 4 && Math.min(...await pilihan().evaluateAll((e) => e.map((x) => x.getBoundingClientRect().height))) >= 54, '4 pilihan, tinggi ≥ 54px');
  ok((await p.locator('.fb').count()) === 0, 'kunci & penjelasan belum tampil sebelum menjawab');
  await klikSalah();
  await tungguFb();
  ok(await p.locator('.fb h3').innerText() === 'Belum tepat, Raka. Tidak apa-apa!', 'salah: judul umpan balik');
  ok(/^Jawaban yang benar: [A-D]\. Benar 1$/.test(await p.locator('.fb .key').innerText()), 'kunci jawaban tampil setelah menjawab', await p.locator('.fb .key').innerText());
  ok(await p.getByText('Karena benar 1.').isVisible(), 'penjelasan tampil');
  ok((await p.locator('.opt.right').count()) === 1 && (await p.locator('.opt.wrong').count()) === 1, 'pilihan benar hijau, salah merah');
  ok((await pilihan().evaluateAll((e) => e.every((x) => x.disabled))), 'semua pilihan terkunci');
  await p.screenshot({ path: `${out}/t7-blok-salah.png`, fullPage: true });
  await lanjut();
  await p.getByText('Soal 2 dari 5').waitFor();
  ok((await p.locator('.dots i.no').count()) === 1, 'titik soal 1 merah');
  for (let i = 1; i < 5; i++) {
    await klikBenar(); await tungguFb();
    if (i === 1) {
      ok(await p.locator('.fb .reward-pop').innerText() === '+1 kayu', 'benar: "+1 kayu"');
      ok(['Mantap, blok didapat!', 'Tepat sekali!', 'Keren, terus menambang!'].includes(await p.locator('.fb h3').innerText()), 'kalimat benar dunia Blok');
      await p.screenshot({ path: `${out}/t7-blok-benar.png`, fullPage: true });
    }
    if (i < 4) await lanjut();
  }
  ok(await p.locator('.inv div').first().innerText().then((t) => t.includes('+4')), 'HUD Blok: +4 kayu');
  ok(await p.locator('.fb .btn').innerText() === 'Lihat hasil', 'soal terakhir: tombol "Lihat hasil"');
  await lanjut();
  await p.locator('.banner').waitFor();
  ok(await p.locator('.banner').innerText().then((t) => t.toLowerCase()) === 'misi berhasil!', 'hasil: banner "Misi berhasil!"');
  ok(await p.locator('.big').innerText() === '4/5' && await p.getByText('80% benar · pecahan · level mudah').isVisible(), 'hasil: 4/5, 80% benar');
  ok(await p.locator('.result .reward-pop').innerText() === '+4 kayu', 'hasil: +4 kayu');
  ok(await p.getByText('Kerja bagus, Raka! Kamu sudah menguasai level mudah. Siap coba level sedang?').isVisible(), 'hasil: pesan ≥80%');
  const tombol = await p.locator('.res-actions .btn').allInnerTexts();
  ok(tombol.join('|') === 'Coba level sedang|Soal baru, level sama|Kembali ke markas', 'hasil: tombol soal AI', tombol.join('|'));
  await p.screenshot({ path: `${out}/t7-blok-hasil.png`, fullPage: true });
  await p.getByRole('button', { name: 'Kembali ke markas' }).click();
  await p.getByRole('heading', { name: 'Ambil misi baru' }).waitFor();
  await p.locator('.hist li').first().waitFor();
  ok(await p.getByText('Bangunanmu: Tenda').isVisible() && await p.getByText('4 blok', { exact: true }).isVisible(), 'kartu markas: 4 blok tersimpan');
  const baris = await p.locator('.hist li').first().innerText();
  ok(baris.includes('pecahan') && baris.includes('4/5') && /Matematika · mudah · \d{1,2} \w{3}/.test(baris), 'riwayat: topik, skor, mapel · level · tanggal', baris.replace(/\n/g, ' / '));
  const chip = p.locator('.chip.up', { hasText: 'Siap naik: pecahan → sedang' });
  ok(await chip.isVisible(), 'saran: "Siap naik: pecahan → sedang"');
  await p.getByLabel('Materi atau tema').fill('');
  await chip.click();
  ok(await p.getByLabel('Materi atau tema').inputValue() === 'pecahan' && await p.locator('.seg input[value="sedang"]').isChecked(), 'chip saran mengisi topik & level');
  await p.screenshot({ path: `${out}/t7-blok-markas.png`, fullPage: true });

  // "Coba level sedang" dari halaman hasil (sesi baru) + "Latih lagi"
  await p.getByRole('button', { name: 'Mulai menambang soal' }).click();
  await p.locator('.qtext').waitFor();
  ok(await p.locator('.qtop .tag').innerText() === 'sedang · pecahan', 'sesi sedang dimulai');
  for (let i = 0; i < 5; i++) { await (i < 2 ? klikBenar() : klikSalah()); await tungguFb(); if (i < 4) await lanjut(); }
  ok(await p.locator('.fb .reward-pop').count() === 0, 'jawaban salah tanpa teks hadiah');
  await lanjut(); await p.locator('.banner').waitFor();
  ok(await p.locator('.banner').innerText().then((t) => t.toLowerCase()) === 'terus menambang!' && await p.locator('.result .reward-pop').innerText() === '+2 batu', 'hasil 40%: "Terus menambang!", +2 batu');
  ok(await p.getByText('Tidak apa-apa, Raka. Baca lagi penjelasan tadi, lalu coba soal baru di level yang sama. Pelan-pelan pasti bisa.').isVisible(), 'pesan <60%');
  ok((await p.locator('.res-actions .btn').allInnerTexts()).join('|') === 'Soal baru, level sama|Kembali ke markas', 'tanpa "Coba level" kalau <80%');
  await p.getByRole('button', { name: 'Kembali ke markas' }).click();
  await p.locator('.chip.weak').first().waitFor();
  ok(await p.locator('.chip.weak', { hasText: 'Latih lagi: pecahan (sedang)' }).isVisible(), 'saran: "Latih lagi: pecahan (sedang)"');

  // ---------- Arena Pahlawan ----------
  await buka(nadia);
  await isi('sel');
  await p.getByRole('button', { name: 'Masuk arena' }).click();
  await p.locator('.qtext').waitFor();
  ok(await p.getByText('Boss Materi').isVisible() && await p.getByText('4 serangan lagi').isVisible() && await p.locator('.hearts').innerText() === '♥♥♥', 'HUD Pahlawan: boss 4 serangan, 3 hati');
  await klikSalah(); await tungguFb();
  ok(await p.locator('.hearts').innerText() === '♥♥♡', 'salah: hati berkurang satu');
  await lanjut();
  await klikBenar(); await tungguFb();
  ok(await p.locator('.fb .reward-pop').innerText() === '+10 XP · serangan kena!' && await p.getByText('3 serangan lagi').isVisible(), 'benar: +10 XP, serangan kena');
  ok(await p.locator('section.hit').count() === 1, 'HUD bergetar saat serangan kena');
  await p.screenshot({ path: `${out}/t7-pahlawan.png`, fullPage: true });
  for (let i = 2; i < 5; i++) { await lanjut(); await klikBenar(); await tungguFb(); }
  ok(await p.getByText('Tumbang!').isVisible(), 'HUD: boss tumbang');
  await lanjut(); await p.locator('.banner').waitFor();
  ok(await p.locator('.banner').innerText().then((t) => t.toLowerCase()) === 'victory! boss tumbang' && await p.locator('.result .reward-pop').innerText() === '+55 XP (termasuk bonus boss)', 'hasil Pahlawan: Victory, +55 XP');
  await p.screenshot({ path: `${out}/t7-pahlawan-hasil.png`, fullPage: true });

  // ---------- Misi Antariksa ----------
  await buka(bima);
  await isi('gaya', 'Sulit');
  await p.getByRole('button', { name: 'Luncurkan misi' }).click();
  await p.locator('.qtext').waitFor();
  ok(await p.getByText('Menuju Bulan').isVisible() && await p.getByText('0/40 liter').isVisible(), 'HUD Antariksa: menuju Bulan, 0/40');
  for (let i = 0; i < 5; i++) { await klikBenar(); await tungguFb(); if (i === 1) { ok(await p.getByText('+60 liter misi ini').isVisible() && await p.getByText('Menuju Mars').isVisible(), 'HUD Antariksa: +60 liter, menuju Mars'); await p.screenshot({ path: `${out}/t7-antariksa.png`, fullPage: true }); } if (i < 4) await lanjut(); }
  await lanjut(); await p.locator('.banner').waitFor();
  ok(await p.getByText('Roketmu mendarat di Mars!').isVisible() && await p.locator('.result .reward-pop').innerText() === '+150 liter bahan bakar', 'hasil Antariksa: 150 liter, mendarat di Mars');
  ok(await p.getByText('Luar biasa, Bima! Level sulit pun sudah kamu kuasai.').isVisible() && (await p.locator('.res-actions .btn').allInnerTexts()).join('|') === 'Soal baru, level sama|Kembali ke markas', 'level sulit 100%: pesan & tanpa level berikut');
  await p.screenshot({ path: `${out}/t7-antariksa-hasil.png`, fullPage: true });

  // ---------- Lembah Dino + soal contoh saat AI gagal ----------
  await buka(sekar);
  ok(await p.getByRole('button', { name: 'Coba soal contoh' }).count() === 0, 'AI tersedia: tombol soal contoh tidak tampil');
  await isi('kuncisalah', 'Sulit');
  await p.getByRole('button', { name: 'Mulai menggali' }).click();
  await p.locator('#form-soal .form-msg').waitFor();
  ok((await p.locator('#form-soal .form-msg').innerText()).startsWith('Pembuat soal belum siap.'), 'kunci Claude ditolak: pesan di form');
  await p.getByRole('button', { name: 'Coba soal contoh' }).click();
  await p.locator('.qtext').waitFor();
  ok(await p.locator('.qtop .tag').innerText() === 'mudah · Pecahan (soal contoh)' && await p.getByText('Pecahan yang senilai dengan 1/2 adalah…').isVisible(), 'soal contoh SD tampil');
  ok(await p.getByText('Menggali T-Rex').isVisible(), 'HUD Dino: menggali T-Rex');
  const kunciSD = ['3/6', '3/4', '3/8', '0,3', '1/3'];
  for (let i = 0; i < 5; i++) {
    await pilihan().filter({ hasText: new RegExp(`^[A-D]${kunciSD[i].replace('/', '\\/')}$`) }).click(); await tungguFb();
    if (i === 0) ok(await p.locator('.fb .reward-pop').innerText() === '+1 tulang fosil' && await p.getByText('+1 tulang misi ini').isVisible(), 'Dino: +1 tulang fosil');
    if (i === 2) await p.screenshot({ path: `${out}/t7-dino.png`, fullPage: true });
    if (i < 4) await lanjut();
  }
  await lanjut(); await p.locator('.banner').waitFor();
  ok(await p.locator('.banner').innerText().then((t) => t.toLowerCase()) === 'ekspedisi sukses!' && await p.locator('.result .reward-pop').innerText() === '+5 tulang fosil', 'hasil Dino: Ekspedisi sukses, +5 tulang');
  ok((await p.locator('.res-actions .btn').allInnerTexts()).join('|') === 'Kembali ke markas', 'soal contoh: hanya "Kembali ke markas"');
  await p.screenshot({ path: `${out}/t7-dino-hasil.png`, fullPage: true });
  await p.getByRole('button', { name: 'Kembali ke markas' }).click();
  await p.locator('.hist li').first().waitFor();
  ok(await p.locator('.hist li').first().innerText().then((t) => t.includes('Pecahan (soal contoh)') && t.includes('5/5')), 'soal contoh masuk riwayat');
  ok(await p.locator('.chip').count() === 0, 'soal contoh tidak menghasilkan saran');

  // ---------- Layar 360px tanpa gulir ke samping ----------
  await p.setViewportSize({ width: 360, height: 780 });
  await isi('pecahan dengan judul materi yang sangat panjang sekali supaya teksnya harus dibungkus di layar kecil');
  await p.getByRole('button', { name: 'Mulai menggali' }).click();
  await p.locator('.qtext').waitFor();
  ok((await lebar()) <= 360, 'mengerjakan di 360px: tanpa gulir ke samping', await lebar());
  await p.getByRole('button', { name: 'Berhenti dan kembali ke markas' }).click();
  await p.getByRole('heading', { name: 'Ekspedisi baru' }).waitFor();
  ok((await lebar()) <= 360, 'markas di 360px: tanpa gulir ke samping', await lebar());

  ok(galatKonsol.length === 0, 'tanpa error JavaScript di halaman', galatKonsol.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
