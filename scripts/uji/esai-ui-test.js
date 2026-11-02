// Uji tampilan soal esai (STATUS "BERIKUTNYA" no. 2): anak mengetik & Periksa, hasil per poin,
// editor kartu esai, koreksi orang tua di dashboard, dan audit axe-core. Layar 390px.
// Butuh Firebase Emulator, server Claude tiruan, dan build emulator di port 3100.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
const AXE = require.resolve('axe-core/axe.min.js', { paths: [process.cwd()] });
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };

(async () => {
  const email = `esaiui${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  const T = idp.idToken;
  const post = async (path, body, sesi) => (await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + T, ...(sesi ? { 'x-admin-sesi': sesi } : {}) }, body: JSON.stringify(body) })).json();
  const sesi = (await post('/api/admin/pin', { pin: '1234' })).token;
  const esai = (q, contoh, wajib, pelengkap = []) => ({ q, options: [], answer: 0, explain: 'Penjelasan dari orang tua.', keyGuessed: false, optionsAdded: false, jenis: 'esai', esai: { contoh, wajib, pelengkap } });
  await post('/api/admin/soal-pilihan', { title: 'Fotosintesis', kelas: 5, subject: 'IPAS', sourceText: '', acakPilihan: false, questions: [
    esai('Jelaskan proses fotosintesis!', 'Tumbuhan membuat makanan sendiri dengan bantuan cahaya matahari.', ['Tumbuhan membuat makanan sendiri', 'Membutuhkan cahaya matahari'], ['Menghasilkan oksigen']),
    esai('Planet terdekat dari Matahari adalah ...', 'Merkurius', ['Merkurius']),
  ] }, sesi);
  const raka = (await post('/api/pemain', { name: 'Raka', kelas: 5, theme: 'dino' })).player;

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const galatKonsol = [];
  p.on('pageerror', (e) => galatKonsol.push(String(e)));
  const audit = async (nama) => {
    await p.addScriptTag({ path: AXE });
    const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map((v) => `${v.id} ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' ; ')}`));
    ok(r.length === 0, `axe: ${nama}`, r.join(' | '));
    const kecil = await p.evaluate(() => [...document.querySelectorAll('button, a[href], input, select, textarea')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.classList.contains('sr-only') && r.height < 43.5; })
      .map((e) => `${e.tagName}.${e.className} ${Math.round(e.getBoundingClientRect().height)}px`));
    ok(kecil.length === 0, `target sentuh ≥ 44px: ${nama}`, kecil.join(' | '));
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `tanpa gulir samping: ${nama}`);
  };

  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL('**/pemain');

  // ---------- Anak mengerjakan soal esai ----------
  await p.goto(`${BASE}/main/${raka.id}`);
  await p.getByRole('heading', { name: 'Raka', exact: true }).waitFor();
  await p.locator('.hist, #riwayat-judul + p').first().waitFor();
  await p.locator('.seg label', { hasText: '★ Soal pilihan' }).click();
  await p.getByLabel('Mata pelajaran').selectOption('IPAS');
  await p.getByRole('button', { name: 'Kerjakan' }).click();
  await p.locator('.qtext').waitFor();
  const kotak = p.getByLabel('Jawabanmu');
  ok(await kotak.isVisible() && (await p.locator('.opts').count()) === 0, 'soal esai: kotak jawaban, tanpa pilihan A–D');
  ok((await kotak.getAttribute('maxlength')) === '500' && await p.getByText('0/500 huruf').isVisible(), 'maks 500 huruf + penghitung');
  await p.getByRole('button', { name: 'Periksa' }).click();
  ok(await p.locator('.form-msg').innerText() === 'Tulis dulu jawabanmu, ya.', 'Periksa tanpa jawaban: diminta menulis dulu');
  await kotak.fill('Tumbuhan bikin makanan sendiri pakai cahaya matahari');
  ok(await p.getByText('52/500 huruf').isVisible(), 'penghitung huruf bertambah');
  await audit('soal esai (dino)');
  await p.screenshot({ path: `${out}/esai-soal.png`, fullPage: true });
  await p.getByRole('button', { name: 'Periksa' }).click();
  await p.locator('.fb').waitFor();
  ok(!(await p.locator('.fb').getAttribute('class')).includes('bad') && await p.locator('.fb .reward-pop').innerText() === '+2 tulang fosil', 'benar: kartu hijau + hadiah setara sedang (+2 tulang)');
  const poin = await p.locator('.esai-hasil li').allInnerTexts();
  ok(poin.join('|') === '✓ Tumbuhan membuat makanan sendiri|✓ Membutuhkan cahaya matahari', 'poin wajib ✓', poin.join('|'));
  ok(await p.getByText('Bisa ditambah: Menghasilkan oksigen.').isVisible() && await p.getByText('Contoh jawaban: Tumbuhan membuat makanan sendiri dengan bantuan cahaya matahari.').isVisible(), 'bisa ditambah + contoh jawaban');
  ok(await kotak.isDisabled() && await kotak.inputValue() === 'Tumbuhan bikin makanan sendiri pakai cahaya matahari' && (await p.getByRole('button', { name: 'Periksa' }).count()) === 0, 'setelah diperiksa: jawaban terkunci, tombol Periksa hilang');
  await audit('hasil esai benar');
  await p.screenshot({ path: `${out}/esai-benar.png`, fullPage: true });
  await p.locator('.fb .btn').click();
  ok(await kotak.inputValue() === '', 'soal berikutnya: kotak jawaban kosong lagi');
  await kotak.fill('Venus');
  await p.getByRole('button', { name: 'Periksa' }).click();
  await p.locator('.fb.bad').waitFor();
  ok(await p.locator('.fb h3').innerText() === 'Belum tepat, Raka. Tidak apa-apa!' && await p.locator('.esai-hasil li').innerText() === '✗ Belum ada: Merkurius', 'belum tepat: poin wajib yang belum ada');
  await audit('hasil esai belum tepat');
  await p.screenshot({ path: `${out}/esai-salah.png`, fullPage: true });
  await p.locator('.fb .btn').click();
  await p.locator('.banner').waitFor();
  ok(await p.getByText('50% benar · Fotosintesis · soal pilihan').isVisible(), 'hasil sesi 1/2');

  // ---------- Dashboard: koreksi orang tua ----------
  await p.goto(BASE + '/admin');
  await p.getByLabel('PIN admin', { exact: true }).fill('1234');
  await p.getByRole('button', { name: 'Masuk' }).click();
  await p.getByRole('heading', { name: 'Progres anak' }).waitFor();
  await p.locator('.lipat-btn', { hasText: 'Riwayat latihan' }).click();
  await p.locator('.hist-btn', { hasText: 'Fotosintesis' }).click();
  await p.locator('.hist-detail .pv-q').nth(1).waitFor();
  const d2 = p.locator('.hist-detail .pv-q').nth(1);
  ok(await d2.getByText('✗ Belum tepat').isVisible() && await d2.locator('.esai-kutip').innerText() === 'Venus' && (await d2.locator('.esai-poin-hasil li').innerText()).includes('Wajib: Merkurius'), 'detail: jawaban esai anak & hasil per poin');
  ok((await p.locator('.hist-detail .pv-q').nth(0).locator('.esai-poin-hasil li').allInnerTexts()).some((t) => t.includes('“Tumbuhan')), 'detail: kutipan jawaban anak per poin');
  ok(await p.locator('.hist-score').innerText() === '1/2', 'skor 1/2');
  await d2.getByRole('button', { name: 'Tandai benar' }).click();
  await d2.getByText('✓ Benar').waitFor();
  ok(await d2.getByText('(dikoreksi orang tua)').isVisible() && await p.locator('.hist-score').innerText() === '2/2' && await d2.getByRole('button', { name: 'Tandai salah' }).isVisible(), 'Tandai benar: skor 2/2, label koreksi, tombol berganti');
  await audit('dashboard detail esai');
  await p.screenshot({ path: `${out}/esai-dashboard.png`, fullPage: true });
  const pemain = await (await fetch(`${BASE}/api/pemain/${raka.id}`, { headers: { authorization: 'Bearer ' + T } })).json();
  ok(pemain.player.rewards.dino.bones === 4, 'hadiah ikut ditambah (2 × 2 tulang)', pemain.player.rewards.dino.bones);

  // ---------- Editor: kartu esai ----------
  await p.locator('.tab', { hasText: 'Soal pilihan' }).click();
  await p.getByRole('button', { name: '+ Tambah soal pilihan' }).click();
  await p.getByLabel('Soal', { exact: true }).fill('1. 3/4 + 1/4 = ...\n2. Jelaskan proses fotosintesis! (uraian)');
  await p.getByRole('button', { name: 'Rapikan soal' }).click();
  await p.getByRole('heading', { name: 'Cek dulu sebelum simpan' }).waitFor();
  ok((await p.locator('.tag-esai').count()) === 3 && await p.getByText('Jawaban dibuat AI. Mohon dicek.').first().isVisible(), 'kartu esai: label Esai + tanda jawaban dibuat AI');
  const k1 = p.locator('.pv-q').nth(1);
  ok(await k1.getByLabel('Contoh jawaban').inputValue() === 'Fotosintesis adalah proses tumbuhan membuat makanan sendiri dengan bantuan cahaya matahari dan menghasilkan oksigen.', 'contoh jawaban bisa diedit');
  ok(await k1.getByLabel('Soal 2, poin wajib 1').inputValue() === 'Tumbuhan membuat makanan sendiri' && await k1.getByLabel('Soal 2, poin pelengkap 1').inputValue() === 'Menghasilkan oksigen', 'poin wajib & pelengkap tampil di kolom');
  ok((await k1.getByRole('button', { name: '+ Tambah poin wajib' }).count()) === 0 && await k1.getByRole('button', { name: '+ Tambah poin pelengkap' }).isVisible(), 'poin wajib sudah 2 (maks): tombol tambah hilang');
  await k1.getByLabel('Soal 2, poin wajib 2').fill('Butuh sinar matahari');
  ok((await p.getByText('Jawaban dibuat AI. Mohon dicek.').count()) === 1, 'mengedit kunci esai: tanda AI hilang di soal itu');
  const k2 = p.locator('.pv-q').nth(2);
  ok((await k2.getByRole('button', { name: /Hapus poin wajib/ }).count()) === 0, 'poin wajib terakhir tidak bisa dihapus');
  await k2.getByLabel('Soal 3, poin wajib 1').fill('  ');
  await audit('editor kartu esai');
  await p.screenshot({ path: `${out}/esai-editor.png`, fullPage: true });
  await p.getByRole('button', { name: 'Simpan soal pilihan' }).click();
  ok(await p.locator('.form-msg').innerText() === 'Soal esai nomor 3 belum punya poin wajib. Isi minimal 1 poin yang harus ada di jawaban anak.', 'simpan: esai tanpa poin wajib ditolak');
  await k2.getByLabel('Soal 3, poin wajib 1').fill('Jakarta');
  await k1.getByRole('button', { name: '+ Tambah poin pelengkap' }).click();
  ok((await k1.getByLabel(/Soal 2, poin pelengkap/).count()) === 2, 'tambah poin pelengkap');
  await p.getByRole('button', { name: 'Simpan soal pilihan' }).click();
  await p.locator('.set-card').nth(1).waitFor();
  const paket = await (await fetch(BASE + '/api/admin/soal-pilihan', { headers: { authorization: 'Bearer ' + T, 'x-admin-sesi': sesi } })).json();
  const baru = paket.paket.find((x) => x.title !== 'Fotosintesis');
  ok(baru.questions[1].esai.wajib.join('|') === 'Tumbuhan membuat makanan sendiri|Butuh sinar matahari' && baru.questions[1].esai.pelengkap.length === 1, 'tersimpan: poin diedit, poin pelengkap kosong dibuang', JSON.stringify(baru.questions[1].esai));

  ok(galatKonsol.length === 0, 'tanpa error di konsol', galatKonsol.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})();
