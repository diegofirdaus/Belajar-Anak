// Uji tampilan gambar soal dari foto (STATUS "BERIKUTNYA" no. 3): usulan potongan, geser & ubah ukuran
// dengan seret (pointer) dan keyboard, simpan potongan, anak melihat & memperbesar, ubah paket lama. Layar 390px.
// Butuh Firebase Emulator, server Claude tiruan, dan build emulator di port 3100.
const { chromium } = require('playwright');
const out = process.argv[2] || '.';
const BASE = 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080/v1/projects/markas-latihan/databases/(default)/documents';
const AXE = require.resolve('axe-core/axe.min.js', { paths: [process.cwd()] });
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };

(async () => {
  const email = `gambarui${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  const T = idp.idToken;
  const post = async (path, body, sesi) => (await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + T, ...(sesi ? { 'x-admin-sesi': sesi } : {}) }, body: JSON.stringify(body) })).json();
  const sesi = (await post('/api/admin/pin', { pin: '1234' })).token;
  const raka = (await post('/api/pemain', { name: 'Raka', kelas: 5, theme: 'antariksa' })).player;

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await ctx.newPage();
  const galatKonsol = [];
  p.on('pageerror', (e) => galatKonsol.push(String(e)));
  const audit = async (nama) => {
    await p.addScriptTag({ path: AXE });
    const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map((v) => `${v.id} ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' ; ')}`));
    ok(r.length === 0, `axe: ${nama}`, r.join(' | '));
    const kecil = await p.evaluate(() => [...document.querySelectorAll('button, a[href], input:not(.sr-only), select, textarea')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 43.5 && !e.closest('dialog:not([open])'); })
      .map((e) => `${e.tagName}.${e.className} ${Math.round(e.getBoundingClientRect().height)}px`));
    ok(kecil.length === 0, `target sentuh ≥ 44px: ${nama}`, kecil.join(' | '));
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `tanpa gulir samping: ${nama}`);
  };

  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL('**/pemain');

  // Foto LKS buatan: latar putih, kotak merah di area 10–60% × 20–70% (letak usulan AI tiruan).
  const foto = Buffer.from(await p.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 1000; c.height = 1400;
    const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 1000, 1400);
    g.fillStyle = '#d02020'; g.fillRect(100, 280, 500, 700);
    return c.toDataURL('image/png').split(',')[1];
  }), 'base64');

  // ---------- Editor: baca foto → usulan potongan ----------
  await p.goto(BASE + '/admin');
  await p.getByLabel('PIN admin', { exact: true }).fill('1234');
  await p.getByRole('button', { name: 'Masuk' }).click();
  await p.locator('.tab', { hasText: 'Soal pilihan' }).click();
  await p.getByRole('button', { name: '+ Tambah soal pilihan' }).click();
  await p.locator('.foto-soal input[type=file]').setInputFiles([{ name: 'lks.png', mimeType: 'image/png', buffer: foto }]);
  await p.getByRole('heading', { name: 'Cek dulu sebelum simpan' }).waitFor();
  await p.locator('.potong').waitFor();
  ok((await p.locator('.potong').count()) === 1 && (await p.locator('.pv-q').nth(1).locator('.potong').count()) === 1, 'usulan potongan langsung tampil di soal yang butuh gambar');
  const kotak = p.locator('.potong-kotak');
  const gaya = () => kotak.evaluate((e) => ({ l: parseFloat(e.style.left), t: parseFloat(e.style.top), w: parseFloat(e.style.width), h: parseFloat(e.style.height) }));
  let k = await gaya();
  ok(Math.abs(k.l - 10) < 0.01 && Math.abs(k.t - 20) < 0.01 && Math.abs(k.w - 50) < 0.01 && Math.abs(k.h - 50) < 0.01, 'kotak usulan AI: 10–60% × 20–70%', JSON.stringify(k));
  ok((await p.locator('.potong-foto').count()) === 0, 'satu foto: tanpa pilihan foto');
  await audit('editor dengan potongan terbuka');
  await p.screenshot({ path: `${out}/gambar-potong.png`, fullPage: true });

  // Seret kotak (geser). Area foto digulir ke layar dulu supaya bisa disentuh.
  await p.locator('.potong-area').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  const area = await p.locator('.potong-area').boundingBox();
  let kb = await kotak.boundingBox();
  await p.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2);
  await p.mouse.down();
  await p.mouse.move(kb.x + kb.width / 2 + area.width * 0.1, kb.y + kb.height / 2 + area.height * 0.05, { steps: 5 });
  await p.mouse.up();
  k = await gaya();
  ok(Math.abs(k.l - 20) < 0.6 && Math.abs(k.t - 25) < 0.6 && Math.abs(k.w - 50) < 0.01, 'seret di dalam kotak: kotak bergeser, ukuran tetap', JSON.stringify(k));
  // Seret melewati tepi: tetap di dalam foto
  kb = await kotak.boundingBox();
  await p.mouse.move(kb.x + kb.width / 2, kb.y + kb.height / 2);
  await p.mouse.down();
  await p.mouse.move(kb.x + kb.width / 2 + area.width, kb.y + kb.height / 2, { steps: 4 });
  await p.mouse.up();
  k = await gaya();
  ok(Math.abs(k.l + k.w - 100) < 0.01, 'kotak tidak bisa keluar dari foto', JSON.stringify(k));
  // Tarik sudut kiri-atas (ubah ukuran)
  const sudut = await p.locator('.potong-sudut.kiri-atas').boundingBox();
  await p.mouse.move(sudut.x + sudut.width / 2, sudut.y + sudut.height / 2);
  await p.mouse.down();
  await p.mouse.move(area.x + area.width * 0.1, area.y + area.height * 0.2, { steps: 5 });
  await p.mouse.up();
  k = await gaya();
  ok(Math.abs(k.l - 10) < 0.6 && Math.abs(k.t - 20) < 0.6 && Math.abs(k.l + k.w - 100) < 0.01, 'tarik sudut: ukuran berubah, sudut seberang tetap', JSON.stringify(k));
  // Keyboard
  await kotak.focus();
  for (let i = 0; i < 20; i++) await p.keyboard.press('Shift+ArrowLeft');
  k = await gaya();
  ok(Math.abs(k.l - 10) < 0.6 && Math.abs(k.l + k.w - 60) < 0.6, 'Shift+panah: ubah ukuran dari sudut kanan bawah', JSON.stringify(k));
  await p.keyboard.press('ArrowDown');
  const k2 = await gaya();
  ok(Math.abs(k2.t - k.t - 2) < 0.01, 'panah: geser 2%');
  await p.keyboard.press('ArrowUp');
  // Sekarang kotak ≈ 10–60% × 20–75%: hampir sama dengan area merah
  await p.getByRole('button', { name: 'Pakai gambar ini' }).click();
  await p.locator('.gambar-editor .gambar-btn img').waitFor();
  ok((await p.locator('.potong').count()) === 0 && await p.getByRole('button', { name: 'Hapus gambar' }).isVisible() && await p.getByRole('button', { name: 'Potong ulang' }).isVisible(), 'pakai gambar: pratinjau + Potong ulang + Hapus gambar');
  ok((await p.locator('.pv-q').nth(1).getAttribute('class')) === 'pv-q warn' && (await p.getByText('Soal ini butuh gambar. Potong gambarnya').count()) === 0, 'peringatan "butuh gambar" hilang (tanda kunci AI tetap)');
  const isi = await p.locator('.gambar-editor .gambar-btn img').evaluate(async (img) => {
    await img.decode();
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const atas = g.getImageData(Math.floor(c.width / 2), Math.floor(c.height * 0.3), 1, 1).data;
    return { w: img.naturalWidth, h: img.naturalHeight, merah: atas[0] > 180 && atas[1] < 80, panjang: img.src.length };
  });
  ok(isi.merah && isi.h > isi.w && Math.max(isi.w, isi.h) <= 900 && isi.panjang < 250_000, 'potongan berisi area merah, sisi ≤ 900 px, kecil', JSON.stringify(isi));
  // Soal lain: tambah gambar dari foto yang sama
  await p.locator('.pv-q').nth(0).getByRole('button', { name: '+ Tambah gambar dari foto' }).click();
  await p.locator('.pv-q').nth(0).locator('.potong').waitFor();
  await p.getByRole('button', { name: 'Simpan soal pilihan' }).click();
  ok(await p.locator('.form-msg').innerText() === 'Gambar soal nomor 1 belum selesai dipotong. Tekan "Pakai gambar ini" atau "Batal".', 'simpan saat potongan masih terbuka: diingatkan');
  await p.locator('.pv-q').nth(0).getByRole('button', { name: 'Batal' }).click();
  await p.getByRole('button', { name: 'Simpan soal pilihan' }).click();
  await p.locator('.set-card').first().waitFor();
  const paket = (await (await fetch(BASE + '/api/admin/soal-pilihan', { headers: { authorization: 'Bearer ' + T, 'x-admin-sesi': sesi } })).json()).paket[0];
  const gid = paket.questions[1].gambarId;
  ok(gid && !paket.questions[0].gambarId && !paket.questions[2].gambarId, 'tersimpan: hanya soal 2 punya gambar', JSON.stringify(paket.questions.map((x) => x.gambarId ?? null)));
  const semua = (await (await fetch(`${FS}/families/${idp.localId}/gambarSoal`, { headers: { authorization: 'Bearer owner' } })).json()).documents ?? [];
  ok(semua.length === 1 && semua[0].fields.data.stringValue.length < 250_000, 'di server hanya 1 potongan kecil (foto utuh tidak disimpan)', semua.length);

  // ---------- Ubah paket lama: gambar tersimpan, foto baru untuk soal lain ----------
  await p.locator('.set-card').first().getByRole('button', { name: 'Ubah' }).click();
  await p.locator('.gambar-editor .gambar-btn img').waitFor();
  ok((await p.getByRole('button', { name: 'Potong ulang' }).count()) === 0 && await p.getByRole('button', { name: 'Hapus gambar' }).isVisible(), 'paket lama: gambar dimuat dari server, tanpa Potong ulang (foto sudah tidak ada)');
  await p.locator('.pv-q').nth(0).locator('input[type=file]').setInputFiles([{ name: 'lain.png', mimeType: 'image/png', buffer: foto }]);
  await p.locator('.pv-q').nth(0).locator('.potong').waitFor();
  k = await gaya();
  ok(Math.abs(k.l - 15) < 0.01 && Math.abs(k.w - 70) < 0.01, 'foto baru tanpa usulan AI: kotak di tengah', JSON.stringify(k));
  await p.locator('.pv-q').nth(0).getByRole('button', { name: 'Batal' }).click();
  await p.getByRole('button', { name: 'Batal' }).last().click();

  // ---------- Anak: gambar di atas soal, ketuk untuk memperbesar ----------
  await p.goto(`${BASE}/main/${raka.id}`);
  await p.getByRole('heading', { name: 'Raka', exact: true }).waitFor();
  await p.locator('.hist, #riwayat-judul + p').first().waitFor();
  await p.locator('.seg label', { hasText: '★ Soal pilihan' }).click();
  await p.getByRole('button', { name: 'Kerjakan' }).click();
  await p.locator('.qtext').waitFor();
  ok((await p.locator('.gambar-soal').count()) === 0, 'soal 1 tanpa gambar');
  await p.locator('.opts .opt').first().click();
  await p.locator('.fb .btn').click();
  await p.locator('.gambar-btn img').waitFor();
  const urutan = await p.evaluate(() => { const g = document.querySelector('.gambar-soal'); const t = document.querySelector('.qtext'); return Boolean(g.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING); });
  ok(urutan, 'soal 2: gambar tampil di atas teks soal');
  await audit('soal bergambar (antariksa)');
  await p.screenshot({ path: `${out}/gambar-anak.png`, fullPage: true });
  await p.getByRole('button', { name: 'Gambar untuk soal 2. Ketuk untuk memperbesar' }).click();
  ok(await p.locator('dialog.gambar-dialog[open]').isVisible(), 'ketuk: gambar diperbesar');
  const besar = await p.locator('dialog.gambar-dialog img').boundingBox();
  ok(besar.height > 400, 'gambar besar memenuhi layar', String(Math.round(besar.height)));
  await audit('gambar diperbesar');
  await p.screenshot({ path: `${out}/gambar-besar.png` });
  await p.getByRole('button', { name: 'Tutup' }).click();
  ok(!(await p.locator('dialog.gambar-dialog[open]').count()), 'Tutup: kembali ke soal');
  await p.getByRole('button', { name: 'Gambar untuk soal 2. Ketuk untuk memperbesar' }).click();
  await p.keyboard.press('Escape');
  ok(!(await p.locator('dialog.gambar-dialog[open]').count()), 'Escape menutup gambar besar');

  ok(galatKonsol.length === 0, 'tanpa error di konsol', galatKonsol.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})();
