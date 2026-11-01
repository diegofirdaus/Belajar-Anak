// Audit aksesibilitas tahap 10 (brief 12, 15): axe-core WCAG 2.1 AA di semua layar, terang & gelap,
// target sentuh ≥ 44px, tanpa gulir ke samping di 360 & 430px, fokus terlihat, reduced motion.
// Butuh Firebase Emulator, server Claude tiruan, dan build emulator di port 3100.
const { chromium } = require('playwright');
const AXE = require.resolve('axe-core/axe.min.js', { paths: [process.cwd()] });
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };

(async () => {
  const email = `a11y${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  const T = idp.idToken;
  const post = async (path, body, sesi) => (await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + T, ...(sesi ? { 'x-admin-sesi': sesi } : {}) }, body: JSON.stringify(body) })).json();
  const sesiAdmin = (await post('/api/admin/pin', { pin: '1234' })).token;
  await post('/api/admin/soal-pilihan', { title: 'UTS Pecahan', kelas: 5, subject: 'Matematika', sourceText: '1. a', questions: [{ q: 'Hasil 1/2 + 1/2?', options: ['1', '2'], answer: 0, explain: 'x', keyGuessed: true, optionsAdded: true }] }, sesiAdmin);
  const pemain = {};
  for (const [nama, kelas, theme] of [['Raka', 5, 'blok'], ['Nadia', 8, 'pahlawan'], ['Bima', 11, 'antariksa'], ['Sekar', 2, 'dino']]) pemain[theme] = (await post('/api/pemain', { name: nama, kelas, theme })).player;
  // Riwayat + saran untuk Raka
  for (const benar of [5, 2]) {
    const s = await post('/api/soal', { pemainId: pemain.blok.id, mapel: 'Matematika', topik: benar === 5 ? 'pecahan' : 'desimal', level: 'mudah', n: 5 });
    for (let i = 0; i < 5; i++) await post(`/api/sesi/${s.sesiId}/jawab`, { pemainId: pemain.blok.id, nomor: i, pilihan: (s.soal[i].options.findIndex((o) => o.startsWith('Benar')) + (i < benar ? 0 : 1)) % 4 });
  }

  const b = await chromium.launch();
  const audit = async (p, nama) => {
    await p.addScriptTag({ path: AXE });
    const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map((v) => `${v.id} [${v.impact}] ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' ; ')}${v.nodes.length > 3 ? ` (+${v.nodes.length - 3})` : ''}`));
    ok(r.length === 0, `axe: ${nama}`, r.join(' | '));
    const kecil = await p.evaluate(() => [...document.querySelectorAll('button, a[href], input:not([type=radio]), select, textarea, .seg label')]
      .filter((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('[aria-hidden=true]') && !e.classList.contains('sr-only'); })
      .filter((e) => e.getBoundingClientRect().height < 43.5)
      .map((e) => `${e.tagName.toLowerCase()}.${e.className}:"${(e.innerText || e.getAttribute('aria-label') || '').slice(0, 20)}" ${Math.round(e.getBoundingClientRect().height)}px`));
    ok(kecil.length === 0, `target sentuh ≥ 44px: ${nama}`, kecil.join(' | '));
  };
  const lebar = async (p, nama) => {
    for (const w of [360, 430]) {
      await p.setViewportSize({ width: w, height: 800 });
      await p.waitForTimeout(150);
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      ok(sw <= w, `tanpa gulir ke samping ${w}px: ${nama}`, sw);
    }
    await p.setViewportSize({ width: 390, height: 844 });
  };

  for (const skema of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: skema });
    const p = await ctx.newPage();
    const tag = skema === 'light' ? 'terang' : 'gelap';
    await p.goto(BASE + '/'); await p.getByRole('link', { name: /Ayo Mulai/ }).waitFor();
    await audit(p, `pembuka (${tag})`); await lebar(p, `pembuka (${tag})`);
    await p.goto(BASE + '/mulai'); await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
    await audit(p, `login (${tag})`);
    await p.evaluate((e) => window.__masukUji(e), email);
    await p.waitForURL('**/pemain'); await p.locator('.pl-card').first().waitFor();
    await audit(p, `daftar pemain (${tag})`); await lebar(p, `daftar pemain (${tag})`);
    await p.goto(BASE + '/kenalan'); await p.getByPlaceholder('Nama panggilan kamu').waitFor();
    await audit(p, `kenalan langkah 1 (${tag})`);
    await p.getByPlaceholder('Nama panggilan kamu').fill('Tes'); await p.getByRole('button', { name: 'Lanjut' }).click();
    await p.getByRole('button', { name: /^SD/ }).click(); await p.getByRole('button', { name: /^Kelas 5/ }).click();
    await p.locator('.tcard').first().waitFor(); await p.waitForTimeout(400);
    await audit(p, `kenalan pilih dunia (${tag})`); await lebar(p, `kenalan (${tag})`);
    await p.goto(BASE + '/admin'); await p.getByText('Masukkan PIN admin').waitFor();
    await audit(p, `admin PIN (${tag})`);
    await p.getByLabel('PIN admin', { exact: true }).fill('1234'); await p.getByRole('button', { name: 'Masuk' }).click();
    await p.locator('.status-card').first().waitFor(); await p.locator('.status-card', { hasText: 'Raka' }).click();
    await p.locator('svg.grafik').waitFor();
    await audit(p, `admin progres (${tag})`); await lebar(p, `admin progres (${tag})`);
    for (const j of ['Per mata pelajaran', 'Riwayat latihan', 'Hadiah & pemakaian AI']) await p.locator('.lipat-btn', { hasText: j }).click();
    await p.locator('.hist-btn').first().click(); await p.locator('.hist-detail .pv-q').first().waitFor();
    await audit(p, `admin progres detail (${tag})`);
    await p.locator('.tab', { hasText: 'Pengaturan' }).click(); await p.getByRole('heading', { name: 'Data keluarga' }).waitFor();
    await audit(p, `admin pengaturan (${tag})`);
    await p.locator('.tab', { hasText: 'Soal pilihan' }).click();
    await p.locator('.set-card').first().waitFor();
    await audit(p, `admin daftar (${tag})`);
    await p.getByRole('button', { name: 'Ubah' }).click(); await p.locator('.pv-q').first().waitFor();
    await audit(p, `admin editor (${tag})`); await lebar(p, `admin editor (${tag})`);
    await p.goto(BASE + '/sehat'); await p.locator('.card[role=status] h3').waitFor({ timeout: 15000 });
    await audit(p, `sehat (${tag})`);
    await ctx.close();
  }

  // Layar dunia (tema dunia tidak ikut terang/gelap)
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/mulai'); await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email); await p.waitForURL('**/pemain');
  for (const dunia of ['blok', 'pahlawan', 'antariksa', 'dino']) {
    const pl = pemain[dunia];
    await p.goto(`${BASE}/main/${pl.id}`); await p.getByRole('heading', { name: pl.name, exact: true }).waitFor();
    await p.getByText(/Riwayat latihan/).waitFor(); await p.waitForTimeout(500);
    if (dunia === 'blok') { await p.locator('.chip').first().waitFor(); await p.locator('.seg label', { hasText: '★ Soal pilihan' }).click(); }
    await audit(p, `markas ${dunia}`); await lebar(p, `markas ${dunia}`);
    if (dunia === 'blok') await p.locator('.seg label', { hasText: /^Mudah$/ }).click();
    await p.getByLabel('Materi atau tema').fill('lambat');
    await p.locator('#form-soal button[type=submit]').click();
    await p.getByText('Biasanya butuh 10–40 detik.').waitFor();
    await audit(p, `memuat ${dunia}`);
    await p.locator('.qtext').waitFor({ timeout: 15000 });
    await audit(p, `mengerjakan ${dunia}`);
    await p.locator('.opts .opt').filter({ hasText: /^[A-D]Salah/ }).first().click(); await p.locator('.fb').waitFor();
    await audit(p, `umpan balik salah ${dunia}`);
    for (let i = 1; i < 5; i++) { await p.locator('.fb .btn').click(); await p.locator('.opts .opt').filter({ hasText: /^[A-D]Benar/ }).click(); await p.locator('.fb').waitFor(); }
    await audit(p, `umpan balik benar ${dunia}`); await lebar(p, `mengerjakan ${dunia}`);
    await p.locator('.fb .btn').click(); await p.locator('.banner').waitFor();
    await audit(p, `hasil ${dunia}`); await lebar(p, `hasil ${dunia}`);
    await p.screenshot({ path: `${out}/t10-hasil-${dunia}.png` });
  }

  // Fokus keyboard terlihat
  await p.goto(`${BASE}/main/${pemain.dino.id}`); await p.getByRole('heading', { name: 'Sekar', exact: true }).waitFor();
  const fokus = [];
  for (let i = 0; i < 14; i++) {
    await p.keyboard.press('Tab');
    fokus.push(await p.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); const lbl = e.tagName === 'INPUT' && e.type === 'radio' ? e.nextElementSibling : null; const o = lbl ? getComputedStyle(lbl) : s; return { tag: e.tagName, gaya: o.outlineStyle, tebal: parseFloat(o.outlineWidth) }; }));
  }
  // Setelah kontrol terakhir, Tab keluar ke bilah alamat (BODY) lalu kembali ke atas: itu wajar.
  const kontrol = fokus.filter((f) => f.tag !== 'BODY');
  ok(kontrol.length >= 12, 'Tab menjangkau semua kontrol markas', fokus.map((f) => f.tag).join(','));
  ok(kontrol.every((f) => f.gaya !== 'none' && f.tebal >= 3), 'fokus keyboard: outline 3px terlihat di semua kontrol', JSON.stringify(kontrol.filter((f) => f.gaya === 'none' || f.tebal < 3)));

  // Reduced motion
  const ctxR = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const pr = await ctxR.newPage();
  await pr.goto(BASE + '/'); await pr.getByRole('link', { name: /Ayo Mulai/ }).waitFor();
  const anim = await pr.evaluate(() => [...document.querySelectorAll('*')].filter((e) => { const s = getComputedStyle(e); return s.animationName !== 'none' && parseFloat(s.animationDuration) > 0; }).length);
  ok(anim === 0, 'reduced motion: tidak ada animasi berjalan di halaman pembuka', anim);

  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
