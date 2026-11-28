// Uji perbaikan baca foto halaman padat: AI hanya menulis soal terstruktur (teks disusun kode), effort rendah,
// jatah token & waktu besar, balasan terpotong → "terlalu_panjang" dan jatah dikembalikan.
import fs from 'node:fs';
const APP = 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080/v1/projects/markas-latihan/databases/(default)/documents';
const LOG = process.argv[2];
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + JSON.stringify(x) : ''}`); if (!c) fail++; };
const user = async (email) => {
  const j = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'rahasia123', returnSecureToken: true }) })).json();
  return { token: j.idToken, uid: j.localId };
};
const post = (path, token, body, sesi) => fetch(APP + path, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(sesi ? { 'x-admin-sesi': sesi } : {}) } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const terakhir = () => { const b = fs.readFileSync(LOG, 'utf8').trim().split('\n'); return JSON.parse(b[b.length - 1]).body; };
const hari = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const rapikanHariIni = async (uid) => Number((await (await fetch(`${FS}/families/${uid}/pemakaian/${hari}`, { headers: { authorization: 'Bearer owner' } })).json()).fields?.rapikan?.integerValue ?? 0);

const A = await user(`p18${Date.now()}@contoh.id`);
const sesi = (await post('/api/admin/pin', A.token, { pin: '1234' })).body.token;
const foto = (n) => ({ media_type: 'image/jpeg', data: Buffer.alloc(n, 3).toString('base64') });

let r = await post('/api/admin/baca-foto', A.token, { kelas: 7, mapel: 'Pendidikan Pancasila', gambar: [foto(3000)] }, sesi);
const b = terakhir();
const isi = b.messages[0].content.find((x) => x.type === 'text').text;
ok(r.status === 200 && r.body.soal.length === 3, 'baca foto berhasil', r.status);
ok(b.output_config.effort === 'medium' && b.max_tokens === 32000, 'baca foto: effort medium (AI mengerjakan soal), 32000 token', [b.output_config.effort, b.max_tokens]);
ok(!('teks' in b.output_config.format.schema.properties) && !isi.includes('Tulis ulang di "teks"') && isi.includes('JANGAN langsung dipakai sebagai kunci') && isi.includes('"tandaFoto"') && 'tandaFoto' in b.output_config.format.schema.properties.soal.items.properties, 'AI tidak menulis salinan kedua; menentukan kunci sendiri dan mencatat tanda di foto');
ok(JSON.stringify(r.body.tanda) === '[0,2,null]', 'tanda di foto dikirim ke editor (sejajar soal)', r.body.tanda);
ok(r.body.soal[0].keyGuessed === false && r.body.soal[1].keyGuessed === true && r.body.soal[2].keyGuessed === true, 'tanda = jawaban AI → tidak perlu dicek; beda/tidak ada tanda → mohon dicek', r.body.soal.map((q) => q.keyGuessed));
ok(r.body.teks.startsWith('1. Hasil dari 1/2 + 1/4 adalah...\nA. 3/4\nB. 2/6\nC. 1/6\nD. 2/4\nKunci: A\n\n2. Perhatikan gambar.'), 'teks kolom Soal disusun dari soal terstruktur', r.body.teks.slice(0, 120));
ok(!r.body.teks.split('\n\n')[1].includes('Kunci:') && !r.body.teks.split('\n\n')[2].includes('Kunci:'), 'kunci yang perlu dicek tidak ditulis di teks (tetap ditandai saat dirapikan)');

const sebelum = await rapikanHariIni(A.uid);
r = await post('/api/admin/baca-foto', A.token, { kelas: 7, mapel: 'Pendidikan Pancasila', gambar: [{ media_type: 'image/jpeg', data: 'A'.repeat(1500) }] }, sesi);
ok(r.status === 502 && r.body.error === 'terlalu_panjang', 'balasan terpotong (halaman terlalu padat): terlalu_panjang', r.body);
ok((await rapikanHariIni(A.uid)) === sebelum, 'jatah dikembalikan saat gagal');

r = await post('/api/admin/baca-foto', A.token, { kelas: 7, mapel: 'Pendidikan Pancasila', gambar: [{ media_type: 'image/jpeg', data: 'A'.repeat(1600) }] }, sesi);
ok(r.status === 500 && r.body.error === 'gangguan' && r.body.message === 'AI 400 invalid_request_error: Could not process image', 'galat lain dari AI: kode penyebab ikut dikirim', r.body);
ok((await rapikanHariIni(A.uid)) === sebelum, 'jatah dikembalikan (galat AI lain)');

const nLog = () => fs.readFileSync(LOG, 'utf8').trim().split('\n').length;
let n0 = nLog();
r = await post('/api/admin/baca-foto', A.token, { kelas: 7, mapel: 'Pendidikan Pancasila', gambar: [{ media_type: 'image/jpeg', data: 'A'.repeat(1700) }] }, sesi);
const dua = fs.readFileSync(LOG, 'utf8').trim().split('\n').slice(n0).map((x) => JSON.parse(x));
ok(r.status === 200 && dua.length === 2 && dua[0].body.fallbacks === 'default' && !('fallbacks' in dua[1].body) && !('effort' in dua[1].body.output_config) && dua[1].headers.beta === null, 'ditolak 400 karena pengaturan: dicoba ulang otomatis dengan permintaan dasar, berhasil', [r.status, dua.length]);
n0 = nLog();
r = await post('/api/admin/baca-foto', A.token, { kelas: 7, mapel: 'Pendidikan Pancasila', gambar: [{ media_type: 'image/jpeg', data: 'A'.repeat(1600) }] }, sesi);
ok(r.status === 500 && nLog() - n0 === 2, 'tetap ditolak: hanya satu kali coba ulang, lalu kode penyebab');

// Browser HP kadang menghasilkan PNG walau diminta JPEG: label dibetulkan dari isi gambar sebelum dikirim ke Claude.
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(400, 7)]).toString('base64');
r = await post('/api/admin/baca-foto', A.token, { kelas: 7, mapel: 'Pendidikan Pancasila', gambar: [{ media_type: 'image/jpeg', data: png }] }, sesi);
const blok = terakhir().messages[0].content.find((x) => x.type === 'image');
ok(r.status === 200 && blok.media_type === 'image/png', 'PNG berlabel JPEG: dikirim ke Claude sebagai image/png', blok.media_type);

// Batas pengeluaran bulanan Claude Console tercapai: kode khusus, tanpa coba ulang, jatah anak dikembalikan.
const raka = (await post('/api/pemain', A.token, { name: 'Raka', kelas: 5, theme: 'blok' })).body.player;
n0 = nLog();
r = await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'batasapi', level: 'mudah', n: 5 });
ok(r.status === 503 && r.body.error === 'batas_api' && r.body.message === '2026-12-01' && nLog() - n0 === 1, 'batas pemakaian API: kode batas_api + tanggal buka, tanpa coba ulang', r.body);
const pk = await (await fetch(`${FS}/families/${A.uid}/pemakaian/${hari}`, { headers: { authorization: 'Bearer owner' } })).json();
ok(Number(pk.fields?.perPemain?.mapValue?.fields?.[raka.id]?.integerValue ?? 0) === 0, 'jatah anak dikembalikan');

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
