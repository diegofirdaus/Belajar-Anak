// Uji baca foto soal (mode admin): validasi, model & isi permintaan ke Claude, jatah, foto tidak disimpan.
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
const post = (path, token, body, sesi) => fetch(APP + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(sesi ? { 'x-admin-sesi': sesi } : {}) }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const daftar = async (path) => (await (await fetch(`${FS}/${path}?pageSize=300`, { headers: { authorization: 'Bearer owner' } })).json()).documents ?? [];
const hari = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const jatah = async (uid) => { const d = await (await fetch(`${FS}/families/${uid}/pemakaian/${hari}`, { headers: { authorization: 'Bearer owner' } })).json(); return Number(d.fields?.rapikan?.integerValue ?? 0); };
const terakhir = () => { const b = fs.readFileSync(LOG, 'utf8').trim().split('\n'); return JSON.parse(b[b.length - 1]); };
const foto = (panjang = 2000) => ({ media_type: 'image/jpeg', data: Buffer.alloc(Math.ceil((panjang * 3) / 4), 7).toString('base64').slice(0, panjang) });

const A = await user(`foto${Date.now()}@contoh.id`);
const sesi = (await post('/api/admin/pin', A.token, { pin: '1234' })).body.token;
const baca = (gambar, extra = {}, s = sesi) => post('/api/admin/baca-foto', A.token, { kelas: 5, mapel: 'Matematika', gambar, ...extra }, s);

ok((await baca([foto()], {}, null)).status === 403, 'tanpa sesi admin ditolak');
let r = await baca([]);
ok(r.status === 400 && r.body.message === 'Pilih foto soalnya dulu, ya.', 'tanpa foto ditolak', r.body);
r = await baca(Array.from({ length: 6 }, () => foto()));
ok(r.status === 400 && r.body.message === 'Maksimal 5 foto sekali unggah.', 'lebih dari 5 foto ditolak', r.body);
ok((await baca([{ media_type: 'image/gif', data: foto().data }])).status === 400, 'jenis file selain JPEG/PNG/WebP ditolak');
ok((await baca([{ media_type: 'image/jpeg', data: 'bukan base64!!'.repeat(20) }])).status === 400, 'isi bukan base64 ditolak');
ok((await baca([foto(1_600_004)])).status === 400, 'satu foto terlalu besar ditolak');
r = await baca([foto(1_500_000), foto(1_500_000), foto(1_500_000)]);
ok(r.status === 400 && r.body.message === 'Foto terlalu besar. Coba kirim lebih sedikit foto sekaligus.', 'total foto terlalu besar ditolak', r.body?.message);
ok((await baca([foto()], { mapel: 'Fisika' })).status === 400, 'mapel tidak sesuai jenjang ditolak');
ok((await jatah(A.uid)) === 0, 'permintaan tidak valid tidak memakai jatah');

r = await baca([foto(), foto()]);
ok(r.status === 200 && r.body.soal.length === 3 && r.body.teks.startsWith('1. Hasil dari 1/2 + 1/4'), 'dua foto terbaca: teks + 3 soal', r.status);
ok(r.body.soal[1].perluGambar === true && r.body.soal[1].keyGuessed === true && r.body.soal[0].perluGambar === false, 'tanda soal butuh gambar & kunci tebakan ikut');
ok(r.body.soal[0].options.join('|') === '3/4|2/6|1/6|2/4' && r.body.soal[2].options.length === 2, 'urutan pilihan tidak diacak; 2 pilihan boleh');
const q = terakhir().body;
const isi = q.messages[0].content;
ok(q.model === 'claude-sonnet-5-5' && q.fallbacks === 'default', 'model Sonnet 5.5 + fallback', q.model);
ok(isi.length === 3 && isi[0].type === 'image' && isi[0].media_type === 'image/jpeg' && isi[1].type === 'image' && isi[2].type === 'text', 'foto dikirim sebelum teks perintah');
ok(isi[2].text.startsWith('2 foto di atas berisi soal untuk anak kelas 5 SD, mata pelajaran Matematika') && isi[2].text.includes('Jangan menyalin identitas siswa') && isi[2].text.includes('"perluGambar": true'), 'prompt: kelas, mapel, identitas, soal bergambar');
ok(q.output_config?.format?.type === 'json_schema', 'structured outputs');
ok((await jatah(A.uid)) === 1, 'memakai jatah rapikan keluarga');
const log = await daftar(`families/${A.uid}/logAi`);
ok(log.length === 1 && log[0].fields.jenis.stringValue === 'baca_foto' && Object.keys(log[0].fields).sort().join() === 'hasil,jenis,model,pemainId,pemakaian,waktu', 'log biaya tanpa isi foto', Object.keys(log[0]?.fields ?? {}));

r = await baca([foto()], { mapel: 'Lainnya' });
ok(r.status === 502 && r.body.error === 'kurang_lengkap' && (await jatah(A.uid)) === 1, 'foto tanpa soal: kurang_lengkap, jatah dikembalikan', r.body);

r = await post('/api/admin/soal-pilihan', A.token, { title: '', kelas: 5, subject: 'Matematika', sourceText: 'x', questions: [{ ...r.body?.soal?.[0], q: 'Soal dari foto?', options: ['a', 'b'], answer: 0, explain: '', keyGuessed: false, optionsAdded: false, perluGambar: true }] }, sesi);
ok(r.status === 201, 'paket dengan tanda perluGambar bisa disimpan', r.status);
// Tidak ada data foto di mana pun di Firestore keluarga ini
const semua = [];
for (const k of ['logAi', 'pemakaian', 'soalPilihan', 'adminSesi']) semua.push(...(await daftar(`families/${A.uid}/${k}`)));
ok(!JSON.stringify(semua).includes(foto().data.slice(0, 40)), 'foto tidak tersimpan di Firestore');

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
