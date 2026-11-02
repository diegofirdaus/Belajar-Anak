// Uji gambar soal dari foto (STATUS "BERIKUTNYA" no. 3): usulan kotak dari baca foto, simpan potongan,
// klaim & bersihkan gambar per paket, gambar di sesi anak, akses hanya keluarga sendiri.
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
const call = (path, token, init = {}, sesi) => fetch(APP + path, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(sesi ? { 'x-admin-sesi': sesi } : {}) } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const post = (path, token, body, sesi) => call(path, token, { method: 'POST', body: JSON.stringify(body ?? {}) }, sesi);
const daftar = async (path) => (await (await fetch(`${FS}/${path}?pageSize=300`, { headers: { authorization: 'Bearer owner' } })).json()).documents ?? [];
const ambil = async (path) => (await fetch(`${FS}/${path}`, { headers: { authorization: 'Bearer owner' } })).json();
const permintaanTerakhir = () => { const b = fs.readFileSync(LOG, 'utf8').trim().split('\n'); return JSON.parse(b[b.length - 1]); };
const s = Date.now();
const jpeg = (n = 2000) => Buffer.alloc(n, 7).toString('base64');

const A = await user(`p14${s}@contoh.id`);
const B = await user(`p14b${s}@contoh.id`);
const sesi = (await post('/api/admin/pin', A.token, { pin: '1234' })).body.token;
const sesiB = (await post('/api/admin/pin', B.token, { pin: '1234' })).body.token;
const raka = (await post('/api/pemain', A.token, { name: 'Raka', kelas: 5, theme: 'blok' })).body.player;

/* ---------- Baca foto: usulan kotak ---------- */
let r = await post('/api/admin/baca-foto', A.token, { kelas: 5, mapel: 'Matematika', gambar: [{ media_type: 'image/jpeg', data: jpeg() }, { media_type: 'image/jpeg', data: jpeg() }] }, sesi);
ok(r.status === 200 && Array.isArray(r.body.kotak) && r.body.kotak.length === r.body.soal.length, 'baca foto: kotak sejajar dengan soal', r.body?.kotak);
ok(r.body.kotak[0] === null && r.body.kotak[2] === null, 'soal tanpa gambar: kotak null');
ok(JSON.stringify(r.body.kotak[1]) === JSON.stringify({ foto: 1, x1: 0.1, y1: 0.2, x2: 0.6, y2: 0.7 }), 'soal bergambar: kotak foto ke-2, pecahan 0–1', r.body.kotak[1]);
ok(!('gambar' in r.body.soal[1]) && !('kotak' in r.body.soal[1]), 'kotak tidak ikut di data soal (tidak disimpan)');
const pr = permintaanTerakhir().body;
ok(pr.messages[0].content.at(-1).text.includes('"gambar" dengan letak gambar itu di foto') && pr.output_config.format.schema.properties.soal.items.required.includes('gambar'), 'prompt & skema meminta letak gambar');

/* ---------- Simpan potongan ---------- */
ok((await post('/api/admin/gambar', A.token, { data: jpeg() })).status === 403, 'simpan gambar butuh sesi admin');
r = await post('/api/admin/gambar', A.token, { data: 'bukan base64!!' + 'x'.repeat(200) }, sesi);
ok(r.status === 400, 'data bukan base64 ditolak');
r = await post('/api/admin/gambar', A.token, { data: 'A'.repeat(400_004) }, sesi);
ok(r.status === 400 && r.body.message === 'Gambar terlalu besar.', 'gambar > ±300 KB ditolak', r.body);
const g1 = (await post('/api/admin/gambar', A.token, { data: jpeg(3000) }, sesi)).body.id;
const g2 = (await post('/api/admin/gambar', A.token, { data: jpeg(4000) }, sesi)).body.id;
ok(typeof g1 === 'string' && g1 !== g2, 'potongan tersimpan, dapat id');
let doc = await ambil(`families/${A.uid}/gambarSoal/${g1}`);
ok(doc.fields.setId.nullValue === null && doc.fields.data.stringValue === jpeg(3000), 'dokumen gambar: data + belum milik paket');

/* ---------- Klaim saat paket disimpan ---------- */
const q = (teks, o = {}) => ({ q: teks, options: ['3', '4', '5'], answer: 1, explain: '', keyGuessed: false, optionsAdded: false, ...o });
r = await post('/api/admin/soal-pilihan', A.token, { title: 'Bangun datar', kelas: 5, subject: 'Matematika', sourceText: '', acakPilihan: false, questions: [q('Berapa segitiga?', { gambarId: 'TidakAda1234567' })] }, sesi);
ok(r.status === 400 && r.body.message.startsWith('Ada gambar soal yang tidak ditemukan'), 'gambar yang tidak ada ditolak', r.body);
r = await post('/api/admin/soal-pilihan', A.token, { title: 'Bangun datar', kelas: 5, subject: 'Matematika', sourceText: '', acakPilihan: false, questions: [q('Berapa segitiga?', { gambarId: g1, perluGambar: true }), q('Berapa sisi?', { gambarId: g2 }), q('Tanpa gambar')] }, sesi);
const paket = r.body.paket;
ok(r.status === 201 && paket.questions[0].gambarId === g1 && !('gambarId' in paket.questions[2]), 'paket dengan gambar tersimpan');
doc = await ambil(`families/${A.uid}/gambarSoal/${g1}`);
ok(doc.fields.setId.stringValue === paket.id, 'gambar ditandai milik paket');
r = await post('/api/admin/soal-pilihan', A.token, { title: 'Lain', kelas: 5, subject: 'Matematika', sourceText: '', questions: [q('Curi?', { gambarId: g1 })] }, sesi);
ok(r.status === 400 && r.body.message === 'Ada gambar soal milik paket lain.', 'gambar milik paket lain ditolak', r.body);
r = await post('/api/admin/soal-pilihan', B.token, { title: 'B', kelas: 5, subject: 'Matematika', sourceText: '', questions: [q('Keluarga lain?', { gambarId: g2 })] }, sesiB);
ok(r.status === 400, 'keluarga lain tidak bisa memakai gambar ini');

/* ---------- Anak: sesi & ambil gambar ---------- */
r = await post('/api/soal/pilihan', A.token, { pemainId: raka.id, setId: paket.id });
ok(r.status === 201 && r.body.soal[0].gambarId === g1 && r.body.soal[1].gambarId === g2 && !('gambarId' in r.body.soal[2]), 'soal sesi membawa gambarId');
r = await call(`/api/gambar/${g1}`, A.token);
ok(r.status === 200 && r.body.data === jpeg(3000) && r.body.media_type === 'image/jpeg', 'anak/orang tua bisa mengambil gambar');
ok((await call(`/api/gambar/${g1}`, B.token)).status === 404, 'keluarga lain tidak bisa mengambil gambar');
ok((await fetch(`${APP}/api/gambar/${g1}`)).status === 401, 'tanpa login ditolak');
ok((await call('/api/gambar/..%2Frahasia', A.token)).status === 404, 'id aneh ditolak');

/* ---------- Bersihkan ---------- */
r = await call(`/api/admin/soal-pilihan/${paket.id}`, A.token, { method: 'PUT', body: JSON.stringify({ title: 'Bangun datar', kelas: 5, subject: 'Matematika', sourceText: '', questions: [q('Berapa segitiga?', { gambarId: g1 }), q('Berapa sisi?')] }) }, sesi);
ok(r.status === 200, 'paket diubah: gambar soal 2 dilepas');
ok((await ambil(`families/${A.uid}/gambarSoal/${g2}`)).error?.code === 404 && !(await ambil(`families/${A.uid}/gambarSoal/${g1}`)).error, 'gambar yang tidak dipakai lagi dihapus, yang dipakai tetap');
// Gambar yatim (diunggah tapi paket tidak disimpan) dihapus setelah sehari
const yatimLama = (await post('/api/admin/gambar', A.token, { data: jpeg() }, sesi)).body.id;
const yatimBaru = (await post('/api/admin/gambar', A.token, { data: jpeg() }, sesi)).body.id;
await fetch(`${FS}/families/${A.uid}/gambarSoal/${yatimLama}?updateMask.fieldPaths=dibuat`, { method: 'PATCH', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' }, body: JSON.stringify({ fields: { dibuat: { timestampValue: new Date(Date.now() - 2 * 86400e3).toISOString() } } }) });
await call(`/api/admin/soal-pilihan/${paket.id}`, A.token, { method: 'PUT', body: JSON.stringify({ title: 'Bangun datar', kelas: 5, subject: 'Matematika', sourceText: '', questions: [q('Berapa segitiga?', { gambarId: g1 })] }) }, sesi);
ok((await ambil(`families/${A.uid}/gambarSoal/${yatimLama}`)).error?.code === 404 && !(await ambil(`families/${A.uid}/gambarSoal/${yatimBaru}`)).error, 'gambar yatim > 1 hari dihapus, yang baru diunggah tetap');
await call(`/api/admin/soal-pilihan/${paket.id}`, A.token, { method: 'DELETE' }, sesi);
ok((await ambil(`families/${A.uid}/gambarSoal/${g1}`)).error?.code === 404, 'paket dihapus: gambarnya ikut terhapus');
const sisa = (await daftar(`families/${A.uid}/gambarSoal`)).map((d) => d.name.split('/').pop());
ok(sisa.join() === yatimBaru, 'sisa gambar keluarga hanya yang baru diunggah', sisa);
ok(!(await daftar(`families/${A.uid}/gambarSoal`)).some((d) => JSON.stringify(d.fields).length > 600_000), 'tidak ada foto utuh tersimpan');

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
