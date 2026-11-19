// Uji (api16) level sulit yang diperketat dan level olimpiade/tantangan. Butuh emulator, mock-claude (log di argv[2]), next start.
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
const call = (path, token, init = {}) => fetch(APP + path, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const post = (path, token, body) => call(path, token, { method: 'POST', body: JSON.stringify(body ?? {}) });
const terakhir = () => { const b = fs.readFileSync(LOG, 'utf8').trim().split('\n'); return JSON.parse(b[b.length - 1]).body; };
const prompt = (b) => b.messages[0].content;
// Olimpiade = 2 permintaan paralel (gaya lomba + gaya penalaran); urutannya di log tidak pasti.
const duaTerakhir = () => { const b = fs.readFileSync(LOG, 'utf8').trim().split('\n').slice(-2).map((x) => JSON.parse(x).body); return { semua: b, lomba: b.find((x) => prompt(x).includes('Gaya soal: seperti')), nalar: b.find((x) => prompt(x).includes('Gaya soal: penalaran')) }; };
const kunci = (q) => q.options.findIndex((o) => o.startsWith('Benar'));
const hari = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const s = Date.now();

const A = await user(`ol${s}@contoh.id`);
const raka = (await post('/api/pemain', A.token, { name: 'Raka', kelas: 5, theme: 'blok' })).body.player;
const nadia = (await post('/api/pemain', A.token, { name: 'Nadia', kelas: 11, theme: 'pahlawan' })).body.player;

// Level biasa: mudah tetap Sonnet + effort medium, sulit memakai effort high dan kriteria ketat.
let r = await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'pecahan', level: 'mudah', n: 5 });
let b = terakhir();
ok(r.status === 201 && b.model === 'claude-sonnet-5-5' && b.output_config.effort === 'medium' && b.max_tokens === 16000, 'mudah: Sonnet, effort medium', [b.model, b.output_config.effort]);
r = await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'pecahan', level: 'sulit', n: 10 });
b = terakhir();
ok(r.status === 201 && b.model === 'claude-sonnet-5-5' && b.output_config.effort === 'high', 'sulit: effort high', b.output_config.effort);
ok(prompt(b).includes('Kriteria level sulit') && prompt(b).includes('minimal 3 langkah') && !prompt(b).includes('KSN'), 'sulit: kriteria ketat di prompt');

// Olimpiade, mapel resmi, materi kosong = campuran.
r = await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'Matematika', topik: '  ', level: 'olimpiade', n: 10 });
let dua = duaTerakhir();
b = dua.semua[0];
ok(r.status === 201 && r.body.level === 'olimpiade' && r.body.topik === 'Campuran' && r.body.soal.length === 10, 'olimpiade: materi kosong boleh, topik "Campuran", 10 soal', [r.status, r.body?.topik, r.body?.soal?.length]);
ok(dua.lomba && dua.nalar && dua.semua.every((x) => prompt(x).includes('Buat 5 soal')), 'olimpiade: 2 permintaan paralel, 5 gaya lomba + 5 gaya penalaran');
ok(dua.semua.every((b) => b.model === 'claude-opus-5-5' && b.output_config.effort === 'high' && b.max_tokens === 32000), 'olimpiade: Opus, effort high, 32000 token', [b.model, b.max_tokens]);
ok(dua.semua.every((x) => prompt(x).includes('KSN SD') && prompt(x).includes('Materi gabungan')) && prompt(b).includes('Buat 5 soal') && !prompt(b).includes('<<<'), 'olimpiade SD: prompt KSN SD tanpa materi');
const sesiOl = r.body;

// Hadiah: jawaban benar olimpiade = 2 permata di dunia blok.
let j = await post(`/api/sesi/${sesiOl.sesiId}/jawab`, A.token, { pemainId: raka.id, nomor: 0, pilihan: kunci(sesiOl.soal[0]) });
ok(j.status === 200 && j.body.benar && j.body.hadiah?.material === 'permata' && j.body.hadiah?.jumlah === 2 && j.body.rewards.blok.permata === 2, 'olimpiade: +2 permata', j.body?.hadiah);
for (let i = 1; i < 10; i++) j = await post(`/api/sesi/${sesiOl.sesiId}/jawab`, A.token, { pemainId: raka.id, nomor: i, pilihan: (kunci(sesiOl.soal[i]) + 1) % 4 });
ok(j.body.akhir && j.body.rewards.blok.permata === 2, 'olimpiade: sesi selesai');
const ring = (await call(`/api/pemain/${raka.id}/ringkasan`, A.token)).body;
ok(ring.riwayat.some((x) => x.level === 'olimpiade' && x.topik === 'Campuran'), 'olimpiade masuk riwayat');
ok(ring.topik.some((t) => t.topik === 'Campuran' && t.lv.olimpiade?.last === 10), 'olimpiade masuk statistik topik', ring.topik.find((t) => t.topik === 'Campuran'));

// Olimpiade SMA dengan materi; Soal Tantangan untuk mapel tanpa olimpiade resmi.
r = await post('/api/soal', A.token, { pemainId: nadia.id, mapel: 'Fisika', topik: 'gerak parabola', level: 'olimpiade', n: 10 });
b = duaTerakhir().semua[0];
ok(r.status === 201 && prompt(b).includes('OSN SMA') && prompt(b).includes('gerak parabola') && r.body.topik === 'gerak parabola', 'olimpiade SMA Fisika: OSN SMA + materi');
r = await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'Bahasa Indonesia', topik: 'ide pokok', level: 'olimpiade', n: 10 });
b = duaTerakhir().semua[0];
ok(r.status === 201 && !prompt(b).includes('KSN') && prompt(b).includes('tantangan') && b.model === 'claude-opus-5-5', 'Bahasa Indonesia: Soal Tantangan (bukan KSN), tetap Opus');

r = await post('/api/soal', A.token, { pemainId: nadia.id, mapel: 'Bahasa Inggris', topik: '', level: 'olimpiade', n: 10 });
b = duaTerakhir().semua[0];
ok(r.status === 201 && prompt(b).includes('olimpiade Bahasa Inggris tingkat SMA') && prompt(b).includes('ditulis dalam bahasa Inggris') && !prompt(b).includes('KSN'), 'Bahasa Inggris: olimpiade Bahasa Inggris, soal berbahasa Inggris');

// Gaya lomba khusus SD: IPAS (sains, bukan IPS) dan Bahasa Inggris
const raka2 = (await post('/api/pemain', A.token, { name: 'Raka2', kelas: 5, theme: 'dino' })).body.player;
r = await post('/api/soal', A.token, { pemainId: raka2.id, mapel: 'IPAS', topik: '', level: 'olimpiade', n: 10 });
dua = duaTerakhir();
ok(r.status === 201 && prompt(dua.lomba).includes('babak final lomba sains SD') && prompt(dua.lomba).includes('bagian sains IPAS (bukan IPS)') && prompt(dua.nalar).includes('bagian sains IPAS (bukan IPS)'), 'IPAS SD: gaya lomba sains + campuran hanya sains');
r = await post('/api/soal', A.token, { pemainId: raka2.id, mapel: 'Bahasa Inggris', topik: '', level: 'olimpiade', n: 10 });
dua = duaTerakhir();
ok(r.status === 201 && prompt(dua.lomba).includes('babak final olimpiade Bahasa Inggris SD') && prompt(dua.lomba).includes('woke – rode – saw – took') && prompt(dua.nalar).includes('inferensi'), 'Bahasa Inggris SD: gaya lomba (past tense, tabel, bacaan) + penalaran');

// Validasi
r = await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'pecahan', level: 'olimpiade', n: 5 });
ok(r.status === 400 && r.body.error === 'tidak_valid', 'olimpiade 5 soal ditolak (selalu 10)');
r = await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'Matematika', topik: '', level: 'sulit', n: 5 });
ok(r.status === 400 && /Tulis dulu materi/.test(r.body.message), 'level biasa tetap wajib materi', r.body);

// Jatah olimpiade: 5 per anak per hari (Raka sudah 2). Gagal tidak memakan jatah.
r = await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'rusak', level: 'olimpiade', n: 10 });
ok(r.status === 502, 'olimpiade gagal (json rusak)');
const kode = [];
for (let i = 0; i < 4; i++) kode.push((await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'IPAS', topik: 'energi', level: 'olimpiade', n: 10 })).status);
ok(kode.join() === '201,201,201,429', 'jatah olimpiade 5/hari: ke-6 ditolak (yang gagal dikembalikan)', kode);
r = await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'IPAS', topik: 'energi', level: 'olimpiade', n: 10 });
ok(r.body.error === 'jatah_habis' && /level tertinggi/.test(r.body.message), 'pesan jatah olimpiade jelas', r.body.message);
r = await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'IPAS', topik: 'energi', level: 'sulit', n: 5 });
ok(r.status === 201, 'level sulit masih bisa setelah jatah olimpiade habis');
r = await post('/api/soal', A.token, { pemainId: nadia.id, mapel: 'Fisika', topik: 'gaya', level: 'olimpiade', n: 10 });
ok(r.status === 201, 'jatah olimpiade per anak (Nadia tidak terpengaruh)');
const d = await (await fetch(`${FS}/families/${A.uid}/pemakaian/${hari}`, { headers: { authorization: 'Bearer owner' } })).json();
ok(Number(d.fields.olimpiade.mapValue.fields[raka.id].integerValue) === 5, 'penghitung olimpiade tersimpan', d.fields.olimpiade);

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
