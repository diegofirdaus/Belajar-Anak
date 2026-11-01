// Uji tampilan & alur markas (tahap 5) terhadap Firebase Emulator.
const { chromium } = require('playwright');
const out = process.argv[2];
const BASE = 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080/v1/projects/markas-latihan/databases/(default)/documents';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };
const AY = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
const int = (n) => ({ integerValue: String(n) });
const rewards = (o) => ({ mapValue: { fields: {
  blok: { mapValue: { fields: { kayu: int(o.kayu ?? 0), batu: int(o.batu ?? 0), permata: int(o.permata ?? 0) } } },
  pahlawan: { mapValue: { fields: { xp: int(o.xp ?? 0), bosses: int(o.bosses ?? 0) } } },
  antariksa: { mapValue: { fields: { fuel: int(o.fuel ?? 0) } } },
  dino: { mapValue: { fields: { bones: int(o.bones ?? 0), done: { arrayValue: { values: (o.done ?? []).map((s) => ({ stringValue: s })) } } } } },
} } });

(async () => {
  const email = `markas${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  const T = idp.idToken; const UID = idp.localId;
  const buat = async (name, kelas, theme, rw, ay = AY) => {
    const p = (await (await fetch(BASE + '/api/pemain', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + T }, body: JSON.stringify({ name, kelas, theme }) })).json()).player;
    await fetch(`${FS}/families/${UID}/players/${p.id}?updateMask.fieldPaths=rewards&updateMask.fieldPaths=academicYear`, { method: 'PATCH', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' }, body: JSON.stringify({ fields: { rewards: rewards(rw), academicYear: int(ay) } }) });
    return p;
  };
  const raka = await buat('Raka', 6, 'blok', { kayu: 18, batu: 9, permata: 4, bones: 5, done: ['T-Rex'] }, AY - 1);
  const nadia = await buat('Nadia', 8, 'pahlawan', { xp: 230, bosses: 4 }, AY - 1);
  const bima = await buat('Bima', 12, 'antariksa', { fuel: 300 }, AY - 1);
  const sekar = await buat('Sekar', 2, 'dino', { bones: 5, done: ['T-Rex', 'Triceratops', 'T-Rex'] });

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL('**/pemain');
  const buka = async (pl) => { await p.goto(`${BASE}/main/${pl.id}`); await p.getByRole('heading', { name: pl.name, exact: true }).waitFor(); await p.waitForTimeout(300); };
  const toast = () => p.locator('.toast').innerText();
  const lebar = () => p.evaluate(() => document.documentElement.scrollWidth);

  // ---- Dunia Blok + naik kelas SD → SMP
  await buka(raka);
  ok(await p.getByText('Bangunanmu: Pondok Kayu').isVisible() && await p.getByText('31 blok').isVisible(), 'Blok: Pondok Kayu, 31 blok');
  ok(await p.getByText('9 blok lagi untuk membangun Rumah Batu.').isVisible(), 'Blok: sisa blok ke tingkat berikut');
  ok((await p.locator('canvas[aria-label="Bangunanmu: Pondok Kayu"]').count()) === 1, 'Blok: canvas berlabel');
  ok(await p.getByRole('heading', { name: 'Ambil misi baru' }).isVisible() && await p.getByRole('button', { name: 'Mulai menambang soal' }).isVisible(), 'Blok: judul form & tombol per dunia');
  ok(await p.getByText('Raka, kamu sudah naik kelas belum?').isVisible(), 'kartu naik kelas muncul (tahun ajaran lama)');
  await p.screenshot({ path: `${out}/t5-blok.png`, fullPage: true });
  ok((await p.locator('#form-soal select option').allInnerTexts()).includes('IPAS'), 'kelas 6: mapel SD (IPAS)');
  await p.getByRole('button', { name: 'Sudah, sekarang Kelas 7 SMP' }).click();
  await p.locator('.toast').waitFor();
  ok((await toast()) === 'Selamat naik kelas, Raka!', 'toast selamat naik kelas');
  ok(await p.getByText('Kelas 7 SMP · Fase D Kurikulum Merdeka').isVisible(), 'naik ke Kelas 7 SMP, Fase D');
  ok(!(await p.getByText('kamu sudah naik kelas belum?').isVisible()), 'kartu naik kelas hilang');
  const mapelSMP = await p.locator('#form-soal select option').allInnerTexts();
  ok(mapelSMP.includes('IPA') && !mapelSMP.includes('IPAS') && (await p.getByPlaceholder('contoh: bilangan bulat negatif').isVisible()), 'mapel & contoh materi ikut jenjang SMP');
  await p.reload(); await p.getByRole('heading', { name: 'Raka', exact: true }).waitFor();
  ok(!(await p.getByText('kamu sudah naik kelas belum?').isVisible()), 'setelah dimuat ulang, kartu naik kelas tidak muncul lagi');

  // Form soal
  await p.getByRole('button', { name: 'Mulai menambang soal' }).click();
  ok(await p.getByText('Tulis dulu materi yang mau dilatih, misalnya "pecahan" atau "gaya dan gerak".').isVisible(), 'form: materi kosong → pesan brief');
  await p.getByText('Sulit', { exact: true }).click();
  ok(await p.locator('input[type=radio][value=sulit]').isChecked(), 'form: level sulit terpilih');
  const tanda = await p.evaluate(() => getComputedStyle(document.querySelector('input[value=sulit] + label'), '::before').content);
  ok(tanda.includes('✓'), 'form: tanda ✓ pada level terpilih', tanda);
  ok(lebar() !== null && (await lebar()) === 390, 'Blok: tanpa geser horizontal');

  // ---- Arena Pahlawan + "Belum"
  await buka(nadia);
  ok(await p.getByText('Ksatria', { exact: true }).isVisible() && await p.getByText('70 XP lagi ke Komandan').isVisible(), 'Pahlawan: rank Ksatria, 70 XP lagi');
  ok(await p.locator('.crest span').innerText() === '2', 'Pahlawan: nomor rank 2');
  ok(await p.evaluate(() => document.body.classList.contains('t-pahlawan')), 'Pahlawan: tema gelap');
  await p.screenshot({ path: `${out}/t5-pahlawan.png`, fullPage: true });
  await p.getByRole('button', { name: 'Belum, masih Kelas 8 SMP' }).click();
  await p.getByText('kamu sudah naik kelas belum?').waitFor({ state: 'detached' });
  ok(await p.getByText('Kelas 8 SMP · Fase D Kurikulum Merdeka').isVisible(), '"Belum": kelas tetap 8');

  // ---- Misi Antariksa + kelas 12
  await buka(bima);
  ok(await p.getByText('Sekarang di Jupiter').isVisible() && await p.getByText('150 liter lagi untuk terbang ke Saturnus.').isVisible(), 'Antariksa: di Jupiter, 150 liter lagi');
  ok(await p.getByText('Jupiter adalah planet terbesar di tata surya.').isVisible(), 'Antariksa: kotak fakta');
  ok(await p.getByText('Kalau kelasmu berubah, ubah lewat Pengaturan di bawah.').isVisible(), 'kelas 12: kartu tahun ajaran versi Oke');
  await p.screenshot({ path: `${out}/t5-antariksa.png`, fullPage: true });
  await p.getByRole('button', { name: 'Oke', exact: true }).click();
  await p.getByText('Kalau kelasmu berubah').waitFor({ state: 'detached' });
  ok(true, 'kelas 12: Oke menutup kartu');

  // ---- Lembah Dino + pengaturan
  await buka(sekar);
  ok(await p.getByRole('heading', { name: 'Brachiosaurus' }).isVisible() && await p.getByText('5/8 tulang').isVisible(), 'Dino: 3 kerangka jadi → menggali Brachiosaurus, 5/8 tulang');
  ok((await p.locator('.bone.on').count()) === 5, 'Dino: 5 slot terisi');
  ok(await p.locator('.museum').innerText().then((t) => t.replace(/\s+/g, ' ') === 'T-Rex ×2 Triceratops'), 'Dino: museum T-Rex ×2, Triceratops');
  ok(!(await p.getByText('kamu sudah naik kelas belum?').isVisible()), 'tahun ajaran sudah dikonfirmasi: tidak ada kartu');
  await p.screenshot({ path: `${out}/t5-dino.png`, fullPage: true });

  const merah = await p.evaluate(() => { const bt = [...document.querySelectorAll('button')].find((x) => x.textContent === 'Hapus pemain'); return getComputedStyle(bt).color === getComputedStyle(document.body).getPropertyValue('--bad').trim() || getComputedStyle(bt).color; });
  ok(merah === true || String(merah).startsWith('rgb(196, 65, 45)'), 'Hapus pemain berteks merah', merah);

  await p.getByRole('button', { name: 'Ubah kelas' }).click();
  await p.locator('label', { hasText: 'SMP' }).click();
  await p.getByRole('button', { name: /^Kelas 9/ }).click();
  await p.locator('.toast').waitFor();
  ok((await toast()) === 'Kelas diubah ke Kelas 9 SMP.', 'ubah kelas: toast brief', await toast());
  ok(await p.getByText('Kelas 9 SMP · Fase D Kurikulum Merdeka').isVisible(), 'ubah kelas: tersimpan');

  await p.getByRole('button', { name: 'Ganti dunia' }).click();
  ok(await p.getByText('Pilih dunia. Hadiah di dunia lama tetap tersimpan.').isVisible(), 'ganti dunia: teks brief');
  await p.locator('.tcard', { hasText: 'Dunia Blok' }).click();
  await p.getByText('Bangunanmu: Tenda').waitFor();
  ok(await p.evaluate(() => document.body.classList.contains('t-blok')), 'ganti dunia: tema berubah ke Blok');
  await p.getByRole('button', { name: 'Ganti dunia' }).click();
  await p.locator('.tcard', { hasText: 'Lembah Dino' }).click();
  await p.getByText('5/8 tulang').waitFor();
  ok(true, 'kembali ke Dino: hadiah lama tetap ada');

  await p.getByRole('button', { name: 'Ganti nama' }).click();
  await p.getByLabel('Nama panggilan').fill('Sekar Ayu');
  await p.getByRole('button', { name: 'Simpan' }).click();
  await p.getByRole('heading', { name: 'Sekar Ayu' }).waitFor();
  ok(true, 'ganti nama tersimpan');

  await p.getByRole('button', { name: 'Hapus pemain' }).click();
  ok(await p.locator('[role=alertdialog]').innerText().then((t) => t.startsWith('Hapus Sekar Ayu? Semua hadiah dan riwayat latihannya ikut terhapus dan tidak bisa dikembalikan.')), 'hapus: konfirmasi teks brief');
  await p.getByRole('button', { name: 'Batal' }).click();
  ok(!(await p.locator('[role=alertdialog]').isVisible()), 'hapus: Batal menutup');
  await p.getByRole('button', { name: 'Hapus pemain' }).click();
  await p.getByRole('button', { name: 'Ya, hapus' }).click();
  await p.waitForURL('**/pemain');
  ok((await toast()) === 'Sekar Ayu sudah dihapus.', 'hapus: toast brief');
  await p.locator('.pl-card').first().waitFor();
  const sisa = await p.locator('.pl-card b').allInnerTexts();
  ok(sisa.join(',') === 'Raka,Nadia,Bima', 'pemain lain tetap ada', sisa.join(','));

  // 360px di semua dunia
  const ctx2 = await b.newContext({ viewport: { width: 360, height: 640 }, storageState: await ctx.storageState({ indexedDB: true }) });
  const p2 = await ctx2.newPage();
  for (const pl of [raka, nadia, bima]) {
    await p2.goto(`${BASE}/main/${pl.id}`); await p2.getByRole('heading', { name: pl.name, exact: true }).waitFor();
    ok((await p2.evaluate(() => document.documentElement.scrollWidth)) === 360, `360px tanpa geser: ${pl.theme}`);
  }

  // Katalog: kartu hadiah contoh
  await p.goto(BASE + '/katalog');
  await p.getByRole('button', { name: 'Misi Antariksa', exact: true }).click();
  ok((await p.locator('section[aria-label="Hadiah Misi Antariksa"]').count()) === 3, 'katalog: 3 contoh kartu hadiah');
  await p.locator('#kat-hadiah').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${out}/t5-katalog-antariksa.png`, fullPage: true });

  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('ERROR', e.message.split('\n').slice(0, 3).join(' | ')); process.exit(1); });
