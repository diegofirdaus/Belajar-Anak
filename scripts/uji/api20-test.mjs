// Uji teks bersama (kutipan berita/cerita/tabel untuk beberapa soal): dikenali saat baca foto & rapikan,
// tersimpan per soal, ikut ke sesi anak, teks kolom Soal, dan prompt. Butuh emulator, mock-claude (log di argv[2]), next start.
import fs from 'node:fs';
const APP = 'http://localhost:3100';
const LOG = process.argv[2];
let fail = 0;
const ok = (c, n, x = '') => { console.log(`${c ? 'LULUS' : 'GAGAL'}  ${n}${x !== '' ? '  ' + JSON.stringify(x) : ''}`); if (!c) fail++; };
const user = async (email) => {
  const j = await (await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'rahasia123', returnSecureToken: true }) })).json();
  return { token: j.idToken, uid: j.localId };
};
const kirim = (method, path, token, body, sesi) => fetch(APP + path, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(sesi ? { 'x-admin-sesi': sesi } : {}) } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const post = (p, t, b, s) => kirim('POST', p, t, b, s);
const terakhir = () => { const b = fs.readFileSync(LOG, 'utf8').trim().split('\n'); return JSON.parse(b[b.length - 1]).body; };
const prompt = (b) => { const c = b.messages[0].content; return typeof c === 'string' ? c : c.filter((x) => x.type === 'text').map((x) => x.text).join('\n'); };

const A = await user(`tb${Date.now()}@contoh.id`);
const sesi = (await post('/api/admin/pin', A.token, { pin: '1234' })).body.token;
const raka = (await post('/api/pemain', A.token, { name: 'Raka', kelas: 7, theme: 'blok' })).body.player;

// Baca foto
let r = await post('/api/admin/baca-foto', A.token, { kelas: 7, mapel: 'Pendidikan Pancasila', gambar: [{ media_type: 'image/jpeg', data: 'A'.repeat(1800) }] }, sesi);
let b = terakhir();
ok(r.status === 200 && r.body.soal[0].stimulus?.startsWith('Perhatikan kutipan berita berikut!') && r.body.soal[1].stimulus === r.body.soal[0].stimulus && r.body.soal[2].stimulus === undefined, 'baca foto: teks bersama menempel di soal 1-2, tidak di soal 3', r.body.soal.map((q) => q.stimulus?.slice(0, 20) ?? null));
ok(prompt(b).includes('"teksBersama"') && prompt(b).includes('Perhatikan kutipan berita berikut!') && prompt(b).includes('disambung menjadi satu soal') && 'teksBersama' in b.output_config.format.schema.properties.soal.items.properties, 'prompt baca foto: aturan teks bersama & soal terpotong antarhalaman');
const teks = r.body.teks;
ok(teks.startsWith('Teks untuk soal berikut:\nPerhatikan kutipan berita berikut!') && teks.split('Teks untuk soal berikut:').length === 2 && teks.indexOf('1. Toleransi') > teks.indexOf('Timika'), 'teks kolom Soal: teks bersama ditulis sekali di atas soal 1', teks.slice(0, 80));

// Rapikan (teks yang diketik/hasil foto)
r = await post('/api/admin/rapikan', A.token, { kelas: 7, mapel: 'Pendidikan Pancasila', teks }, sesi);
b = terakhir();
ok(r.status === 200 && r.body.soal[0].stimulus && r.body.soal[1].stimulus === r.body.soal[0].stimulus && !r.body.soal[2].stimulus && prompt(b).includes('"teksBersama"'), 'rapikan: teks bersama dikenali lagi');

// Simpan & anak mengerjakan
const soal = r.body.soal.map((q, i) => (i === 2 ? { ...q, stimulus: '' } : q));
r = await post('/api/admin/soal-pilihan', A.token, { title: 'Toleransi', kelas: 7, subject: 'Pendidikan Pancasila', sourceText: teks, questions: soal }, sesi);
ok(r.status === 201 && r.body.paket.questions[0].stimulus && !('stimulus' in r.body.paket.questions[2]), 'tersimpan: teks bersama per soal, yang dikosongkan tidak disimpan', r.status);
const setId = r.body.paket.id;
r = await post('/api/soal/pilihan', A.token, { pemainId: raka.id, setId });
ok(r.status === 201 && r.body.soal[0].stimulus === r.body.soal[1].stimulus && r.body.soal[0].stimulus.includes('Timika') && r.body.soal[2].stimulus === undefined && r.body.bacaan === undefined, 'sesi anak: teks bersama ikut ke soal 1-2');

// Soal mirip: contoh memuat teks; soal baru harus berdiri sendiri
r = await post('/api/soal/mirip', A.token, { pemainId: raka.id, setId });
b = terakhir();
ok(r.status === 201 && prompt(b).includes('(Teks yang dipakai soal ini: Perhatikan kutipan berita berikut!') && prompt(b).includes('jangan menulis "kutipan di atas" tanpa menyertakan kutipannya'), 'soal mirip: teks bersama jadi konteks, soal baru berdiri sendiri');

console.log(fail ? `\n${fail} GAGAL` : '\nSemua lulus');
process.exit(fail ? 1 : 0);
