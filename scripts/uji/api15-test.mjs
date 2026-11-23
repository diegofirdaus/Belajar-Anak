// Uji baca PDF soal (POST /api/admin/baca-foto dengan `pdf`): validasi, isi permintaan ke Claude, usulan kotak gambar per halaman.
// Butuh Firebase Emulator, server Claude tiruan, dan `next start -p 3100` (lihat docs/STATUS.md).
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
const permintaanTerakhir = () => { const b = fs.readFileSync(LOG, 'utf8').trim().split('\n'); return JSON.parse(b[b.length - 1]); };
const jumlahLog = () => fs.readFileSync(LOG, 'utf8').trim().split('\n').length;
const hari = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const pdf = (isi = 'soal') => Buffer.from(`%PDF-1.4\n% ${isi}\n${'x'.repeat(300)}\n%%EOF`).toString('base64');

const A = await user(`p15${Date.now()}@contoh.id`);
const sesi = (await post('/api/admin/pin', A.token, { pin: '1234' })).body.token;
const dasar = { kelas: 5, mapel: 'IPAS' };

/* ---------- Validasi ---------- */
let n = jumlahLog();
ok((await post('/api/admin/baca-foto', A.token, { ...dasar, pdf: { data: pdf() } })).status === 403, 'tanpa sesi admin ditolak');
let r = await post('/api/admin/baca-foto', A.token, { ...dasar, pdf: { data: Buffer.from('bukan pdf'.repeat(40)).toString('base64') } }, sesi);
ok(r.status === 400 && r.body.message === 'File itu bukan PDF.', 'file bukan PDF ditolak', r.body);
r = await post('/api/admin/baca-foto', A.token, { ...dasar, pdf: { data: 'JVBERi' + 'A'.repeat(4_200_000) } }, sesi);
ok(r.status === 400 || r.status === 413, 'PDF > ±3 MB ditolak', r.status);
r = await post('/api/admin/baca-foto', A.token, { ...dasar, pdf: { data: pdf() }, gambar: [{ media_type: 'image/jpeg', data: Buffer.alloc(200, 1).toString('base64') }] }, sesi);
ok(r.status === 400, 'foto dan PDF sekaligus ditolak');
r = await post('/api/admin/baca-foto', A.token, { ...dasar }, sesi);
ok(r.status === 400 && r.body.message === 'Pilih foto soalnya dulu, ya.', 'tanpa foto & PDF ditolak', r.body);
ok(jumlahLog() === n, 'permintaan tidak valid tidak memanggil AI');

/* ---------- Baca PDF ---------- */
r = await post('/api/admin/baca-foto', A.token, { ...dasar, pdf: { data: pdf() } }, sesi);
ok(r.status === 200 && r.body.soal.length === 2 && r.body.teks.startsWith('1. Ibu kota Jepang adalah...'), 'PDF terbaca: teks + 2 soal', r.status);
ok(r.body.soal[1].perluGambar === true && r.body.kotak[0] === null && r.body.kotak[1]?.foto === 0 && r.body.kotak[1].x1 === 0.1, 'PDF: tanda butuh gambar + usulan kotak per halaman (halaman 1 → indeks 0)', r.body.kotak);
const pr = permintaanTerakhir().body;
const isi = pr.messages[0].content;
ok(isi.length === 2 && isi[0].type === 'document' && isi[0].media_type === 'application/pdf' && isi[0].panjang === pdf().length && isi[1].type === 'text', 'dikirim sebagai dokumen PDF, sebelum teks perintah', isi.map((x) => x.type));
ok(isi[1].text.startsWith('Dokumen PDF di atas berisi soal untuk anak kelas 5 SD, mata pelajaran IPAS') && isi[1].text.includes('"foto" = nomor halaman PDF') && !isi[1].text.includes('difoto') && isi[1].text.includes('baca semua soal di dokumen'), 'prompt khusus PDF');
ok(pr.model === 'claude-sonnet-5-5' && pr.fallbacks === 'default' && pr.output_config.format.type === 'json_schema', 'model baca foto + structured outputs');
const log = (await (await fetch(`${FS}/families/${A.uid}/logAi`, { headers: { authorization: 'Bearer owner' } })).json()).documents ?? [];
ok(log.some((d) => d.fields.jenis.stringValue === 'baca_pdf' && d.fields.hasil.stringValue === 'ok') && !JSON.stringify(log).includes(pdf()), 'dicatat sebagai baca_pdf, isi PDF tidak disimpan');
const pakai = await (await fetch(`${FS}/families/${A.uid}/pemakaian/${hari}`, { headers: { authorization: 'Bearer owner' } })).json();
ok(Number(pakai.fields.rapikan.integerValue) === 1, 'memakai jatah rapikan keluarga (1)');

/* ---------- Foto tetap seperti dulu ---------- */
r = await post('/api/admin/baca-foto', A.token, { ...dasar, gambar: [{ media_type: 'image/jpeg', data: Buffer.alloc(2000, 7).toString('base64') }] }, sesi);
ok(r.status === 200 && permintaanTerakhir().body.messages[0].content.at(-1).text.includes('difoto orang tua'), 'baca foto tetap memakai prompt foto');

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
