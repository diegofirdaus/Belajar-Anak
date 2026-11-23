// Uji anggota keluarga: undang lewat email, bergabung saat login (data lama dibuang), hak pemilik vs anggota,
// cabut, hapus keluarga, dan pengaman salah undang. Butuh emulator dan next start (port 3100).
const APP = 'http://localhost:3100';
const FS = 'http://127.0.0.1:8080/v1/projects/markas-latihan/databases/(default)/documents';
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + JSON.stringify(x) : ''}`); if (!c) fail++; };
const s = Date.now();
/** Login Google tiruan (email terverifikasi). */
const google = async (email) => {
  const j = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ requestUri: 'http://localhost', returnSecureToken: true, postBody: 'providerId=google.com&id_token=' + encodeURIComponent(JSON.stringify({ sub: email, email, email_verified: true })) }),
  })).json();
  return { token: j.idToken, uid: j.localId, email };
};
const call = (method, path, token, body, sesi) => fetch(APP + path, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(sesi ? { 'x-admin-sesi': sesi } : {}) } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const pemain = async (u) => (await call('GET', '/api/pemain', u.token)).body.players.map((p) => p.name).sort().join(',');
const ada = async (path) => (await fetch(`${FS}/${path}`, { headers: { authorization: 'Bearer owner' } })).status === 200;

const A = await google(`ayah${s}@contoh.id`);
const B = await google(`Ibu${s}@Contoh.id`);
await call('POST', '/api/pemain', A.token, { name: 'Raka', kelas: 5, theme: 'blok' });
const sesiA = (await call('POST', '/api/admin/pin', A.token, { pin: '1234' })).body.token;
await call('POST', '/api/admin/soal-pilihan', A.token, { title: 'Pecahan', kelas: 5, subject: 'Matematika', sourceText: '1. a', questions: [{ q: '1/2 + 1/2 =', options: ['1', '2', '3', '4'], answer: 0, explain: '', keyGuessed: false, optionsAdded: false }] }, sesiA);

// Ibu sempat membuat data sendiri sebelum diundang
await call('POST', '/api/pemain', B.token, { name: 'Lama', kelas: 2, theme: 'dino' });
ok((await pemain(B)) === 'Lama' && (await ada(`families/${B.uid}`)), 'sebelum diundang: Ibu punya keluarga sendiri');

// Undang
let r = await call('POST', '/api/admin/anggota', A.token, { email: B.email }, sesiA);
ok(r.status === 201 && r.body.saya === 'pemilik' && r.body.emailPemilik === A.email && r.body.anggota[0].email === B.email.toLowerCase() && r.body.anggota[0].status === 'menunggu', 'pemilik mengundang email (huruf kecil), status menunggu', r.body);
ok((await call('POST', '/api/admin/anggota', A.token, { email: B.email.toUpperCase() }, sesiA)).status === 400, 'email yang sama tidak bisa diundang dua kali');
ok((await call('POST', '/api/admin/anggota', A.token, { email: A.email }, sesiA)).body?.message === 'Itu email akun Anda sendiri.', 'tidak bisa mengundang email sendiri');
ok((await call('POST', '/api/admin/anggota', A.token, { email: 'bukan-email' }, sesiA)).status === 400, 'email tidak sah ditolak');
ok((await call('POST', '/api/admin/anggota', A.token, { email: `x${s}@contoh.id` })).status === 403, 'tanpa sesi admin ditolak');

// Ibu login → bergabung, data lamanya dibuang
ok((await pemain(B)) === 'Raka', 'Ibu login: melihat anak keluarga Ayah');
ok(!(await ada(`families/${B.uid}`)), 'data lama Ibu dihapus');
const paketB = await call('GET', '/api/pemain/' + (await call('GET', '/api/pemain', B.token)).body.players[0].id + '/ringkasan', B.token);
ok(paketB.body.paketPilihan.length === 1 && paketB.body.paketPilihan[0].title === 'Pecahan', 'Ibu melihat soal pilihan yang sama');
await call('POST', '/api/pemain', B.token, { name: 'Nadia', kelas: 8, theme: 'pahlawan' });
ok((await pemain(A)) === 'Nadia,Raka', 'anak yang ditambah Ibu terlihat oleh Ayah');

// Mode admin Ibu: PIN sama, bukan pemilik
r = await call('POST', '/api/admin/masuk', B.token, { pin: '1234' });
const sesiB = r.body?.token;
ok(r.status === 200 && sesiB, 'Ibu masuk mode admin dengan PIN keluarga yang sama');
r = await call('GET', '/api/admin/anggota', B.token, null, sesiB);
ok(r.body.saya === 'anggota' && r.body.anggota[0].status === 'bergabung', 'Ibu: peran anggota, status bergabung', r.body);
ok((await call('POST', '/api/admin/anggota', B.token, { email: `x${s}@contoh.id` }, sesiB)).status === 400, 'anggota tidak bisa mengundang');
ok((await call('DELETE', '/api/admin/anggota', B.token, { email: B.email }, sesiB)).status === 400, 'anggota tidak bisa mencabut');
r = await call('POST', '/api/keluarga/hapus', B.token, { konfirmasi: 'HAPUS' }, sesiB);
ok(r.status === 400 && /pemilik/.test(r.body.message) && (await pemain(A)) === 'Nadia,Raka', 'anggota tidak bisa menghapus semua data keluarga');

// Pengaman: email yang sudah anggota/diundang keluarga lain
const C = await google(`lain${s}@contoh.id`);
await call('GET', '/api/pemain', C.token);
const sesiC = (await call('POST', '/api/admin/pin', C.token, { pin: '5678' })).body.token;
ok((await call('POST', '/api/admin/anggota', C.token, { email: B.email }, sesiC)).body?.message === 'Email itu sudah menjadi anggota keluarga lain.', 'tidak bisa mengundang anggota keluarga lain');
await call('POST', '/api/admin/anggota', A.token, { email: `tamu${s}@contoh.id` }, sesiA);
ok((await call('POST', '/api/admin/anggota', C.token, { email: `tamu${s}@contoh.id` }, sesiC)).body?.message === 'Email itu sudah diundang keluarga lain.', 'tidak bisa mengundang email yang sedang diundang keluarga lain');
// Pengaman salah undang: pemilik yang punya anggota tidak ikut bergabung (keluarganya tidak terhapus)
await call('POST', '/api/admin/anggota', C.token, { email: A.email }, sesiC);
ok((await pemain(A)) === 'Nadia,Raka' && (await ada(`families/${A.uid}`)), 'pemilik yang punya anggota tidak tertarik masuk keluarga lain');
await call('DELETE', '/api/admin/anggota', C.token, { email: A.email }, sesiC);

// Akun tanpa email terverifikasi tidak bisa menerima undangan
const P = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `palsu${s}@contoh.id`, password: 'rahasia123', returnSecureToken: true }) })).json();
await call('POST', '/api/admin/anggota', A.token, { email: `palsu${s}@contoh.id` }, sesiA);
ok((await call('GET', '/api/pemain', P.idToken)).body.players.length === 0, 'email belum terverifikasi: tidak ikut bergabung');

// Batas 5 anggota (Ibu, tamu, palsu sudah ada)
await call('POST', '/api/admin/anggota', A.token, { email: `d${s}@contoh.id` }, sesiA);
await call('POST', '/api/admin/anggota', A.token, { email: `e${s}@contoh.id` }, sesiA);
r = await call('POST', '/api/admin/anggota', A.token, { email: `f${s}@contoh.id` }, sesiA);
ok(r.status === 429 && /Maksimal 5/.test(r.body.message), 'maksimal 5 anggota', r.body);

// Cabut Ibu → keluarga sendiri yang baru (kosong)
r = await call('DELETE', '/api/admin/anggota', A.token, { email: B.email }, sesiA);
ok(r.status === 200 && !r.body.anggota.some((x) => x.email === B.email.toLowerCase()), 'pemilik mencabut Ibu');
ok((await pemain(B)) === '' && (await pemain(A)) === 'Nadia,Raka', 'setelah dicabut: Ibu kembali ke keluarga sendiri (kosong), data Ayah utuh');
ok((await call('DELETE', '/api/admin/anggota', A.token, { email: `tidakada${s}@contoh.id` }, sesiA)).status === 404, 'cabut email yang tidak ada: 404');

// Pemilik menghapus keluarga → undangan & keanggotaan ikut terhapus
const G = await google(`nenek${s}@contoh.id`);
await call('DELETE', '/api/admin/anggota', A.token, { email: `d${s}@contoh.id` }, sesiA);
await call('POST', '/api/admin/anggota', A.token, { email: G.email }, sesiA);
ok((await pemain(G)) === 'Nadia,Raka', 'anggota lain bergabung');
r = await call('POST', '/api/keluarga/hapus', A.token, { konfirmasi: 'HAPUS' }, sesiA);
ok(r.status === 200, 'pemilik menghapus semua data keluarga', r.body);
ok(!(await ada(`anggota/${G.uid}`)) && !(await ada(`undangan/tamu${s}@contoh.id`)) && (await pemain(G)) === '', 'keanggotaan & undangan ikut terhapus; anggota kembali ke keluarga sendiri');

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
