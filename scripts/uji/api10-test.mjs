// Uji ekspor & hapus semua data keluarga (brief 11). Butuh emulator, mock Claude, `next start -p 3100`.
// Mode "login-lama": jalankan server dengan ADMIN_LOGIN_ULANG_DETIK=1.
const APP = 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080/v1/projects/markas-latihan/databases/(default)/documents';
const MODE = process.argv[2] ?? 'utama';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + JSON.stringify(x) : ''}`); if (!c) fail++; };
const user = async (email) => {
  const j = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'rahasia123', returnSecureToken: true }) })).json();
  return { token: j.idToken, uid: j.localId, email };
};
const call = (path, token, init = {}, sesi) => fetch(APP + path, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(sesi ? { 'x-admin-sesi': sesi } : {}) } }).then(async (r) => ({ status: r.status, headers: r.headers, body: await r.json().catch(() => null) }));
const post = (path, token, body, sesi) => call(path, token, { method: 'POST', body: JSON.stringify(body ?? {}) }, sesi);
const ada = async (path) => (await fetch(`${FS}/${path}`, { headers: { authorization: 'Bearer owner' } })).status === 200;
const daftar = async (path) => (await (await fetch(`${FS}/${path}?pageSize=300`, { headers: { authorization: 'Bearer owner' } })).json()).documents ?? [];
const s = Date.now();

async function siapkan(u) {
  const sesi = (await post('/api/admin/pin', u.token, { pin: '1234' })).body.token;
  await post('/api/admin/soal-pilihan', u.token, { title: 'Paket', kelas: 5, subject: 'Matematika', sourceText: 'x', questions: [{ q: 'a?', options: ['1', '2'], answer: 0, explain: '', keyGuessed: false, optionsAdded: false }] }, sesi);
  const p = (await post('/api/pemain', u.token, { name: 'Raka', kelas: 5, theme: 'blok' })).body.player;
  const c = (await post('/api/soal/contoh', u.token, { pemainId: p.id })).body;
  const kunciSD = [1, 1, 2, 2, 1];
  for (let i = 0; i < 5; i++) await post(`/api/sesi/${c.sesiId}/jawab`, u.token, { pemainId: p.id, nomor: i, pilihan: kunciSD[i] });
  return { sesi, p };
}

if (MODE === 'login-lama') {
  const A = await user(`ll${s}@contoh.id`);
  const { sesi } = await siapkan(A);
  await new Promise((r) => setTimeout(r, 2500));
  ok((await post('/api/keluarga/ekspor', A.token, {}, sesi)).body.error === 'login_ulang', 'ekspor ditolak kalau login orang tua sudah lama');
  ok((await post('/api/keluarga/hapus', A.token, { konfirmasi: 'HAPUS' }, sesi)).body.error === 'login_ulang', 'hapus ditolak kalau login orang tua sudah lama');
  ok(await ada(`families/${A.uid}`), 'data tetap ada');
} else {
  const A = await user(`ek${s}@contoh.id`);
  const B = await user(`ek2${s}@contoh.id`);
  const { sesi, p } = await siapkan(A);
  const b = await siapkan(B);

  ok((await post('/api/keluarga/ekspor', A.token)).status === 403, 'ekspor tanpa sesi admin ditolak');
  ok((await post('/api/keluarga/ekspor', A.token, {}, b.sesi)).status === 403, 'ekspor dengan sesi admin keluarga lain ditolak');
  let r = await post('/api/keluarga/ekspor', A.token, {}, sesi);
  ok(r.status === 200 && /attachment; filename="markas-latihan-data-\d{4}-\d{2}-\d{2}\.json"/.test(r.headers.get('content-disposition')), 'ekspor: file JSON untuk diunduh');
  const k = r.body.keluarga;
  ok(r.body.akun.email === A.email && k.id === A.uid, 'ekspor: akun & id keluarga');
  ok(!('adminPinHash' in k.data) && !('adminSesi' in (k.koleksi ?? {})), 'hash PIN dan token sesi admin tidak ikut diekspor', Object.keys(k.koleksi ?? {}));
  const pm = k.koleksi.players.find((x) => x.id === p.id);
  ok(pm && pm.data.name === 'Raka' && pm.data.rewards.blok.kayu === 5 && typeof pm.data.createdAt === 'string', 'ekspor: pemain, hadiah, waktu ISO');
  ok(pm.koleksi.attempts.length === 1 && pm.koleksi.attempts[0].data.answers.length === 5 && pm.koleksi.sesi.length === 1, 'ekspor: riwayat & sesi beserta jawaban anak');
  ok(k.koleksi.soalPilihan.length === 1 && k.koleksi.pemakaian === undefined, 'ekspor: soal pilihan ikut (tanpa AI belum ada pemakaian)', Object.keys(k.koleksi));
  ok(!JSON.stringify(r.body).includes(B.uid), 'ekspor tidak memuat data keluarga lain');

  ok((await post('/api/keluarga/hapus', A.token, {}, sesi)).status === 400, 'hapus tanpa ketikan HAPUS ditolak');
  ok((await post('/api/keluarga/hapus', A.token, { konfirmasi: 'hapus' }, sesi)).status === 400, 'ketikan harus persis HAPUS (dirapikan di browser)');
  ok((await post('/api/keluarga/hapus', A.token, { konfirmasi: 'HAPUS' })).status === 403, 'hapus tanpa sesi admin ditolak');
  r = await post('/api/keluarga/hapus', A.token, { konfirmasi: 'HAPUS' }, sesi);
  ok(r.status === 200, 'hapus semua data keluarga');
  ok(!(await ada(`families/${A.uid}`)) && (await daftar(`families/${A.uid}/players`)).length === 0 && (await daftar(`families/${A.uid}/players/${p.id}/attempts`)).length === 0 && (await daftar(`families/${A.uid}/soalPilihan`)).length === 0, 'dokumen keluarga dan semua subkoleksi terhapus');
  const login = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: A.email, password: 'rahasia123', returnSecureToken: true }) })).json();
  ok(login.error?.message === 'EMAIL_NOT_FOUND', 'akun login Markas Latihan ikut dihapus', login.error?.message);
  ok(await ada(`families/${B.uid}`) && (await daftar(`families/${B.uid}/players`)).length === 1 && (await daftar(`families/${B.uid}/soalPilihan`)).length === 1, 'keluarga lain tidak tersentuh');
}
console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
