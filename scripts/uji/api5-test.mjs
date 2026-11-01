// Uji API ubah & hapus pemain (tahap 5) terhadap Firebase Emulator.
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake';
const APP = 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080/v1/projects/markas-latihan/databases/(default)/documents';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + x : ''}`); if (!c) fail++; };
async function user(email) {
  const j = await (await fetch(AUTH, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'rahasia123', returnSecureToken: true }) })).json();
  return { token: j.idToken, uid: j.localId };
}
const call = (path, token, init = {}) => fetch(APP + path, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` } })
  .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const patch = (t, id, b) => call(`/api/pemain/${id}`, t, { method: 'PATCH', body: JSON.stringify(b) });
// Tulis langsung ke emulator sebagai admin (melewati rules) untuk menyiapkan keadaan uji.
const seed = (uid, pid, fields) => fetch(`${FS}/families/${uid}/players/${pid}?${Object.keys(fields).map((f) => 'updateMask.fieldPaths=' + f).join('&')}`, {
  method: 'PATCH', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });

const s = Date.now();
const A = await user(`a5${s}@contoh.id`);
const B = await user(`b5${s}@contoh.id`);
const ay = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;

const raka = (await call('/api/pemain', A.token, { method: 'POST', body: JSON.stringify({ name: 'Raka', kelas: 6, theme: 'blok' }) })).body.player;
await seed(A.uid, raka.id, {
  academicYear: { integerValue: String(ay - 1) },
  rewards: { mapValue: { fields: {
    blok: { mapValue: { fields: { kayu: { integerValue: '5' }, batu: { integerValue: '2' }, permata: { integerValue: '1' } } } },
    pahlawan: { mapValue: { fields: { xp: { integerValue: '120' }, bosses: { integerValue: '2' } } } },
    antariksa: { mapValue: { fields: { fuel: { integerValue: '50' } } } },
    dino: { mapValue: { fields: { bones: { integerValue: '3' }, done: { arrayValue: { values: [{ stringValue: 'T-Rex' }] } } } } },
  } } },
});

let r = await patch(A.token, raka.id, { kelas: 7 });
ok(r.status === 200 && r.body.player.kelas === 7 && r.body.player.academicYear === ay, 'naik kelas 6 → 7 dan tahun ajaran diperbarui', `${r.body?.player?.kelas}/${r.body?.player?.academicYear}`);

await seed(A.uid, raka.id, { academicYear: { integerValue: String(ay - 1) } });
r = await patch(A.token, raka.id, { konfirmasiTahunAjaran: true });
ok(r.body.player.kelas === 7 && r.body.player.academicYear === ay, '"Belum naik": kelas tetap, tahun ajaran dikonfirmasi');

r = await patch(A.token, raka.id, { theme: 'pahlawan' });
ok(r.body.player.theme === 'pahlawan' && r.body.player.rewards.blok.kayu === 5 && r.body.player.rewards.dino.done[0] === 'T-Rex', 'ganti dunia: hadiah dunia lama tetap tersimpan');

r = await patch(A.token, raka.id, { name: '  Raka   Putra ' });
ok(r.body.player.name === 'Raka Putra', 'ganti nama dirapikan');
r = await patch(A.token, raka.id, { name: '   ' });
ok(r.status === 400 && r.body.message === 'Tulis dulu nama panggilanmu, ya.', 'ganti nama kosong ditolak');
r = await patch(A.token, raka.id, { kelas: 0 });
ok(r.status === 400, 'kelas 0 ditolak');
r = await patch(A.token, raka.id, {});
ok(r.status === 400, 'perubahan kosong ditolak');
r = await patch(A.token, raka.id, { rewards: { blok: { kayu: 9999 } } });
ok(r.status === 400, 'hadiah tidak bisa diubah lewat API profil', r.status);
r = await patch(A.token, raka.id, { theme: 'dino', academicYear: 1999 });
ok(r.status === 400, 'kolom tak dikenal (academicYear) ditolak', r.status);

r = await patch(B.token, raka.id, { name: 'Peretas' });
ok(r.status === 404, 'keluarga lain tidak bisa mengubah', r.status);
r = await call(`/api/pemain/${raka.id}`, B.token, { method: 'DELETE' });
ok(r.status === 404, 'keluarga lain tidak bisa menghapus', r.status);

// Subkoleksi ikut terhapus
await fetch(`${FS}/families/${A.uid}/players/${raka.id}/attempts?documentId=sesi1`, { method: 'POST', headers: { authorization: 'Bearer owner', 'content-type': 'application/json' }, body: JSON.stringify({ fields: { n: { integerValue: '5' } } }) });
r = await call(`/api/pemain/${raka.id}`, A.token, { method: 'DELETE' });
ok(r.status === 200, 'hapus pemain');
r = await call(`/api/pemain/${raka.id}`, A.token);
ok(r.status === 404, 'pemain terhapus tidak bisa dibuka');
const sisa = await fetch(`${FS}/families/${A.uid}/players/${raka.id}/attempts/sesi1`, { headers: { authorization: 'Bearer owner' } });
ok(sisa.status === 404, 'riwayat (subkoleksi) ikut terhapus', sisa.status);

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
