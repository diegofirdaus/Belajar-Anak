// Uji tampilan dashboard progres v2 (mode admin → Progres anak): status 7 hari, aktivitas,
// tren per mapel dengan level, perbandingan bulanan, saran bantuan, detail dilipat.
// Riwayat lampau ditulis langsung ke Firestore Emulator dengan tanggal mundur.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080/v1/projects/markas-latihan/databases/(default)/documents';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };
const H = 86_400_000;
const lalu = (hari) => new Date(Date.now() - hari * H).toISOString();
const s = (v) => ({ stringValue: v });
const i = (v) => ({ integerValue: String(v) });

(async () => {
  const email = `progresui${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  const UID = idp.localId;
  const post = async (path, body) => (await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + idp.idToken }, body: JSON.stringify(body) })).json();
  await post('/api/admin/pin', { pin: '1234' });
  const raka = (await post('/api/pemain', { name: 'Raka', kelas: 5, theme: 'blok' })).player;
  const nadia = (await post('/api/pemain', { name: 'Nadia', kelas: 8, theme: 'pahlawan' })).player;
  const sekar = (await post('/api/pemain', { name: 'Sekar', kelas: 2, theme: 'dino' })).player;
  let no = 0;
  const latihan = async (pid, mapel, topik, level, hari, n, benar, sumber = 'ai') => {
    const answers = Array.from({ length: n }, (_, k) => ({ mapValue: { fields: { q: s(`${topik} soal ${k + 1}?`), options: { arrayValue: { values: ['A1', 'B1', 'C1', 'D1'].map(s) } }, answer: i(0), pilihan: i(k < benar ? 0 : 2) } } }));
    const r = await fetch(`${FS}/families/${UID}/players/${pid}/attempts?documentId=uji${no++}`, { method: 'POST', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' }, body: JSON.stringify({ fields: {
      subject: s(mapel), topic: s(topik), level: s(level), source: s(sumber), setId: { nullValue: null }, n: i(n), correct: i(benar),
      answers: { arrayValue: { values: answers } }, createdAt: { timestampValue: lalu(hari) } } }) });
    if (!r.ok) throw new Error('gagal menulis latihan ' + (await r.text()));
  };
  const statTopik = async (pid, mapel, topik, level, best, last, tries) => {
    await fetch(`${FS}/families/${UID}/players/${pid}/topikStat?documentId=t${no++}`, { method: 'POST', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' }, body: JSON.stringify({ fields: {
      kunci: s(`${mapel}|${topik}`.toLowerCase()), mapel: s(mapel), topik: s(topik), waktu: { timestampValue: lalu(1) },
      lv: { mapValue: { fields: { [level]: { mapValue: { fields: { best: i(best), last: i(last), tries: i(tries) } } } } } } } }) });
  };
  // Raka: rajin (3+ hari dalam 7 hari), Matematika naik setelah naik ke level sedang
  await latihan(raka.id, 'Matematika', 'pecahan', 'mudah', 40, 10, 6);
  await latihan(raka.id, 'Matematika', 'pecahan', 'mudah', 33, 10, 6);
  await latihan(raka.id, 'Matematika', 'pecahan', 'mudah', 26, 10, 7);
  await latihan(raka.id, 'Bahasa Indonesia', 'sinonim', 'mudah', 25, 5, 4);
  await latihan(raka.id, 'Matematika', 'desimal', 'sedang', 12, 10, 6);
  await latihan(raka.id, 'Matematika', 'desimal', 'sedang', 9, 10, 7);
  await latihan(raka.id, 'Matematika', 'desimal', 'sedang', 4, 10, 8);
  await latihan(raka.id, 'Matematika', 'desimal', 'sedang', 0, 10, 9);
  await latihan(raka.id, 'IPAS', 'cahaya', 'mudah', 2, 5, 2);
  await latihan(raka.id, 'IPAS', 'cahaya', 'mudah', 1, 5, 2);
  await statTopik(raka.id, 'IPAS', 'cahaya', 'mudah', 40, 40, 2);
  await statTopik(raka.id, 'Matematika', 'pecahan', 'mudah', 100, 70, 3);
  // Nadia: terakhir latihan 5 hari lalu
  await latihan(nadia.id, 'Matematika', 'bilangan bulat', 'mudah', 5, 5, 3);

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
  await p.goto(BASE + '/admin');
  await p.getByLabel('PIN admin', { exact: true }).fill('1234');
  await p.getByRole('button', { name: 'Masuk' }).click();
  await p.locator('.status-card').first().waitFor();

  // ---------- 1. Status 7 hari terakhir ----------
  ok(await p.getByRole('heading', { name: '7 hari terakhir' }).isVisible() && (await p.locator('.status-card').count()) === 3, 'tiga kartu status, judul "7 hari terakhir"');
  const kartu = (n) => p.locator('.status-card', { hasText: n });
  ok(await kartu('Raka').getAttribute('aria-pressed') === 'true', 'anak di HP ini terpilih lebih dulu');
  const tRaka = (await kartu('Raka').innerText()).replace(/\n/g, ' | ');
  ok(tRaka.includes('Raka rajin dalam 7 hari terakhir') && tRaka.includes('4 latihan · 2 mata pelajaran') && (await kartu('Raka').locator('.status-dot.hijau').count()) === 1, 'Raka: hijau, rajin', tRaka);
  ok(tRaka.includes('▲ Matematika naik 20 poin dari 7 hari sebelumnya'), 'sorotan per mapel', tRaka);
  const tNadia = (await kartu('Nadia').innerText()).replace(/\n/g, ' | ');
  ok(tNadia.includes('Nadia belum latihan 5 hari') && tNadia.includes('Matematika 3/5') && (await kartu('Nadia').locator('.status-dot.oranye').count()) === 1, 'Nadia: oranye, belum latihan 5 hari', tNadia);
  ok((await kartu('Sekar').innerText()).includes('Sekar belum pernah latihan'), 'Sekar: belum pernah latihan');
  ok(!(await p.locator('main').innerText()).match(/rata-rata benar \d+%/i), 'tidak ada rata-rata gabungan semua mapel');

  // ---------- 2. Aktivitas & tren ----------
  ok(await p.getByRole('heading', { name: 'Aktivitas 2 minggu terakhir' }).isVisible() && await p.getByText('Latihan di 6 dari 14 hari').isVisible(), 'aktivitas: 6 dari 14 hari', await p.locator('.aktivitas').getAttribute('aria-label'));
  ok((await p.locator('.aktivitas-batang i').count()) === 14 && (await p.locator('.aktivitas-batang i.isi').count()) === 6, '14 batang, 6 berisi');
  ok(await p.getByRole('heading', { name: 'Tren nilai per mata pelajaran' }).isVisible(), 'kartu tren per mapel');
  const chipMapel = await p.locator('[aria-label="Pilih mata pelajaran"] .chip').allInnerTexts();
  ok(chipMapel.join('|') === 'Matematika|IPAS|Bahasa Indonesia' && await p.locator('[aria-label="Pilih mata pelajaran"] .chip[aria-pressed="true"]').innerText() === 'Matematika', 'pilihan mapel, bawaan paling sering dilatih', chipMapel.join('|'));
  const label = await p.locator('svg.grafik').getAttribute('aria-label');
  ok(label.startsWith('Matematika, rata-rata benar per 7 hari') && label.includes('(level sedang)') && label.includes('(level mudah)'), 'grafik berlabel, menandai level', label);
  ok(await p.locator('svg.grafik text', { hasText: 'Level sedang' }).count() === 1 && await p.getByText('Nilai yang sedikit turun setelah naik level itu wajar', { exact: false }).isVisible(), 'penanda & keterangan naik level');
  ok(await p.locator('.card', { hasText: 'Tren nilai' }).getByText('60% → 85%').isVisible(), 'ringkasan tren Matematika 60% → 85%');
  await p.screenshot({ path: `${out}/t13-progres-atas.png`, fullPage: false });
  await p.locator('[aria-label="Pilih mata pelajaran"] .chip', { hasText: 'IPAS' }).click();
  ok(await p.locator('svg.grafik').getAttribute('aria-label').then((t) => t.startsWith('IPAS')) && await p.locator('.card', { hasText: 'Tren nilai' }).locator('p b', { hasText: '40%' }).isVisible(), 'ganti ke IPAS');

  // ---------- 3. Perbandingan bulanan ----------
  const kartuBulan = p.locator('.card', { hasText: 'Perbandingan bulanan' });
  ok(await kartuBulan.getByText('Rata-rata benar per mapel').isVisible() && (await kartuBulan.locator('tbody tr').count()) >= 6, 'tabel bulanan dengan rata-rata per mapel');
  const opsiA = await kartuBulan.getByLabel('Bandingkan').locator('option').allInnerTexts();
  ok(opsiA.length >= 2 && (await kartuBulan.getByLabel('Dengan').inputValue()) === new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7), 'bawaan: bulan lalu vs bulan ini', opsiA.join(', '));
  ok(!(await kartuBulan.innerText()).includes('Rata-rata benar\t'), 'tidak ada baris rata-rata gabungan');

  // ---------- 4. Yang bisa Anda bantu ----------
  const bantu = await p.locator('.bantu li').allInnerTexts();
  ok(bantu.length >= 2 && bantu[0].includes('IPAS: cahaya') && bantu[0].includes('Skor terakhir 40% di level mudah · 2 kali dicoba') && bantu[0].includes('Ajak Raka membaca ulang materinya'), 'saran: topik lemah', bantu[0]);
  ok(bantu.some((t) => t.includes('Bahasa Indonesia') && t.includes('Belum dilatih 3 minggu')), 'saran: mapel lama tidak dilatih', bantu.join(' / '));
  ok(bantu.some((t) => t.includes('Matematika: pecahan') && t.includes('siap naik')), 'saran: siap naik level');
  ok(bantu.length <= 3, 'maksimal 3 saran');

  // ---------- 5. Detail dilipat ----------
  ok((await p.locator('.lipat-btn').count()) === 3 && (await p.locator('.lipat-btn[aria-expanded="true"]').count()) === 0 && (await p.locator('.hist-btn').count()) === 0, 'detail awalnya terlipat');
  await p.locator('.lipat-btn', { hasText: 'Riwayat latihan' }).click();
  await p.locator('.hist-btn').first().waitFor();
  ok((await p.locator('.hist-item').count()) === 10 && (await p.getByRole('button', { name: 'Tampilkan lebih banyak' }).count()) === 0, 'riwayat: 10 latihan, tanpa tombol lebih banyak');
  await p.locator('.hist-btn', { hasText: 'cahaya' }).first().click();
  await p.locator('.hist-detail .pv-q').first().waitFor();
  ok((await p.locator('.hist-detail .pv-q').count()) === 5 && (await p.locator('.hist-detail .pv-q.salah').count()) === 3, 'detail jawaban per soal');
  await p.locator('.lipat-btn', { hasText: 'Per mata pelajaran' }).click();
  ok((await p.locator('.mapel-list li').count()) === 3, 'per mata pelajaran terbuka');
  await p.locator('.lipat-btn', { hasText: 'Hadiah & pemakaian AI' }).click();
  ok(await p.getByText('Soal AI hari ini:', { exact: false }).isVisible(), 'hadiah & AI terbuka');
  await p.screenshot({ path: `${out}/t13-progres-penuh.png`, fullPage: true });

  // ---------- Anak lain ----------
  await kartu('Sekar').click();
  ok(await p.getByText('Sekar belum pernah latihan. Grafik dan perbandingan akan muncul setelah latihan pertama.').isVisible() && (await p.locator('svg.grafik').count()) === 0, 'anak tanpa latihan: pesan kosong, tanpa grafik');
  await kartu('Nadia').click();
  ok(await p.getByRole('heading', { name: 'Nadia', level: 2 }).isVisible() && (await p.locator('svg.grafik').count()) === 1, 'ganti anak');

  await p.emulateMedia({ colorScheme: 'dark' });
  await kartu('Raka').click();
  await p.screenshot({ path: `${out}/t13-progres-gelap.png`, fullPage: false });
  for (const w of [360, 430]) { await p.setViewportSize({ width: w, height: 800 }); ok((await p.evaluate(() => document.documentElement.scrollWidth)) <= w, `${w}px tanpa gulir ke samping`); }
  ok(galatKonsol.length === 0, 'tanpa error JavaScript', galatKonsol.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
