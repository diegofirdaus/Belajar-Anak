// Uji akhir (tahap 11): kriteria brief 15 yang belum dicakup uji lain.
// - Halaman pembuka muat tanpa gulir di 390×844; "Ayo Mulai!" berdenyut, berhenti saat reduced motion
// - Kartu naik kelas SMP → SMA (kelas 9 → 10)
// - Kunci API tidak pernah muncul di respons jaringan
const { chromium } = require('playwright');
const BASE = 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080/v1/projects/markas-latihan/databases/(default)/documents';
const KUNCI = process.argv[2] || 'sk-tiruan';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };

(async () => {
  const b = await chromium.launch();

  // ---------- Halaman pembuka ----------
  const p0 = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await p0.goto(BASE + '/'); await p0.getByRole('link', { name: /Ayo Mulai/ }).waitFor();
  const ukuran = await p0.evaluate(() => [document.documentElement.scrollHeight, window.innerHeight, document.documentElement.scrollWidth]);
  ok(ukuran[0] <= ukuran[1] && ukuran[2] <= 390, 'pembuka tampil lengkap tanpa gulir di 390×844', ukuran.join(' / '));
  const anim = await p0.locator('.sp-start').evaluate((e) => getComputedStyle(e).animationName);
  ok(anim.includes('pulse'), 'tombol "Ayo Mulai!" berdenyut', anim);
  const pr = await (await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })).newPage();
  await pr.goto(BASE + '/'); await pr.getByRole('link', { name: /Ayo Mulai/ }).waitFor();
  ok(await pr.locator('.sp-start').evaluate((e) => getComputedStyle(e).animationName) === 'none', 'denyut berhenti saat reduced motion');

  // ---------- Naik kelas SMP → SMA + pemantauan jaringan ----------
  const email = `akhir${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  const pemain = (await (await fetch(BASE + '/api/pemain', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + idp.idToken }, body: JSON.stringify({ name: 'Nadia', kelas: 9, theme: 'antariksa' }) })).json()).player;
  const AY = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  await fetch(`${FS}/families/${idp.localId}/players/${pemain.id}?updateMask.fieldPaths=academicYear`, { method: 'PATCH', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' }, body: JSON.stringify({ fields: { academicYear: { integerValue: String(AY - 1) } } }) });

  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const bocor = [];
  p.on('response', async (r) => {
    try {
      const t = await r.text();
      if (t.includes(KUNCI)) bocor.push(r.url());
    } catch { /* respons tanpa isi */ }
  });
  p.on('request', (r) => { if ((r.postData() ?? '').includes(KUNCI) || Object.values(r.headers()).some((h) => h.includes(KUNCI))) bocor.push('permintaan ' + r.url()); });
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL(/\/(pemain|main\/.*)$/);
  await p.goto(`${BASE}/main/${pemain.id}`);
  await p.getByText('Nadia, kamu sudah naik kelas belum?').waitFor();
  await p.getByRole('button', { name: 'Sudah, sekarang Kelas 10 SMA' }).click();
  await p.locator('.toast', { hasText: 'Selamat naik kelas, Nadia!' }).waitFor();
  ok(await p.getByText('Kelas 10 SMA · Fase E Kurikulum Merdeka').isVisible(), 'naik kelas SMP → SMA: Kelas 10 SMA, Fase E');
  ok((await p.locator('#form-soal select option').allInnerTexts()).includes('Fisika') && await p.getByPlaceholder('contoh: hukum Newton').isVisible(), 'mapel & contoh materi ikut jenjang SMA');
  await p.reload(); await p.getByRole('heading', { name: 'Nadia', exact: true }).waitFor(); await p.waitForTimeout(500);
  ok(!(await p.getByText('kamu sudah naik kelas belum?').isVisible()), 'kartu naik kelas hanya sekali per tahun ajaran');
  // Buat soal AI + jawab satu, supaya respons jalur AI ikut dipantau
  await p.getByLabel('Materi atau tema').fill('gerak lurus');
  await p.getByRole('button', { name: 'Luncurkan misi' }).click();
  await p.locator('.opts .opt').first().waitFor();
  await p.locator('.opts .opt').first().click(); await p.locator('.fb').waitFor();
  ok(bocor.length === 0, 'kunci API tidak muncul di permintaan maupun respons jaringan', bocor.join(' | '));

  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
