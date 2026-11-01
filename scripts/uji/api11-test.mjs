// Uji dashboard progres orang tua: GET /api/admin/progres dan detail latihan. Butuh emulator, mock, next start.
const APP = 'http://localhost:3100';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + JSON.stringify(x) : ''}`); if (!c) fail++; };
const user = async (email) => {
  const j = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'rahasia123', returnSecureToken: true }) })).json();
  return { token: j.idToken, uid: j.localId };
};
const call = (path, token, init = {}, sesi) => fetch(APP + path, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(sesi ? { 'x-admin-sesi': sesi } : {}) } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const post = (path, token, body, sesi) => call(path, token, { method: 'POST', body: JSON.stringify(body ?? {}) }, sesi);
const kunci = (q) => q.options.findIndex((o) => o.startsWith('Benar'));
const s = Date.now();

const A = await user(`pg${s}@contoh.id`);
const B = await user(`pg2${s}@contoh.id`);
const sesi = (await post('/api/admin/pin', A.token, { pin: '1234' })).body.token;
const sesiB = (await post('/api/admin/pin', B.token, { pin: '1234' })).body.token;
const raka = (await post('/api/pemain', A.token, { name: 'Raka', kelas: 5, theme: 'blok' })).body.player;
const nadia = (await post('/api/pemain', A.token, { name: 'Nadia', kelas: 8, theme: 'dino' })).body.player;
const main = async (p, mapel, topik, level, benar) => {
  const x = (await post('/api/soal', A.token, { pemainId: p.id, mapel, topik, level, n: 5 })).body;
  for (let i = 0; i < 5; i++) await post(`/api/sesi/${x.sesiId}/jawab`, A.token, { pemainId: p.id, nomor: i, pilihan: i < benar ? kunci(x.soal[i]) : (kunci(x.soal[i]) + 1) % 4 });
  return x;
};
await main(raka, 'Matematika', 'pecahan', 'mudah', 5);
const terakhir = await main(raka, 'IPAS', 'cahaya', 'mudah', 2);
// Sesi ditinggal di tengah: memakai jatah AI tapi tidak masuk riwayat
await post('/api/soal', A.token, { pemainId: raka.id, mapel: 'Matematika', topik: 'desimal', level: 'mudah', n: 5 });

ok((await call('/api/admin/progres', A.token)).status === 403, 'tanpa sesi admin ditolak');
ok((await call('/api/admin/progres', A.token, {}, sesiB)).status === 403, 'sesi admin keluarga lain ditolak');
const r = await call('/api/admin/progres', A.token, {}, sesi);
ok(r.status === 200 && r.body.pemain.map((p) => p.name).join() === 'Raka,Nadia', 'semua anak, urut dibuat', r.body?.pemain?.map((p) => p.name));
const pr = r.body.pemain[0];
ok(pr.riwayat.length === 2 && pr.riwayat[0].topik === 'cahaya' && pr.riwayat[0].benar === 2 && pr.riwayat[1].benar === 5, 'riwayat terbaru dulu');
ok(pr.riwayat.every((x) => !('answers' in x)), 'daftar riwayat tanpa isi soal (ringan)');
ok(pr.topik.length === 2 && pr.rewards.blok.kayu === 7, 'statistik topik & hadiah', pr.rewards.blok);
ok(pr.aiHariIni === 3 && r.body.pemain[1].aiHariIni === 0, 'pemakaian AI hari ini per anak', pr.aiHariIni);
ok(r.body.ai.keluargaHariIni === 3 && r.body.ai.batasPemain === 50 && r.body.ai.batasKeluarga === 100, 'pemakaian & batas AI keluarga', r.body.ai);
ok(r.body.pemain[1].riwayat.length === 0 && r.body.riwayatMaks === 2000, 'anak tanpa latihan; batas riwayat');

const d = await call(`/api/admin/progres/${raka.id}/${terakhir.sesiId}`, A.token, {}, sesi);
ok(d.status === 200 && d.body.soal.length === 5, 'detail latihan: 5 soal');
ok(d.body.soal.filter((x) => x.pilihan === x.answer).length === 2 && d.body.soal.every((x) => x.options.length === 4 && typeof x.q === 'string'), 'detail: jawaban anak & kunci per soal');
ok((await call(`/api/admin/progres/${raka.id}/${terakhir.sesiId}`, A.token)).status === 403, 'detail tanpa sesi admin ditolak');
ok((await call(`/api/admin/progres/${raka.id}/${terakhir.sesiId}`, B.token, {}, sesiB)).status === 404, 'detail dari keluarga lain: tidak ditemukan');
ok((await call(`/api/admin/progres/${raka.id}/tidakada`, A.token, {}, sesi)).status === 404, 'latihan tidak ada: 404');

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
