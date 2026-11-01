// Uji tahap 8: PIN admin (hash, batas percobaan, reset), sesi admin, soal pilihan, rapikan.
// Butuh Firebase Emulator, server Claude tiruan, dan `next start -p 3100` (lihat docs/STATUS.md).
const APP = 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080/v1/projects/markas-latihan/databases/(default)/documents';
const MODE = process.argv[2] ?? 'utama';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + JSON.stringify(x) : ''}`); if (!c) fail++; };
const user = async (email) => {
  const j = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'rahasia123', returnSecureToken: true }) })).json();
  return { token: j.idToken, uid: j.localId };
};
const call = (path, token, init = {}, sesi) => fetch(APP + path, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(sesi ? { 'x-admin-sesi': sesi } : {}) } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const post = (path, token, body, sesi) => call(path, token, { method: 'POST', body: JSON.stringify(body ?? {}) }, sesi);
const dok = async (path) => (await fetch(`${FS}/${path}`, { headers: { authorization: 'Bearer owner' } })).json();
const s = Date.now();
const soal = (o = {}) => ({ q: 'Hasil 2+2?', options: ['3', '4', '5', '6'], answer: 1, explain: '2+2=4.', keyGuessed: false, optionsAdded: false, ...o });

if (MODE === 'reset-lama') {
  // Server dijalankan dengan ADMIN_LOGIN_ULANG_DETIK=1: token yang dibuat >1 detik lalu dianggap login lama.
  const A = await user(`r${s}@contoh.id`);
  await post('/api/admin/pin', A.token, { pin: '1234' });
  await new Promise((r) => setTimeout(r, 2500));
  const r = await post('/api/admin/reset', A.token);
  ok(r.status === 403 && r.body.error === 'login_ulang', 'reset ditolak kalau login orang tua sudah lama', r.body);
  const d = await dok(`families/${A.uid}`);
  ok(Boolean(d.fields.adminPinHash?.stringValue), 'PIN tetap ada');
} else {
  const A = await user(`adm${s}@contoh.id`);
  const B = await user(`adm2${s}@contoh.id`);

  let r = await call('/api/admin', A.token);
  ok(r.status === 200 && r.body.adaPin === false && r.body.terkunciSampai === null && r.body.aiTersedia === true, 'status awal: belum ada PIN', r.body);
  ok((await call('/api/admin/soal-pilihan', A.token)).status === 403, 'tanpa sesi admin: daftar ditolak');
  ok((await post('/api/admin/pin', A.token, { pin: '12a4' })).status === 400, 'PIN bukan 4 angka ditolak');
  ok((await post('/api/admin/pin', A.token, { pin: '12345' })).status === 400, 'PIN 5 angka ditolak');

  r = await post('/api/admin/pin', A.token, { pin: '2468' });
  ok(r.status === 200 && typeof r.body.token === 'string' && r.body.token.length > 20, 'PIN pertama dibuat → token sesi admin');
  const sesi1 = r.body.token;
  let d = await dok(`families/${A.uid}`);
  const hash = d.fields.adminPinHash.stringValue;
  ok(hash.startsWith('scrypt$') && !hash.includes('2468') && hash.split('$')[1].length === 32, 'PIN disimpan sebagai hash scrypt dengan salt', hash.slice(0, 20));
  ok((await post('/api/admin/pin', A.token, { pin: '1111' })).status === 403, 'PIN sudah ada: ganti tanpa sesi admin ditolak');

  r = await post('/api/admin/masuk', A.token, { pin: '2468' });
  ok(r.status === 200 && r.body.token && r.body.token !== sesi1, 'masuk dengan PIN benar');
  const sesi = r.body.token;
  ok((await post('/api/admin/masuk', B.token, { pin: '2468' })).status === 404, 'keluarga lain (belum punya PIN) tidak bisa masuk dengan PIN keluarga A');
  ok((await call('/api/admin/soal-pilihan', B.token, {}, sesi)).status === 403, 'token sesi keluarga A tidak berlaku untuk keluarga B');

  // Soal pilihan
  r = await call('/api/admin/soal-pilihan', A.token, {}, sesi);
  ok(r.status === 200 && r.body.paket.length === 0, 'daftar kosong');
  r = await post('/api/admin/soal-pilihan', A.token, { title: '', kelas: 5, subject: 'Matematika', sourceText: '1. Hasil 2+2?', questions: [soal()] }, sesi);
  ok(r.status === 201 && r.body.paket.title === 'Matematika Kelas 5 SD' && r.body.paket.questions.length === 1, 'simpan: judul bawaan "{Mapel} Kelas k Jenjang"', r.body?.paket?.title);
  const p1 = r.body.paket;
  await post('/api/admin/soal-pilihan', A.token, { title: 'Latihan UTS Pecahan', kelas: 3, subject: 'IPAS', sourceText: '', questions: [soal(), soal({ options: ['ya', 'tidak'], answer: 0 })] }, sesi);
  await post('/api/admin/soal-pilihan', A.token, { title: 'Bahasa', kelas: 5, subject: 'Bahasa Indonesia', sourceText: '', questions: [soal()] }, sesi);
  r = await call('/api/admin/soal-pilihan', A.token, {}, sesi);
  ok(r.body.paket.map((p) => `${p.kelas}/${p.subject}`).join(',') === '3/IPAS,5/Bahasa Indonesia,5/Matematika', 'urut kelas lalu mapel', r.body.paket.map((p) => `${p.kelas}/${p.subject}`));
  ok((await post('/api/admin/soal-pilihan', A.token, { title: '', kelas: 5, subject: 'Fisika', sourceText: '', questions: [soal()] }, sesi)).status === 400, 'mapel tidak sesuai jenjang ditolak');
  ok((await post('/api/admin/soal-pilihan', A.token, { title: '', kelas: 5, subject: 'Matematika', sourceText: '', questions: [soal({ answer: 3, options: ['a', 'b'] })] }, sesi)).status === 400, 'kunci di luar pilihan ditolak');
  r = await call(`/api/admin/soal-pilihan/${p1.id}`, A.token, { method: 'PUT', body: JSON.stringify({ title: 'Diubah', kelas: 6, subject: 'Matematika', sourceText: 'baru', questions: [soal(), soal()] }) }, sesi);
  ok(r.status === 200 && r.body.paket.title === 'Diubah' && r.body.paket.kelas === 6 && r.body.paket.questions.length === 2 && r.body.paket.createdAt === p1.createdAt, 'ubah paket');
  ok((await call(`/api/admin/soal-pilihan/${p1.id}`, B.token, { method: 'DELETE' }, sesi)).status === 403, 'keluarga lain tidak bisa menghapus');
  ok((await call(`/api/admin/soal-pilihan/${p1.id}`, A.token, { method: 'DELETE' }, sesi)).status === 200, 'hapus paket');
  ok((await call(`/api/admin/soal-pilihan/${p1.id}`, A.token, { method: 'DELETE' }, sesi)).status === 404, 'hapus lagi: 404');

  // Rapikan
  r = await post('/api/admin/rapikan', A.token, { kelas: 5, mapel: 'Matematika', teks: '1. Hasil dari 3/4 + 1/4 adalah...\nA. 1/2\nB. 1\nKunci: B\n2. Ibu punya 12 kue' }, sesi);
  ok(r.status === 200 && r.body.soal.length === 2, 'rapikan: item tidak valid dibuang', r.body?.soal?.length);
  ok(r.body.soal[1].keyGuessed === true && r.body.soal[1].optionsAdded === true && r.body.soal[0].options.join('|') === '1/2|1|4/8|2', 'rapikan: tanda keyGuessed/optionsAdded, urutan pilihan tidak diacak');
  const log = (await (await fetch(`${FS}/families/${A.uid}/logAi?pageSize=50`, { headers: { authorization: 'Bearer owner' } })).json()).documents ?? [];
  const lr = log.find((x) => x.fields.jenis.stringValue === 'rapikan');
  ok(lr && lr.fields.model.stringValue === 'claude-haiku-5-5', 'rapikan memakai Haiku 5.5 dan dicatat di log biaya');
  ok((await post('/api/admin/rapikan', A.token, { kelas: 5, mapel: 'Matematika', teks: '   ' }, sesi)).status === 400, 'rapikan: teks kosong ditolak');
  ok((await post('/api/admin/rapikan', A.token, { kelas: 5, mapel: 'Matematika', teks: 'x'.repeat(20001) }, sesi)).status === 400, 'rapikan: > 20.000 karakter ditolak');
  ok((await post('/api/admin/rapikan', A.token, { kelas: 5, mapel: 'Matematika', teks: '1. x' })).status === 403, 'rapikan tanpa sesi admin ditolak');
  r = await post('/api/admin/rapikan', A.token, { kelas: 5, mapel: 'Matematika', teks: '1. tolak ini' }, sesi);
  ok(r.status === 422 && r.body.error === 'ditolak', 'rapikan: AI menolak → ditolak');

  // Ganti PIN, keluar
  r = await post('/api/admin/pin', A.token, { pin: '1357' }, sesi);
  ok(r.status === 200 && r.body.token, 'ganti PIN dengan sesi admin');
  ok((await post('/api/admin/masuk', A.token, { pin: '2468' })).body.error === 'pin_salah', 'PIN lama tidak berlaku');
  const sesi3 = (await post('/api/admin/masuk', A.token, { pin: '1357' })).body.token;
  ok((await post('/api/admin/keluar', A.token, {}, sesi3)).status === 200 && (await call('/api/admin/soal-pilihan', A.token, {}, sesi3)).status === 403, 'keluar: sesi admin tidak berlaku lagi');

  // Batas percobaan: 5 salah → jeda
  const C = await user(`adm3${s}@contoh.id`);
  await post('/api/admin/pin', C.token, { pin: '9999' });
  const kode = [];
  for (let i = 0; i < 5; i++) kode.push((await post('/api/admin/masuk', C.token, { pin: '0000' })).body.error);
  ok(kode.join(',') === 'pin_salah,pin_salah,pin_salah,pin_salah,pin_terkunci', '5 PIN salah → terkunci', kode);
  r = await post('/api/admin/masuk', C.token, { pin: '9999' });
  ok(r.status === 429 && r.body.error === 'pin_terkunci' && r.body.message === 'PIN salah terlalu sering. Coba lagi dalam 5 menit.', 'saat terkunci, PIN benar pun ditolak', r.body);
  r = await call('/api/admin', C.token);
  ok(r.body.terkunciSampai && new Date(r.body.terkunciSampai) > new Date(), 'status menampilkan waktu kunci');
  const D = await user(`adm4${s}@contoh.id`);
  await post('/api/admin/pin', D.token, { pin: '4444' });
  const par = await Promise.all(Array.from({ length: 8 }, () => post('/api/admin/masuk', D.token, { pin: '0000' })));
  ok(par.every((x) => x.status === 403 || x.status === 429) && (await post('/api/admin/masuk', D.token, { pin: '4444' })).status === 429, '8 tebakan bersamaan tetap terkunci (transaksi)', par.map((x) => x.status));

  // Reset lewat login ulang (token baru = login baru)
  r = await post('/api/admin/reset', C.token);
  ok(r.status === 200, 'lupa PIN: reset dengan login yang baru saja dilakukan');
  r = await call('/api/admin', C.token);
  ok(r.body.adaPin === false && r.body.terkunciSampai === null, 'setelah reset: PIN & kunci hilang', r.body);
  ok((await post('/api/admin/pin', C.token, { pin: '5555' })).status === 200, 'buat PIN baru setelah reset');
  ok((await call('/api/admin', null)).status === 401, 'tanpa login: 401');
}
console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
