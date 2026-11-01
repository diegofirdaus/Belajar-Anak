// Uji tampilan dashboard progres orang tua (mode admin → Progres anak).
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };

(async () => {
  const email = `progresui${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  const post = async (path, body) => (await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + idp.idToken }, body: JSON.stringify(body) })).json();
  await post('/api/admin/pin', { pin: '1234' });
  const raka = (await post('/api/pemain', { name: 'Raka', kelas: 5, theme: 'blok' })).player;
  const nadia = (await post('/api/pemain', { name: 'Nadia', kelas: 8, theme: 'pahlawan' })).player;
  const kunci = (q) => q.options.findIndex((o) => o.startsWith('Benar'));
  const main = async (p, mapel, topik, benar, n = 5) => {
    const x = await post('/api/soal', { pemainId: p.id, mapel, topik, level: 'mudah', n });
    for (let i = 0; i < n; i++) await post(`/api/sesi/${x.sesiId}/jawab`, { pemainId: p.id, nomor: i, pilihan: i < benar ? kunci(x.soal[i]) : (kunci(x.soal[i]) + 1) % 4 });
  };
  await main(raka, 'Matematika', 'pecahan', 5);
  await main(raka, 'IPAS', 'cahaya', 2);
  for (let i = 0; i < 11; i++) await main(raka, 'Matematika', `latihan ${i}`, 4);

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const galatKonsol = [];
  p.on('pageerror', (e) => galatKonsol.push(String(e)));
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL('**/pemain');
  await p.evaluate((id) => localStorage.setItem('ml:pemain', id), nadia.id);
  await p.goto(BASE + '/admin');
  await p.getByLabel('PIN admin', { exact: true }).fill('1234');
  await p.getByRole('button', { name: 'Masuk' }).click();
  await p.getByRole('heading', { name: 'Progres anak' }).waitFor();
  await p.locator('.chips[aria-label="Pilih anak"]').waitFor();
  ok(await p.locator('.chip[aria-pressed="true"]').innerText() === 'Nadia', 'anak yang memakai HP ini terpilih lebih dulu');
  ok(await p.getByText('Belum pernah latihan.').isVisible() && (await p.locator('.mapel-list').count()) === 0, 'anak tanpa latihan: keadaan kosong');
  await p.locator('.chip', { hasText: 'Raka' }).click();
  await p.locator('.mapel-list').waitFor();
  ok(await p.getByRole('heading', { name: 'Raka', level: 2 }).isVisible() && await p.getByText('Kelas 5 SD · Dunia Blok').isVisible(), 'kartu anak: nama, kelas, dunia');
  ok(await p.getByText('Terakhir latihan hari ini.').isVisible(), 'terakhir latihan');
  const stat = await p.locator('.stat-grid div').allInnerTexts();
  ok(stat[0].includes('13') && stat[1].includes('65') && stat[2].includes('78%'), '13 latihan, 65 soal, 78% benar', stat.join(' / '));
  ok(await p.getByText('Rumah Batu · 51 blok').isVisible(), 'ringkasan hadiah dunia', await p.locator('text=Hadiah:').innerText());
  ok(await p.getByText('AI hari ini: 13/50 paket soal').isVisible(), 'pemakaian AI anak hari ini');
  const mapel = await p.locator('.mapel-list li').allInnerTexts();
  ok(mapel[0].includes('Matematika') && mapel[0].includes('12 latihan · 82% benar') && mapel[1].includes('IPAS') && mapel[1].includes('1 latihan · 40% benar'), 'per mata pelajaran', mapel.join(' / ').replace(/\n/g, ' '));
  ok(await p.locator('.bar.nilai.baik').count() === 1 && await p.locator('.bar.nilai.kurang').count() === 1, 'warna bar sesuai nilai');
  ok(await p.locator('.chip.weak', { hasText: 'cahaya (mudah) · IPAS' }).isVisible(), 'perlu dibantu: cahaya');
  ok(await p.locator('.chip.up', { hasText: 'pecahan → sedang · Matematika' }).isVisible() && await p.locator('.chip.up', { hasText: 'latihan 3 → sedang' }).isVisible(), 'siap naik level (tanpa batas 6 chip)');
  ok((await p.locator('.hist-item').count()) === 10 && await p.getByRole('button', { name: 'Tampilkan lebih banyak' }).isVisible(), 'riwayat: 10 dulu + tombol lebih banyak');
  await p.screenshot({ path: `${out}/t12-progres.png`, fullPage: true });
  await p.getByRole('button', { name: 'Tampilkan lebih banyak' }).click();
  ok((await p.locator('.hist-item').count()) === 13 && (await p.getByRole('button', { name: 'Tampilkan lebih banyak' }).count()) === 0, 'semua riwayat tampil');
  const cahaya = p.locator('.hist-btn', { hasText: 'cahaya' });
  ok(await cahaya.getAttribute('aria-expanded') === 'false', 'baris riwayat bisa dibuka (aria-expanded)');
  await cahaya.click();
  await p.locator('.hist-detail .pv-q').first().waitFor();
  ok(await cahaya.getAttribute('aria-expanded') === 'true' && (await p.locator('.hist-detail .pv-q').count()) === 5, 'detail: 5 soal');
  ok((await p.locator('.hist-detail .pv-q.salah').count()) === 3 && await p.locator('.hist-detail').getByText('✗ Salah').first().isVisible() && await p.locator('.hist-detail').getByText(/^Kunci:/).first().isVisible(), 'detail: jawaban salah ditandai + kunci');
  ok(await p.locator('.hist-detail').getByText('Jawaban Raka: ✓ Benar', { exact: false }).first().isVisible(), 'detail: jawaban benar ditandai');
  await cahaya.scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${out}/t12-progres-detail.png`, fullPage: true });
  await cahaya.click();
  ok((await p.locator('.hist-detail').count()) === 0, 'detail bisa ditutup');
  ok(await p.getByText('Pemakaian AI keluarga hari ini: 13/100 paket soal.').isVisible(), 'pemakaian AI keluarga');
  for (const w of [360, 430]) { await p.setViewportSize({ width: w, height: 800 }); ok((await p.evaluate(() => document.documentElement.scrollWidth)) <= w, `${w}px tanpa gulir ke samping`); }
  ok(galatKonsol.length === 0, 'tanpa error JavaScript', galatKonsol.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
