// Uji tampilan upload PDF & Word (.docx) di editor soal pilihan. Layar 390px.
// .docx dibuat di sini (ZIP + XML, penomoran otomatis Word) supaya pembaca di browser teruji sungguhan.
// Butuh Firebase Emulator, server Claude tiruan, dan build emulator di port 3100.
const { chromium } = require('playwright');
const fs = require('node:fs');
const zlib = require('node:zlib');
const out = process.argv[2] || '.';
const LOG = process.argv[3];
const BASE = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };
const semuaPermintaan = () => fs.readFileSync(LOG, 'utf8').trim().split('\n').map((b) => JSON.parse(b).body);

/* ---------- Pembuat .docx kecil (ZIP: satu entri disimpan apa adanya, sisanya deflate) ---------- */
function crc32(buf) {
  let c = ~0;
  for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); }
  return ~c >>> 0;
}
function zip(files) {
  const lokal = []; const pusat = []; let offset = 0;
  for (const [nama, isi, simpan] of files) {
    const data = Buffer.from(isi, 'utf8'); const namaBuf = Buffer.from(nama);
    const komp = simpan ? data : zlib.deflateRawSync(data); const metode = simpan ? 0 : 8; const crc = crc32(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(metode, 8); h.writeUInt32LE(crc, 14); h.writeUInt32LE(komp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(namaBuf.length, 26);
    lokal.push(h, namaBuf, komp);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(metode, 10); c.writeUInt32LE(crc, 16); c.writeUInt32LE(komp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(namaBuf.length, 28); c.writeUInt32LE(offset, 42);
    pusat.push(c, namaBuf);
    offset += 30 + namaBuf.length + komp.length;
  }
  const pusatBuf = Buffer.concat(pusat);
  const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(pusatBuf.length, 12); e.writeUInt32LE(offset, 16);
  return Buffer.concat([...lokal, pusatBuf, e]);
}
const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"';
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const para = (t, lvl) => `<w:p>${lvl === undefined ? '' : `<w:pPr><w:numPr><w:ilvl w:val="${lvl}"/><w:numId w:val="1"/></w:numPr></w:pPr>`}<w:r><w:t xml:space="preserve">${esc(t)}</w:t></w:r></w:p>`;
const docx = (paras) => zip([
  ['[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>', true],
  ['word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${NS}><w:body>${paras}</w:body></w:document>`],
  ['word/numbering.xml', `<?xml version="1.0" encoding="UTF-8"?><w:numbering ${NS}><w:abstractNum w:abstractNumId="7"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="upperLetter"/><w:lvlText w:val="%2."/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="7"/></w:num></w:numbering>`],
]);
// Soal bernomor otomatis (1., A., B.), kunci biasa, dan kotak teks dengan salinan cadangan (harus tidak dobel).
const wordSoal = docx([
  para('Hasil dari 3/4 + 1/4 adalah...', 0), para('1/2', 1), para('1', 1), para('4/8', 1), para('2', 1), para('Kunci: B'),
  para('Ibu punya 12 kue, dibagi rata ke 4 anak. Tiap anak dapat berapa kue?', 0), para('2', 1), para('3', 1), para('Kunci: B'),
  `<w:p><w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:t>Nama:</w:t></mc:Choice><mc:Fallback><w:p><w:r><w:t>SALINAN-CADANGAN</w:t></w:r></w:p></mc:Fallback></mc:AlternateContent></w:r></w:p>`,
].join(''));

/** PDF satu halaman 600×800 pt yang sah (xref benar) dengan isi gambar `isi` (operator PDF). */
function buatPdf(isi) {
  const obj = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Contents 4 0 R /Resources << >> >>',
    `<< /Length ${Buffer.byteLength(isi)} >>\nstream\n${isi}\nendstream`,
  ];
  let out = '%PDF-1.4\n';
  const posisi = [];
  obj.forEach((o, i) => { posisi.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n` + posisi.map((x) => `${String(x).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

(async () => {
  const email = `dokui${Date.now()}@contoh.id`;
  const idp = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  await fetch(BASE + '/api/admin/pin', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + idp.idToken }, body: JSON.stringify({ pin: '1234' }) });
  await fetch(BASE + '/api/pemain', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + idp.idToken }, body: JSON.stringify({ name: 'Raka', kelas: 5, theme: 'blok' }) });

  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const galatKonsol = [];
  p.on('pageerror', (e) => galatKonsol.push(String(e)));
  await p.goto(BASE + '/mulai');
  await p.getByRole('button', { name: 'Masuk dengan Google' }).waitFor();
  await p.evaluate((e) => window.__masukUji(e), email);
  await p.waitForURL('**/pemain');
  await p.goto(BASE + '/admin');
  await p.getByLabel('PIN admin', { exact: true }).fill('1234');
  await p.getByRole('button', { name: 'Masuk' }).click();
  await p.locator('.tab', { hasText: 'Soal pilihan' }).click();
  const baru = async () => { await p.getByRole('button', { name: '+ Tambah soal pilihan' }).click(); await p.getByRole('heading', { name: 'Tambah soal pilihan' }).waitFor(); };
  const input = () => p.locator('.foto-soal input[type=file]');
  const batal = async () => { await p.getByRole('button', { name: 'Batal' }).last().click(); await p.getByRole('button', { name: '+ Tambah soal pilihan' }).waitFor(); };
  await baru();

  const accept = await input().getAttribute('accept');
  ok(accept.includes('image/*') && accept.includes('application/pdf') && accept.includes('.docx'), 'input menerima foto, PDF, dan Word', accept);
  ok(await p.getByText('Bisa foto (maksimal 5 sekali unggah), satu PDF (maksimal ±3 MB), atau satu file Word (.docx).', { exact: false }).isVisible(), 'keterangan format yang bisa diunggah');

  // ---------- Word (.docx) ----------
  let n = semuaPermintaan().length;
  await input().setInputFiles([{ name: 'ulangan.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: wordSoal }]);
  await p.getByRole('heading', { name: 'Cek dulu sebelum simpan' }).waitFor();
  const teks = await p.getByLabel('Soal', { exact: true }).inputValue();
  ok(teks.startsWith('1. Hasil dari 3/4 + 1/4 adalah...\nA. 1/2\nB. 1\nC. 4/8\nD. 2\nKunci: B\n2. Ibu punya 12 kue'), 'teks Word masuk ke kolom Soal, penomoran otomatis ditulis ulang (1., A., B. …)', JSON.stringify(teks.slice(0, 120)));
  ok(teks.includes('\n2. Ibu punya 12 kue') && teks.includes('\nA. 2\nB. 3\nKunci: B') && teks.includes('Nama:') && !teks.includes('SALINAN-CADANGAN'), 'nomor berlanjut, pilihan mulai lagi dari A, kotak teks tidak dobel');
  const rq = semuaPermintaan().slice(n);
  ok(rq.length === 1 && rq[0].messages[0].content.includes('Berikut teks soal yang diketik orang tua') && rq[0].messages[0].content.includes('A. 1/2'), 'langsung dirapikan AI (file Word tidak dikirim, hanya teksnya)');
  ok(!JSON.stringify(rq).includes('word/document.xml'), 'isi file Word mentah tidak dikirim');
  await p.screenshot({ path: `${out}/dok-word.png`, fullPage: true });
  await batal();

  // ---------- .doc lama ----------
  await baru();
  n = semuaPermintaan().length;
  await input().setInputFiles([{ name: 'lama.doc', mimeType: 'application/msword', buffer: Buffer.from('xx') }]);
  ok(await p.locator('.form-msg').innerText() === 'File Word lama (.doc) belum bisa dibaca. Simpan ulang sebagai .docx atau PDF di Word, lalu unggah lagi.' && semuaPermintaan().length === n, '.doc lama: pesan simpan ulang, tanpa AI');
  // Word rusak
  await input().setInputFiles([{ name: 'rusak.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('bukan zip sama sekali') }]);
  ok(await p.locator('.form-msg').innerText() === 'File Word tidak bisa dibuka. Pastikan formatnya .docx.', 'file Word rusak: pesan jelas');

  // ---------- PDF ----------
  const pdf = Buffer.from(`%PDF-1.4\n% soal\n${'x'.repeat(300)}\n%%EOF`);
  n = semuaPermintaan().length;
  await input().setInputFiles([{ name: 'lks.pdf', mimeType: 'application/pdf', buffer: pdf }, { name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('x') }]);
  await p.getByRole('heading', { name: 'Cek dulu sebelum simpan' }).waitFor();
  await p.locator('.toast', { hasText: 'soal terbaca dari PDF' }).waitFor();
  const kirim = semuaPermintaan().slice(n);
  ok(kirim.length === 1 && kirim[0].messages[0].content[0].type === 'document' && kirim[0].messages[0].content[0].panjang === pdf.toString('base64').length, 'PDF dikirim utuh sebagai dokumen (satu permintaan)');
  ok((await p.locator('.pv-q').count()) === 2 && (await p.getByLabel('Soal', { exact: true }).inputValue()).startsWith('1. Ibu kota Jepang'), 'soal & teks dari PDF tampil');
  const pesan = await p.locator('.form-msg').innerText();
  ok(pesan.includes('Satu file dibaca sekali unggah; 1 file lainnya tidak dibaca.') && pesan.includes('Ada soal yang butuh gambar'), 'PDF + foto sekaligus: hanya PDF dibaca, ada pemberitahuan; catatan soal bergambar', pesan);
  const k2 = p.locator('.pv-q').nth(1);
  ok((await k2.locator('.potong').count()) === 0 && await k2.getByText('Soal ini butuh gambar.', { exact: false }).isVisible() && (await k2.locator('input[type=file]').count()) === 1, 'soal bergambar dari PDF: tanpa usulan potongan, bisa tambah gambar dari foto');
  await p.screenshot({ path: `${out}/dok-pdf.png`, fullPage: true });
  // ---------- PDF sungguhan dengan gambar: halaman digambar di HP, usulan potongan langsung terbuka ----------
  await batal();
  await baru();
  const pdfAsli = buatPdf('1 0 0 rg 60 400 240 320 re f');
  await input().setInputFiles([{ name: 'lks-gambar.pdf', mimeType: 'application/pdf', buffer: pdfAsli }]);
  await p.locator('.toast', { hasText: 'soal terbaca dari PDF' }).waitFor();
  const kg = p.locator('.pv-q').nth(1);
  await kg.locator('.potong').waitFor({ timeout: 15000 });
  ok((await p.locator('.form-msg').count()) === 0 || !(await p.locator('.form-msg').innerText()).includes('butuh gambar'), 'PDF valid: tanpa catatan "tambahkan gambar sendiri"');
  const isiPotong = await kg.locator('.potong img').evaluate((img) => new Promise((ok) => { const go = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(Math.floor(c.width * 0.3), Math.floor(c.height * 0.3), 1, 1).data; ok({ w: img.naturalWidth, h: img.naturalHeight, merah: d[0] > 180 && d[1] < 80 }); }; if (img.complete) go(); else img.onload = go; }));
  ok(isiPotong.merah && isiPotong.h > isiPotong.w && Math.max(isiPotong.w, isiPotong.h) === 1568, 'halaman PDF digambar di HP (1568 px), gambar merah di area usulan', JSON.stringify(isiPotong));
  await kg.getByRole('button', { name: 'Pakai gambar ini' }).click();
  await kg.locator('.gambar-editor').waitFor();
  ok(await kg.getByRole('button', { name: 'Potong ulang' }).isVisible(), 'potongan dari PDF terpasang di soal');
  await p.screenshot({ path: `${out}/dok-pdf-gambar.png`, fullPage: true });

  // PDF terlalu besar: ditolak di HP tanpa dikirim
  n = semuaPermintaan().length;
  await input().setInputFiles([{ name: 'besar.pdf', mimeType: 'application/pdf', buffer: Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(3_200_000, 65)]) }]);
  await p.locator('.form-msg', { hasText: 'PDF terlalu besar' }).waitFor();
  ok(semuaPermintaan().length === n, 'PDF > ±3 MB: pesan, tidak dikirim');
  await input().setInputFiles([{ name: 'palsu.pdf', mimeType: 'application/pdf', buffer: Buffer.from('ini bukan pdf'.repeat(20)) }]);
  ok(await p.locator('.form-msg').innerText() === 'File itu bukan PDF yang bisa dibaca.', 'file .pdf palsu: pesan');
  await batal();

  // ---------- Tanpa AI: hanya Word, dibaca dari format nomor ----------
  await baru();
  await p.getByLabel('Soal', { exact: true }).fill('1. kuncisalah 2 + 2 = ...\nA. 4\nB. 5\nKunci: A');
  await p.getByRole('button', { name: 'Rapikan soal' }).click();
  await p.getByRole('heading', { name: 'Cek dulu sebelum simpan' }).waitFor();
  ok(await p.locator('.foto-btn').innerText() === 'Upload file Word (.docx)' && !(await input().getAttribute('accept')).includes('image') && (await input().getAttribute('multiple')) === null, 'tanpa AI: tombol jadi "Upload file Word (.docx)"');
  await p.getByLabel('Soal', { exact: true }).fill('');
  n = semuaPermintaan().length;
  await input().setInputFiles([{ name: 'ulangan.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: wordSoal }]);
  await p.locator('.pv-q').nth(1).waitFor();
  ok((await p.locator('.pv-q').count()) === 2 && semuaPermintaan().length === n, 'tanpa AI: soal Word dibaca dari format nomor, tanpa memanggil AI');
  ok(await p.locator('.pv-q').nth(0).locator('.pv-opt[aria-pressed="true"]').innerText().then((t) => t.startsWith('B.')), 'kunci dari baris "Kunci: B"');
  await p.screenshot({ path: `${out}/dok-word-tanpa-ai.png`, fullPage: true });

  ok(galatKonsol.length === 0, 'tanpa error di konsol', galatKonsol.join(' | '));
  await b.close();
  console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
  process.exit(fail ? 1 : 0);
})();
