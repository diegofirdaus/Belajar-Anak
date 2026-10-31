// Uji API pemain terhadap Firebase Emulator.
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake';
const APP = 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080/v1/projects/markas-latihan/databases/(default)/documents';
let fail = 0;
const ok = (cond, name, extra = '') => { console.log(`${cond ? 'LULUS' : 'GAGAL'}  ${name}${extra ? '  ' + extra : ''}`); if (!cond) fail++; };

async function user(email) {
  const r = await fetch(AUTH, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'rahasia123', returnSecureToken: true }) });
  const j = await r.json();
  return { token: j.idToken, uid: j.localId };
}
const call = (path, token, init = {}) => fetch(APP + path, { ...init, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) } })
  .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const post = (token, body) => call('/api/pemain', token, { method: 'POST', body: JSON.stringify(body) });

const stamp = Date.now();
const A = await user(`a${stamp}@contoh.id`);
const B = await user(`b${stamp}@contoh.id`);

let r = await call('/api/pemain');
ok(r.status === 401 && r.body.error === 'sesi_habis', 'tanpa login ditolak', r.status);
r = await call('/api/pemain', 'token-palsu');
ok(r.status === 401, 'token palsu ditolak', r.status);

r = await call('/api/pemain', A.token);
ok(r.status === 200 && r.body.players.length === 0, 'akun baru: daftar kosong');

r = await post(A.token, { name: '   ', kelas: 5, theme: 'blok' });
ok(r.status === 400 && r.body.message === 'Tulis dulu nama panggilanmu, ya.', 'nama kosong ditolak dengan pesan brief', r.body?.message);
r = await post(A.token, { name: 'x'.repeat(21), kelas: 5, theme: 'blok' });
ok(r.status === 400, 'nama 21 karakter ditolak');
r = await post(A.token, { name: 'Raka', kelas: 13, theme: 'blok' });
ok(r.status === 400, 'kelas 13 ditolak');
r = await post(A.token, { name: 'Raka', kelas: 5, theme: 'minecraft' });
ok(r.status === 400, 'dunia tak dikenal ditolak');
r = await post(A.token, { name: 'Raka', kelas: 5, theme: 'blok', email: 'anak@x.id', sekolah: 'SD 1' });

const raka = r.body?.player;
ok(r.status === 201 && raka?.name === 'Raka' && raka.kelas === 5, 'buat pemain Raka', r.status);
ok(raka && !('email' in raka) && !('sekolah' in raka), 'kolom tambahan (email, sekolah) tidak tersimpan');
ok(raka?.rewards?.dino?.done?.length === 0 && raka?.rewards?.blok?.kayu === 0, 'hadiah awal kosong untuk 4 dunia');
const nowAy = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
ok(raka?.academicYear === nowAy, 'tahun ajaran tercatat', raka?.academicYear);

r = await post(A.token, { name: '  Nadia   Putri ', kelas: 8, theme: 'pahlawan' });
ok(r.body?.player?.name === 'Nadia Putri', 'spasi nama dirapikan', JSON.stringify(r.body?.player?.name));

r = await call('/api/pemain', A.token);
ok(r.body.players.map((p) => p.name).join(',') === 'Raka,Nadia Putri', 'urut dari yang dibuat paling awal');

r = await call(`/api/pemain/${raka.id}`, A.token);
ok(r.status === 200 && r.body.player.id === raka.id, 'ambil satu pemain');

// Isolasi antar-keluarga
r = await call('/api/pemain', B.token);
ok(r.body.players.length === 0, 'keluarga lain tidak melihat pemain A');
r = await call(`/api/pemain/${raka.id}`, B.token);
ok(r.status === 404, 'keluarga lain tidak bisa membuka pemain A', r.status);

// Batas 10 pemain
for (let i = 3; i <= 10; i++) await post(A.token, { name: `Anak ${i}`, kelas: 1, theme: 'dino' });
r = await post(A.token, { name: 'Anak 11', kelas: 1, theme: 'dino' });
ok(r.status === 429 && r.body.message === 'Maksimal 10 pemain per keluarga.', 'pemain ke-11 ditolak', r.status);

// Security Rules: akses langsung dari browser ke Firestore ditolak
const direct = await fetch(`${FS}/families/${A.uid}/players`, { headers: { authorization: `Bearer ${A.token}` } });
ok(direct.status === 403, 'baca Firestore langsung (pemilik sendiri) ditolak rules', direct.status);
const directW = await fetch(`${FS}/families/${A.uid}/players?documentId=hack`, { method: 'POST', headers: { authorization: `Bearer ${A.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ fields: { name: { stringValue: 'x' } } }) });
ok(directW.status === 403, 'tulis Firestore langsung ditolak rules', directW.status);

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
