// Uji alur Tahap 4 (perkenalan dengan Pipo) terhadap Firebase Emulator.
const { chromium } = require('playwright');
const BASE = process.argv[3] || 'http://localhost:3100';
const out = process.argv[2];
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x ? '  ' + x : ''}`); if (!c) fail++; };
const bubbles = (p) => p.locator('.ob-log .chat-row').evaluateAll((els) => els.map((e) => (e.classList.contains('me') ? '> ' : '< ') + e.innerText.trim()));

async function login(p, email) {
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const shot = (n) => p.screenshot({ path: `${out}/t4-${n}.png`, fullPage: true });

  await login(p, `kenalan${Date.now()}@contoh.id`);
  await p.waitForURL('**/kenalan', { timeout: 15000 });
  ok(true, 'akun tanpa pemain diarahkan ke perkenalan');

  // Indikator mengetik muncul sebelum pesan pertama
  await p.getByLabel('Pipo sedang mengetik').waitFor({ timeout: 3000 });
  ok(true, 'indikator mengetik muncul');
  await p.getByPlaceholder('Nama panggilan kamu').waitFor();
  let log = await bubbles(p);
  ok(log.join('|') === '< Halo! Aku Pipo, pemandu di Markas Latihan.|< Biar akrab, kamu biasa dipanggil siapa?', 'langkah 1: dua sapaan Pipo', JSON.stringify(log));
  ok((await p.locator('.steps i.on').count()) === 1, 'indikator langkah 1 dari 4');
  ok(!(await p.getByRole('link', { name: 'Batal' }).isVisible()), 'tanpa pemain lain: tidak ada Batal');
  ok(await p.evaluate(() => document.activeElement?.id === 'ob-nama'), 'kolom nama langsung fokus');
  await shot('1-nama');

  await p.getByRole('button', { name: 'Lanjut' }).click();
  ok(await p.getByText('Tulis dulu nama panggilanmu, ya.').isVisible(), 'nama kosong: pesan brief');
  await p.getByPlaceholder('Nama panggilan kamu').fill('  Raka  ');
  await p.getByRole('button', { name: 'Lanjut' }).click();
  await p.getByRole('button', { name: /SMP/ }).waitFor();
  log = await bubbles(p);
  ok(log.slice(2).join('|') === '> Raka|< Hai, Raka! Senang kenalan sama kamu.|< Sekarang kamu sekolah di mana?', 'langkah 2: sapa nama', JSON.stringify(log.slice(2)));
  ok((await p.locator('.choice').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ')).join('|') === 'SD Sekolah Dasar|SMP Sekolah Menengah Pertama|SMA Sekolah Menengah Atas', 'tiga pilihan jenjang');
  await shot('2-jenjang');

  await p.getByRole('button', { name: /SMP/ }).click();
  await p.getByRole('button', { name: /Kelas 8/ }).waitFor();
  log = await bubbles(p);
  ok(log.slice(5).join('|') === '> SMP|< Oke, SMP! Kamu kelas berapa?', 'langkah 3: tanya kelas', JSON.stringify(log.slice(5)));
  const kelas = (await p.locator('.kgrid .choice').allInnerTexts()).map((t) => t.replace(/\s+/g, ' '));
  ok(kelas.join('|') === 'Kelas 7 kelas 1 SMP|Kelas 8 kelas 2 SMP|Kelas 9 kelas 3 SMP', 'kelas SMP dengan subjudul', kelas.join('|'));
  await shot('3-kelas');

  await p.getByRole('button', { name: /Kelas 8/ }).click();
  await p.locator('.tgrid .tcard').first().waitFor();
  log = await bubbles(p);
  ok(log.slice(7).join('|') === '> Kelas 8|< Kelas 8, siap! Nanti soal-soalnya aku sesuaikan dengan pelajaran Kelas 8 SMP.|< Terakhir nih. Kamu mau berpetualang di dunia yang mana?', 'langkah 4: tanya dunia', JSON.stringify(log.slice(7)));
  ok((await p.locator('.tgrid .tcard').count()) === 4, 'empat kartu dunia');
  await shot('4-dunia');

  await p.locator('.tcard', { hasText: 'Arena Pahlawan' }).click();
  await p.getByRole('button', { name: 'Masuk ke markas' }).waitFor();
  log = await bubbles(p);
  ok(log.slice(10).join('|') === '> Arena Pahlawan|< Pilihan keren! Selamat datang di Arena Pahlawan, Raka.|< Setiap jawaban benar adalah serangan ke boss dan memberi XP. Kumpulkan XP untuk naik rank!', 'langkah 5: sambutan dan aturan hadiah', JSON.stringify(log.slice(10)));
  ok((await p.locator('.steps i.on').count()) === 4, 'indikator penuh di akhir');
  await shot('5-selesai');

  // Ulangi perkenalan
  await p.getByRole('button', { name: 'Ulangi perkenalan' }).click();
  await p.getByPlaceholder('Nama panggilan kamu').waitFor();
  log = await bubbles(p);
  ok(log.length === 2, 'Ulangi perkenalan memulai dari awal', String(log.length));

  // Jalan cepat lagi, lalu simpan
  await p.getByPlaceholder('Nama panggilan kamu').fill('Raka');
  await p.getByRole('button', { name: 'Lanjut' }).click();
  await p.getByRole('button', { name: /SMP/ }).click();
  await p.getByRole('button', { name: /Kelas 8/ }).click();
  await p.locator('.tcard', { hasText: 'Arena Pahlawan' }).click();
  await p.getByRole('button', { name: 'Masuk ke markas' }).click();
  await p.waitForURL('**/main/**', { timeout: 15000 });
  await p.getByRole('heading', { name: 'Raka' }).waitFor();
  ok(await p.evaluate(() => document.body.classList.contains('t-pahlawan')), 'markas baru memakai tema Arena Pahlawan');
  ok(await p.getByText('Kelas 8 SMP · Fase D Kurikulum Merdeka').isVisible(), 'kelas dan fase tersimpan benar');
  await shot('6-markas');

  // HP mengingat pemain baru
  await p.goto(BASE + '/mulai');
  await p.waitForURL('**/main/**');
  ok(true, 'HP langsung masuk ke markas pemain baru');

  // Sekarang sudah ada pemain: perkenalan menampilkan Batal
  await p.goto(BASE + '/kenalan');
  await p.getByRole('link', { name: 'Batal' }).waitFor({ timeout: 10000 });
  await p.getByRole('link', { name: 'Batal' }).click();
  await p.waitForURL('**/pemain');
  ok(true, 'ada pemain lain: Batal kembali ke daftar pemain');

  // Kurangi gerakan: tanpa indikator mengetik
  const ctx2 = await b.newContext({ viewport: { width: 360, height: 640 }, reducedMotion: 'reduce', storageState: await ctx.storageState({ indexedDB: true }) });
  const p2 = await ctx2.newPage();
  let sawTyping = false;
  await p2.exposeFunction('__lihatMengetik', () => { sawTyping = true; });
  await p2.addInitScript(() => new MutationObserver(() => { if (document.querySelector('[aria-label="Pipo sedang mengetik"]')) window.__lihatMengetik(); }).observe(document, { subtree: true, childList: true }));
  await p2.goto(BASE + '/kenalan');
  await p2.getByPlaceholder('Nama panggilan kamu').waitFor();
  ok(!sawTyping, 'kurangi gerakan: tanpa indikator mengetik');
  const sw = await p2.evaluate(() => document.documentElement.scrollWidth);
  ok(sw === 360, 'tanpa scroll horizontal di 360px', sw);
  await p2.getByPlaceholder('Nama panggilan kamu').fill('Bima');
  await p2.getByRole('button', { name: 'Lanjut' }).click();
  await p2.getByRole('button', { name: /SMA/ }).click();
  await p2.getByRole('button', { name: /Kelas 10/ }).waitFor();
  const k2 = (await p2.locator('.kgrid .choice').allInnerTexts()).map((t) => t.replace(/\s+/g, ' '));
  ok(k2.join('|') === 'Kelas 10 kelas 1 SMA|Kelas 11 kelas 2 SMA|Kelas 12 kelas 3 SMA', 'kelas SMA dengan subjudul');
  await p2.getByRole('button', { name: /Kelas 11/ }).click();
  await p2.locator('.tcard').first().waitFor();
  const sw2 = await p2.evaluate(() => document.documentElement.scrollWidth);
  const cols = await p2.evaluate(() => getComputedStyle(document.querySelector('.tgrid')).gridTemplateColumns.split(' ').length);
  ok(sw2 === 360 && cols === 2, 'kartu dunia 2 kolom di 360px tanpa geser', `${sw2}px, ${cols} kolom`);
  await p2.screenshot({ path: `${out}/t4-7-sma-360.png`, fullPage: true });

  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERROR', e.message.split('\n')[0]); process.exit(1); });
