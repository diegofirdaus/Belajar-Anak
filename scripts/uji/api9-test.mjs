// Uji tahap 9: soal pilihan di sisi anak (daftar per kelas, kerjakan, soal mirip AI).
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
const hari = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const jatah = async (uid, pid) => { const d = await (await fetch(`${FS}/families/${uid}/pemakaian/${hari}`, { headers: { authorization: 'Bearer owner' } })).json(); return Number(d.fields?.perPemain?.mapValue?.fields?.[pid]?.integerValue ?? 0); };
const permintaanTerakhir = () => { const b = fs.readFileSync(LOG, 'utf8').trim().split('\n'); return JSON.parse(b[b.length - 1]); };
const q = (i, o = {}) => ({ q: `Soal pilihan ${i}?`, options: ['Semua benar', `Kunci ${i}`, 'Salah'], answer: 1, explain: `Karena kunci ${i}.`, keyGuessed: false, optionsAdded: false, ...o });
const s = Date.now();

const A = await user(`p9${s}@contoh.id`);
const B = await user(`p9b${s}@contoh.id`);
const sesi = (await post('/api/admin/pin', A.token, { pin: '1234' })).body.token;
const buat = async (title, kelas, subject, questions) => (await post('/api/admin/soal-pilihan', A.token, { title, kelas, subject, sourceText: '', questions }, sesi)).body.paket;
const mtk5 = await buat('UTS Pecahan', 5, 'Matematika', [q(1), q(2)]);
const ipas5 = await buat('', 5, 'IPAS', Array.from({ length: 13 }, (_, i) => q(i + 1)));
const mtk7 = await buat('Bilangan Bulat', 7, 'Matematika', [q(1)]);
const raka = (await post('/api/pemain', A.token, { name: 'Raka', kelas: 5, theme: 'blok' })).body.player;
const nadia = (await post('/api/pemain', A.token, { name: 'Nadia', kelas: 7, theme: 'pahlawan' })).body.player;

/* ---------- Daftar per kelas ---------- */
let r = await call(`/api/pemain/${raka.id}/ringkasan`, A.token);
ok(r.status === 200 && r.body.paketPilihan.map((p) => p.title).join('|') === 'IPAS Kelas 5 SD|UTS Pecahan', 'kelas 5: hanya paket kelas 5, urut mapel', r.body.paketPilihan?.map((p) => p.title));
ok(r.body.paketPilihan.every((p) => Object.keys(p).sort().join() === 'id,n,subject,title'), 'anak hanya menerima judul, mapel, jumlah soal (tanpa soal & kunci)');
ok(r.body.paketPilihan.find((p) => p.id === mtk5.id).n === 2, 'jumlah soal paket');
r = await call(`/api/pemain/${nadia.id}/ringkasan`, A.token);
ok(r.body.paketPilihan.length === 1 && r.body.paketPilihan[0].id === mtk7.id, 'kelas 7: hanya paket kelas 7');

/* ---------- Kerjakan ---------- */
r = await post('/api/soal/pilihan', A.token, { pemainId: raka.id, setId: mtk5.id });
ok(r.status === 201 && r.body.sumber === 'set' && r.body.level === 'pilihan' && r.body.topik === 'UTS Pecahan' && r.body.mapel === 'Matematika' && r.body.setId === mtk5.id, 'kerjakan: sesi soal pilihan', r.body && { ...r.body, soal: undefined });
ok(r.body.soal.length === 2 && r.body.soal[0].options.join('|') === 'Semua benar|Kunci 1|Salah', 'urutan pilihan dari orang tua dipertahankan (3 pilihan)');
ok(r.body.soal.every((x) => Object.keys(x).sort().join() === 'options,q'), 'kunci tidak dikirim ke browser');
const sesiSet = r.body;
let j = await post(`/api/sesi/${sesiSet.sesiId}/jawab`, A.token, { pemainId: raka.id, nomor: 0, pilihan: 1 });
ok(j.body.benar && j.body.hadiah?.material === 'batu' && j.body.explain === 'Karena kunci 1.', 'soal pilihan dihitung setara sedang (+1 batu)', j.body.hadiah);
ok((await post(`/api/sesi/${sesiSet.sesiId}/jawab`, A.token, { pemainId: raka.id, nomor: 1, pilihan: 3 })).status === 400, 'pilihan D pada soal 3 pilihan ditolak');
j = await post(`/api/sesi/${sesiSet.sesiId}/jawab`, A.token, { pemainId: raka.id, nomor: 1, pilihan: 2 });
ok(j.body.akhir?.benar === 1 && j.body.akhir.n === 2, 'sesi soal pilihan selesai 1/2');
const at = await daftar(`families/${A.uid}/players/${raka.id}/attempts`);
ok(at.length === 1 && at[0].fields.source.stringValue === 'set' && at[0].fields.level.stringValue === 'pilihan' && at[0].fields.setId.stringValue === mtk5.id, 'riwayat mencatat setId & sumber set');
ok((await daftar(`families/${A.uid}/players/${raka.id}/topikStat`)).length === 0, 'soal pilihan tidak masuk statistik topik');
ok((await jatah(A.uid, raka.id)) === 0, 'kerjakan tidak memakai jatah AI');

r = await post('/api/soal/pilihan', A.token, { pemainId: raka.id, setId: mtk7.id });
ok(r.status === 404 && r.body.message === 'Soal pilihan itu bukan untuk kelasmu.', 'paket kelas lain ditolak', r.body);
ok((await post('/api/soal/pilihan', B.token, { pemainId: raka.id, setId: mtk5.id })).status === 404, 'keluarga lain ditolak');
ok((await post('/api/soal/pilihan', A.token, { pemainId: raka.id, setId: 'tidakada' })).body.message === 'Soal pilihan itu tidak ditemukan. Mungkin sudah dihapus orang tua.', 'paket tidak ada: pesan ramah');

/* ---------- Buat soal mirip ---------- */
r = await post('/api/soal/mirip', A.token, { pemainId: raka.id, setId: mtk5.id });
ok(r.status === 201 && r.body.sumber === 'set_similar' && r.body.level === 'pilihan' && r.body.setId === mtk5.id && r.body.topik === 'UTS Pecahan', 'soal mirip: sesi set_similar', r.status);
ok(r.body.soal.length === 5 && r.body.soal.every((x) => x.options.length === 4 && Object.keys(x).sort().join() === 'options,q'), 'paket 2 soal → 5 soal mirip, 4 pilihan, tanpa kunci');
let pr = permintaanTerakhir();
let teks = pr.body.messages[0].content;
ok(teks.includes('Orang tua sudah menyiapkan contoh soal Matematika berjudul "UTS Pecahan"') && teks.includes('Buat 5 soal pilihan ganda BARU'), 'prompt 10.2: mapel, judul, jumlah');
ok(teks.includes('<<<\n1. Soal pilihan 1?\nA. Semua benar\nB. Kunci 1\nC. Salah\nKunci: B') && teks.includes('Jangan menyalin soal contoh'), 'prompt: contoh dengan huruf & kunci di dalam pembatas');
ok(pr.body.model === 'claude-sonnet-5-5' && pr.body.fallbacks === 'default', 'soal mirip memakai model soal + fallback');
ok((await jatah(A.uid, raka.id)) === 1, 'soal mirip memakai jatah anak');
const posisi = new Set();
const sm = await daftar(`families/${A.uid}/players/${raka.id}/sesi`);
sm.filter((d) => d.fields.sumber.stringValue === 'set_similar').forEach((d) => d.fields.soal.arrayValue.values.forEach((v) => posisi.add(v.mapValue.fields.answer.integerValue)));
ok(posisi.size >= 2, 'pilihan soal mirip diacak', [...posisi]);

r = await post('/api/soal/mirip', A.token, { pemainId: raka.id, setId: ipas5.id });
pr = permintaanTerakhir(); teks = pr.body.messages[0].content;
ok(r.body.soal.length === 10 && teks.includes('Buat 10 soal'), 'paket 13 soal → maksimal 10 soal mirip');
ok(teks.includes('12. Soal pilihan 12?') && !teks.includes('13. Soal pilihan 13?'), 'contoh maksimal 12 soal');
ok(!teks.includes('mata pelajaran IPAS berjudul') && teks.includes('contoh soal IPAS berjudul "IPAS Kelas 5 SD"'), 'judul bawaan dipakai di prompt');
const sebelum = await jatah(A.uid, raka.id);
await call(`/api/admin/soal-pilihan/${mtk5.id}`, A.token, { method: 'DELETE' }, sesi);
r = await post('/api/soal/mirip', A.token, { pemainId: raka.id, setId: mtk5.id });
ok(r.status === 404 && (await jatah(A.uid, raka.id)) === sebelum, 'paket dihapus: soal mirip ditolak tanpa memakai jatah');
r = await call(`/api/pemain/${raka.id}/ringkasan`, A.token);
ok(r.body.paketPilihan.length === 1, 'paket yang dihapus hilang dari daftar anak');

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
